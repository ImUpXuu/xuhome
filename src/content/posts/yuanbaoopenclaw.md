---
title: "元宝神操作！免费部署 OpenClaw，秒变永久免费服务器？？"
published: 2026-03-30 00:00:00
image: "https://Img.upxuu.com/image/img_1775141479284_image.png"
description: "腾讯元宝推出重磅福利，可免费部署 OpenClaw！本文手把手教你通过 zerotier 内网穿透，将元宝 Bot 变身为一台可用的轻量云服务器，含 1Panel 安装、远程连接全流程。"
tags: ["折腾"]
category: "技术"
---

> [!NOTE]
>
> 2026.5.3更新 之前的tailscale延迟有些高 这里换用zerotier 直接打洞

> [!WARNING]
>
> 无法保证稳定性，无法保证合法性 禁止实际部署 本站不承担任何责任 ✊未来腾讯可能会收回服务，请不要部署重要服务
>
> 腾讯随时可能会单方面终止服务 本站不承担风向 仅作参考！！！

既然都用元宝了，很多东西就可以让元宝帮我们干了，实际没有这个教程这么麻烦哈哈哈哈😂

什么，元宝送免费服务器了？还是2h4g？

众所周知，元宝派最近整了个大活，可以免费部署 openclaw，是的你没听错 而且还是单独给你分配一个服务器 而且你甚至可以让bot帮你把root密码改了，挂个VPN直接就可以连接了！不过没有公网（严格意义上是有的，但是应该防火墙没有开放端口）

我刚开始以为只是一个噱头，可能是几个用户公用一个服务器，或者跑在 docker 里 但是？！它竟然是单独部署在服务器里的！！！

