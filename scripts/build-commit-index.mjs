#!/usr/bin/env node
/**
 * 构建仓库提交索引 → src/data/commit-index.json
 *
 * 数据源优先本地 git（免 token、无速率限制、一次拿全历史）；
 * 只有在本地 git 不可用时（例如 Vercel 的浅克隆）才退回 GitHub API。
 * 索引提交进仓库，所以常规情况是「读已有索引 + 补齐新提交」的增量模式。
 *
 * 用法：
 *   node scripts/build-commit-index.mjs           # 增量补齐
 *   node scripts/build-commit-index.mjs --full    # 忽略已有索引，全量重建
 *
 * 可选环境变量（GitHub API 兜底时用，两个平台都能配）：
 *   COMMIT_INDEX_TOKEN / GITHUB_TOKEN  —— 提升 API 速率上限
 *   COMMIT_INDEX_REPO                  —— 覆盖 owner/repo，默认 ImUpXuu/xuhome
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const OUT_PATH = join('src', 'data', 'commit-index.json');
const SCHEMA = 3;
const DEFAULT_REPO = 'ImUpXuu/xuhome';
const FULL = process.argv.includes('--full');

const log = (...a) => console.log('[commit-index]', ...a);

/* ------------------------------------------------------------------ *
 * 路径分类：决定「更新内容比」里每次提交算哪一类
 * ------------------------------------------------------------------ */

/**
 * 不计入统计的路径。索引文件自己被 CI 每次推送后回写，
 * 留着会让明细里全是「src/data/commit-index.json +1 -1」这种噪音。
 */
const IGNORED_PATHS = [
  /^src\/data\/commit-index\.json$/,
];

function isIgnoredPath(path) {
  return IGNORED_PATHS.some((re) => re.test(path));
}

