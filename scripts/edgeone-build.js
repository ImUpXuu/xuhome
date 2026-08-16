#!/usr/bin/env node
/**
 * EdgeOne Pages 专用构建入口（EdgeOne 控制台"编译命令"配置：node scripts/edgeone-build.js）
 *
 * 架构：HTML 由 Vercel 直接提供；_astro 静态资源由 EdgeOne（upxuu.lcrworld.xyz）提供。
 * 本脚本唯一要做的就是：先删掉 Vercel 专属的 middleware.js ——
 * EdgeOne 若把它当边缘函数执行会报 "Error return from script"（Vercel 私有协议，EdgeOne 跑不了）。
 * 之后再跑标准构建，EdgeOne 部署 dist（含 _astro 资源）。
 */
import { rmSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';

if (existsSync('middleware.js')) {
  rmSync('middleware.js');
  console.log('[edgeone-build] 已移除 Vercel 专属 middleware.js');
}

const r = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(r.status ?? 1);
