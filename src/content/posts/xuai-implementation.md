---
title: '为我的博客实现AI功能，让博客"活起来"'
published: 2026-05-30 16:41:00
description: "从 Cloudflare Worker 到前端 SSE 流式渲染，从三个模型端点到 Swup SPA 兼容，完整记录本博客 AI 问答 + 文章概括功能的实现过程与踩坑经历。"
tags: ["AI", "博客", "Cloudflare Workers", "折腾"]
category: "技术"
---

本博客目前集成了两套 AI 功能：**XUUAI 问答**（悬浮在文章页面的 AI 聊天面板）和**文章概括**（每篇文章顶部的 AI 摘要卡片）。本文从使用指南、技术栈、架构设计、实现细节、踩坑记录五个维度完整介绍其实现方案。

## 功能总览

| 功能 | 入口 | 能力 |
|------|------|------|
| **XUUAI 问答** | 文章页面右下角「问AI」按钮 / 底部 FAB 悬浮球 | 基于当前文章内容进行对话，支持多轮交互、引用跳转、思维链展示 |
| **文章概括** | 每篇文章顶部的 AI 概括卡片 | 一键生成文章摘要，含思维链展开、段落引用、追问建议 |
| **模型切换** | 概括卡片右上角下拉菜单 / 聊天面板顶部模型选择器 | 在 GPT-OSS 120B、DeepSeek R1、Qwen 3.5 397B 之间切换，切换即重新生成 |
| **引用跳转** | 回答段落末尾的章节链接（↗） | 点击直接跳转到文章中对应的标题位置 |
| **追问建议** | 概括卡片底部的标签按钮 | 点击标签将问题自动发送到 AI 聊天面板 |

## 使用指南

### XUUAI 问答

1. 打开任意文章页面，点击右下角的「问AI」按钮（桌面端）或底部悬浮球（移动端），弹出聊天面板
2. 面板顶部可切换当前使用的 AI 模型，默认为 GPT-OSS 120B
3. 在输入框中输入问题并发送，AI 会基于当前文章内容生成回答
4. 回答以段落形式展示，每个段落末尾的 `↗` 链接可跳转到文章中对应的章节
5. 点击面板右上角 `✕` 关闭，或继续多轮对话
6. 未打开文章页面时（如首页），AI 以通用助手身份回答关于博主和博客的问题

### 文章概括

1. 进入任意文章页面，在标题下方可见 AI 概括卡片
2. 卡片右上角下拉菜单可选择概括所用的模型
3. 概括自动触发，你将在几秒内看到：
   - **Thinking 过程**：AI 的推理思路，可点击折叠
   - **摘要正文**：2-3 段核心内容概括，引用章节处有跳转链接
   - **追问标签**：基于文章的推荐问题，点击直接跳转到 AI 聊天面板
4. 切换模型后，卡片会清除旧结果并重新生成
5. 同一会话内切换回已看过的文章，直接展示缓存结果，无需等待

### 模型选择建议

| 场景 | 推荐模型 | 原因 |
|------|----------|------|
| 快速问答、日常闲聊 | GPT-OSS 120B | 响应最快，适合大多数场景 |
| 复杂推理、深度分析 | DeepSeek R1 | 思维链可展示完整推理过程 |
| 中文理解、长文处理 | Qwen 3.5 397B | 参数量最大，中文能力最强 |
| 文章概括 | 任意（默认 GPT-OSS） | 三者均可胜任，差异不大 |

## 技术栈全景

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **前端框架** | Astro 5.x + Tailwind CSS | 静态站点生成，岛屿架构 |
| **页面切换** | Swup | SPA 风格无刷新导航 |
| **AI 后端** | Cloudflare Workers | 边缘计算，路由分发与 Prompt 工程 |
| **上游模型 API** | NVIDIA NIM / SiliconFlow | 三个大模型端点 |
| **数据传输** | Server-Sent Events (SSE) | 流式输出，逐 Token 渲染 |
| **缓存** | sessionStorage | 同会话内避免重复请求 |
| **文章源** | GitHub Raw | 通过 GitHub API 获取原始 Markdown |

