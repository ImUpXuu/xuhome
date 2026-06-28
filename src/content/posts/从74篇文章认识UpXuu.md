---
title: 从 74 篇文章认识 UpXuu
published: 2026-05-24 22:00:00
slug: about-upxuu-from-74-posts
tags:
  - 随笔
categories:
  - myself
---

`posts/` 目录下 74 个 `.md` 文件，按时间跨度和内容密度，大致可以分为六条线。

## 一、技术线

技术文章占了最大篇幅，且并非入门教程级别。

`newblog.md` 记录了一次完整的 WordPress 被植入木马事件——从下载破解插件、被"养猪"一个月、到用 `grep -r "崔哥" /var/www/html/` 定位藏在 `/index.php` 里的恶意代码。事后弃用 WP，自建 Astro 静态博客。

`extalk.md` 是自研评论系统的完整技术文档：Cloudflare Workers + D1 数据库、hCaptcha 防护、JWT 认证、SQL 索引优化（查询从 5 次降到 3 次，延迟降低 73%）。`newcommentsystem.md` 则诚实记录了后来因没时间维护而换回 Waline 的过程，附带一份详细的 ExTalk → Waline 数据迁移方案。

`blog-admin.md` 展示了基于 Cloudflare Workers 的博客管理后台，支持 Vditor 编辑器、图床上传、友链管理、IndexNow 自动提交。`friend-link-system.md` 用 GitHub Issues + Playwright + Actions 搭建了完全自动化的友链审核流程。

`cfworkers-ip.md` 是一篇完整的 `request.cf` 对象技术参考手册，`deepseek-price-drop.md` 对比了 GPT-5.5、Claude Opus 4、Gemini 2.5 Pro 与 DeepSeek V4 的 API 定价，`nvidia-build.md` 介绍了 NVIDIA Build 平台免费调用的 DeepSeek V4 Pro 等模型。

`yuanbaoopenclaw.md` 记录了把腾讯元宝的 OpenClaw Bot 变成免费服务器的详细步骤——ZeroTier 打洞、1Panel 面板安装、内网穿透。文末标注"已无法新建实例"，说明时效性。

`关于最近发生的一些事.md` 是一篇技术复盘：Cloudflare WAF 配置失误导致评论 IP 误判、分流系统架构细节（国内 5 个节点 + 海外节点）、以及最终定位到 CDN 节点缓存 IP 的问题。

## 二、人文线

`81192-25years.md` 是技术文章之外最完整的一篇。224 行，包含王伟生平、撞机细节、十万军民搜救、美方傲慢、国防建设进展。有史料引用，有情感控制。

`AI时代的"眼见不为实".md` 是一篇关于 Deepfake 的小论文，结构清晰：GANs 原理 → 香港 2 亿港元诈骗案 → Taylor Swift 伪造照片 → 防范指南（PPG 心跳检测法、家庭暗号）。附 13 条参考文献。

`关于哗众取丑行为几点看法.md` 是一篇观点文，讨论"自尊、自爱、自强"的递进关系。

`雪泥鸿爪的公众号9.24.md` 是唯一一篇纯转载，内容是两篇《丑小鸭》读后感。

## 三、生活线

`我的2025.md` 是年度总结，机器人竞赛全省第三、坐高铁第一次独自出市、被裁判用湿抹布擦地图气到想直接买票回家。

`51traveling.md` 是赵州桥游记，顺路去了柏林禅寺。`to-zhengding.md` 是正定文庙和天宁寺。`回老家力.md` 是一路高铁回陕西。`to-liaozhong.md` 是乡下过年。`重走来时路.md` 是毕业后走过小学的桥。

`primary-life.md` 整理了小学 6 年照片。`突然感觉好孤独.md` 只有一句话。`我也想和你们一聚.md` 遗憾小学毕业时没加上联系方式。`somephoto.md` 正文为空，标题本身即内容。`exam-week-heartbeat.md` 配了一张华为运动健康的心率截图。

`deepseek-price-drop.md` 和 `nvidia-build.md` 虽然是技术主题，但结尾的"冲了 5r 试试""写这篇文章用的就是 DeepSeek V4 Flash"让它们同时属于生活记录。

## 四、工具与折腾线

`cdw.md` 是一个 Python 倒计时壁纸生成器，带 PyQt5 管理界面，可以设为开机自启。

`崔哥的10w+点赞.md` 是一个压测工具的文档：TCP Keep-Alive 隧道复用、加权 URL 偏移算法、呼吸式退避算法。文档比工具本身更详细。

`backtowin10.md` 记录了 Win11 降级到 Win10。`5a-net-test.md` 测了华为 5A 网络的 4G 表现（市区 160mbps）。`aeasyhomework.md` 用 Gamma AI 5 分钟生成了一个海报。

`blog-subscribe.md` 和 `subme.md` 介绍了基于 GitHub Issues 的更新订阅方案。`indexnow-auto-index.md` 是 Bing 自动索引的 GitHub Actions 配置。`free-ip-api.md` 推荐了免费 IP 查询 API。`freemusic.md` 推荐了开源音乐软件 EchoMusic。`nbip.md` 推荐了 Cloudflare 优选域名。`xyzdomain.md` 教注册不到 5 元的纯数字 xyz 域名。

## 五、情绪线

`心已经被伤的透透的了.md` 是一篇情绪爆发。准备了一个月的项目被破坏，源视频被删除，域名停止解析，代码仓设定时删除。全文没有技术分析，没有复盘，只有愤怒。

`关于最近发生的一些事.md` 则是同一事件后的冷静复盘。`have-to-leave.md` 告知将降低更新频率。`zk100days.md` 和 `zk66d.md` 是倒计时。`dsym.md` 展示了刷过的教辅清单。

`数学，让我赢！.md` 写在期末前。`轻舟已过万重山~.md` 写在出分后。`failure-on-Excel.md` 是因粗心丢分的复盘。`my-zhongkao-first-stop.md` 记录了第一次真正意义上的考试。

## 六、持续线

`我的新班主任：崔.md` → `崔哥二三事.md` → `letter-to-c.md` 是一条贯穿叙事。从最初以为他是体育老师，到总结"崔氏文学"，到用英文写信说"you are my best teacher and friend"。`崔哥的10w+点赞.md` 出现在中间，提供了一个技术性的侧面。

`未完待续的诗，初中这二分之一.md` 是一次集体项目的汇总，包含 B 站视频、心愿墙、时间轴统计站。`2025.9.27-国庆文艺汇演.md` 是文艺汇演的截图记录。`blogupdate322.md` 里提到了手搓的评论系统 Extalk、Banner 打字机动画、移除了 51la 统计。

---

*本文由 DeepSeek V4 Pro 通读 74 篇文章后生成的分析。*

74 篇文章拼出的形象是：一个拥有独立域名、自建博客、手写评论系统、懂 CDN 分流和 WAF 配置、拿过省级机器人竞赛名次、也会在深夜写"突然感觉好孤独"的人。技术能力与情感表达之间没有断层——用 Python 写压测工具、用 Cloudflare Workers 搭后台，同时也用博客消化那些不想对别人说的话。

"轻舟已过万重山"是一篇文章的标题。但船上装的不是轻，是 Workers、D1、GitHub Actions、崔哥的梗、老家的朱鹮、和那些深夜写下的孤独。
