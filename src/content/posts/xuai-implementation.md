---

title: '为我的博客实现AI功能，让博客"活起?'
published: 2026-05-30 16:41:00
description: "?Cloudflare Worker 到前?SSE 流式渲染，从三个模型端点?Swup SPA 兼容，完整记录本博客 AI 问答 + 文章概括功能的实现过程与踩坑经历?"
tags: ["AI", "博客", "Cloudflare Workers", "折腾"]
category: "技术?"
---
本博客目前集成了两套 AI 功能?*XUUAI 问答**（悬浮在文章页面?AI 聊天面板）和**文章概括**（每篇文章顶部的 AI 摘要卡片）。本文从使用指南、技术栈、架构设计、实现细节、踩坑记录五个维度完整介绍其实现方案?

** 功能总览**

 功能  入口  能力 

 **XUUAI 问答**  文章页面右下角「问AI」按?/ 底部 FAB 悬浮? 基于当前文章内容进行对话，支持多轮交互、引用跳转、思维链展?
 **文章概括**  每篇文章顶部?AI 概括卡片  一键生成文章摘要，含思维链展开、段落引用、追问建?
 **模型切换**  概括卡片右上角下拉菜?/ 聊天面板顶部模型选择? ?GPT-OSS 120B、DeepSeek R1、Qwen 3.5 397B 之间切换，切换即重新生成 
 **引用跳转**  回答段落末尾的章节链接（↗）  点击直接跳转到文章中对应的标题位?
 **追问建议**  概括卡片底部的标签按? 点击标签将问题自动发送到 AI 聊天面板 

** 使用指南**


** XUUAI 问答**

1. 打开任意文章页面，点击右下角的「问AI」按钮（桌面端）或底部悬浮球（移动端），弹出聊天面板
2. 面板顶部可切换当前使用的 AI 模型，默认为 GPT-OSS 120B
3. 在输入框中输入问题并发送，AI 会基于当前文章内容生成回?
4. 回答以段落形式展示，每个段落末尾?`↗` 链接可跳转到文章中对应的章节
5. 点击面板右上?`✕` 关闭，或继续多轮对话
6. 未打开文章页面时（如首页），AI 以通用助手身份回答关于博主和博客的问题

** 文章概括**

1. 进入任意文章页面，在标题下方可见 AI 概括卡片
2. 卡片右上角下拉菜单可选择概括所用的模型
3. 概括自动触发，你将在几秒内看到：
4.  **Thinking 过程**：AI 的推理思路，可点击折叠
5.  **摘要正文**?-3 段核心内容概括，引用章节处有跳转链接
6.  **追问标签**：基于文章的推荐问题，点击直接跳转到 AI 聊天面板
切换模型后，卡片会清除旧结果并重新生?
同一会话内切换回已看过的文章，直接展示缓存结果，无需等待

** 模型选择建议**

 场景  推荐模型  原因 

 快速问答、日常闲? GPT-OSS 120B  响应最快，适合大多数场?
 复杂推理、深度分? DeepSeek R1  思维链可展示完整推理过程 
 中文理解、长文处? Qwen 3.5 397B  参数量最大，中文能力最?
 文章概括  任意（默?GPT-OSS? 三者均可胜任，差异不大 

** 技术栈全景**

 层级  技术选型  说明 

 **前端框架**  Astro 5.x + Tailwind CSS  静态站点生成，岛屿架构 
 **页面切换**  Swup  SPA 风格无刷新导?
 **AI 后端**  Cloudflare Workers  边缘计算，路由分发与 Prompt 工程 
 **上游模型 API**  NVIDIA NIM / SiliconFlow  三个大模型端?
 **数据传输**  Server-Sent Events (SSE)  流式输出，?Token 渲染 
 **缓存**  sessionStorage  同会话内避免重复请求 
 **文章?*  GitHub Raw  通过 GitHub API 获取原始 Markdown 

** 架构设计**

** 设计原则**

1. **前端零密?*：所?API Key 存储?Cloudflare Workers ?Wrangler Secrets 中，前端仅感知中间层 URL
2. **CORS 白名?*：仅允许 `https://upxuu.com` 跨域访问
3. **失败重试?*：当前模型不可用时自动回退到下一个，无需用户干预
4. **无状态设?*：Worker 不维护会话状态，每次请求独立拉取文章内容构建上下?