```
┌─────────────────────────────────────────────────────┐
│                    浏览器端                          │
│  ┌──────────────┐  ┌────────────────────────────┐   │
│  │ AiChat.astro │  │  ArticleSummary.astro       │   │
│  │  (聊天面板)   │  │  (概括卡片 + 模型选择器)    │   │
│  └──────┬───────┘  └───────────┬────────────────┘   │
│         │                     │                     │
│         └─────────┬───────────┘                     │
│                   │ POST /chat{1,2,3}               │
│                   │ POST /summarize{1,2,3}          │
└───────────────────┼─────────────────────────────────┘
                    │
┌───────────────────┼─────────────────────────────────┐
│          Cloudflare Workers (ai-chat)               │
│                   │                                  │
│  ┌────────────────┴─────────────────┐               │
│  │         路由分发                  │               │
│  │  /chat → GPT-OSS                 │               │
│  │  /chat2 → DeepSeek R1            │               │
│  │  /chat3 → Qwen 3.5              │               │
│  │  /summarize → GPT-OSS            │               │
│  │  /summarize2 → DeepSeek R1       │               │
│  │  /summarize3 → Qwen 3.5         │               │
│  └────────────────┬─────────────────┘               │
│                   │                                  │
│  ┌────────────────┴─────────────────┐               │
│  │     callModel() 抽象层            │               │
│  │  - API Key 分发                  │               │
│  │  - 超时控制 (NVIDIA 2s timeout)   │               │
│  │  - 请求体组装 (model, tokens...)  │               │
│  └────────────────┬─────────────────┘               │
│                   │                                  │
│  ┌────────────────┴─────────────────┐               │
│  │  Prompt 工程                     │               │
│  │  - SYSTEM_PROMPT (问答)          │               │
│  │  - SUMMARIZE_PROMPT (概括)       │               │
│  │  - UPXUU_BIO (博主介绍)          │               │
│  │  - 文章内容注入 (.md from GitHub) │               │
│  │  - 章节索引构建 (引用编号)        │               │
│  └────────────────┬─────────────────┘               │
└───────────────────┼─────────────────────────────────┘
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│   NVIDIA NIM     │  │   SiliconFlow    │
│  - GPT-OSS 120B  │  │  DeepSeek R1     │
│  - Qwen 3.5 397B │  │  (Qwen3-8B)      │
│  超时: 2s        │  │  无超时          │
│  usage: 末帧     │  │  usage: 每帧     │
└──────────────────┘  └──────────────────┘
         │                     │
         └──────────┬──────────┘
                    ▼
           SSE 流式响应 → 浏览器
```

## 架构设计

### 设计原则

1. **前端零密钥**：所有 API Key 存储在 Cloudflare Workers 的 Wrangler Secrets 中，前端仅感知中间层 URL
2. **CORS 白名单**：仅允许 `https://upxuu.com` 跨域访问
3. **失败重试链**：当前模型不可用时自动回退到下一个，无需用户干预
4. **无状态设计**：Worker 不维护会话状态，每次请求独立拉取文章内容构建上下文

### 安全与防护

除了 CORS 白名单，Worker 所在的 Cloudflare 边缘网络还启用了 **WAF 速率限制规则**，对 `/chat*` 和 `/summarize*` 路径的请求进行源头限速。这意味着：

- 即使攻击者伪造 `Origin` 头绕过 CORS，到达 Worker 的请求仍受 Cloudflare 边缘节点的速率限制保护
- 限速在 Cloudflare 边缘层执行，恶意流量在到达 Worker 之前即被丢弃，不会产生任何上游 API 调用
- 速率限制与模型提供商的免费配额无关——前者防止滥用，后者确保即使正常用户遍历重试链也不会产生费用

### CORS 实现

```js
const ALLOWED_ORIGINS = ["https://upxuu.com"];

function corsHeaders(request) {
	const origin = request?.headers?.get("Origin") || "";
	const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "null";
	return {
		"Access-Control-Allow-Origin": allowOrigin,
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};
}
```

## 模型选型与路由

目前接入了三个上游模型，通过路由后缀区分：

