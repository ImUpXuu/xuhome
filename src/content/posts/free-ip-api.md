---
title: "推荐几个超准的免登录，支持跨域的IP查询API"
published: 2026-05-16 00:00:00
description: "在这付费盛行的时期 我找到了可能是“最良心的ip api”"
---

说实话，不知道从什么时候开始，完全免费的api接口真的越来越少了，即使是有 也都要注册，一次偶然 让我发现了这些宝藏ip查询api

## 01 小小API

https://v2.xxapi.cn/api/ip

官网：[ip查询 - 免费API|快速稳定的免费API调用平台](https://xxapi.cn/doc/ip)

返回示例

```
{
	"code": 200,
	"msg": "数据请求成功",
	"data": {
		"address": "中国浙江温州 电信",
		"type": "数据中心",
		"begin": "122.228.192.0",
		"end": "122.228.255.255"
	}
}


```

为啥选他呢 因为真的限制特别少 尤其适合放到前端查询 关键还准！

PS 他家还有v2版本 不过免费版也够用了（需要验key

## 02 cloudflare workers

> [!NOTE]
>
> 你可以访问https://upxuu.com/cfworkers-ip 这篇文章 已经做了详细的介绍 这里不过多赘述

你可能会很惊讶 workers不是边缘平台吗？ 怎么还能做ip属地查询

但是事实却是如此，你可以通过调用`request.cf` 对象查询指定ip的信息 这里给大家一个实例

javascript

```
export default {
  async fetch(request, env, ctx) {
    // 获取客户端真实 IP
    const clientIP = request.headers.get('CF-Connecting-IP');
  
    // 获取 request.cf 对象
    const cf = request.cf;

    // 构造完整信息
    const info = {
      ip: clientIP,
      ...cf
    };

    // 直接返回 JSON
    return new Response(JSON.stringify(info, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

部署后访问这个 Worker，你会看到类似这样的输出：

json

```
{
  "ip": "123.45.67.89",
  "city": "San Jose",
  "country": "US",
  "region": "California",
  "regionCode": "CA",
  "postalCode": "95129",
  "latitude": "37.34121",
  "longitude": "-121.99513",
  "timezone": "America/Los_Angeles",
  "asn": 12345,
  "asOrganization": "Example ISP",
  "colo": "SJC",
  "httpProtocol": "HTTP/2",
  "tlsVersion": "TLSv1.3",
  "tlsCipher": "AEAD-AES256-GCM-SHA384",
  "botManagement": null,
  "clientTrustScore": null,
  "isEUCountry": null,
  "ja3Hash": null,
  "ja4": null
}
```

`...cf` 会把 `request.cf` 里的所有字段自动展开，省得一个个手写。`null` 的字段是当前套餐未启用的，部署到 Cloudflare 上就会显示真实数据。
