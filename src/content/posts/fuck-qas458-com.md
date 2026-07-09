---
title: "《我让镜像我的站跳dubo——如何反制恶意反代》"
published: 2026-07-09 15:15:44
description: "今天搜我的站upxuu 发现竟然被人全站镜像了 看来它的域名是不想要了直接处理掉"
category: "技术"
---

w我做梦都想不到有一天我的小破站还对有盗版！

# 发现sb（没错就是直言不讳）

是的是的 一个UV不到100的小站竟然被镜像了

![image-20260709151833359](https://edit.upxuu.com/img/2026/7/9/1783581514513_271.png)

没怎么见过大世面的我无疑是非常震惊的，不是哥们 我页脚有站的GitHub仓库啊喂 你直接部署vercel不就行了吗非要反代是吧 还nm全站反代

![446ab7487df3c43f7bf64f8460a6e1c5](https://edit.upxuu.com/img/2026/7/9/1783581614991_435.jpg)

可以看到底部url冥想不对劲

# 如何制裁这种神人

## 一些分析

既然你都这么不要脸了，那我直接给你跳赌博站算了

本来打算抓一下日志看特征的 but...

![image-20260709152404050](https://edit.upxuu.com/img/2026/7/9/1783581844704_675.png)

那就先写了前端逻辑吧

## 反制代码（cf worker）

由于本站是通过workers反代vercel的 所以实现的也非常简单，直接投毒就完事了！

```javascript
// ========== 第二层防御：HTML 注入 JS 域名校验 ==========
if (contentType.includes('text/html')) {
    const antiPirateJS = `
<script>
(function() {
    var currentHost = window.location.hostname;
    var legalDomain = 'upxuu.com';
    if (currentHost.toLowerCase() !== legalDomain.toLowerCase() && 
        currentHost.toLowerCase() !== 'www.' + legalDomain.toLowerCase()) {
        window.location.replace('http://www.23963.me/');
    }
})();
</script>
`;
    if (content.includes('</head>')) {
        content = content.replace('</head>', antiPirateJS + '</head>');
    } else if (content.includes('<body')) {
        content = content.replace('<body', antiPirateJS + '<body');
    } else {
        content = antiPirateJS + content;
    }
}
// ========================================================
```

## 这段代码做了什么？



| 步骤 | 说明                                                 |
| :--- | :--------------------------------------------------- |
| 1    | 检测响应内容是否为 HTML                              |
| 2    | 构造一段 JS 代码                                     |
| 3    | JS 获取浏览器地址栏域名 (`window.location.hostname`) |
| 4    | 判断是否等于`upxuu.com` 或 `www.upxuu.com`           |
| 5    | 如果不是 → 跳转到`http://www.23963.me/`             |
| 6    | 把这段 JS 注入到 HTML 的`</head>` 或 `<body>` 前     |

当然 如果你也被反代了，也可以使用这个思路解决 也不需要必须在worker上的网站 只要把这段</script>注入到head即可

经过群u提醒 没想到这b域名还是惯犯

![5606cbc3f87cb38551d1294bb46f54e4](https://edit.upxuu.com/img/2026/7/9/1783582350012_75.jpg)
