---
title: "全新相册Kaleido现已上线！来看看我的日常吧~"
published: 2026-07-16 18:13:19
description: "是的！ 我又重写了一个相册 这回依旧是纯静态+vercel部署，惊喜的是vercel优选后速度竟然还挺快的整体风格和我的博客一致 轻盈 简洁 没有任何冗余的功能 几乎零配置 开箱即用 将在完善后开源"
tags: ["技术", "开发"]
category: "生活"
---

是的！ 我又重写了一个相册 这回依旧是纯静态+vercel部署，惊喜的是vercel优选后速度竟然还挺快的

整体风格和我的博客一致 轻盈 简洁 没有任何冗余的功能 几乎零配置 开箱即用 将在完善后开源

即刻体验！[所有相册 - upxuu的相册](https://life.upxuu.com/)

来看看readme吧 一个很详细的介绍

Kaleido 是一个纯静态的照片/视频相册网站，用万花筒般的彩色积木动画和圆润可爱的 UI 呈现你的珍贵回忆。 首次实装与我的相册https://life.upxuu.com/ 也是一个小demo吧 可以参考 我的博客 https://upxuu.com/ 

首次实装与我的相册https://life.upxuu.com/ 也是一个小demo吧 可以参考

我的博客 https://upxuu.com/ 



## 目录

- [Kaleido](#kaleido)
  - [目录](#目录)
  - [快速开始](#快速开始)
  - [项目结构](#项目结构)
  - [添加照片](#添加照片)
    - [相册元信息 (meta.json)](#相册元信息-metajson)
    - [多层文件夹](#多层文件夹)
  - [加密相册](#加密相册)
  - [视频处理](#视频处理)
  - [站点配置](#站点配置)
  - [构建与部署](#构建与部署)
    - [Vercel 部署](#vercel-部署)
    - [Cloudflare Pages 部署](#cloudflare-pages-部署)
  - [技术栈](#技术栈)

## 快速开始

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000/)，即可看到相册。

如果 `raw_photos/` 里还没有照片，会自动生成示例图片。

## 项目结构

```
raw_photos/           ← 你的原始照片放这里（不入库）
  ├── trip/            ← 一个相册 = 一个文件夹
  │   ├── meta.json    ← 相册标题、描述、密码等
  │   ├── DSC001.jpg
  │   ├── DSC002.jpg
  │   └── 上海/        ← 相册内子文件夹
  │       ├── DSC010.jpg
  │       └── VID_001.mp4
  └── daily/
      └── meta.json
public/photos/        ← 构建后自动生成（压缩/加密后的文件）
src/data/             ← 构建后自动生成
  ├── albums.json     ← 所有相册的数据
  └── site.json       ← 站点标题
gallery.config.json   ← 站点名称配置
```

### 关键规则

- `raw_photos/` 下的**每一个子文件夹 = 一个相册**
- 相册内可以**无限嵌套子文件夹**，UI 会按目录层级展示（文件夹卡片排在图片前面）
- 支持图片格式：jpg, jpeg, png, webp, gif, avif, tiff
- 支持视频格式：mp4, webm, mov, m4v, ogg

## 添加照片

在 `raw_photos/` 下创建文件夹，把照片/视频放进去即可：

```
raw_photos/
  └── my_trip/           ← 相册 ID（URL 用，纯英文推荐）
      ├── meta.json      ← 可选，见下方
      ├── beach.jpg
      ├── sunset.mp4
      └── night/         ← 子文件夹
          ├── party.jpg
          └── cake.jpg
```

运行 `npm run dev` 或 `npm run build:photos` 即可构建。

### 相册元信息 (meta.json)

放在相册根目录：

```json
{
  "title": "我的旅行",
  "description": "2025年夏天的回忆",
  "location": "大理",
  "characters": ["小明", "小红"],
  "date": "2025-07-15",
  "password": "secret123"
}
```

不创建 `meta.json` 也完全 OK，会用文件夹名作为标题。

### 多层文件夹

相册内的子文件夹会在 UI 中：

1. **排序在图片前面**显示为文件夹卡片
2. 卡片上有文件夹名称和数量
3. **点击可进入**子目录，支持无限层级
4. 有面包屑导航和「返回」按钮

## 加密相册

在 `meta.json` 中设置 `password` 即可：

```json
{
  "title": "私密相册",
  "password": "你的密码"
}
```

构建时自动执行：

- 用 **AES-256-GCM** 加密所有图片/视频 → 输出为 `.bin` 文件
- `albums.json` 只存密码的 **SHA-256 hash + 随机 salt**，不存明文
- 前端打开时弹密码框，验证 hash 通过后客户端解密显示（blob URL）

**安全提示**

| 场景                 | 防护程度                         |
| -------------------- | -------------------------------- |
| 路人直接访问链接     | 只看到 `.bin`，打不开            |
| 开发者工具看网络     | 破解需 AES-256 密钥              |
| 离线下载 `.bin` 爆破 | 取决于密码强度（弱密码可被撞库） |
| 本机已解锁后         | 内存中明文可见                   |

## 视频处理

构建时自动检测视频大小：

| 大小     | 处理方式                                   |
| -------- | ------------------------------------------ |
| ≤ 24MB   | 原样复制到 `public/photos/`                |
| > 24MB   | 尝试 ffmpeg 压缩至 < 24MB                  |
| 压不下去 | URL 改为外链（不放在 `public/photos/` 中） |

外链域名在 `gallery.config.json` 中配置（默认 `life.upxuu.com`）。

## 站点配置

`gallery.config.json`：

```json
{
  "title": "Kaleido",
  "titleShort": "我的相册"
}
```

- `title`：页面 logo 和页头显示
- `titleShort`：浏览器标签页标题后缀

## 构建与部署

```bash
npm run build      # 压缩图片 → Vite 构建 → dist/
npm run preview    # 本地预览 dist/
```

产出在 `dist/` 目录，纯静态，可直接托管。

### Vercel 部署

1. 推送代码到 GitHub

2. 在 [vercel.com](https://vercel.com/) 导入仓库

3. 构建配置（会自动识别 Vite）：

   | 配置项           | 值              |
   | ---------------- | --------------- |
   | Framework        | Vite            |
   | Build Command    | `npm run build` |
   | Output Directory | `dist`          |
   | Install Command  | `npm install`   |

4. **SPA Fallback**：Vercel 会自动处理，无需额外配置

5. 点 Deploy 即可

### Cloudflare Pages 部署

1. 推送代码到 GitHub

2. 在 Cloudflare Dashboard → Workers & Pages 创建项目

3. 构建配置：

   | 配置项        | 值              |
   | ------------- | --------------- |
   | Build command | `npm run build` |
   | Build output  | `dist`          |

4. **SPA Fallback**：项目中已包含 `public/_redirects`（`/* /index.html 200`），Cloudflare 会自动识别

## 技术栈

- **React 19** + TypeScript
- **Vite 6** 构建
- **React Router v7** 前端路由
- **Framer Motion** 动画
- **Tailwind CSS 4** 样式
- **sharp** 图片压缩（转 WebP）
- **Web Crypto API** 客户端 AES 解密
- **Vercel / Cloudflare Pages** 推荐部署
