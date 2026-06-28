---
title: "你平时经常用的workers，竟还是一个实用的的ip查询接口! Cloudflare Workers request.cf 对象完全指南"
published: 2026-05-16 18:20:00
description: "request.cf 是 Cloudflare Workers 运行时提供的一个内置对象，包含由 Cloudflare 全球网络自动检测并注入的请求相关元数据。它无须额外配置即可使用，且数据来源可靠、无法被客户端伪造"
category: "技术"
---

很多人只知道 Cloudflare Workers 能跑代码、做边缘渲染，却不知道它还能直接“查 IP”——不是调接口，而是内置就有的能力。这一切都藏在 `request.cf` 这个对象里。

`request.cf` 是 Cloudflare Workers 运行时提供的一个内置对象，包含由 Cloudflare 全球网络自动检测并注入的请求相关元数据。它无须额外配置即可使用，且数据来源可靠、无法被客户端伪造。

---

#### 1. 基本访问方式

```javascript
export default {
  async fetch(request, env, ctx) {
    // 直接访问 request.cf 属性
    const { cf } = request;

    return new Response(JSON.stringify(cf, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

注意事项：

- 本地开发时（如 `wrangler dev`），`request.cf` 可能为空或仅包含模拟数据。真实数据需部署到 Cloudflare 后才能获取。
- 所有属性均为只读，无法手动修改。

---

#### 2. 所有可用属性详解

##### 2.1 地理信息


| 属性         | 类型     | 说明                          | 示例                    |
| ------------ | -------- | ----------------------------- | ----------------------- |
| `city`       | `string` | 城市名称                      | `"San Jose"`            |
| `country`    | `string` | 国家代码 (ISO 3166-1 alpha-2) | `"US"`                  |
| `region`     | `string` | 地区代码                      | `"California"`          |
| `regionCode` | `string` | 地区缩写                      | `"CA"`                  |
| `postalCode` | `string` | 邮政编码                      | `"95129"`               |
| `latitude`   | `string` | 粗略纬度                      | `"37.34121"`            |
| `longitude`  | `string` | 粗略经度                      | `"-121.99513"`          |
| `timezone`   | `string` | 时区名称                      | `"America/Los_Angeles"` |

```javascript
// 根据国家进行路由判断
async fetch(request, env, ctx) {
  const { country, city } = request.cf;

  if (country === "CN") {
    return new Response(`你好，${city || "朋友"}！`);
  }
  return new Response(`Hello, ${city || "visitor"}!`);
}
```

##### 2.2 网络属性


| 属性             | 类型     | 说明                               |
| ---------------- | -------- | ---------------------------------- |
| `asn`            | `number` | 自治系统号码                       |
| `asOrganization` | `string` | ASN 所属组织名称                   |
| `colo`           | `string` | 处理请求的 Cloudflare 数据中心代码 |
| `httpProtocol`   | `string` | 客户端使用的 HTTP 协议版本         |

```javascript
// 常用的数据中心代码：SJC(圣何塞), LAX(洛杉矶), LHR(伦敦), HKG(香港), NRT(东京)
const { asn, asOrganization, colo, httpProtocol } = request.cf;

console.log(`请求来自 AS${asn} (${asOrganization})，由 ${colo} 数据中心处理，协议 ${httpProtocol}`);
```

##### 2.3 安全与机器人检测


| 属性               | 类型     | 说明                                 |
| ------------------ | -------- | ------------------------------------ |
| `botManagement`    | `object` | 机器人管理检测结果（需开启对应功能） |
| `clientTrustScore` | `number` | 客户端信任评分，0-100                |
| `tlsVersion`       | `string` | TLS 协议版本                         |
| `tlsCipher`        | `string` | 使用的加密套件                       |

```javascript
const { tlsVersion, tlsCipher } = request.cf;

if (tlsVersion === "TLSv1.3" && tlsCipher === "AEAD-AES256-GCM-SHA384") {
  // 高安全性连接
}
```

##### 2.4 企业版专属属性

以下属性仅在 **Enterprise 套餐** 可用：


| 属性          | 说明                                              |
| ------------- | ------------------------------------------------- |
| `botScore`    | 机器人评分，1-99（1=一定是机器人，99=一定是人类） |
| `verifiedBot` | 是否为已验证的搜索引擎爬虫                        |
| `score`       | 安全威胁评分                                      |
| `isEUCountry` | 是否位于欧盟境内                                  |
| `ja3Hash`     | TLS 客户端指纹                                    |
| `ja4`         | JA4+ 指纹                                         |

```javascript
// 仅在企业套餐下可用
const { botScore, verifiedBot } = request.cf;

