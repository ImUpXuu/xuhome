import { next, rewrite } from '@vercel/functions/middleware';

// 爬虫/AI/搜索引擎 User-Agent 正则（单行，避免JS跨行正则报错）
const CRAWLER_RE = /(bot|spider|crawl|slurp|mediapartners|google|bing|baidu|yandex|duckduckgo|sogou|so\.com|360spider|360seccrawler|gpt|claude|perplexity|anthropic|cohere|openai|llama|mistral|gemini|facebook|twitter|linkedin|telegram|whatsapp|discord|slack|semrush|ahrefs|majestic|serpstat|petal|yisou|soso|easou|iask|ia_archiver|wayback|archive\.org|seokicks|rogerbot|dotbot|mj12bot|screaming frog|bingpreview|googleinspectiontool|googleother|applebot|twitterbot|linkedinbot|slackbot|telegrambot|whatsappbot|discordbot|skypeuripreview|ccbot|dataforseobot|brightbot|neevabot|siteauditbot|linkdexbot|exabot|blexbot|yandeximages|yandexvideo|yandexbot|baiduspider|baiduimage|sogou|soso|youdao|haosou|duckduckbot|duckduckgobot|yahoo|teoma|altavista|lycos|facebookexternalhit|facebot|quora|reddit|pinterest|tumblr|curl|wget|python|java|httpclient|headless|phantomjs|selenium|puppeteer|playwright)/i;

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
