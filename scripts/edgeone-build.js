#!/usr/bin/env node

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
