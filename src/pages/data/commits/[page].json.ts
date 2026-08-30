import type { APIRoute } from 'astro';
import { shardCount, shardSlice } from '../../../utils/commitStats';

/**
 * 提交明细分片：/data/commits/1.json … N.json
 * 首屏只内联聚合摘要，明细由前端翻页时按需拉取。
 */
export function getStaticPaths() {
  return Array.from({ length: shardCount() }, (_, i) => ({
    params: { page: String(i + 1) },
  }));
}

export const GET: APIRoute = ({ params }) => {
  const page = Number(params.page) || 1;
  const commits = shardSlice(page);

  return new Response(JSON.stringify({ page, total: shardCount(), commits }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=600, s-maxage=86400',
    },
  });
};
