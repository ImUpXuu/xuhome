import type { APIRoute } from 'astro';
import { historyShard, historyShardCount } from '../../../utils/commitStats';

/**
 * 文章历史分片：/data/history/1.json … N.json
 * 每片装 10 篇文章的提交历史，文章页点开「文章历史」时才拉取。
 */
export function getStaticPaths() {
  return Array.from({ length: historyShardCount() }, (_, i) => ({
    params: { page: String(i + 1) },
  }));
}

export const GET: APIRoute = ({ params }) => {
  const page = Number(params.page) || 1;

  return new Response(
    JSON.stringify({ page, total: historyShardCount(), files: historyShard(page) }),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=600, s-maxage=86400',
      },
    },
  );
};
