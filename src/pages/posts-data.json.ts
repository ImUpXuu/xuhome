import { getProcessedPosts } from '../utils/postsFetcher';

export async function GET() {
  const posts = await getProcessedPosts();
  const payload = posts.map(post => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    date: post.date,
    description: post.description,
    img: post.img,
    tags: post.tags,
    category: post.category,
  }));

  return new Response(JSON.stringify(payload), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