| 路由 | 模型 | 参数量 | 供应商 | max_tokens (Chat) | max_tokens (Summary) |
|------|------|--------|--------|-------------------|---------------------|
| `/chat` `/summarize` | GPT-OSS 120B | 120B | NVIDIA NIM | 4096 | 4096 |
| `/chat2` `/summarize2` | DeepSeek R1 (Qwen3-8B) | 8B | SiliconFlow | 20480 | 10240 |
| `/chat3` `/summarize3` | Qwen 3.5 397B | 397B | NVIDIA NIM | 4096 | 4096 |

- **GPT-OSS 120B**：默认模型，响应速度快，适合大多数场景
- **DeepSeek R1**：思维链模型，max_tokens 开到 20480 以容纳完整推理过程，适合需要深度分析的问题
- **Qwen 3.5 397B**：参数量最大的模型，中文理解能力最强，但响应延迟也最高

两个模型提供商均提供免费额度：NVIDIA NIM 注册即送免费 API 调用（每分钟 40 次请求限额），SiliconFlow 也有充足的免费调用量。Worker 层面做了严格的 CORS 白名单限制，即使有人拿到前端 URL 也无法从其他域名发起请求。因此**不存在被刷导致账单超支的风险**——成本始终为零。

路由映射通过两个常量表实现，清晰且易于扩展：

```js
const CHAT_ROUTES = { "/chat": "gptoss", "/chat2": "deepseek", "/chat3": "qwen" };
const SUMMARY_ROUTES = { "/summarize": "gptoss", "/summarize2": "deepseek", "/summarize3": "qwen" };
```

### 重试链

前端维护一个重试索引，当发起请求时按优先级依次尝试，直到获取成功响应或全部失败：

```
用户请求
  │
  ├─ 尝试模型 A ── 成功 ──▶ 流式渲染
  │     │
  │     └─ 失败 ──▶ 尝试模型 B ── 成功 ──▶ 流式渲染
  │                      │
  │                      └─ 失败 ──▶ 尝试模型 C
  │                                    │
  │                                    └─ 失败 ──▶ 提示"请求速率过快"
  └─ 更新 localStorage 记录当前模型索引
```

```js
async function retryWithModel(startIdx) {
	let resp = null;
	let usedIdx = -1;
	// 从当前索引向后尝试
	for (let i = startIdx; i < models.length; i++) {
		resp = await fetch(models[i].url);
		if (resp?.ok) { usedIdx = i; break; }
	}
	// 兜底：从头尝试到当前索引
	if (!resp?.ok) {
		for (let i = 0; i < startIdx; i++) {
			resp = await fetch(models[i].url);
			if (resp?.ok) { usedIdx = i; break; }
		}
	}
	if (!resp?.ok) { /* 显示错误提示 */ return; }
	// 更新模型索引，开始流式渲染
	summaryModelIdx = usedIdx;
	localStorage.setItem('xuai-summary-model', String(usedIdx));
	await streamSummary(resp, models[usedIdx].name);
}
```

## callModel 抽象层

所有上游 API 调用统一经过 `callModel` 函数，提供以下能力：

1. **API Key 自动分发**：根据 `modelConfig.api` 匹配 NVIDIA 或 SiliconFlow 的密钥
2. **超时控制**：NVIDIA API 设置 2 秒 `AbortController` 超时，SiliconFlow 不做限制（DeepSeek R1 思维链生成时间较长）
3. **参数注入**：支持 `chat_template_kwargs`、`temperature`、`top_p` 等模型级参数，当前模型无需使用，但为未来模型切换预留了扩展点

```js
async function callModel(bodyWithoutModel, env, modelConfig) {
	const apiKey = modelConfig.api === NVIDIA_API
		? env.NVIDIA_API_KEY
		: env.SILICONFLOW_API_KEY;
	const controller = new AbortController();
	let timeout;
	if (modelConfig.api === NVIDIA_API) {
		timeout = setTimeout(() => controller.abort(), NVIDIA_TIMEOUT_MS); // 2000ms
	}
	try {
		const body = {
			...bodyWithoutModel,
			model: modelConfig.model,
			max_tokens: modelConfig.max_tokens,
		};
		if (modelConfig.chat_template_kwargs) body.chat_template_kwargs = modelConfig.chat_template_kwargs;
		if (modelConfig.temperature !== undefined) body.temperature = modelConfig.temperature;
		if (modelConfig.top_p !== undefined) body.top_p = modelConfig.top_p;

		const resp = await fetch(modelConfig.api, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(body),
			signal: timeout ? controller.signal : undefined,
		});
		clearTimeout(timeout);
		return resp;
	} catch (e) {
		clearTimeout(timeout);
		throw e;
	}
}
```

