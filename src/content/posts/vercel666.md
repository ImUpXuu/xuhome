---
title: "你的vercel项目，还能更快"
published: 2026-08-12 18:02:22
description: "通过更改vercel项目地区加快vercel项目的速度"
tags: []
category: "技术"
---

今天在blogsclub群里划水的时候偶然间发现suo.ma大佬正在问vercel该地区的影响

我一想不对啊，vercel不是有cdn吗怎么还有地区之分，结果仔细一寻找还真有，默认还在美国！

![image-20260812180535876](https://img.upxuu.lcrworld.xyz/images/2026/8/12/1786529137496_840.png)

进入到已经部署的项目中，点击settings ➡️Functions➡️Functions Region 这里还有一个坑 你需要先切换到North America取消勾选USA 否则会选中两个地区导致在hobby计划下无法使用

还是挺逆天的vercel竟然藏这么深 实际上也是有一点速度的提升 我的vercel项目也不太多 主要是[所有相册 - upxuu的相册](https://life.upxuu.com/)
