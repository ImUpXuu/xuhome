---
title: "基于 GitHub Issues 的博客更新订阅方案"
published: 2026-05-10 00:00:00
image: "https://Img.upxuu.com/img/2026/5/10/1778388844407_935.png"
description: "告别 RSS 被拦截和邮件滥用，用 GitHub Issues 实现零配置的博客更新通知"
category: "技术"
---

如果你有一个博客，可能会面临一个经典问题：**怎么让读者知道自己更新了？**

RSS？邮件推送？第三方通知服务？这些方案各有问题。今天分享一个我用 GitHub Issues 实现的零成本、零配置的订阅方案。

::github{repo="imupxuu/myblog"}

## 传统订阅方式的痛点

### 1. RSS 被邮箱当成垃圾邮件

很多 RSS 转邮件服务（Feedly、Inoreader 等）发出的通知邮件经常被 Gmail、QQ 邮箱直接扔进垃圾箱。读者根本看不到更新通知。

### 2. 容易被滥用

开放式的邮件订阅系统如果没有做好频率控制，很容易被恶意订阅或者爬虫刷爆。加上退订链接被滥用，最后可能整域被标记为垃圾邮件发送者。

### 3. 配置复杂

自建 RSS 转邮件需要部署服务、配置 SMTP、处理退订逻辑……对个人博客来说太重了。第三方服务又往往收费或者有使用限制。

## 我的方案：GitHub Issues 通知

核心思路很简单：

**利用 GitHub Issues 的原生订阅机制，每次博客更新时自动在固定 Issue 下发布评论，订阅了该 Issue 的人就会收到 GitHub 的邮件通知。**

不需要任何第三方服务，零成本，零配置，不会被当成垃圾邮件。

## 使用方法

### 对于读者

1. 在博客页脚或欢迎弹窗点击 **"更新订阅"** 链接，跳转到 GitHub Issue
2. 在 Issue 页面右上角点击 **Subscribe**（或评论任意内容自动订阅）

![subscribe](https://Img.upxuu.com/img/2026/5/10/20260510092802_496.png)

就这么简单，不需要注册任何额外账号，有 GitHub 账号就行。

### 对于博主

你什么都不用做。正常写文章、推送到 GitHub，剩下的全部自动化。

## 实现方法

整个方案只依赖一个 GitHub Actions 工作流，核心逻辑如下：

1. 当 `main` 分支有 `push` 且变更了 `src/content/posts/**/*.md` 文件时触发
2. 获取变更的文件列表
3. 用 Node.js 解析 Markdown 的 frontmatter，提取 **标题**、**描述**、**发布时间**
4. 自动生成通知内容，以评论形式发布到固定的 Issue

{% github "ImUpXuu/myblog" %}

工作流文件：[notify-update.yml](https://github.com/ImUpXuu/myblog/blob/main/.github/workflows/notify-update.yml)

## 效果展示

每次推送新文章后，Issue 下会自动出现类似这样的评论：

## 宝子订阅的UpXuu的博客更新啦~

https://upxuu.com/posts/blog-subscribe/

### 基于 GitHub Issues 的博客更新订阅方案

> 告别 RSS 被拦截和邮件滥用，用 GitHub Issues 实现零配置的博客更新通知

📅 2026-05-10

感谢您对upxuu的支持 祝好~

**更新时间：** 2026-05-10 12:00:00 UTC
**Commit：** `abc1234` - feat: 新增博客更新订阅方案介绍文章

---

*此通知由 GitHub Actions 自动发布*

读者收到邮件后，邮件标题会是：**宝子订阅的UpXuu'blog 更新了文章《文章名称》**

点击文章链接直接跳转阅读。

## 总结

这个方案的优点：

- **零成本**：完全免费，用 GitHub 自带功能
- **不会被当垃圾邮件**：GitHub 的邮件可信度远高于第三方 RSS 转邮件服务
- **零配置**：博主不用管，读者评论一下就行
- **可追溯**：所有更新历史都在 Issue 的评论里，一目了然

如果你也有一个托管在 GitHub 上的博客，不妨试试这个方案。