## AI Chat 问答系统

### 请求流程

```
用户输入问题
  │
  ▼
前端构建请求 { articleUrl, messages }
  │
  ▼
Cloudflare Worker 接收请求
  │
  ├─ 1. 从 GitHub Raw 拉取 articles-index.json（博客文章索引）
  │
  ├─ 2. 从 articleUrl 提取 slug
  │     └─ 拉取对应文章的 Markdown 原始内容
  │
  ├─ 3. 构建 System Prompt
  │     ├─ SYSTEM_PROMPT（角色定义 + 输出格式）
  │     ├─ UPXUU_BIO（博主简介）
  │     ├─ 文章索引列表
  │     ├─ 当前文章章节引用编号
  │     └─ 当前文章全文（Markdown）
  │
  ├─ 4. 调用 callModel() → 上游 API
  │
  └─ 5. 透传 SSE 流 → 浏览器
```

### System Prompt 结构

`handleChat` 中的 Prompt 组装逻辑：

```js
let systemMsg = `${SYSTEM_PROMPT}\n\n${UPXUU_BIO}\n\n## 博客文章总览\n${formatArticleIndex(articles)}`;

if (articleContent) {
	const citeGuide = sectionIndex
		? `\n\n## 当前文章章节索引\n${sectionIndex}`
		: "";
	systemMsg += `${citeGuide}\n\n## 当前文章内容\n\`\`\`markdown\n${articleContent}\n\`\`\``;
}
```

`SYSTEM_PROMPT` 定义了以下核心行为：

- **输出格式**：严格 JSON 数组 `[{"p": "...", "r": [1, 2]}, {"q": ["..."]}]`
- **引用机制**：`r` 数组引用文章章节编号，前端映射为可点击锚点链接
- **语气适配**：技术类文章保持严谨专业，生活类文章采用活泼风格
- **引导提问**：回答末尾输出 `{"q": [...]}` 生成追问建议
- **积木式结构**：每个段落独立成块，层层递进

### 引用渲染机制

Worker 返回的每个段落对象包含 `r` 字段（引用的章节编号数组）。前端维护一个从 `<article-headings-data>` 元素解析的标题映射表，将编号转换为对应的标题 slug 并渲染为可点击的锚链接：

```js
function getArticleHeadings() {
	const el = document.getElementById('article-headings-data');
	if (!el?.textContent) return [];
	return el.textContent.split('|').filter(Boolean).map(s => JSON.parse(s));
}

// 渲染引用链接
if (item.r?.length && headings.length) {
	for (const n of item.r) {
		const h = headings[n - 1];
		if (h) {
			citeHtml += `<a class="cite-link" href="#${h.slug}">${h.text}<span class="cite-arrow">↗</span></a> `;
		}
	}
}
```

## Article Summary 文章概括

### 请求流程

```
页面加载 / 切换模型
  │
  ├─ 检查 sessionStorage 缓存
  │     ├─ 命中 → 直接渲染缓存结果
  │     └─ 未命中 → 发起请求
  │
  ├─ POST { articleUrl } → Worker
  │
  ├─ Worker 处理：
  │     ├─ 提取 slug → 拉取 Markdown
  │     ├─ 构建章节索引
  │     ├─ 组装 SUMMARIZE_PROMPT + 文章内容
  │     └─ callModel() → SSE 流
  │
  ├─ 前端流式渲染：
  │     ├─ thinking 过程（可折叠）
  │     ├─ 正文段落（支持行内 Markdown）
  │     ├─ 引用链接
  │     └─ 提问建议标签
  │
  └─ 写入 sessionStorage
