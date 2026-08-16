#!/usr/bin/env node
/**
 * 壳层构建脚本（在 `astro build` 之后运行）
 *
 * 产出两份产物：
 *
 *  - dist-cdn/  ：完整站。所有 HTML 里的 /_astro/ 资源引用改写为 https://<CDN域名>/_astro/，
 *                 上传国内 CDN 用。
 *
 *  - dist/      ：Vercel 部署包（与现状同一目录，Vercel Git 集成自动部署它）：
 *      · 首页 / posts / talks / talk 路由 → 替换为「壳层」
 *        （极小 HTML：完整 meta + 内联 bootstrap 脚本，JS 从 CDN 拉完整 HTML 注入）
 *      · 上述路由的完整 HTML 另存到 /.full/ 路径，作 CDN 拉取失败时的同源回退
 *      · /bot/*（SEO 页）、/about 等其余页面保持完整 HTML 不动
 *
 * SEO 不受影响：middleware.js 会把爬虫 UA 从 /、/posts/*、/talks/*、/talk/*
 * 重写到 /bot/*（Vercel 上的完整 HTML）。
 */
import { cpSync, readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, statSync } from 'fs';
import { join, relative, dirname, sep } from 'path';
import { CDN_DOMAIN } from './site-config.js';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const DIST_CDN = join(ROOT, 'dist-cdn');
const FULL_BASE = '.full';

const CDN_BASE = `https://${CDN_DOMAIN}`;

// 壳化路由范围：与 middleware.js 的 matcher 一致（/、/posts/*、/talks/*、/talk/*）
function isShelled(route) {
  return (
    route === '/' ||
    route === '/posts' || route.startsWith('/posts/') ||
    route === '/talks' || route.startsWith('/talks/') ||
    route === '/talk' || route.startsWith('/talk/')
  );
}

function routeOfHtml(absPath) {
  let rel = relative(DIST, absPath).split(sep).join('/');
  let route = '/' + rel;
  if (route.endsWith('/index.html')) {
    route = route.slice(0, -'/index.html'.length) || '/';
  } else if (route.endsWith('.html')) {
    route = route.slice(0, -'.html'.length);
  }
  if (route.length > 1 && route.endsWith('/')) route = route.slice(0, -1);
  return route;
}

function walkHtml(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkHtml(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

// 从完整 HTML 的 <head> 提取 SEO 信息，供壳层复用（title/meta/canonical/JSON-LD）
function extractHeadSeo(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const metas = (html.match(/<meta[^>]*>/gi) || [])
    .filter(m => !/\bcharset\b/i.test(m) && !/\bviewport\b/i.test(m))
    .join('\n    ');
  const canonical = (html.match(/<link[^>]*rel="canonical"[^>]*>/i) || [])[0] || '';
  const ldJson = (html.match(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi) || []).join('\n    ');
  return { title, metas, canonical, ldJson };
}

function buildShell(fullHtml) {
  const { title, metas, canonical, ldJson } = extractHeadSeo(fullHtml);
  const bootstrap = `
(function () {
  var CDN = ${JSON.stringify(CDN_BASE)};
  var path = location.pathname;
  var attempts = 0;
  function get(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    });
  }
  function inject(html) { document.open(); document.write(html); document.close(); }
  function showFail() {
    var el = document.getElementById('app');
    if (el) el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:96px 16px;color:#888;font-family:system-ui,-apple-system,sans-serif;text-align:center"><div>页面加载失败，请检查网络后重试</div><button onclick="location.reload()" style="padding:8px 20px;border-radius:8px;border:1px solid #ccc;background:#fff;cursor:pointer">重试</button></div>';
  }
  function load() {
    attempts++;
    get(CDN + path).then(inject)['catch'](function () {
      if (attempts < 2) { setTimeout(load, 300); return; }
      return get('/.full' + path).then(inject);
    })['catch'](showFail);
  }
  load();
})();`;

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title || 'upxuu.com'}</title>
    ${metas}
    ${canonical}
    ${ldJson}
    <link rel="preconnect" href="${CDN_BASE}" crossorigin />
    <script>${bootstrap}
    </script>
  </head>
  <body>
    <div id="app" style="min-height:100vh;display:flex;align-items:center;justify-content:center;color:#999;font-family:system-ui,-apple-system,sans-serif">加载中…</div>
  </body>
</html>
`;
}

function main() {
  if (!existsSync(DIST)) {
    console.error('[build-shell] 未找到 dist/，请先运行 astro build');
    process.exit(1);
  }

  console.log(`[build-shell] CDN 域名：${CDN_DOMAIN}（可在 scripts/site-config.js 修改或 CDN_DOMAIN 环境变量覆盖）`);

  // 1) 完整站 → dist-cdn，_astro 资源引用改写为 CDN 绝对地址
  if (existsSync(DIST_CDN)) rmSync(DIST_CDN, { recursive: true });
  cpSync(DIST, DIST_CDN, { recursive: true });
  let rewritten = 0;
  for (const f of walkHtml(DIST_CDN)) {
    let html = readFileSync(f, 'utf-8');
    if (html.includes('"/_astro/') || html.includes("'/_astro/")) {
      html = html.split('"/_astro/').join(`"${CDN_BASE}/_astro/`)
                 .split("'/_astro/").join(`'${CDN_BASE}/_astro/`);
      writeFileSync(f, html);
      rewritten++;
    }
  }
  console.log(`[build-shell] dist-cdn 就绪（${rewritten} 个 HTML 的 _astro 资源已指向 ${CDN_BASE}）`);

  // 2) dist（Vercel 包）：生成壳层 + .full 回退
  let shells = 0;
  for (const f of walkHtml(DIST)) {
    const route = routeOfHtml(f);
    if (!isShelled(route)) continue;

    const fullHtml = readFileSync(f, 'utf-8');

    // 完整 HTML 另存到 /.full（保留同源 /_astro/ 引用，CDN 挂掉时回退仍可用）
    const fullDest = join(DIST, FULL_BASE, route.replace(/^\//, ''), 'index.html');
    mkdirSync(dirname(fullDest), { recursive: true });
    writeFileSync(fullDest, fullHtml);

    // 覆盖原路由为壳层
    writeFileSync(f, buildShell(fullHtml));
    shells++;
  }
  console.log(`[build-shell] 壳层生成完成：${shells} 个路由 → 壳层，完整版已存到 ${FULL_BASE}/`);
}

main();
