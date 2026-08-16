#!/usr/bin/env node
/**
 * EdgeOne Pages 专用构建入口（在 EdgeOne 控制台的"构建命令"里配置：node scripts/edgeone-build.js）
 *
 * 目的：同一个 GitHub 仓库，让 Vercel 和 EdgeOne 各取所需——
 *   - Vercel：npm run build（保留 middleware.js，跑爬虫分流 + 壳层版 dist）
 *   - EdgeOne：本脚本 ——
 *       1) 先删掉 Vercel 专属的 middleware.js（EdgeOne 若把它当边缘函数执行会报
 *          "Error return from script"）
 *       2) 跑标准构建（产出 dist 壳层版 + dist-cdn 完整版）
 *       3) 把 dist-cdn 复制为 dist，让 EdgeOne 部署的是「完整站」（含 CDN 绝对地址资源）
 */
import { rmSync, cpSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();

// 1) 排除 Vercel 专属中间件
const MW = 'middleware.js';
if (existsSync(MW)) {
  rmSync(MW);
  console.log('[edgeone-build] 已移除 Vercel 专属 middleware.js（避免被当边缘函数执行）');
}

// 2) 标准构建：node scripts/indexnow-key.js && astro build && node scripts/build-shell.js
console.log('[edgeone-build] 开始标准构建…');
const r = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (r.status !== 0) {
  console.error('[edgeone-build] 构建失败，退出码', r.status);
  process.exit(r.status ?? 1);
}

// 3) EdgeOne 部署完整站：dist-cdn → dist
const DIST = `${ROOT}/dist`;
const DIST_CDN = `${ROOT}/dist-cdn`;
if (existsSync(DIST_CDN)) {
  if (existsSync(DIST)) rmSync(DIST, { recursive: true });
  cpSync(DIST_CDN, DIST, { recursive: true });
  console.log('[edgeone-build] 已用 dist-cdn（完整站）覆盖 dist，EdgeOne 将部署完整内容');
} else {
  console.error('[edgeone-build] 未找到 dist-cdn，请检查 build-shell.js 是否正常执行');
  process.exit(1);
}

console.log('[edgeone-build] 完成');