```

### 与 Chat 的区别

| 维度 | AI Chat | Article Summary |
|------|---------|-----------------|
| **Prompt** | `SYSTEM_PROMPT` + 对话历史 | `SUMMARIZE_PROMPT`（纯概括） |
| **Temperature** | 0.7 | 0.1 |
| **输出格式** | 通用问答 JSON | 固定开头格式 + 2-3 段概括 + 提问 |
| **上下文** | 对话历史 + 文章内容 | 仅文章内容 |
| **缓存** | 无 | sessionStorage |
| **触发方式** | 用户输入 | 自动 + 模型切换 |
| **Thinking 显示** | 有（折叠） | 有（折叠） |

### 模型选择器

每篇文章顶部的概括卡片包含一个模型下拉菜单，用户可切换用于概括的模型。切换时：

1. 清除当前渲染结果
2. 更新 `localStorage` 中保存的模型索引
3. 重新发起请求并流式渲染

```js
toggle.onclick = () => {
	summaryModelIdx = i;
	localStorage.setItem('xuai-summary-model', String(i));
	renderSummaryModelSelector();
	// 重置 UI 状态
	startTime = Date.now();
	loadingEl.classList.remove('hidden');
	box.classList.add('hidden');
	resultEl.classList.add('hidden');
	// 重新生成
	retryWithModel(i);
};
```

## 前端 SSE 流式渲染

### 数据流解析

```tsx
// SSE 解析核心逻辑
async function streamSummary(resp, modelName) {
	const reader = resp.body?.getReader();
	const decoder = new TextDecoder();
	let buf = '';
	let full = '';
	let hasContent = false;
	let usage = null;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buf += decoder.decode(value, { stream: true });
		const lines = buf.split('\n');
		buf = lines.pop() || '';

		for (const line of lines) {
			if (!line.startsWith('data: ')) continue;
			const data = line.slice(6).trim();
			if (data === '[DONE]') continue;

			const parsed = JSON.parse(data);
			if (parsed.usage) { usage = parsed.usage; } // 注意：不可 continue！
			const d = parsed.choices?.[0]?.delta;

			if (d?.reasoning_content && !hasContent) {
				// 渲染 thinking 过程
				thinkingText.textContent += d.reasoning_content;
			}
			if (d?.content) {
				if (!hasContent) {
					hasContent = true;
					loadingEl.classList.add('hidden');
				}
				full += d.content;
				resultEl.textContent = full; // 实时渲染
			}
		}
	}
	// 流结束后：最终解析 JSON 并渲染为结构化视图
	if (full) {
		sessionStorage.setItem(cacheKey, full);
		renderSummary(full, usage?.completion_tokens, modelName);
	}
}
```

### 结构化渲染

流结束后的 `renderSummary` 分为四个阶段：

1. **JSON 解析**：提取 `p` 段落数组和 `q` 提问数组（兼容嵌套 `{"q": [...]}` 格式）
2. **段落渲染**：每段通过 `renderInlineMd()` 处理行内 Markdown，并在末尾追加引用链接
3. **提问标签**：将 `q` 数组渲染为可点击标签，点击后传递给 AI Chat 面板
4. **统计信息**：显示模型名称、Token 消耗和请求耗时

## 踩坑记录

### 1. SiliconFlow SSE 的 usage 字段行为差异

**现象**：DeepSeek R1 模型（SiliconFlow）的响应中 `reasoning_content` 和 `content` 始终为空。

**原因**：NVIDIA NIM 的 SSE 流仅在最后一个 chunk 中附带 `usage` 字段，而 SiliconFlow **在每个 chunk 中都包含 `usage`**。原始代码中 `if (parsed.usage) { usage = parsed.usage; continue; }` 导致所有包含 `usage` 的 chunk 被跳过，丢失了实际内容。

**解决方案**：移除 `continue` 语句，仅在遇到 `usage` 时记录，不中断后续字段的处理。

```
NVIDIA SSE 流（正常）：
  data: {"choices":[{"delta":{"content":"..."}}]}
  data: {"choices":[{"delta":{"content":"..."}}]}
  data: {"usage":{"completion_tokens":100}}  ← 仅在末帧

