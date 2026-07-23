import { writeFileSync, mkdirSync } from 'fs';

const key = process.env.INDEXNOW_SECRET || process.env.INDEXNOW_KEY;

if (!key) {
  console.log('[IndexNow] INDEXNOW_SECRET not set — skip key file');
  process.exit(0);
}

const clean = key.trim();
if (!clean) {
  console.log('[IndexNow] INDEXNOW_SECRET empty — skip key file');
  process.exit(0);
}

mkdirSync('public', { recursive: true });
writeFileSync(`public/${clean}.txt`, clean, 'utf-8');
console.log(`[IndexNow] Wrote public/${clean}.txt`);
