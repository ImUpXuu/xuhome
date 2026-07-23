---
title: "无需服务器让你的文件在各个设备自由流转！localsend"
published: 2026-07-23 17:44:34
description: "众所周知，我的家里云和垃圾的阿里云一样垃圾，只有一个n100的4g小机器，经常cpu都干到80% 于是就导致我经常要把文件从手机传到电脑，或者在几个手机之间来回导，但是! 那我这破机子太卡了跑不起来文件服务器了就直接炸了）：，其实也有别的解决办法，比如我之前简单写了个Python的http局域网文件服务器，但是我懒得开电脑(于是在翻了一会GitHub后砸到了一个项目--localsend"
tags: []
category: "技术"
---

众所周知，我的家里云和垃圾的阿里云一样垃圾，只有一个n100的4g小机器，经常cpu都干到80% 于是就导致我经常要把文件从手机传到电脑，或者在几个手机之间来回导，但是! 那我这破机子太卡了跑不起来文件服务器了就直接炸了）：，其实也有别的解决办法，比如我之前简单写了个Python的http局域网文件服务器，但是我懒得开电脑(

于是在翻了一会GitHub后砸到了一个项目--localsend

![image-20260723175018916](https://img.upxuu.com/images/2026/7/23/1784800220373_705.png)

> LocalSend 使用安全通信协议，允许设备通过 REST API 进行通信。所有数据都通过 HTTPS 安全地发送，并且 TLS/SSL 证书会在每台设备上动态生成，确保最大的安全性。
>
> 欲了解更多关于 LocalSend 协议的信息，请参阅[文档](https://github.com/localsend/protocol)。
>
> 来自localsend GitHub中文文档https://github.com/localsend/localsend/blob/main/support/readme/README_ZH.m

这个项目给我的感觉就是极简，方便。 没有冗余的功能，而且界面很清爽。 最重要的是，能在卓易通里跑起来！ 从前想把鸿蒙里的文件快速搞出来可真是太费劲了... 也没有Harmony next的笔记本(悲

使用方法也很简单，去[Releases · localsend/localsend](https://github.com/localsend/localsend/releases)下载对应系统的客户端即可，Harmony next卓易通也能跑

![image-20260723175754871](https://img.upxuu.com/images/2026/7/23/1784800696121_874.png)

不过有个很奇怪的问题，应该是我的路由器的事吧... 因可能默认开了5ghz和2.4ghz自动选择了吧，所以即使在一个WiFi下，但有时旧设备会连到2.4g（信号差），但我有的会连到5g，就很无语
