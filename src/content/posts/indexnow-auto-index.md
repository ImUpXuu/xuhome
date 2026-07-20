---
title: 给博客接入 IndexNow + Bing 自动索引
published: 2026-05-03
description: 通过 GitHub Actions 工作流，在文章更新时自动通知 Bing 爬取新内容，再也不用手动去 Bing Webmaster 提交了。
image: ''
tags: [工具,博客,SEO,Github Action]
category: 技术
draft: false
---

之前每次写完博客都得手动去 Bing Webmaster Tools 提交 URL，麻烦得很。最近接入了 IndexNow，配合 GitHub Actions 实现了文章更新时自动通知 Bing 爬取，记录一下。

## 项目信息

我的博客仓库在这里：

::github{repo="imupxuu/myblog"}

工作流文件在这里：[.github/workflows/indexnow.yml](https://github.com/imupxuu/myblog/blob/main/.github/workflows/indexnow.yml)

## 什么是 IndexNow

[IndexNow](https://www.indexnow.org/) 是一个开放的搜索引擎索引协议，目前被 Bing、Yandex 等搜索引擎支持。原理很简单：网站主动 POST 一批 URL 给搜索引擎的 IndexNow 接口，搜索引擎收到后会尽快来抓取这些页面。

然而，如果你在搜索引擎搜索，会发现都是叫你如何配置wordpress之类的带有后台的indexnow，这些cms平台可以使用插件，可是想本站用的Astro静态站点呢...! 于是，是时候请出我们的GitHub action啦

## 接入indexnow 好处有哪些？

事实上本站其实在使用indexnow索引之前在bing的权重特别低，一次偶然的尝试让我用上了indexnow 于是...终于索引啦！

## 接入过程

### 1. 获取 IndexNow Key

#### 配置bing

登录 [Bing Webmaster Tools](https://www.bing.com/webmasters)，首先先验证站点所有权，

![image-20260503154224805](https://img.upxuu.com/images/2026/5/3/1777794145979_973.png)

这里由于我已经配置了 所以直接就是控制台 有关于如何鉴权这里就不过多赘述了

#### 获取indexnow api key

进入[How to add IndexNow to your website | Bing Webmaster Tools](https://www.bing.com/indexnow/getstarted) 一直向下滑动（真够隐藏的）

![image-20260503154448786](https://img.upxuu.com/images/2026/5/3/1777794289407_825.png)

这里有官方的教程 其实还是比较易读的微软的英文(

![image-20260503154831376](https://img.upxuu.com/images/2026/5/3/1777794511962_347.png)

说白了就是吧api key放到你的网站下 .txt 内容一样

然后就可以了

### 2. 配置 GitHub Secrets

由于这个key的权限非常高 可以直接控制你的索引 所以要把 key 存到仓库的 Secrets 里：

- 路径：**Settings → Secrets and variables → Actions → New repository secret**

- 名称：`INDEXNOW_SECRET`

- 值：你的 IndexNow key

  ![image-20260503155010533](https://img.upxuu.com/images/2026/5/3/1777794611134_692.png)

### 3. 创建工作流文件

在 `.github/workflows/indexnow.yml` 写入以下内容：

```yaml
name: IndexNow

on:
  push:
    paths:
      - "src/content/posts/**/*.md"

jobs:
  indexnow:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get changed post files
        id: changed
        run: |
          CHANGED=$(git diff --name-only HEAD~1 HEAD | grep 'src/content/posts/.*\.md$' | tr '\n' ' ')
          echo "changed=${CHANGED}" >> $GITHUB_OUTPUT

      - name: Build URLs and submit
        if: steps.changed.outputs.changed != ''
        run: |
          SITE_URL="https://upxuu.com"
          CHANGED="${{ steps.changed.outputs.changed }}"

          echo "Changed files: $CHANGED"
          echo ""

          URLS="["
          first=true
          for file in $CHANGED; do
            slug=$(basename "$file" .md)
            url="${SITE_URL}/posts/${slug}/"
            echo "  Found: $url"
            if [ "$first" = true ]; then
              first=false
            else
              URLS="${URLS},"
            fi
            URLS="${URLS}\"${url}\""
          done
          URLS="${URLS}]"

          echo ""
          echo "Submitting to Bing..."
          echo ""

          RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
            "https://www.bing.com/indexnow" \
            -H "Content-Type: application/json" \
            -H "Host: www.bing.com" \
            -d "{
              \"host\": \"upxuu.com\",
              \"key\": \"${{ secrets.INDEXNOW_SECRET }}\",
              \"urlList\": ${URLS}
            }")

          HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
          BODY=$(echo "$RESPONSE" | sed '$d')

          echo "HTTP Status: $HTTP_CODE"
          echo "Response: $BODY"
```

### 4. 工作流说明

- **触发条件**：`src/content/posts/**/*.md` 有变更时自动触发
- **精准索引**：通过 `git diff --name-only HEAD~1 HEAD` 只处理本次变更的文章
- **URL 生成**：从文件名读取 slug，拼接为 `https://upxuu.com/posts/{slug}/`
- **提交地址**：`https://www.bing.com/indexnow`
- **输出结果**：GitHub Actions 日志里直接输出 HTTP 状态码和响应内容，方便排查

## 效果

现在每次推送文章后，GitHub Actions 会自动把新文章的 URL 提交给 Bing。之前需要手动在 Webmaster 后台提交，现在完全自动化了。

不过有一点需要注意：Bing 对 IndexNow 的处理也需要时间，不会立刻出现在搜索结果里，一般几个小时到一天不等。之前主动推送到效果还是比较明显的，新文章基本当天就能被收录。

顺便修了一下博客浅色模式代码高亮看不清的问题 —— 之前只配了暗色主题 `github-dark`，浅色模式没有对应配置，现在改成双主题 `github-dark` + `github-light`，切换主题后代码块颜色就正常了。
