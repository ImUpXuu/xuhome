import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'src', 'talk');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

for (let i = 1; i <= 12; i++) {
  const images = i % 3 === 0 ? `\n![img](https://picsum.photos/seed/${i}1/400/400) ![img](https://picsum.photos/seed/${i}2/400/400) ![img](https://picsum.photos/seed/${i}3/400/400)` : (i % 2 === 0 ? `\n![img](https://picsum.photos/seed/${i}1/400/400)` : ``);
  
  const content = `---
date: "2026-05-${String(31 - i).padStart(2, '0')} 14:00"
title: "日常随记 ${i}"
---

这是第 ${i} 条说说。**Markdown** 语法测试。
在这里记录生活的美好与技术的探索。

今日总结：
- 喝了一杯拿铁 ☕
- 调优了积木风样式
- 看了会儿书

${images}
`;
  fs.writeFileSync(path.join(dir, `post-${i}.md`), content);
}
console.log("Mock MD generated");
