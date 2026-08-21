---
title: "0元首发？匿名模型 Ox Alpha 空降 OpenRouter！1M 上下文 + 多模态，疑似智谱出品|免费AI"
published: 2026-08-21 12:30:00
description: "昨天晚上 OpenRouter 上突然冒出一个名为 Ox Alpha 的匿名模型：输入输出全部 0 元、1M 上下文、原生多模态，opencode 官方推文还承诺免费一周 + 每日 100T token 容量。全网都在猜它到底是谁家的孩子……"
tags: ["AI"]
category: "技术"
---

昨天晚上（8 月 20 日 UTC 20:04）OpenRouter 上突然冒出来一个神秘的匿名模型，代号 **Ox Alpha**，路由 ID 是 `stealth/ox-alpha`。没有厂商，没有参数量，没有官方发布文，只有一行冷冰冰的介绍：

> *"A frontier model built for efficient coding, sustained agentic work, and real-world production use."*

然后……价格是 **$0 / $0**。对，你没看错，输入输出全部免费，连 `:free` 后缀都用不着，因为它本身就是 `0 元`。

这波操作直接把 HN 干上了热帖。我连夜扒了一圈，信息量还挺大的，整理给你。

## 白嫖参数速览

直接在 OpenRouter 的模型页和 API 里实锤的参数：

| 指标 | 数值 |
| :--- | :--- |
| 路由 ID | `stealth/ox-alpha` |
| 上下文 | **1,048,576（1M）** |
| 最大输出 | 131,072 |
| 输入 | 文本 / 图片 / **视频** |
| 输出 | 文本 |
| 类型 | 推理模型（强制开启，low/high/max 三档，默认 max） |
| 工具调用 | ✅ 支持 |
| 价格 | **输入 $0 / 输出 $0** |
| 托管方 | 匿名 provider "Stealth" |

多模态输入支持**视频**这点挺少见——大部分免费模型撑死给你看个图，能开视频的屈指可数。

端点状态也不错：P50 延迟约 2 秒、吞吐约 50 tok/s、缓存命中率约 67%、近 3 天 uptime 99.99%。免费还这么稳，属实有点东西。

## opencode：这波是"官方联合首发"

跟别的 anonymous 模型不一样，这次 opencode 直接下场官宣了。

**opencode 官方 X**（就是那个开源的 coding agent，15.4 万粉）8 月 20 日发推：

> *"Ox Alpha (stealth model) is free for the next week — 1M Context · Multi-modal · Zero Data Retention. Generous rate limits, near unlimited usage. We have capacity for 100T tokens per day, lets see what you can do"*

翻译一下重点：

- **免费一周**
- 1M 上下文、多模态
- 声称 **Zero Data Retention**（零留存）
- 每日容量高达 **100T tokens**

这条推文热度爆炸：6790 赞、330 转发、2500+ 收藏、约 **196 万次浏览**。

代码侧也落地了：opencode 仓库（sst 迁移到了 anomalyco/opencode）连着合了两个 PR，把 Ox Alpha 接进了 **opencode Go** 的模型表里——Go 端模型 ID 叫 **`ox-alpha-free`**，标注免费、限时、零留存。

也就是说你现在有**两条免费通道**：

1. **OpenRouter**：`stealth/ox-alpha`
2. **opencode Go**：`ox-alpha-free`

不过注意，opencode 的"官方推荐模型"列表里还没它，官方措辞更像"上线了一个新玩具"而不是"这以后就是咱默认推荐了"。顺带一提，它的最大流量来源测出来是 **Claude Code** 和 Hermes Agent 在带——也就是说已经有大量 agent 把它当"免费干活模型"在跑了。

## 它到底是谁家的？全网都在猜

这是最大的瓜。因为它是匿名的，社区已经吵翻天了，主要两派：

### 🏆 智谱 GLM 系（最主流猜测）

- HN 多名用户从行为特征推断：**超长的 thinking trace 很像 GLM**、词汇统计风格对得上、对台湾/西藏/天安门等话题的"中国式"拒答方式都是智谱的指纹
- 中文技术站 80aj 直接开扒：说社区通过抓包匹配到了**智谱特有的网关报错信息以及回复风格**，认为它很可能就是智谱未发布的原生多模态模型，可能指向 **GLM-5.3 多模态变体**或下一代
- 他们还推测这可能是"训练早期 checkpoint、后训练未完成"——因为**代码生成偏弱、Bug 不少**，跟"抢先发布试水"的套路对得上

### 🤔 小米 MiMo 系（也有不少人站这边）

