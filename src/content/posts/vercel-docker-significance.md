---
title: "Vercel 跑 Docker 意味着什么？全栈平台的最后一块拼图，拼上了 | Vercel Docker | Vercel Sandbox | 云原生 | Serverless"
published: 2026-06-06 15:00:00
category: "技术"
tags: ["Vercel", "Docker", "云原生"]
description: "Vercel Sandbox 支持 Docker 不仅是功能更新，更是云计算范式转移的信号。深度分析为什么这件事意味着 Serverless 的终点和全栈平台的起点，以及它对开发者的真正价值。"
image: "https://img.476543.xyz/img/2026/6/6/1780716909043_939.png"
---

**本文由AI辅助生成**
**----**

五月底 Vercel 发了一篇 changelog，说 Sandbox 现在能跑 Docker 了

看起来就是一个功能更新对吧？装个 Docker、跑个容器、完事。

但看完之后我的第一反应不是好用，是——**Vercel 要变天了。**

这玩意儿不是个普通功能。这是个信号。

** 先搞清楚一件事：Vercel 之前不跑 Docker 才是正常的**

你可能会觉得——"AWS 多少年前就能跑容器了，Vercel 这才跟上算什么大事？"

**AWS 跑容器 = ECS/EKS/Fargate，用的是普通 VM 或裸机。**

**Vercel 跑容器 = Firecracker 微 VM，每个 Sandbox 都有自己的独立内核。**

 对比项  AWS ECS  一般 VPS  Vercel Sandbox 跑 Docker 

 底层  共享内核的容器  完整 VM  Firecracker 微 VM 
 隔离性  容器级（cgroup/namespace） VM 级 **VM 级（独立内核）** 
 启动时间  秒级  分钟级 **秒级** 
 Docker 兼容  原生支持  原生支持 **刚实现** 
 安全隔离  弱（共享内核） 强 **极强** 

Vercel 的底层是 Firecracker——每个 Sandbox 就是一个独立的微型虚拟机，有自己的内核、文件系统、网络栈。跑 `sudo rm -rf /` 也不影响隔壁。

代价就是 Docker 跑不了。Docker 需要共享内核跑特权进程，Firecracker 的设计哲学是"最小给权"，默认不给你这些。

所以之前的 Sandbox 有个大缺口：**你不能跑容器。**

想做集成测试？Redis 去外面开一个。想验证镜像？本地 build → push registry → 再部署。流程断了一截。

现在补上了。**但补上的不止是一个功能缺口。**

** 从"不能跑 Docker"到"原生跑 Docker"：Vercel 的底层功夫**

要让 Firecracker 微 VM 跑 Docker，三个核心工程难题要解决：

**1. 特权进程支持** — Docker 需要 privileged mode 才能挂载文件系统、管理网络、创建 cgroups。Firecracker 之前完全禁止。Vercel 在 Sandbox 层面打通了权限通道，且不波及生产环境。

**2. 存储驱动兼容** — Docker 的 overlayfs 需要内核支持合并层。Firecracker 的块设备模型跟这玩意儿不兼容。Vercel 连带上了 FUSE 支持——不只是 Docker，以后任何自定义文件系统都能挂。

**3. 网络桥接** — Docker 容器需要 bridge 网络做端口映射。在微 VM 的网络命名空间里实现这个，需要对虚拟网卡和 iptables 做精细编排。

Vercel 选择全部打通。**这不是顺手做的，是战略投入。**

** 怎么用：30 行代码跑起一个 Redis**

第一步，装 Docker：

第二步，启动 Docker daemon：

第三步，想跑啥跑啥：

30 行代码，一个完整的 Redis 测试环境。

** PostgreSQL 也一样简单**

然后你的测试代码直接连 `localhost:5432`。

** 配合持久化，体验翻倍**

Docker 装一次就缓存住，镜像 pull 一次下次秒级恢复。**你在 Vercel 上有了一个"永久性的云开发环境"。**

** 对比一下，差距有多大**

** 场景 1：跑一个 Redis 做集成测试**

 步骤  以前  现在 

 1  打开 GitHub Actions 写 workflow `Sandbox.create()` 
 2  配 service container `docker run redis:alpine` 
 3  等 CI 排队  秒级启动 
 4  跑完测试  跑完测试 
 5  提交代码 — 

以前需要一个完整的 CI 流程，现在本地 30 行脚本搞定。

** 场景 2：验证一个 Docker 镜像**

 步骤  以前  现在 

 1 `docker build` `docker build` 
 2  push 到 Docker Hub / ECR **直接 `docker run`** 
 3  部署到测试环境验证  就在 Sandbox 里验证 
 4  发现问题，回到步骤 1  发现问题，回到步骤 1 

