// ===== 部署配置（部署前请确认！） =====
// 国内 CDN 域名：壳层从这里拉取完整 HTML，打包的 _astro 静态资源也由它提供。
// 要求：
//   1. 该域名已 ICP 备案（或已备案域名的子域）
//   2. 该域名上已按 dist-cdn/ 的内容部署（完整 HTML + _astro + public）
//   3. 该域名的 HTML 响应带 CORS 头：Access-Control-Allow-Origin: *
// 可通过环境变量 CDN_DOMAIN 覆盖，例如：CDN_DOMAIN=cdn.example.com npm run build
export const CDN_DOMAIN = (process.env.CDN_DOMAIN || '').trim() || 'upxuu.lcrworld.xyz';