if (botScore > 70) {
  // 高概率是人类访问者
} else if (verifiedBot) {
  // 是经过验证的爬虫，如 Googlebot
}
```

---

#### 3. 常见应用场景

##### 3.1 地理定位与内容个性化

```javascript
export default {
  async fetch(request, env, ctx) {
    const { country, timezone } = request.cf;

    // 根据时区显示不同的问候语
    const hour = new Date().toLocaleString("en-US", { timeZone: timezone, hour: "numeric" });
    let greeting = "Good day!";

    if (hour < 12) greeting = "Good morning!";
    else if (hour < 18) greeting = "Good afternoon!";
    else greeting = "Good evening!";

    return new Response(`${greeting} Welcome from ${country}`);
  }
}
```

##### 3.2聚合所有可用输出的ip数据

```javascript
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

部署后将会输出

`{`
`"ip": "123.45.67.89",`
`"city": "San Jose",`
`"country": "US",`
`"region": "California",`
`"regionCode": "CA",`
`"postalCode": "95129",`
`"latitude": "37.34121",`
`"longitude": "-121.99513",`
`"timezone": "America/Los_Angeles",`
`"asn": 12345,`
`"asOrganization": "Example ISP",`
`"colo": "SJC",`
`"httpProtocol": "HTTP/2",`
`"tlsVersion": "TLSv1.3",`
`"tlsCipher": "AEAD-AES256-GCM-SHA384",`
`"botManagement": null,`
`"clientTrustScore": null,`
`"isEUCountry": null,`
`"ja3Hash": null,`
`"ja4": null`
`}`

##### 3.3 访问控制与地域限制

```javascript
// 配合 Wrangler.toml 中的 routes 或自定义逻辑
async fetch(request, env, ctx) {
  const { country } = request.cf;

  // 限制特定国家访问
  const blockedCountries = ["XX", "YY"]; // 替换为实际国家代码
  if (blockedCountries.includes(country)) {
    return new Response("Access Denied", { status: 403 });
  }

  // 正常处理请求
  return fetch(request);
}
```

##### 3.4 数据统计与日志记录

```javascript
async fetch(request, env, ctx) {
  const logData = {
    timestamp: Date.now(),
    ip: request.headers.get('CF-Connecting-IP'),
    country: request.cf.country,
    asn: request.cf.asn,
    colo: request.cf.colo,
    url: request.url
  };

  // 写入 KV 或外部日志服务
  ctx.waitUntil(env.LOG_KV.put(logData.timestamp.toString(), JSON.stringify(logData)));

  return fetch(request);
}
```

---

#### 4. 类型声明与调试

如果使用 TypeScript，可添加类型注解以获得更好的开发体验：

```typescript
interface RequestCFProperties {
  city?: string;
  country?: string;
  region?: string;
  regionCode?: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
  timezone?: string;
  asn?: number;
  asOrganization?: string;
  colo?: string;
  httpProtocol?: string;
  tlsVersion?: string;
  tlsCipher?: string;
  botManagement?: {
    verifiedBot: boolean;
    score: number;
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const cf = request.cf as RequestCFProperties;
    // 后续使用 cf.country、cf.city 等
  }
}
```

---

#### 5. 最佳实践与注意事项

1. **所有属性均可为 `undefined`**
   本地开发、测试环境或某些边缘情况下，部分字段可能缺失。始终做好空值判断。
2. **精度限制**
   经纬度信息会随用户到 Cloudflare 数据中心的路由动态变化，且精度有限（约 10-50 公里范围），不可用于高精度定位需求。
3. **依赖 Cloudflare DNS 代理**
   仅当域名通过 Cloudflare 代理（橙色云朵）时，`request.cf` 才包含完整信息。直连 DNS（灰色云朵）可能缺失大部分字段。
4. **隐私与合规**
   若需向第三方提供基于 `request.cf` 的数据，请确保符合隐私法规（如 GDPR）。可选择在 Wrangler.toml 中禁用特定字段的收集。

了解这些属性后，你可以在不调用任何外部 API 的情况下，直接在边缘节点实现地理位置路由、访问控制、机器人检测等多种功能。
