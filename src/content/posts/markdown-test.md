---
title: "Markdown 完整渲染测试"
date: "2026-06-02"
description: "这是一篇包含各种 Markdown 元素的测试文章，用于展示博客对不同排版格式的支持效果，包括代码块、表格、引用等。"
img: "https://picsum.photos/seed/markdownbg/800/400"
tags: ["测试", "Markdown", "排版"]
category: "技术笔记"
---

## 标题演示

这是一段普通的正文文本。在它下面是不同级别的标题演示。

### 三级标题

#### 四级标题

我们可以看到，当鼠标悬浮在标题上时，会自动高亮并且在右侧显示 `#` 号（如果支持的话，取决于具体的实现）。这是一个很棒的用户体验升级！

## 文本样式与排版

Markdown 支持丰富的行内排版：

这是 **粗体文本**，这是 *斜体文本*，这是 ***粗斜体文本***。
这是 ~~删除线~~，这是一个行内代码：`console.log("Hello, UpXuu!")`。

我们还可以插入链接，比如 [UpXuu 的主页](https://upxuu.com)。

## 列表测试

### 无序列表

前端开发离不开这些有趣的框架和库：
* React
  * Next.js
  * Remix
* Vue
* Astro
* Svelte

### 有序列表

完成一个全栈项目通常需要以下步骤：
1. 需求分析与设计
2. 搭建脚手架与环境
3. 核心功能开发
4. 部署与上线

## 引用块

引用块用于突出显示他人的话或者重要的提示信息：

> 学习编程就像是建造一座城堡，需要一块块砖石的积累，不能一蹴而就。
> 保持耐心和热爱，你终会看到它拔地而起。

甚至可以嵌套：
> 基础引用
>> 嵌套的引用，通常由于更加深层次的讨论。

## 代码块与高亮

好的技术博客怎么能少得了代码高亮呢？

```javascript
// 这是一个简单的 JavaScript 发送请求的例子
async function fetchPostData(id) {
  try {
    const response = await fetch(`https://api.example.com/posts/${id}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch post:", error);
    return null;
  }
}
```

```python
# 这是一个 Python 的例子
def get_fibonacci(n):
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    result = [0, 1]
    for _ in range(2, n):
        result.append(result[-1] + result[-2])
    return result
```

## 表格

使用 GFM (GitHub Flavored Markdown)，我们可以渲染出整齐的表格。

| 框架 | 语言 | 核心特点 | 性能评分 |
| :--- | :---: | :---: | ---: |
| React | JS/TS | UI 组件化, 虚拟 DOM | 8/10 |
| Vue | JS/TS | 渐进式, 双向绑定 | 8/10 |
| Astro | JS/TS | 岛屿架构, MPA | 9/10 |
| Svelte | JS/TS | 编译期优化, 无虚拟 DOM | 10/10 |

## 图像

插入图片也是必不可少的：

![美丽的自然风景](https://picsum.photos/seed/nature3/800/400)

---

## 结语

测试结束。希望这篇包含各种常见 Markdown 语法的文章能够全面展示系统的渲染能力。
如果以上元素都渲染无误，说明我们的博客文章展示系统已经相当健壮了！