** 安全与防?*

除了 CORS 白名单，Worker 所在的 Cloudflare 边缘网络还启用了 **WAF 速率限制规则**，对 `/chat*` ?`/summarize*` 路径的请求进行源头限速。这意味着?

- 即使攻击者伪?`Origin` 头绕?CORS，到?Worker 的请求仍?Cloudflare 边缘节点的速率限制保护
- 限速在 Cloudflare 边缘层执行，恶意流量在到?Worker 之前即被丢弃，不会产生任何上?API 调用
- 速率限制与模型提供商的免费配额无关——前者防止滥用，后者确保即使正常用户遍历重试链也不会产生费?

** CORS 实现**

** 模型选型与路?*

目前接入了三个上游模型，通过路由后缀区分?

 路由  模型  参数? 供应? max_tokens (Chat)  max_tokens (Summary) 

 `/chat` `/summarize`  GPT-OSS 120B  120B  NVIDIA NIM  4096  4096 
 `/chat2` `/summarize2`  DeepSeek R1 (Qwen3-8B)  8B  SiliconFlow  20480  10240 
 `/chat3` `/summarize3`  Qwen 3.5 397B  397B  NVIDIA NIM  4096  4096 

- **GPT-OSS 120B**：默认模型，响应速度快，适合大多数场?
- **DeepSeek R1**：思维链模型，max_tokens 开?20480 以容纳完整推理过程，适合需要深度分析的问题
- **Qwen 3.5 397B**：参数量最大的模型，中文理解能力最强，但响应延迟也最?

两个模型提供商均提供免费额度：NVIDIA NIM 注册即送免?API 调用（每分钟 40 次请求限额），SiliconFlow 也有充足的免费调用量。Worker 层面做了严格?CORS 白名单限制，即使有人拿到前端 URL 也无法从其他域名发起请求。因?*不存在被刷导致账单超支的风险**——成本始终为零?

路由映射通过两个常量表实现，清晰且易于扩展：

** 重试?*

前端维护一个重试索引，当发起请求时按优先级依次尝试，直到获取成功响应或全部失败?

** callModel 抽象?*

所有上?API 调用统一经过 `callModel` 函数，提供以下能力：

1. **API Key 自动分发**：根?`modelConfig.api` 匹配 NVIDIA ?SiliconFlow 的密?
2. **超时控制**：NVIDIA API 设置 2 ?`AbortController` 超时，SiliconFlow 不做限制（DeepSeek R1 思维链生成时间较长）
3. **参数注入**：支?`chat_template_kwargs`、`temperature`、`top_p` 等模型级参数，当前模型无需使用，但为未来模型切换预留了扩展?

** AI Chat 问答系统**

** 请求流程**

** System Prompt 结构**

`handleChat` 中的 Prompt 组装逻辑?

`SYSTEM_PROMPT` 定义了以下核心行为：

- **输出格式**：严?JSON 数组 `[{"p": "...", "r": [1, 2]}, {"q": ["..."]}]`
- **引用机制**：`r` 数组引用文章章节编号，前端映射为可点击锚点链?
- **语气适配**：技术类文章保持严谨专业，生活类文章采用活泼风格
- **引导提问**：回答末尾输?`{"q": [...]}` 生成追问建议
- **积木式结?*：每个段落独立成块，层层递进

** 引用渲染机制**

Worker 返回的每个段落对象包?`r` 字段（引用的章节编号数组）。前端维护一个从 `<article-headings-data>` 元素解析的标题映射表，将编号转换为对应的标题 slug 并渲染为可点击的锚链接：

** Article Summary 文章概括**

** 请求流程**

** ?Chat 的区?*

 维度  AI Chat  Article Summary 

 **Prompt**  `SYSTEM_PROMPT` + 对话历史  `SUMMARIZE_PROMPT`（纯概括?
 **Temperature**  0.7  0.1 
 **输出格式**  通用问答 JSON  固定开头格?+ 2-3 段概?+ 提问 
 **上下?*  对话历史 + 文章内容  仅文章内?
 **缓存**  ? sessionStorage 
 **触发方式**  用户输入  自动 + 模型切换 
 **Thinking 显示**  有（折叠? 有（折叠?

** 模型选择?*