省掉的是"推到 Registry 再部署"这个中间环节。

** 场景 3：跟 AWS Lambda 容器支持对比**

 维度  AWS Lambda 容器  Vercel Sandbox 

 写 Dockerfile ✅ ✅ 
 build 镜像 ✅ ✅ 
 push 到镜像仓库 ✅（必须 push 到 ECR） **不需要** 
 创建函数 ✅（选"容器镜像"，配 IAM/VPC/超时……） **不需要** 
 部署 ✅（等几秒到几十秒冷启动） **秒级** 
 发现不对  回到步骤 1  回到步骤 1 

**AWS 多出来的那些步骤里，没有一个是在帮你干活，全是在给你添门槛。**

** 横向对比：Vercel Sandbox vs 主流云方案**

 维度  AWS ECS  Google Cloud Run  Railway  Vercel Sandbox 

 启动速度  几十秒  秒级  秒级 **1-2 秒** 
 学习曲线  陡峭  中等  低 **极低** 
 隔离级别  容器级  容器级  容器级 **微 VM 级** 
 是否需要 Docker  是，还要 ECR  是，还要 Artifact Registry  是 **是，直接 Docker** 
 临时使用  不适合  一般  适合 **天生适合** 
 价格模型  按资源保有  按请求+时长  按容器规格 **按使用量** 
 API 复杂度  几十个 API  十几个 API  简单 **3 个方法** 

结论很明确：**论 Developer Experience，Vercel 已经超过所有对手。**

** 这波还藏了两个大招：FUSE + VPN**

很多人只盯着 Docker，没注意一起发布的还有两个能力：

**FUSE 文件系统驱动** — 可以在 Sandbox 里挂载任意文件系统。S3 挂成本地目录？可以。加密文件系统挂载？可以。

**VPN 客户端支持** — Sandbox 可以接入你的私有网络。数据库在内网？Sandbox 直接连。公司服务只有 VPN 能访问？Sandbox 挂了 VPN 也能。

 能力  之前的 Sandbox  现在的 Sandbox 

 Docker 容器 ❌ ✅ 
 FUSE 文件系统 ❌ ✅ 
 VPN 接入 ❌ ✅ 
 持久化状态 ✅ ✅ 

Docker + FUSE + VPN 加在一起，Vercel Sandbox 的定位已经非常清楚：**"你需要一个干净 Linux 环境？来找我。"**

** 三个层面的影响**

** 对普通开发者**

以前你在 Vercel 做个全栈项目，数据库测试环境得去外面找。PlanetScale、Supabase、Neon——都是外部的。

现在 `docker run postgres:16`，完事。**省掉的不只是钱，是一个完整的外部依赖。**

** 对 Vercel 生态**

Vercel 被诟病最多的是"只能跑前端"。加了 Serverless Functions 之后能跑后端逻辑了，但数据库还在外面。

现在 Sandbox + Docker 意味着：**Vercel 内部可以自闭环了。** 开发、测试、预览、CI——全在 Vercel 里完成。

** 对云计算行业**

Vercel 的路线图越来越清晰：

纯前端托管 → Edge Functions → Serverless Functions → Sandbox 通用计算 → **Sandbox + Docker 容器化计算**

**每一步都在把"在云端跑东西"的门槛往下压。**

AWS 的哲学是"我给你积木，你自己搭"。
Vercel 的哲学是"我给你答案，你直接用"。

两个都能造房子。但一个给你水泥沙子钢筋，一个直接给你精装房。

** 我的判断**

一句话：

**Vercel 正在从"前端部署平台"变成"全栈基础设施平台"，Docker 支持是拼图里最关键的一块。**

回顾一下 Vercel 的路线：

1. 出 Sandbox SDK + CLI → 代码操控环境
2. 做持久化 → 环境可以保存状态
3. 加 Docker/FUSE/VPN → 环境能干任何事

每一步都在拓宽 Vercel 的能力边界。如果你还把 Vercel 当"放前端的地方"，那可能需要重新认识了。

再猜一个：**接下来 Vercel 会出 Sandbox 的生产环境模式。** 能跑 Docker 了，下一步自然就是"跑起来的容器能不能直接对外提供服务"——这一步如果打通了，Vercel 就是"云原生时代的 Heroku"。

**参考链接：**

- [Run Docker containers inside Vercel Sandbox](https://vercel.com/changelog/run-docker-containers-inside-vercel-sandbox)
- [Vercel Sandbox 文档](https://vercel.com/docs/sandbox)
- [Vercel Sandbox 现已 GA](https://vercel.com/blog/vercel-sandbox-is-now-generally-available)

