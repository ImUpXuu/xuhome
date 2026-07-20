---
title: "还在本地写博客？来试试基于worker的博客后台 零成本叫你打造一个不用服务器的后台"
published: 2026-05-04 07:06:00
image: "https://img.upxuu.com/images/2026/5/4/20260503230406_418.png"
description: "- ✨ 支持三种编辑模式：即时渲染 (IR)、所见即所得 (WYSIWYG)、分屏预览 (SV)"
category: "技术"
---

# Blog Admin Worker

基于 Cloudflare Workers 的博客管理后台与图床系统，一worker通吃 一个worker解决你的所有博客编辑问题！
使用 Vditor 作为 Markdown 编辑器。

::github{repo="imupxuu/blog-admin-workers"}
![image.png](https://img.upxuu.com/images/2026/5/4/20260503230406_418.png)

## 功能特性

- ✨ 支持三种编辑模式：即时渲染 (IR)、所见即所得 (WYSIWYG)、分屏预览 (SV)
- 💾 自动保存草稿，防止意外丢失
- 🖼️ 图片上传和管理，支持批量操作
  - 新图片上传到 photo 仓库（`/img/` 路由）
  - 历史图片保留在 myblog 仓库（`/image/` 路由）
  - 按 `年/月/日/时间戳_随机数。扩展名` 结构存储
  - 递归获取所有子目录中的图片
  - crtl cv即可一键上传图片到图床
    ![image.png](https://img.upxuu.com/images/2026/5/4/20260503230451_869.png)
- 🤝 友链管理，在线编辑 GitHub 仓库中的友链配置
  ![image.png](https://img.upxuu.com/images/2026/5/4/20260503230535_598.png)
- 📅 时间轴筛选文章
  ![img](https://img.upxuu.com/images/2026/5/4/20260503230406_418.png)
- 🎨 多主题支持
- 🔒 安全认证 + CAPTCHA 验证
- 📱 移动端优化，智能固定布局
- 🔍 IndexNow 自动提交（Bing 搜索引擎）
- 所有请求均通过worker代理发送 无畏网络问题！

## 技术栈

- **前端**：原生 JavaScript + TailwindCSS + Vditor
- **后端**：Cloudflare Workers
- **存储**：GitHub API（文章和图片存储在 GitHub 仓库）
- **图片索引**：GitHub Action 自动生成 JSON 索引

## 仓库结构

你需要准备 **两个 GitHub 仓库**：

### 1. 博客仓库（myblog）

存放文章和旧图片：

```
myblog/
├── src/
│   ├── content/
│   │   └── posts/          # 文章目录
│   ├── layouts/
│   │   └── Layout.astro    # 布局文件
│   └── config.ts           # 博客配置
└── public/
    ├── images/             # 旧图片（可选）
    └── data/
        └── friends.json    # 友链配置
```

### 2. 图片仓库（photo）

专门存放新上传的图片：

```
photo/
└── images/
    ├── index.json          # 根索引（自动生成）
    ├── 2026/
    │   ├── 4/
    │   │   ├── index.json  # 月份索引（自动生成）
    │   │   ├── 5/          # 日期目录
    │   │   └── 6/
    │   └── 5/
    └── ...
```

## 部署

### 环境要求

- Node.js 20.18+
- Python 3.8+（用于 Typora 上传脚本）
- Cloudflare 账号
- GitHub Token（需要 `repo` 权限）

### 部署步骤

#### 1. 克隆项目

```bash
git clone https://github.com/ImUpXuu/blog-admin-workers.git
cd admin-worker
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 配置环境变量

编辑 `wrangler.toml` 文件：

```toml
[vars]
# 博客仓库配置
GITHUB_OWNER = "ImUpXuu"           # 你的 GitHub 用户名
GITHUB_REPO = "myblog"             # 博客仓库名
GITHUB_BRANCH = "main"             # 分支名
POSTS_PATH = "src/content/posts"   # 文章目录路径
IMAGE_PATH = "public/images"       # 旧图片路径（可选）
BLOG_URL = "https://upxuu.com"     # 博客域名

# 图片仓库配置
PHOTO_OWNER = "ImUpXuu"            # 图片仓库所有者
PHOTO_REPO = "photo"               # 图片仓库名
PHOTO_BRANCH = "main"              # 图片仓库分支
PHOTO_PATH = "images"              # 图片根目录
PROXY_BASE = "https://img.upxuu.com/img"  # 图片代理基础 URL
```

#### 4. 设置 Secrets

```bash
# 设置 GitHub Token（需要 repo 权限）
wrangler secret put GITHUB_TOKEN

# 设置管理员密码
wrangler secret put ADMIN_PASSWORD
```

#### 5. 部署到 Cloudflare

```bash
npm run deploy
```

部署成功后会显示 Worker URL，例如：`https://blog-admin.upxuu.workers.dev`

### 本地开发

```bash
# 设置 Secrets（首次）
wrangler secret put GITHUB_TOKEN
wrangler secret put ADMIN_PASSWORD

# 启动开发服务器
npm run dev
```

## 项目结构

```
admin-worker/
├── src/
│   ├── index.js        # Cloudflare Workers 主入口
│   ├── html.js         # 管理后台 HTML 和 JavaScript
│   └── gallery.js      # 公开图库页面
├── scripts/
│   ├── typora-upload.py    # Typora 图片上传脚本（Python）
│   └── typora-upload.bat   # Windows 批处理入口
├── .github/
│   └── workflows/
│       └── generate-index.yml  # GitHub Action（图片索引生成）
├── wrangler.toml       # Wrangler 配置文件
├── package.json        # 项目依赖配置
└── README.md          # 项目说明文档
```

## API 接口

### 文章管理

- `GET /api/posts` - 获取文章列表
- `GET /api/post/:filename` - 获取文章内容
- `PUT /api/post/:filename` - 创建/更新文章
- `DELETE /api/post/:filename` - 删除文章

### 图片管理

- `GET /api/images` - 获取图片列表
- `POST /api/upload` - 上传图片
- `DELETE /api/img/:filename` - 删除图片

### 友链管理

- `GET /api/friends` - 获取友链列表
- `PUT /api/friends` - 更新友链列表

### 设置

- `GET /api/settings` - 获取设置
- `PUT /api/settings` - 更新设置

## Typora 图片上传配置

### 1. 安装 Python

确保已安装 Python 3.8+ 并添加到系统 PATH。

### 2. 安装依赖

```bash
pip install requests
```

### 3. 配置 Typora

打开 Typora → 文件 → 偏好设置 → 图像 → 上传服务配置：

- **上传服务**：自定义命令
- **命令**：`G:\project\blog\admin-worker\scripts\typora-upload.bat --upload`

### 4. 测试

在 Typora 中粘贴图片，应该会自动上传并返回 URL。

## GitHub Action 自动索引

**工作流文件位置**：`image-proxy/.github/workflows/generate-index.yml`

### 配置步骤

#### 1. 复制工作流文件

将 `image-proxy/.github/workflows/generate-index.yml` 复制到你的 **photo 仓库** 的 `.github/workflows/` 目录下。

#### 2. 修改代理 URL

编辑工作流文件，将 `PROXY_BASE` 改为你自己的 Worker 代理地址：

```javascript
const PROXY_BASE = 'https://img.upxuu.com/img';  // 改为你的地址
```

#### 3. 工作原理

- **触发条件**：push 到 `images/` 目录
- **生成文件**：
  - `images/index.json` - 根索引（所有月份）
  - `images/YYYY/M/index.json` - 月份索引
  - `images/YYYY/M/D/index.json` - 日期索引
- **输出格式**：包含代理后的完整 URL

#### 4. 索引格式

**根索引** (`images/index.json`)：

```json
[
  {
    "year": 2026,
    "month": 4,
    "count": 15,
    "url": "https://img.upxuu.com/images/2026/4/index.json"
  }
]
```

**月份索引** (`images/2026/4/index.json`)：

```json
[
  {
    "name": "1234567890_123.jpg",
    "url": "https://img.upxuu.com/images/2026/4/5/1234567890_123.jpg",
    "date": "2026-4"
  }
]
```

## IndexNow 自动提交

保存文章时自动提交到 Bing 搜索引擎：

- **触发时机**：文章保存成功
- **提交方式**：异步后台任务`

## 安全认证

- **登录验证**：管理员密码认证
- **CAPTCHA**：Safe.UpXuu.com CAPTCHA 验证
- **会话管理**：localStorage 存储 token

## 移动端优化

- 顶部工具栏固定定位，滚动时始终可见
- 发布按钮集成在设置面板中，避免误触
- 响应式设计，适配各种屏幕尺寸

## 许可证

MIT

## 鸣谢

- [Vditor](https://github.com/Vanessa219/vditor) - 优秀的 Markdown 编辑器
- [Cloudflare Workers](https://workers.cloudflare.com/) - 无服务器平台
- [TailwindCSS](https://tailwindcss.com/) - 实用工具 CSS 框架
- [IndexNow](https://www.indexnow.org/) - 搜索引擎索引提交协议
