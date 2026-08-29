import { next, rewrite } from '@vercel/functions/middleware';

// 爬虫 User-Agent 正则（与 Caddy 规则保持一致）
const CRAWLER_RE = /(bot|crawl|spider|gpt|claude|perplexity|anthropic|cohere)/i;

export const config = {
  matcher: ['/', '/posts/:path*', '/talks/:path*', '/talk', '/talk/:path*'],
};

function stripTrailingSlash(path) {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!CRAWLER_RE.test(ua)) {
    return next();
  }

  const path = stripTrailingSlash(new URL(request.url).pathname);

  let dest = null;
  if (path === '' || path === '/') {
    dest = '/bot/';
  } else if (path === '/posts') {
    dest = '/bot/posts/';
  } else if (path.startsWith('/posts/')) {
    dest = '/bot/' + path.slice('/posts/'.length) + '/';
  } else if (path === '/talks') {
    dest = '/bot/talks/';
  } else if (path === '/talk') {
    dest = '/bot/talks/';
  } else if (path.startsWith('/talk/')) {
    dest = '/bot/talk/' + path.slice('/talk/'.length) + '/';
  }

  if (dest) {
    return rewrite(new URL(dest, request.url).toString());
  }
  return next();
}