![img](https://Img.upxuu.com/img/2026/5/3/20260503193021_194.jpg)

元宝对自己的描述：

> "元宝派为每位用户提供独立的服务器环境来运行 OpenClaw 实例"

是的你没看错，那么如何最大限度地白嫖它呢？

![元宝对自己的描述](https://Img.upxuu.com/image/20260330220409_815.jpg)

# 获取元宝bot

## 01下载元宝

这里不过多解释 应用商店下载即可

## 02开启元宝派

由于元宝派是内测功能 你首先需要填入邀请码

这里由于我已经注册了 是用的一个比较老的手机做演示 实际界面可能有所不同

点击拍邀请码

在弹出的窗口输入ENJOY（春节期间官方邀请码 亲测可用）

![img](https://Img.upxuu.com/img/2026/5/3/20260503193353_589.jpg)

## 03准备抢注bot

点击“派”确保你已经更新到了最新版，此时左上角应有一个“元宝bot” 点击 “一键创建” 查看时间 然后**一定要定好闹钟**

# bot？server！如何把它变成一个可用的服务器

首先这个部署的服务器大概率是没有开放公网端口的，但是我们可以使用一些工具来完成，比如使用 VPN zerotier

### 01注册安装 zerotier

首先选择你的平台下载客户端，点击 login 注册，可以用 GitHub 还是很方便的

点击注册[Sign Up - ZeroTier](https://accounts.zerotier.com/realms/zerotier/protocol/openid-connect/registrations?client_id=central-v2&scope=openid profile&redirect_uri=https%3A%2F%2Fcentral.zerotier.com%2F&response_type=code) 选择GitHub登录还是很快速的

![image-20260503193917796](https://Img.upxuu.com/img/2026/5/3/1777808692782_68.png)

点击new network

![image-20260503194030693](https://Img.upxuu.com/img/2026/5/3/1777808698152_657.png)

之后你可以进行一些配置 这里因为我已经配置好了就先不演示了

重点！！！ 点击你的网段 然后记录下你的network id 使用这个

![image-20260503194713747](https://Img.upxuu.com/img/2026/5/3/1777808834302_243.png)

### 02引导 openclaw 安装zerotier

这里直接用自然语言和它交流即可 让他通过官方脚本

**实际对话示例 你可以参考我的流程

步骤1：加入ZeroTier网络

**网络ID：**xxxxxxxxx

**Linux/macOS/Windows (PowerShell)：**

bash

```
# 安装ZeroTier（如未安装）
curl -s https://install.zerotier.com | sudo bash

# 加入网络
sudo zerotier-cli join xxxxxxxxxxxx

# 验证（可选）
sudo zerotier-cli listnetworks
```

步骤2：安装1Panel面板

**官方推荐命令（适用于Linux）：**

bash

```
curl -sSL https://resource.fit2cloud.com/1panel/package/quick_start.sh | sudo bash
```

这会显示一个登录链接，请把链接给我 以及默认的用户名 密码

## 03批准元宝服务器加入网络

回到你的控制台 你应该会看到如下界面 找到黄色的设备 点击三个点 然后选择允许

![image-20260503195017889](https://Img.upxuu.com/img/2026/5/3/1777809018571_723.png)

# 客户端链接zerotier

前往[New Central | ZeroTier Documentation](https://docs.zerotier.com/new-central/) 可以参考文档 然后下载对应你的系统的zerotier 依旧使用你的id 加入网段即可

# 元宝还能帮你干什么？

**元宝能做的自动化示例：**

* **问元宝："帮我看看服务器状态"**
  * Bot会执行 `top`、`df -h`、`free -m` 等命令给你看系统负载
* **问元宝："部署个博客玩玩"**
  * Bot可以帮你安装 WordPress 或者静态博客工具
* **问元宝："搞个定时任务"**
  * Bot帮你设置 cron jobs，比如每天备份配置
* **问元宝："我想玩 Docker"**
  * Bot帮你安装 Docker + Portainer，图形化管理容器

**让元宝更听话的小技巧：**

1. **用完整句子** - "帮我安装 tailscale 并告诉我登录链接"
2. **一步一步** - 先让元宝安装，再让它告诉你下一步
3. **检查结果** - "安装成功了吗？看看 tailscale status"
4. **重复命令** - "再帮我安装一下 1panel"

## 4. 除了 Tailscale，还能用啥？

* **ZeroTier** - 类似 Tailscale，也是个内网穿透工具
* **Cloudflare Tunnel** - 免费隧道服务
* **frp/NPS** - 开源内网穿透工具
* **Telegram Bot + SSH** - 通过 Telegram 转发 SSH 连接（有点复杂）

**最简单还是 Tailscale**，为啥？

* 官方支持一键安装脚本
* 元宝能直接帮你搞定
* 自动获取 IP，不用手动配置

## 5. 更多能玩的东西（元宝帮你装）

### 轻量级好玩工具：

* `neofetch` - 酷炫的系统信息展示
* `htop` - 漂亮的任务管理器
* `speedtest-cli` - 测测服务器网速
* `nmap` - 扫描网络端口（只扫自己别扫别人）

### Web 面板全家桶：

* **Cockpit** - 红帽官方轻量 Web 管理界面
* **Webmin** - 老牌但实用的管理面板
* **Ajenti** - 漂亮的轻量管理工具

### 监控全家福：

* `netdata` - 实时监控，漂亮图表
* `glances` - Python 写的监控工具

## 6. 安全注意事项（再说一遍）

### 重要提醒：

1. **别当真** - 这服务器就像公共厕所，随时可能关门
2. **别存私货** - 千万别放你的个人照片、密码、银行信息
3. **玩完就扔** - 就当是个沙盒，测试完数据就清空
4. **随机密码** - 让元宝帮你生成随机密码，别用默认密码

### 腾讯可能做的：

* 半夜突然回收服务器（不打招呼）
* 限制资源使用（CPU/内存）
* 直接封掉违规用户
* 修改网络策略（防火墙）

## 7. 最后一句真话

这确实是"神操作"，但不是"神计划"。别指望用它赚钱、创业、存数据。就当是个免费的 Linux 实验课，腾讯请客你听课。

玩得开心，但别玩得过头。

**附录：实际命令参考**

### Tailscale 安装命令：

```
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up
tailscale status
```

### 1Panel 安装命令：

```
curl -sSL https://resource.fit2cloud.com/1panel/install.sh | bash
```

### Docker 安装命令：

```
curl -fsSL https://get.docker.com | sh
docker run -d -p 9000:9000 portainer/portainer-ce
```

**问元宝的时候记得说清楚：**

* 要什么工具
* 要安装到哪里
* 需要什么配置
* 最后要做什么

**元宝懂什么命令？**

* Linux 基本命令（top、ps、netstat）
* 安装脚本（apt、yum、curl）
* Docker 操作
* 配置文件修改

**祝你白嫖成功！🤑**

---

2026.4.2更新：已无法新建openclaw实例，但原有实例仍然可用
