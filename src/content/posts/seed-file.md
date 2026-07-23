---
title: "无需服务器，让文件在各个设备自由流转——LocalSend"
published: 2026-07-23 17:44:34
description: "跨设备传输文件不靠服务器！LocalSend 局域网直连，N100 小机器也能跑，鸿蒙卓易通可用，比 Python HTTP 服务器更省心。"
tags: []
category: "技术"
---

众所周知，我的"家里云"和垃圾阿里云一样垃圾——只有一台 N100 + 4G 内存的小机器，CPU 常年飙到 80%。这就导致我经常要把文件从手机传到电脑、或者在几个手机之间来回导，但破机子实在跑不动文件服务器，直接炸了）。

其实也有别的办法。比如我之前写了个 Python HTTP 局域网文件服务器，但每次还得开电脑——太懒了。

于是翻了翻 GitHub，偶遇了一个神项目——**LocalSend**（跨平台局域网文件传输）。

![image-20260723175018916](https://img.upxuu.com/images/2026/7/23/1784800220373_705.png)

> LocalSend 使用安全通信协议，允许设备通过 REST API 进行通信。所有数据都通过 HTTPS 安全地发送，并且 TLS/SSL 证书会在每台设备上动态生成，确保最大的安全性。
>
> 详见 [LocalSend 协议文档](https://github.com/localsend/protocol)。
>
> ——来自 LocalSend GitHub 中文文档

这个项目给我的感觉就是极简、方便。没有冗余功能，界面清爽。最最重要的是——能在**卓易通（鸿蒙）**里跑起来！从前想把鸿蒙里的文件快速搞出来可太费劲了，而且也没有 Harmony NEXT 的笔记本（悲）。

使用方法也很简单：去 [Releases](https://github.com/localsend/localsend/releases) 下载对应系统的客户端，Windows、macOS、Android、iOS 全都有，鸿蒙卓易通也能跑。

![image-20260723175754871](https://img.upxuu.com/images/2026/7/23/1784800696121_874.png)

不过有个奇怪的问题，大概是我路由器的事儿——默认开了 5GHz 和 2.4GHz 自动选择，导致即使连同一 WiFi，旧设备可能跑 2.4G（信号差），新设备跑 5G，偶尔会互相发现不了。手动切成同一频段就好了。
