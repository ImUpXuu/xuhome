---

title: "换新博客了！全新极简主题 Cubie 上线"
published: 2026-06-05 08:50:00
tags:
  - 博客
  - 折腾
category: "技术?"
---

最近老是觉得浑身难受，仔细一琢磨，发现原来是看原博客有点不顺眼了。（折腾病又犯了属于是）

大家都知道我之前用的?`fuwari` 主题，一开始感觉挺惊艳的，轻巧好看。但是不知道从什么时候开始，我发?`fuwari` 被改得太重量级了，各种繁杂的功能往上堆，代码越来越臃肿，慢慢失去了最初那种轻量、简简单单的感觉。看久了真的是有点心累?

所以我一气之下直接决定推翻重来！既然现成的都不满足，那我就自己手搓一个！于是就有了现在你看到的这个由我从零亲自设计并编写的全新博客主题—?*Cubie**?

## 为什么起名叫 Cubie?

如果说以前的博客变得像是一个沉重的集装箱，?Cubie 给我的感觉就是回到了真正的“小积木”（Cube）那种纯粹状态?

它采用了非常有视觉张力的 **Neobrutalism（新粗野主义?* 风格，粗边框、强阴影，配合让人感到温馨的米黄纸张底色，第一眼看到就让人觉得既复古活泼又极具个性。没有多余繁复的杂乱设置，最大的特点就一个字?*快！是真的极速！**

一切由我自己把控，去掉了所有冗余的负担后，页面切换丝滑流畅，这才是理想的个人碎片空间该有的纯粹样子！平时用来写写技术笔记、发个日常说说、吐吐槽简直不要太舒服?

## 核心技术栈与实现细?

既然是自己完完全全手写的，技术选型当然要选择最现代最舒服的组合：

- **Astro**：宇宙最强博客底层框架！利用 Astro 的群岛架构（Islands Architecture），页面绝大部分直接输出极其轻量的纯静?HTML，极具压迫感的加载速度由此诞生。同时它?Content Collections 对管?md 文件夹体验无敌?
- **React + Svelte**：前端老兵加新锐的混搭！因?Astro 框架兼容一切，日历热点图、交互灯箱等动态部分我大胆引入?Svelte 来获得极低的运行时开销；而大部分动态交互状态则交给了熟练的 React 去把控?
- **Tailwind CSS (@tailwindcss/vite)**：构建这类“新粗野主义”风格的绝佳利器！几?Utility Classes：`border-4 border-黑` ?`shadow-[6px_6px_0px_0px_#HEX]`，就能光速堆砌出一个个极具张力的几何模块?
- **贴心定制?MDX 和组件流**：我全面接管了文章页的布局：加?Fancybox 画廊级别的图片光影放大；抛弃了刻板的高亮库，手写了一个纯?Mac 视窗风格、支持复制与长代码自动折叠的独立代码块渲染组件。一切都恰到好处?

## GitHub 仓库

如果你对这个新主题感兴趣，或者想了解其背后的代码，可以直接去参观一下目前的 GitHub 仓库?

<a href="https://github.com/ImUpXuu/xuhome" target="_blank" style="display: block; margin: 20px 0;">
  <img src="https://github-readme-stats.vercel.app/api/pin/?username=ImUpXuu&repo=xuhome&theme=vue-dark&show_owner=true" alt="ImUpXuu/xuhome repository card" />
</a>

直接奉上链接：[https://github.com/ImUpXuu/xuhome](https://github.com/ImUpXuu/xuhome)

欢迎常来看看，或者提?Issue！接下来也会在这个新家记录更多有意思的生活碎片和技术折腾经验?


