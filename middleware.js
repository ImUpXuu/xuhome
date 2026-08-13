import { next, rewrite } from '@vercel/edge';

// 爬虫 User-Agent 正则（与原 Caddy 规则一致）
const CRAWLER_RE = /googlebot|bingbot|baiduspider|sogou|360spider|yandex|duckduckbot/i;

export const config = {
  matcher: ['/', '/posts/:path*', '/talks/:path*', '/talk/:path*'],
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
  } else if (path.startsWith('/talk/')) {
    dest = '/bot/talk/' + path.slice('/talk/'.length) + '/';
  }

  if (dest) {
    return rewrite(new URL(dest, request.url).toString());
  }
  return next();
}