const RULES = [
  { kind: 'post', test: (p) => /^src\/content\/posts\//.test(p) },
  { kind: 'talk', test: (p) => /^src\/content\/talks\//.test(p) },
  { kind: 'friend', test: (p) => /friends?\.(json|ts)$/.test(p) || /^src\/config\/friends/.test(p) },
];

function classifyPath(path) {
  for (const r of RULES) if (r.test(path)) return r.kind;
  return 'other';
}

/**
 * 一次提交可能同时动了文章和代码。按「改动行数最多的那一类」归属，
 * 便于占比图不重复计数；同时保留 kinds 数组供前端做次要标注。
 */
function classifyCommit(files) {
  const weight = { post: 0, talk: 0, friend: 0, other: 0 };
  for (const f of files) {
    weight[classifyPath(f.path)] += (f.added || 0) + (f.removed || 0) + 1;
  }
  const kinds = Object.keys(weight).filter((k) => weight[k] > 0);
  let primary = 'other';
  let best = -1;
  for (const k of ['post', 'talk', 'friend', 'other']) {
    if (weight[k] > best) { best = weight[k]; primary = k; }
  }
  return { primary, kinds };
}
/* ------------------------------------------------------------------ *
 * 本地 git 数据源
 * ------------------------------------------------------------------ */

function git(args) {
  // core.quotepath=false：否则中文文件名会被转义成 "\345\220\216..." 八进制形式，
  // 路径分类和「首次出现时间」全部失配
  return execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function gitAvailable() {
  try {
    git(['rev-parse', '--git-dir']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Vercel 等平台默认浅克隆，git log 只能看到最近几条。
 * 这时本地 git 的结果只能当增量用，必须和仓库里已提交的索引合并。
 */
function gitIsShallow() {
  try {
    return git(['rev-parse', '--is-shallow-repository']).trim() === 'true';
  } catch {
    return false;
  }
}

/**
 * 浅克隆的边界提交（.git/shallow 里列的那些）没有父提交，
 * git 会把它和空树比，--numstat 于是吐出整个仓库的所有文件。
 * 实测 --depth 1 时那一条会显示「405 个文件 +34950 行」而不是真实的 7 个文件。
 * 这些条目必须丢掉，改用仓库里已提交的索引中那一份正确数据。
 */
function shallowBoundary() {
  try {
    const p = git(['rev-parse', '--git-path', 'shallow']).trim();
    return new Set(
      readFileSync(p, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

/**
 * git log 的 --numstat 输出没有稳定的记录分隔符，用自定义前缀切分。
 * 字段里可能含制表符/换行（提交信息），所以用 \x1f 作字段分隔、\x1e 作记录起始标记。
 */
const REC = '\x1e';
const SEP = '\x1f';

function readLocalCommits({ since } = {}) {
  const args = [
    'log',
    '--no-merges',
    '--numstat',
    `--format=${REC}%H${SEP}%at${SEP}%an${SEP}%s`,
  ];
  if (since) args.push(`${since}..HEAD`);

  let raw;
  try {
    raw = git(args);
  } catch (e) {
    // since 指向的 commit 在浅克隆里不存在 → 让调用方退回全量
    throw Object.assign(new Error('git log failed: ' + (e.stderr || e.message)), { code: 'GIT_LOG' });
  }

  const commits = [];
  for (const chunk of raw.split(REC)) {
    if (!chunk.trim()) continue;
    const nl = chunk.indexOf('\n');
    const header = nl === -1 ? chunk : chunk.slice(0, nl);
    const body = nl === -1 ? '' : chunk.slice(nl + 1);
    const [sha, at, author, ...rest] = header.split(SEP);
    if (!sha || !at) continue;

    const files = [];
    for (const line of body.split('\n')) {
      if (!line.trim()) continue;
      const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
      if (!m) continue;
      // 重命名形如 "old => new" 或 "dir/{a => b}/f"，取箭头后的新路径
      let path = m[3];
      if (path.includes('=>')) {
        path = path.replace(/\{([^}]*) => ([^}]*)\}/g, '$2').replace(/^.*\s=>\s/, '').trim();
      }
      // 含特殊字符时 git 仍会加引号包裹，剥掉以便与真实路径对齐
      if (path.startsWith('"') && path.endsWith('"')) path = path.slice(1, -1);
      files.push({
        path,
        added: m[1] === '-' ? 0 : Number(m[1]),
        removed: m[2] === '-' ? 0 : Number(m[2]),
      });
    }

    commits.push({
      sha,
      ts: Number(at) * 1000,
      author: author || '',
      subject: rest.join(SEP) || '',
      files,
    });
  }
  return commits;
}
/* ------------------------------------------------------------------ *
 * GitHub API 兜底（本地 git 不可用时，例如浅克隆环境）
 * ------------------------------------------------------------------ */

function apiHeaders() {
  const token = process.env.COMMIT_INDEX_TOKEN || process.env.GITHUB_TOKEN;
  const h = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'xuhome-commit-index',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function apiGet(url) {
  const r = await fetch(url, { headers: apiHeaders() });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`GitHub API ${r.status} ${url} ${body.slice(0, 200)}`);
  }
  return r.json();
}

/**
 * API 的列表接口不返回每个文件的增删行，要逐提交再查一次 detail。
 * 提交数多时这会很贵，所以只在增量补齐（通常几条）或本地 git 缺失时使用，
 * 并对 detail 请求数设上限，超了就只保留列表里的元信息（files 为空）。
 */
async function readApiCommits({ repo, sinceISO, maxDetail = 300 }) {
  const list = [];
  for (let page = 1; page <= 20; page++) {
    const qs = new URLSearchParams({ per_page: '100', page: String(page) });
    if (sinceISO) qs.set('since', sinceISO);
    const batch = await apiGet(`https://api.github.com/repos/${repo}/commits?${qs}`);
    if (!batch.length) break;
    list.push(...batch);
    if (batch.length < 100) break;
  }

  const commits = [];
  let detailBudget = maxDetail;
  for (const c of list) {
    if (c.parents && c.parents.length > 1) continue; // 跳过 merge，与本地 --no-merges 对齐
    let files = [];
    if (detailBudget > 0) {
      detailBudget--;
      try {
        const d = await apiGet(`https://api.github.com/repos/${repo}/commits/${c.sha}`);
        files = (d.files || []).map((f) => ({
          path: f.filename,
          added: f.additions || 0,
          removed: f.deletions || 0,
        }));
      } catch (e) {
        log('detail fetch failed for', c.sha.slice(0, 7), '-', e.message);
      }
    }
    commits.push({
      sha: c.sha,
      ts: new Date(c.commit.author.date).getTime(),
      author: c.commit.author.name || (c.author && c.author.login) || '',
      subject: (c.commit.message || '').split('\n')[0],
      files,
    });
  }
  return commits;
}
/* ------------------------------------------------------------------ *
 * 派生数据：热力图日历 + 内容字数
 * ------------------------------------------------------------------ */

function ymd(ts) {
  const d = new Date(ts);
  const p = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 逐日聚合，供热力图和趋势图使用（不含无提交的空日，前端自行补零） */
function buildDaily(entries) {
  const map = new Map();
  for (const c of entries) {
    const key = ymd(c.ts);
    let d = map.get(key);
    if (!d) {
      d = { date: key, commits: 0, added: 0, removed: 0, contentAdded: 0, contentRemoved: 0, kinds: { post: 0, talk: 0, friend: 0, other: 0 } };
      map.set(key, d);
    }
    d.commits++;
    d.added += c.added;
    d.removed += c.removed;
    d.contentAdded += c.contentAdded;
    d.contentRemoved += c.contentRemoved;
    d.kinds[c.kind]++;
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** 正文字数：与页脚共用同一口径（见 src/utils/wordCount.mjs） */
async function loadWordCounter() {
  const { countMarkdownChars } = await import('../src/utils/wordCount.mjs');
  return countMarkdownChars;
}

/**
 * 当前仓库里每篇文章/说说的真实字数，并从提交索引反推它的首次出现时间。
 * 字数增长曲线由此累加得到，比用 diff 行数估算准确得多。
 */
async function buildContentWordCounts(entries) {
  const { readdir, readFile } = await import('node:fs/promises');
  const countWords = await loadWordCounter();
  const dirs = [
    { dir: join('src', 'content', 'posts'), kind: 'post' },
    { dir: join('src', 'content', 'talks'), kind: 'talk' },
  ];

  // path → 最早/最新提交时间
  const firstTs = new Map();
  const lastTs = new Map();
  for (const c of entries) {
    for (const [p] of c.files) {
      const prev = firstTs.get(p);
      if (prev === undefined || c.ts < prev) firstTs.set(p, c.ts);
      const last = lastTs.get(p);
      if (last === undefined || c.ts > last) lastTs.set(p, c.ts);
    }
  }

  const out = [];
  for (const { dir, kind } of dirs) {
    let names;
    try {
      names = await readdir(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!/\.mdx?$/i.test(name)) continue;
      const rel = `${dir.replace(/\\/g, '/')}/${name}`;
      let raw;
      try {
        raw = await readFile(join(dir, name), 'utf8');
      } catch {
        continue;
      }
      out.push({
        path: rel,
        kind,
        words: countWords(raw),
        createdTs: firstTs.get(rel) || 0,
        updatedTs: lastTs.get(rel) || 0,
      });
    }
  }
  out.sort((a, b) => a.createdTs - b.createdTs);
  return out;
}

/**
 * 每篇文章/说说的提交历史。
 *
 * 用文件基名（去掉目录和扩展名）做 key：文章页拿得到的是 collection entry id，
 * 正好等于基名，且已验证 124 篇文章基名互不重复。用完整路径反而对不上，
 * 因为页面侧不知道源文件在 posts 还是 talks 目录。
 */
function buildFileHistory(entries) {
  const map = new Map();

  // entries 已按时间倒序，这里保持同序写入，页面直接用不必再排
  for (const c of entries) {
    for (const [path, added, removed] of c.files) {
      const m = path.match(/^src\/content\/(posts|talks)\/(.+)\.mdx?$/);
      if (!m) continue;
      const key = m[2];
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({
        sha: c.sha,
        ts: c.ts,
        subject: c.subject,
        author: c.author,
        added,
        removed,
      });
    }
  }
  return map;
}

/** 单个提交的准确 diff 统计（浅克隆边界提交只能靠 API 补） */
async function fetchCommitDetail(repo, sha) {
  const d = await apiGet(`https://api.github.com/repos/${repo}/commits/${sha}`);
  return {
    sha: d.sha,
    ts: new Date(d.commit.author.date).getTime(),
    author: d.commit.author.name || (d.author && d.author.login) || '',
    subject: (d.commit.message || '').split('\n')[0],
    files: (d.files || []).map((f) => ({
      path: f.filename,
      added: f.additions || 0,
      removed: f.deletions || 0,
    })),
  };
}

/* ------------------------------------------------------------------ *
 * 索引组装
 * ------------------------------------------------------------------ */

function toEntry(c) {
  // 先滤掉噪音路径，再算分类与行数统计
  const files = c.files.filter((f) => !isIgnoredPath(f.path));
  const { primary, kinds } = classifyCommit(files);
  let added = 0;
  let removed = 0;
  for (const f of files) { added += f.added; removed += f.removed; }

  // 只统计正文内容（文章/说说）的净增字数，代码改动不算进"字数变化"
  let contentAdded = 0;
  let contentRemoved = 0;
  for (const f of files) {
    const k = classifyPath(f.path);
    if (k === 'post' || k === 'talk') {
      contentAdded += f.added;
      contentRemoved += f.removed;
    }
  }

  return {
    sha: c.sha,
    ts: c.ts,
    author: c.author,
    subject: c.subject,
    kind: primary,
    kinds,
    added,
    removed,
    contentAdded,
    contentRemoved,
    fileCount: files.length,
    files: files.map((f) => [f.path, f.added, f.removed]),
  };
}

/**
 * CI 回写索引的提交只动 commit-index.json，滤掉噪音后一个文件都不剩，
 * 整条剔除，免得明细里出现一串 0 改动的空提交。
 * files 为空但有增删行数的走 API 兜底（detail 预算耗尽），要保留。
 */
function isMeaningful(entry) {
  return entry.files.length > 0 || entry.added > 0 || entry.removed > 0;
}

function readExisting() {
  if (FULL) return null;
  try {
    const j = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
    if (j.schema !== SCHEMA || !Array.isArray(j.commits)) return null;
    return j;
  } catch {
    return null;
  }
}

/** 后来的条目覆盖同 sha 的旧条目（新数据通常更完整，例如补上了 files） */
function mergeBySha(...lists) {
  const bySha = new Map();
  for (const list of lists) for (const c of list) bySha.set(c.sha, c);
  return [...bySha.values()];
}

async function main() {
  const repo = process.env.COMMIT_INDEX_REPO || DEFAULT_REPO;
  const existing = readExisting();
  const base = existing ? existing.commits : [];

  let entries = null;
  let source = null;

  if (gitAvailable()) {
    const shallow = gitIsShallow();
    try {
      let local = readLocalCommits().map(toEntry).filter(isMeaningful);

      if (shallow) {
        // 边界提交的 diff 是「整个仓库 vs 空树」，数据是错的，必须丢掉
        const boundary = shallowBoundary();
        const dropped = local.filter((c) => boundary.has(c.sha));
        local = local.filter((c) => !boundary.has(c.sha));

        // 缓存里没有这条（刚推的提交就是边界）时，去 API 拿一次准确的 diff，
        // 否则这条提交会整条丢失，文章历史里也就看不到最新那次改动
        const cachedShas = new Set(base.map((c) => c.sha));
        const recovered = [];
        for (const c of dropped) {
          if (cachedShas.has(c.sha)) continue;
          try {
            recovered.push(toEntry(await fetchCommitDetail(repo, c.sha)));
          } catch (e) {
            log(`could not recover boundary commit ${c.sha.slice(0, 7)}:`, e.message);
          }
        }
        if (dropped.length) {
          log(`dropped ${dropped.length} shallow-boundary commit(s), recovered ${recovered.length} via API`);
        }

        // 缓存条目优先级最高（完整克隆下算出来的），local/recovered 只补缺失的
        log(`shallow clone — merging ${local.length} local + ${recovered.length} recovered with ${base.length} cached`);
        entries = mergeBySha(local, recovered, base).filter(isMeaningful);
        source = base.length ? 'git-shallow+cache' : 'git-shallow';
      } else {
        // 完整克隆下全量重算：比逐提交打 API 便宜得多，且能自动修正
        // rebase / force-push 后索引与真实历史不一致的情况
        entries = local;
        source = 'git';
      }
    } catch (e) {
      log('local git unusable:', e.message);
    }
  }

  if (!entries || !entries.length) {
    // 非 git 环境：用已有索引打底，再用 API 补齐更新的提交
    const newestTs = base.reduce((m, c) => Math.max(m, c.ts), 0);
    const sinceISO = newestTs ? new Date(newestTs + 1000).toISOString() : undefined;
    log('falling back to GitHub API', sinceISO ? `since ${sinceISO}` : '(full)');

    let fresh = [];
    try {
      fresh = (await readApiCommits({ repo, sinceISO })).map(toEntry).filter(isMeaningful);
    } catch (e) {
      log('API fetch failed:', e.message);
      if (!base.length) log('no data at all — writing empty index so the build still succeeds');
    }
    entries = mergeBySha(base, fresh);
    source = fresh.length ? 'api+cache' : 'cache';
  }

  entries.sort((a, b) => b.ts - a.ts);
  const daily = buildDaily(entries);
  const contentFiles = await buildContentWordCounts(entries);
  const fileHistory = buildFileHistory(entries);

  const payload = {
    schema: SCHEMA,
    repo,
    generatedAt: new Date().toISOString(),
    source,
    totals: {
      commits: entries.length,
      added: entries.reduce((s, c) => s + c.added, 0),
      removed: entries.reduce((s, c) => s + c.removed, 0),
      firstTs: entries.length ? entries[entries.length - 1].ts : 0,
      lastTs: entries.length ? entries[0].ts : 0,
      words: contentFiles.reduce((s, f) => s + f.words, 0),
    },
    daily,
    contentFiles,
    // 文章页要按需拉取，所以按文件基名存成对象
    fileHistory: Object.fromEntries(fileHistory),
    commits: entries,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(payload), 'utf8');
  log(
    `wrote ${OUT_PATH} — ${entries.length} commits, ${daily.length} active days,`,
    `${contentFiles.length} content files, ${payload.totals.words} words,`,
    `${fileHistory.size} files with history (source: ${source})`,
  );
}

main().catch((e) => {
  console.error('[commit-index] fatal:', e);
  process.exit(1);
});



