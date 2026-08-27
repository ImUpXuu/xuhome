/**
 * 构建时生成 /history 页面数据：从 GitHub 拉取 commit 历史，
 * 解析 posts/talks 计算累计字数趋势，输出 src/data/history-data.json。
 *
 * 安全性：本脚本只读取 git 历史与内容文件，不涉及任何密钥/账号信息。
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const rm = (s) => s
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')   // markdown 图片
  .replace(/<img[^>]*>/gi, '')            // HTML 图片
  .replace(/\s+/g, '');                   // 去掉空白

const run = (cmd) => execSync(cmd, {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 100 * 1024 * 1024,
});

// 1) 从 GitHub 拉取最新 commit 历史（读 origin/main，不动本地工作区/当前分支）。
//    部署环境一般在构建前已 pull/checkout，因此这里 fetch 只是兜底刷新历史；
//    失败时回退到本地 HEAD，绝不会影响构建产物。
let ref = 'HEAD';
try {
  run('git fetch origin main --quiet');
  run('git rev-parse origin/main');   // 确认 origin/main 存在
  ref = 'origin/main';
  console.log('[generate-history] 已从 GitHub (origin) 拉取最新 commit 历史');
} catch (e) {
  console.warn('[generate-history] git fetch 失败，使用本地历史：', String(e.message || e).split('\n')[0]);
}

// 2) 解析远程仓库名（用于生成 GitHub commit 链接）
let repo = 'ImUpXuu/xuhome';
try {
  const url = run('git config --get remote.origin.url').trim();
  const m = url.match(/[:/]([^/]+)\/([^/]+?)(\.git)?$/);
  if (m) repo = `${m[1]}/${m[2]}`;
} catch {}

// 3) git log：%H(完整 sha) %aI(作者日期 ISO) %an(作者名) %s(标题)，并带 --name-only 变更文件
//    字段间用不可见分隔符 \x1f（0x1F），提交一行一个，后续行是变更文件路径。
let raw = '';
try {
  raw = run(`git log ${ref} --pretty=format:%H%x1f%aI%x1f%an%x1f%s --name-only`);
} catch (e) {
  console.warn('[generate-history] git log 失败：', String(e.message || e).split('\n')[0]);
}

const commits = [];
let cur = null;
for (const line of (raw || '').split(/\r?\n/)) {
  if (line.includes('\u001f')) {
    if (cur) commits.push(cur);
    const [sha, date, author, subject] = line.split('\u001f');
    cur = { sha: (sha || '').slice(0, 7), date: date || '', author: author || '', subject: subject || '', files: [] };
  } else if (cur) {
    const f = line.trim();
    if (f) cur.files.push(f);
  }
}
if (cur) commits.push(cur);

// 4) 文件 → 内容类型归类（用于占比饼图「文章 / 说说 / 友链 / 其他」）
function isFriendFile(p) {
  return /\/friends\.(astro|json|ts|svelte)$/i.test(p)
    || /sveltefriends/i.test(p)
    || /\/links\.astro$/i.test(p)
    || /友链/.test(p);
}
function categorize(p) {
  const low = p.toLowerCase();
  if (low.includes('src/content/posts/') || low.startsWith('content/posts/')) return 'post';
  if (low.includes('src/content/talks/') || low.startsWith('content/talks/')) return 'talk';
  if (isFriendFile(p)) return 'friend';
  return 'other';
}
for (const c of commits) {
  c.cats = [...new Set(c.files.map(categorize))];
}

// 4b) 文件级内容占比（饼图：文章/说说/友链/其他）
const pieCounts = { post: 0, talk: 0, friend: 0, other: 0 };
for (const c of commits) for (const f of c.files) pieCounts[categorize(f)]++;

// 4c) 每日提交数（热力图用）
const dailyCounts = {};
for (const c of commits) {
  const d = new Date(c.date);
  if (isNaN(d.getTime())) continue;
  const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  dailyCounts[k] = (dailyCounts[k] || 0) + 1;
}

// 4d) 各月提交数（柱状图）
const monthly = [];
{
  const byMonth = new Map();
  for (const c of commits) {
    const d = new Date(c.date);
    if (isNaN(d.getTime())) continue;
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth.set(k, (byMonth.get(k) || 0) + 1);
  }
  for (const [m, count] of [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    monthly.push({ m, count });
  }
}

// 5) 字数趋势：posts(字段 published) + talks(字段 date)，按月累计字符数
function extract(fm, key) {
  const m = fm.match(new RegExp(`^${key}\\s*:\\s*(.+)$`, 'm'));
  if (!m) return null;
  let v = m[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}
function entriesFromDir(dir, dateKey) {
  let names;
  try { names = readdirSync(dir); } catch { return []; }
  return names.filter((f) => f.endsWith('.md')).map((f) => {
    const text = readFileSync(join(dir, f), 'utf8').replace(/\r\n?/g, '\n');
    const parts = text.split('---\n');
    if (parts.length < 3) return null;
    const date = extract(parts[1], dateKey);
    if (!date) return null;
    const body = parts.slice(2).join('---\n');
    const d = new Date(date.replace(' ', 'T'));
    if (isNaN(d.getTime())) return null;
    return { date: d, chars: rm(body).length };
  }).filter(Boolean);
}

const contentItems = [
  ...entriesFromDir(join(root, 'src', 'content', 'posts'), 'published'),
  ...entriesFromDir(join(root, 'src', 'content', 'talks'), 'date'),
].sort((a, b) => a.date - b.date);

const wordTrend = [];
if (contentItems.length) {
  const ym = (d) => d.getFullYear() * 12 + d.getMonth();
  const byMonth = new Map();
  for (const it of contentItems) {
    const k = ym(it.date);
    byMonth.set(k, (byMonth.get(k) || 0) + it.chars);
  }
  const minYm = ym(contentItems[0].date);
  const now = new Date();
  const maxYm = Math.max(Math.max(...contentItems.map((c) => ym(c.date))), ym(now));
  let acc = 0;
  for (let k = minYm; k <= maxYm; k++) {
    acc += byMonth.get(k) || 0;
    const y = Math.floor(k / 12), m = k % 12;
    wordTrend.push({ m: `${y}-${String(m + 1).padStart(2, '0')}`, v: acc });
  }
}

// 6) 汇总元信息
const years = [...new Set(commits.map((c) => new Date(c.date).getFullYear()).filter((y) => !isNaN(y)))].sort();
const dated = commits.filter((c) => c.date);
const data = {
  meta: {
    generatedAt: new Date().toISOString(),
    repo,
    commitCount: commits.length,
    firstCommit: dated.length ? dated[dated.length - 1].date : null,
    lastCommit: dated.length ? dated[0].date : null,
    years,
  },
  commits,
  wordTrend,
  pieCounts,
  monthly,
  dailyCounts,
};

const outDir = join(root, 'src', 'data');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'history-data.json');

// 兜底：即便前面解析失败，也写出一个合法的空 JSON，防止 astro build 报 "Could not resolve ../data/history-data.json"。
const emptyData = {
  meta: { generatedAt: new Date().toISOString(), repo, commitCount: 0, firstCommit: null, lastCommit: null, years: [new Date().getFullYear()] },
  commits: [],
  wordTrend: [],
  pieCounts: { post: 0, talk: 0, friend: 0, other: 0 },
  monthly: [],
  dailyCounts: {},
};

try {
  writeFileSync(outPath, JSON.stringify(data && data.commits ? data : emptyData), 'utf8');
  console.log(`[generate-history] 已生成 src/data/history-data.json：${(data && data.commits ? data.commits.length : 0)} 次提交 (${(data && data.meta ? data.meta.years : []).join(', ')} 年)，字数趋势 ${(data && data.wordTrend ? data.wordTrend.length : 0)} 个月`);
} catch (e) {
  console.error('[generate-history] 写文件失败，尝试写入兜底空数据：', String(e.message || e).split('\n')[0]);
  try {
    writeFileSync(outPath, JSON.stringify(emptyData), 'utf8');
  } catch (e2) {
    console.error('[generate-history] 兜底写入也失败：', String(e2.message || e2).split('\n')[0]);
    process.exit(1);
  }
}