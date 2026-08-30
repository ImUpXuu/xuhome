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

/** 明细分页大小：单片约 25KB，够小到可以按需拉取 */
export const COMMITS_PER_SHARD = 50;

export function shardCount(): number {
  return Math.max(1, Math.ceil(commitIndex.commits.length / COMMITS_PER_SHARD));
}

export function shardSlice(page: number): CommitEntry[] {
  const start = (page - 1) * COMMITS_PER_SHARD;
  return commitIndex.commits.slice(start, start + COMMITS_PER_SHARD);
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
  };
}