每篇文章顶部的概括卡片包含一个模型下拉菜单，用户可切换用于概括的模型。切换时?

1. 清除当前渲染结果
2. 更新 `localStorage` 中保存的模型索引
3. 重新发起请求并流式渲?

** 前端 SSE 流式渲染**

** 数据流解?*

** 结构化渲?*

流结束后?`renderSummary` 分为四个阶段?

1. **JSON 解析**：提?`p` 段落数组?`q` 提问数组（兼容嵌?`{"q": [...]}` 格式?
2. **段落渲染**：每段通过 `renderInlineMd()` 处理行内 Markdown，并在末尾追加引用链?
3. **提问标签**：将 `q` 数组渲染为可点击标签，点击后传递给 AI Chat 面板
4. **统计信息**：显示模型名称、Token 消耗和请求耗时

** 踩坑记录**

** 1. SiliconFlow SSE ?usage 字段行为差异**

**现象**：DeepSeek R1 模型（SiliconFlow）的响应?`reasoning_content` ?`content` 始终为空?

**原因**：NVIDIA NIM ?SSE 流仅在最后一?chunk 中附?`usage` 字段，?SiliconFlow **在每?chunk 中都包含 `usage`**。原始代码中 `if (parsed.usage) { usage = parsed.usage; continue; }` 导致所有包?`usage` ?chunk 被跳过，丢失了实际内容?

**解决方案**：移?`continue` 语句，仅在遇?`usage` 时记录，不中断后续字段的处理?

** 2. Swup SPA 导航导致组件失活**

**现象**：首次加载文章时 AI Chat ?Article Summary 正常工作，但通过 Swup 导航到另一篇文章后，概括功能停留在"正在生成..."状态，无法完成请求?

**根因**：Astro 将组件中?`<script>` 标签提取并打包为 ES Module。在 ES Module 中，`function setupAiSummary()` 定义于模块作用域，不会暴露至 `window` 全局对象。当 Swup 切换页面后：

1. Swup 替换 DOM 内容，但 ES Module 不会重新执行
2. Layout.astro 中的 `page:view` 钩子尝试调用 `window.setupAiSummary()`，但该函数不存在
3. 概括组件因此无法完成初始?

**解决方案**：在模块内部显式将函数注册到 `window` 对象上：

并在 Layout.astro ?Swup 生命周期钩子中注册调用：

** 3. NVIDIA NIM 超时控制**

**现象**：部分请求（尤其?Qwen 3.5 397B）长时间无响应，前端连接挂起?

**解决方案**：对 NVIDIA API 设置 2 秒的 `AbortController` 超时。超时后请求被终止，前端重试链自动切换到下一个模型。此超时仅作用于请求建立阶段，一?SSE 流开始传输则工作正常?

SiliconFlow 不做超时限制，因?DeepSeek R1 的思维链生成通常需?5-15 秒，过早超时会导致模型完全不可用?

** 优化与细?*

** 温度参数策略**

 场景  Temperature  目的 

 AI Chat（问答）  0.7  保持回答多样性和创造?
 Article Summary（概括）  0.1  降低随机性，保证输出结构稳定 

** 缓存策略**

- **sessionStorage**：概括结果以 `xuai-summary-v3-{slug}` 为键缓存?sessionStorage，同一会话内返回同一文章时直接展示，避免重复请求
- **模型选择持久?*：用户选择的概括模型索引保存在 `localStorage` 中，跨会话保?

** 模型级参数扩?*

`callModel` 支持?`modelConfig` 中读取可选参数注入请求体，包?`chat_template_kwargs`、`temperature`、`top_p`。当前模型均无需启用这些参数，但该设计保留了未来替换模型时的灵活性——无需修改 `handleChat` ?`handleSummarize` 的处理逻辑?

** 后续规划**

- **错误分类处理**：区分网络错误、API 鉴权错误、模型超时等不同场景，提供精准的提示信息
- **Worker 端日?*：接?Cloudflare Tail Workers，实现请求级别的日志追踪

Worker 代码位于 `workers/ai-chat/src/index.js`（API Key 通过 Wrangler Secrets 注入，仓库中?gitignore），前端组件位于 `src/components/widget/AiChat.astro` ?`ArticleSummary.astro`，Prompt 模板嵌入?Worker 代码中?
