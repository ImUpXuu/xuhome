---
title: "我的公益中转站上线啦！"
keywords: ["New API", "NVIDIA NIM", "AI中转站", "DeepSeek", "GLM"]
published: 2026-08-03 11:52:34
description: "基于 New API 搭建的 NVIDIA NIM 免费模型聚合中转站，支持 DeepSeek、GLM、Gemma 等十余种模型"
tags: ["AI", "技术"]
category: "技术"
---



众所周知，upxuu 比较 ~~注重性价比~~ 抠门，所以跑简单 Agent 的时候都喜欢白嫖免费模型。但每次更换平台实在麻烦。于是搭建了这个中转站，帮助大家快速获取免费模型。

> [!NOTE]
>
> 此中转站纯娱乐，不保证sla 禁止对接下游！！



## 中转站地址

[https://ai.love7.top/](https://ai.love7.top/)

![New API 中转站首页](https://img.upxuu.lcrworld.xyz/images/2026/8/3/1785729285798_188.png)

## 模型概览

本站模型聚合了多个平台渠道，目前有两个魔搭社区账号和 90 个 NVIDIA NIM 账号。魔搭配额较少，因此降低了其权重；NVIDIA NIM 可保证高可用度和高并发，但 DeepSeek、GLM 等高级模型速度有亿点点慢——不过如果你不在意速度，也足够用了。

![模型分流示意图](https://img.upxuu.lcrworld.xyz/images/2026/8/3/1785729498136_764.png)

另外接入了十多个 Agnes 号，这些模型比较适合跑 Agent，当然，它们的性能不算太强。

## 用途声明

此中转站仅供 **个人 Vibe Coding** 使用，用于自行跑 Agent。**严禁**将其作为下游 API 提供给他人使用，资源有限，请务必遵守。

## 获取方式

- **点击上方链接** 注册即可获得 **15 USD** 初始额度。 可进行测试，如果想要继续使用可以继续联系
- 授权初步确定为两种分为两种：
  1. **熟悉信任**：如果你已与 upxuu 熟悉，可通过任意渠道联系或在评论区留言，我会额外赠送 **500 USD**，用后可再联系加额。
  2. **陌生申请**：通过评论或邮件 **me@upxuu.com** 联系，可获得 **100 USD** 初始额度，额度用完后可以再次申请或等待我定期补充。

## 已支持的模型列表

| 模型名称 | 输入价格 ($) | 输出价格 ($) | 计费单位 | 吞吐 (t) | 状态 | 协议 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **agnes-2.5-flash** | 0.1 | 0.1 | 1M | 90 | openai | 按量计费 |
| **agnes-2.5-pro-alpha** | 0.1 | 0.1 | 1M | 65 | openai | 按量计费 |
| **deepseek-ai/deepseek-v4-flash** | 3 | 3 | 1M | 34 | openai | 按量计费 |
| **deepseek-ai/deepseek-v4-pro** | 2 | 2 | 1M | 24 | openai | 按量计费 |
| **google/diffusiongemma-26b-a4b-it** | 3 | 3 | 1M | 558 | openai | 按量计费 |
| **google/gemma-4-31b-it** | 1.5 | 1.5 | 1M | 20 | openai | 按量计费 |
| **moonshotai/kimi-k2.6** | 5 | 5 | 1M | — | openai | 按量计费 |
| **nvidia/nemotron-3-ultra-550b-a55b** | 0.3 | 0.3 | 1M | 28 | openai | 按量计费 |
| **openai/gpt-oss-120b** | 1 | 1 | 1M | 148 | openai | 按量计费 |
| **stepfun-ai/step-3.7-flash** | 0.6 | 0.6 | 1M | 30 | openai | 按量计费 |
| **z-ai/glm-5.2** | 3 | 3 | 1M | — | openai | 按量计费 |
| **ZhipuAI/GLM-5.2** | 3 | 3 | 1M | 50 | openai | 按量计费 |

## 接口地址

`https://ai.love7.top/v1`

## 使用示例

下面给出一个最小的调用示例（使用 curl），演示如何通过 HTTP POST 请求获取模型输出。请先在请求头中加入你的 **API‑Key**（在注册后获得），并确保所请求的模型在你的额度范围内。

```bash
curl -X POST https://ai.love7.top/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "openai/gpt-oss-120b",
    "messages": [{"role": "user", "content": "给我写一段 5 行的 Python 代码，打印 Hello World。"}],
    "max_tokens": 200
}'
```

> **提示**：如果你使用的是 `node-fetch`、`axios` 或者 `fetch` 等库，记得把 `Authorization` 设为 `Bearer <API_KEY>`。

### 响应结构

```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1690999999,
  "model": "openai/gpt-oss-120b",
  "choices": [{
    "message": {"role": "assistant", "content": "..."},
    "finish_reason": "stop",
    "index": 0
  }],
  "usage": {"prompt_tokens": 12, "completion_tokens": 45, "total_tokens": 57}
}
```

## 常见问题 (FAQ)

- **Q: 额度用完怎么办？**\
  A: 可以在评论区或邮件联系我补充额度，或等待下次资源补满。
- **Q: 是否可以商用？**\
  A: 本站不提供商用授权，仅供个人实验和学习使用。
- **Q: 支持哪些模型的最新版本？**\
  A: 所有在表格中的模型均为当前最新可用版本，后续会实时同步更新。
- **Q: 如何查看我的剩余额度？**\
  A: 登录中转站后在「我的额度」页面查看使用情况。
- **Q: 是否支持流式（stream）返回？**\
  A: 支持 `stream=true` 参数，返回 SSE 流式数据，适用于实时对话。

## 免责声明

本中转站为 **公益项目**，不保证 100% 可用性，若因平台方政策变更导致服务中断，概不负责。使用者应自行评估风险并遵守各模型提供商的使用条款。

如有任何建议或疑问，欢迎在评论区或邮件反馈。

