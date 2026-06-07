---

title: "兜兜转转开发了1个月的ExTalk，最后还是换回了成熟的方案"
published: 2026-04-26 14:15:00
description: "如果你是本站的老读者可能知道，我在很早的时候发了篇文章，介绍本站自研的评论系统，现在又换waline了..."
category: "技术"
---

# 为何更换

## ExTalk的一些问题

其实这个项目我开发了很久，投入了大量的时间和精力，几乎平时周六日一有之间就会修点东西，但是奈何前端实在是太难看了

因为我真的前端特别烂，所以基本都是用的Claude写的，但是...始终感觉这个UI不太好看，而且其实整个系统的稳定性我也没有花太多时间测试。时间实在是太紧张了....

## UpXuu的问题

emm其实好像和上一框一样吧hh，就是没时间开发了，未来如果有什么严重的安全问题可能也没法及时修复

就当图省心吧换别人开发了很久的项目

# 何以迁移

之前使用的是D1数据库+workers 所以迁移起来也比较方便 这里供大家参考吧

### ExTalk → Waline 数据迁移说明

#### 概述

将 ExTalk 评论系统的 D1 数据库数据转换为 Waline 兼容格式，包括评论、页面统计和用户数据。

### 1. Worker API 导出接口

在 Cloudflare Worker 中创建 `/export-data` 端点，通过密钥认证后导出 D1 数据库所有表数据：

```
// POST /export-data
// 需要密钥: upxuu-export-2026
```

该接口查询以下表：

- `page_views` - 页面浏览量统计
- `users` - 注册用户
- `comments` - 评论数据
- `comment_counts` - 评论计数
- `comment_reports` - 举报记录
- `allowed_domains` - 允许域名
- `page_restrictions` - 页面限制
- `page_views_log` - 访问日志（IP 防刷）

### 2. Node.js 转换脚本

使用 `convert_to_waline.js` 脚本完成数据转换：

```
node convert_to_waline.js
```

**步骤：**

1. **拉取原始数据** - 通过 HTTPS 请求 Worker API，使用 UTF-8 编码接收 JSON
2. **读取 Waline 模板** - 解析 `waline.json` 获取 Waline 数据结构和现有 objectId 起始值
3. **转换评论** - 按 Waline Comment 表结构映射字段：

| ExTalk       | Waline                               | 说明                 |
| :----------- | :----------------------------------- | :------------------- |
| `id`         | -                                    | 用于建立父子关系映射 |
| `page_url`   | `url`                                | 页面路径             |
| `nickname`   | `nick`                               | 昵称                 |
| `content`    | `comment`                            | 评论内容             |
| `email`      | `mail`                               | 邮箱                 |
| `website`    | `link`                               | 网站链接             |
| `parent_id`  | `pid`/`rid`                          | 父评论/根评论 ID     |
| `ip`         | `ip`                                 | IP 地址              |
| `user_agent` | `ua`                                 | 浏览器 UA            |
| `created_at` | `insertedAt`/`createdAt`/`updatedAt` | 时间戳               |

1. **处理回复关系** - 先转换根评论，再转换子评论，通过 `walineId` 映射建立 `pid` 和 `rid`
2. **转换 Counter** - `page_views.views` → `Counter.time`
3. **转换 Users** - 仅保留 UpXuu 管理员账号，密码使用 bcrypt 哈希

### 3. 输出

生成 `waline_import.json`，符合 Waline 导入格式：

```
{
  "__version": "1.39.3",
  "type": "waline",
  "version": 1,
  "tables": ["Comment", "Counter", "Users"],
  "data": {
    "Comment": [...],
    "Counter": [...],
    "Users": [...]
  }
}
```

------

## 转换结果

- **评论**: 256 条（根评论 231 条 + 回复 25 条）
- **页面统计**: 118 个页面
- **用户**: 1 个（UpXuu 管理员）

# 新的评论系统：Waline

[Waline | Waline](https://waline.js.org/) 之所以选择它，主要还是感觉这个UI确实挺清新的，而且部署也很方便 并且还在更新当中

![image-20260426194239589](https://edit.upxuu.com/img/2026/4/26/1777203760216_414.png)

![](https://edit.upxuu.com/img/2026/4/26/1777203800495_516.png)

我个人还是比较喜欢这种简洁的

# extalk的未来

或许在不久的将来 我会重新继续维护吧 一会会把它开源