- 理由是这套"马甲首发"玩法之前在 OpenRouter 上出现过，之前那个匿名模型 Hunter Alpha（Pony Alpha）最后也被证实就是某家国产模型
- OpenRouter 的 Discord 里也有人觉得姿势像 MiMo V3 的匿名预览

目前**官方没有任何确认**，百度百科式下结论还为时过早，但从行为指纹和"拒绝回答政治敏感话题"的确定性来看，**国产大模型的概率极高**——而智谱是目前证据指向最强的一家。

顺带，有人怀疑它背后其实是**多模型路由**而非单一模型：因为不同人测出它对敏感话题有时拒答、有时中立，一致性贼差。也有一定道理。

## 性能到底行不行？

很遗憾，**没有任何官方基准**——查不到 Aider Polyglot、SWE-bench、LiveCodeBench 之类的成绩，参数量也没公布。只能说看社区体感：

**✅ 有人说惊艳：** HN 有用户表示它在创意/宽松类任务上表现极其出色，甚至有人觉得比之前白嫖圈公认的强者还猛。token 用量低、速度快，在 agent 工具里很能扛。

**❌ 也有人翻车：** 有用户反馈 CSS/主题类任务直接硬编码颜色、覆盖已有代码；80aj 的评测说它"代码普遍有 Bug、需要大量返工"——如果真是训练早期 checkpoint，这倒也正常。

总之一句话：**免费的东西，拿去玩可以，真当生产主力要谨慎。**

## 白嫖路径 & 注意事项

目前一共有**三条路**可以白嫖：

### ① OpenRouter（官方路由）

最简单粗暴：[OpenRouter](https://openrouter.ai/stealth/ox-alpha) 注册个账号，模型直接选 `stealth/ox-alpha` 就能用，API 兼容 OpenAI 格式。

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "stealth/ox-alpha",
    "messages": [{"role": "user", "content": "你好，介绍一下你自己"}]
  }'
```

### ② opencode Go

用 opencode 的朋友可以直接走 **opencode Go**，模型 ID 是 `ox-alpha-free`，同样免费、限时、零留存。配好之后就能直接用。

### ③ 我的中转站也接入了！

是的，upxuu 的[公益中转站](https://ai.love7.top/)第一时间把 Ox Alpha 接进来了，模型名就叫 `ox-alpha`，OpenAI 协议直接调：

```bash
curl -X POST https://ai.love7.top/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "ox-alpha",
    "messages": [{"role": "user", "content": "你好，介绍一下你自己"}]
  }'
```

还不知道我中转站的可以看这篇：[我的公益中转站上线啦！ - UpXuu's blog](https://upxuu.com/posts/new-api/)，注册就有初始额度，熟悉的朋友还可以找我加量。懒得折腾 OpenRouter 的直接用它就行~

> [!WARNING]
>
> **有两个坑必须提醒：**
>
> 1. **数据留存有矛盾**：opencode 推文说 "Zero Data Retention"，但 OpenRouter 模型页写的是 "Prompts and completions ... are retained by the provider and are not used for training"——两者表述矛盾。**别往里塞客户数据、内部代码、密钥**。
>
> 2. **匿名供应商**：托管方是匿名 provider，身份未证实。拿它写写文章、跑跑玩具 demo 没问题，做合规架构别指望它。

好消息是免费期至少到 **8 月 27 日前后**（官方说 free for the next week），100T/天的容量也基本等于不限量。趁热白嫖，指不定哪天就收费了。

## 参考链接

- [Ox Alpha - OpenRouter 模型页](https://openrouter.ai/stealth/ox-alpha)
- [opencode 官方推文（免费一周公告）](https://x.com/opencode/status/2090544355824038300)
- [OpenRouter 官方发布推文](https://x.com/OpenRouter/status/2090544970923184269)
- [Hacker News 热帖讨论（123 评论）](https://news.ycombinator.com/item?id=49381896)
- [Ox Alpha 身份之谜分析](https://www.ic.work/article/ox-alpha-stealth-model-openrouter-identity-mystery)
- [疑似智谱来源分析 - 80aj](https://www.80aj.com/2026/08/21/ox-alpha-model-exposed/)
- [opencode Go 模型接入 PR](https://github.com/anomalyco/opencode/pull/43690)
- [我的公益中转站 - UpXuu's blog](https://upxuu.com/posts/new-api/)

---

说实话，白嫖圈隔三差五就有人放"免费前沿模型"，但像 Ox Alpha 这种**免费 + 1M 上下文 + 多模态 + 大厂级产能 + opencode 下场背书**的组合还是头一回。至于它到底是不是智谱的，等官方自己憋不住吧——按照国产厂商的尿性，藏不了太久 😏