SiliconFlow SSE 流（异常行为）：
  data: {"choices":[{"delta":{"reasoning_content":"..."}}], "usage":{...}}  ← 每帧都有
  data: {"choices":[{"delta":{"content":"..."}}], "usage":{...}}           ← 每帧都有
  data: {"usage":{"completion_tokens":500}}                                ← 末帧
```

### 2. Swup SPA 导航导致组件失活

**现象**：首次加载文章时 AI Chat 和 Article Summary 正常工作，但通过 Swup 导航到另一篇文章后，概括功能停留在"正在生成..."状态，无法完成请求。

**根因**：Astro 将组件中的 `<script>` 标签提取并打包为 ES Module。在 ES Module 中，`function setupAiSummary()` 定义于模块作用域，不会暴露至 `window` 全局对象。当 Swup 切换页面后：

1. Swup 替换 DOM 内容，但 ES Module 不会重新执行
2. Layout.astro 中的 `page:view` 钩子尝试调用 `window.setupAiSummary()`，但该函数不存在
3. 概括组件因此无法完成初始化

**解决方案**：在模块内部显式将函数注册到 `window` 对象上：

```js
window.setupAiSummary = setupAiSummary;
setupAiSummary();
```

并在 Layout.astro 的 Swup 生命周期钩子中注册调用：

```js
window.swup.hooks.on('page:view', () => {
	if (window.setupAiSummary) window.setupAiSummary();
});
```

```
Swup 页面切换生命周期
  ┌──────────────────────┐
  │ 首次加载              │
  │ 脚本执行 → setupAiSummary() │
  │ window.setupAiSummary = fn │
  └──────────┬───────────┘
             │ 用户点击另一篇文章
             ▼
  ┌──────────────────────┐
  │ Swup 获取新页面 HTML   │
  │ Swup 替换 #swup-container │
  │ Swup 触发 page:view    │
  │ 钩子调用 window.setupAiSummary() │
  │ → 在新 DOM 上重新初始化  │
  └──────────────────────┘
```

### 3. NVIDIA NIM 超时控制

**现象**：部分请求（尤其是 Qwen 3.5 397B）长时间无响应，前端连接挂起。

**解决方案**：对 NVIDIA API 设置 2 秒的 `AbortController` 超时。超时后请求被终止，前端重试链自动切换到下一个模型。此超时仅作用于请求建立阶段，一旦 SSE 流开始传输则工作正常。

```js
if (modelConfig.api === NVIDIA_API) {
	timeout = setTimeout(() => controller.abort(), 2000);
}
```

SiliconFlow 不做超时限制，因为 DeepSeek R1 的思维链生成通常需要 5-15 秒，过早超时会导致模型完全不可用。

## 优化与细节

### 温度参数策略

| 场景 | Temperature | 目的 |
|------|-------------|------|
| AI Chat（问答） | 0.7 | 保持回答多样性和创造性 |
| Article Summary（概括） | 0.1 | 降低随机性，保证输出结构稳定 |

### 缓存策略

- **sessionStorage**：概括结果以 `xuai-summary-v3-{slug}` 为键缓存至 sessionStorage，同一会话内返回同一文章时直接展示，避免重复请求
- **模型选择持久化**：用户选择的概括模型索引保存在 `localStorage` 中，跨会话保持

### 模型级参数扩展

`callModel` 支持从 `modelConfig` 中读取可选参数注入请求体，包括 `chat_template_kwargs`、`temperature`、`top_p`。当前模型均无需启用这些参数，但该设计保留了未来替换模型时的灵活性——无需修改 `handleChat` 或 `handleSummarize` 的处理逻辑。

## 后续规划

- **错误分类处理**：区分网络错误、API 鉴权错误、模型超时等不同场景，提供精准的提示信息
- **Worker 端日志**：接入 Cloudflare Tail Workers，实现请求级别的日志追踪

---

Worker 代码位于 `workers/ai-chat/src/index.js`（API Key 通过 Wrangler Secrets 注入，仓库中已 gitignore），前端组件位于 `src/components/widget/AiChat.astro` 与 `ArticleSummary.astro`，Prompt 模板嵌入在 Worker 代码中。
