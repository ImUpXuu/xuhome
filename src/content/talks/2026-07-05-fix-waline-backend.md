---
title: "fix-waline-backend"
date: "2026-07-05 21:24:13"
---

最近考完试修了一下评论，那你可能会问了 UPXUU你这用的waline都是serverless，怎么炸的呢。
那么那么是这样的，还记得我前几个月发了一个文章吗 https://upxuu.com/posts/yuanbaoopenclaw 一个把元宝bot搞成服务器的。本身这个东西很稳，但是那，我们的腾讯突然收回了没有在元宝bot内活动的bot主机，而且，在我复习周发的消息！！！ 
本身也没啥重要服务，结果我后来一看 好家伙评论系统炸了 结果发现之前引入的是部署在bot上的后端（还有一个cf的和vercel）
好吧数据已经丢了，懒得恢复了就直接换上vercel得了，至少现在能用对