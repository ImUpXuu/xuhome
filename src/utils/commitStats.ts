import indexRaw from '../data/commit-index.json';

export interface CommitFileTuple extends Array<string | number> {}

export interface CommitEntry {
  sha: string;
  ts: number;
  author: string;
  subject: string;
  kind: CommitKind;
  kinds: CommitKind[];
  added: number;
  removed: number;
  contentAdded: number;
  contentRemoved: number;
  fileCount: number;
  /** [path, added, removed] —— 元组形式压缩体积 */
  files: [string, number, number][];
}

export type CommitKind = 'post' | 'talk' | 'friend' | 'other';

export interface DailyEntry {
  date: string;
  commits: number;
  added: number;
  removed: number;
  contentAdded: number;
  contentRemoved: number;
  kinds: Record<CommitKind, number>;
}

export interface ContentFileEntry {
  path: string;
  kind: 'post' | 'talk';
  words: number;
  createdTs: number;
  updatedTs: number;
}

export interface CommitIndex {
  schema: number;
  repo: string;
  generatedAt: string;
  source: string;
  totals: {
    commits: number;
    added: number;
    removed: number;
    firstTs: number;
    lastTs: number;
    words: number;
  };
  daily: DailyEntry[];
  contentFiles: ContentFileEntry[];
  commits: CommitEntry[];
}

export const commitIndex = indexRaw as unknown as CommitIndex;

/**
 * 明细分页大小。行默认折叠，一页 100 条的视觉高度比以前 50 条展开时还短，
 * 单片约 68KB（gzip 后更小），仍远小于整份索引。
 */
export const COMMITS_PER_SHARD = 100;

export function shardCount(): number {
  return Math.max(1, Math.ceil(commitIndex.commits.length / COMMITS_PER_SHARD));
}

export function shardSlice(page: number): CommitEntry[] {
  const start = (page - 1) * COMMITS_PER_SHARD;
  return commitIndex.commits.slice(start, start + COMMITS_PER_SHARD);
}

/** 某天的提交落在第几片（热力图点格子跳转用） */
export function dayShardMap(): Record<string, number> {
  const map: Record<string, number> = {};
  commitIndex.commits.forEach((c, i) => {
    const d = new Date(c.ts);
    const p = (v: number) => String(v).padStart(2, '0');
    const key = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    // 同一天可能跨片，记最早出现的那片
    const page = Math.floor(i / COMMITS_PER_SHARD) + 1;
    if (map[key] === undefined || page < map[key]) map[key] = page;
  });
  return map;
}

/**
 * 页面首屏内联用的摘要：不含逐提交明细，只有热力图/趋势/占比所需的聚合值。
 * 明细走 /data/commits/N.json 按需拉取，避免把 350KB 索引塞进 HTML。
 */
export function buildSummary() {
  const { totals, daily, contentFiles, repo, generatedAt } = commitIndex;

  // 字数增长曲线：按内容文件的首次提交时间累加当前字数
  const wordPoints = contentFiles
    .filter((f) => f.createdTs > 0)
    .map((f) => ({ ts: f.createdTs, words: f.words, kind: f.kind }))
    .sort((a, b) => a.ts - b.ts);

  const authors = new Map<string, number>();
  for (const c of commitIndex.commits) {
    authors.set(c.author, (authors.get(c.author) || 0) + 1);
  }

  return {
    repo,
    generatedAt,
    totals: {
      ...totals,
      posts: contentFiles.filter((f) => f.kind === 'post').length,
      talks: contentFiles.filter((f) => f.kind === 'talk').length,
      activeDays: daily.length,
    },
    daily,
    wordPoints,
    authors: [...authors.entries()]
      .map(([name, commits]) => ({ name, commits }))
      .sort((a, b) => b.commits - a.commits),
    shards: shardCount(),
    perShard: COMMITS_PER_SHARD,
    // 热力图点格子直接跳到那天所在的明细页
    dayShards: dayShardMap(),
  };
}
