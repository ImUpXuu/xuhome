#!/usr/bin/env node
// EdgeOne Pages 专用：先删 Vercel 专属 middleware.js（防止被当边缘函数执行报错），再跑标准构建
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
