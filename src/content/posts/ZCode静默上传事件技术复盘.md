---
title: ZCode 静默上传事件技术复盘：一次仓库快照如何带走完整 Git 历史
keywords: ["ZCode", "智谱", "ZCode静默上传", "AI编程工具", "数据安全", "Git历史", "隐私合规", "逆向分析", "阿里云OSS", "法律风险"]
description: 2026 年 9 月 18 日智谱 ZCode 被曝登录态下静默打包工作区并上传完整 .git 历史。本文还原上传链路、快照构成与过滤逻辑，核对官方回应与流传说法，分析可能面临的法律风险，并给出自查与阻断方案。
published: 2026-09-19 15:00:00
slug: zcode-silent-git-upload-forensics
tags: ["逆向", "数据安全", "AI"]
categories:
  - 技术
---

2026 年 9 月 18 日，开发者 ferstar 在清理磁盘时发现 `~/.zcode` 占用异常，顺着目录挖出一份 313MB 的加密快照。当天，智谱 AI 的编程客户端 ZCode 被确认存在以下行为：**只要账号处于登录状态，客户端会在后台静默打包整个工作区并加密上传至阿里云 OSS，打包内容包含完整的 `.git` 目录。**

事件在 30 小时内完成"曝光 → 多平台独立复现 → 官方致歉 → 承诺整改"的完整周期。本文不复述情绪，只做四件事：还原技术链路、核对官方口径、纠正流传的错误说法、给出可执行的自查与阻断方案。

## 一、本地留下了什么

证据链的起点在 `~/.zcode/v2/checkpoints/`。这是按工作区哈希分目录的投料区，每个工作区一份 `state.json`：

```json
{
  "workspacePath": "/Users/ferstar/myprojects/<a commercial project>",
  "lastCompressedSize": {
    "encryptedSizeBytes": 313070842,
    "workspaceSizeBytes": 345549173
  },
  "kind": "baseline",
  "failureCount": 564
}
```

`kind: baseline` 表示这是一次全量快照而非增量。345MB 工作区被压成 313MB 密文，躺在 `pending/` 目录里等待重传。

判断"是否已经上传成功"的关键字段是 **`lastAcceptedManifestHash`**。客户端代码只在 `uploadObject(...).ok` 之后才调用 `markAcceptedManifest` 写入该字段并清理 pending 文件。因此它表示"客户端认为对象已成功上传"，而不是"本地扫描完成"。

> 需要特别纠正一点：`failureCount` **不是**上传失败次数。它是跨任务累计值——某个已尝试但失败的 pending 会在下一个 turn boundary 时加一，作为下一份快照的 attribution 发送。单包的真实上传次数记录在 `attemptCount`，默认策略是**最多尝试 3 次、最长保留 24 小时**。

## 二、上传链路

逆向客户端 `app.asar` 后，完整链路如下：

```
① 客户端 → GET https://zcode.z.ai/api/v1/snapshot/upload-credential
   ← snapshot_id + RSA 公钥 + key_version + max_size
     + OSS Host + Object Key + 表单签名(x-oss-signature /
       x-oss-credential / x-oss-security-token) + callback

② 本地扫描  git ls-files --cached --others --exclude-standard -z
   + appendRootGitMetadataPaths() 递归读取根 .git 全部文件

③ 打包为 tar.gz（含 prompt 信息、文件 Manifest、增量信息、真实文件正文）

④ 加密  随机 32B AES key + 16B nonce → AES-256-CTR 加密归档
   → RSA-OAEP-SHA256 包裹 AES key

⑤ 登记 pendingUpload，multipart/form-data POST 直传 OSS
   文件名固定为 repo-snapshot.tar.gz.enc

⑥ OSS callback 通知智谱后端登记 → 客户端写 lastAcceptedManifestHash
```

调用链为：

```
sendPrompt → captureBeforePrompt → tokenProvider → getUploadKey
→ scanRepoSnapshot → createEncryptedRepoSnapshotArtifact
→ registerPendingUpload → flushWorkspace → uploadObject
```

两个设计要点：

**其一，直传不经业务服务器。** 客户端拿到凭证后直接向 OSS 发起 POST，智谱业务服务器只在最后收到 OSS 的回调通知。数据流向的责任边界因此更难被用户核查。

**其二，密钥归属在服务端。** 这是标准信封加密：AES-256-CTR 加密内容，再用 RSA-OAEP-SHA256 包裹对称密钥。但**公钥由服务端在凭证协商时动态下发，对应私钥从头到尾只在云端**。本机只保存 `encryptedDataKey`，没有任何用户持有的解密路径。用本机全部私钥去解那份 313MB 密文会失败——这不是配置问题，是设计如此。

换句话说：**加密保护的是传输和对象存储中的密文，它不构成"用户独占密钥的端到端加密"。**服务端持有私钥即具备完整解密能力。

## 三、快照里装了什么

密文解不开，但生成时留下的 Manifest（文件清单）是明文存在本地的。两份独立样本的统计：

| 样本 | 密文体积 | 工作区 | 文件数 | `.git` 占比 |
| --- | --- | --- | --- | --- |
| ferstar（macOS） | 313 MB | 345 MB | 42,411 | **86.6%** |
| 第三方只读取证（3.12.3） | 747.9 MiB | 758.0 MiB | 7,946 | **98.91%** |

样本一的 `.git` 内部拆分：`.git/lfs` 56.8%、`.git/objects` 29.6%、`.git/logs` 0.2%，其余源码与文档仅占 13.4%。

**两份样本的差异说明 `.git` 占比高度依赖项目结构**（是否用 LFS、历史长度、当前源码体量），实测区间为 **86.6% – 98.9%**。只引单一数值是不严谨的。

样本二确认清单还包含：`.git/config`、`.git/HEAD`、`.git/packed-refs`、68 个 refs 文件、78 个 reflog 文件、6,475 个 `.git/objects` 文件。

此外还有一份 `repo_snapshot_extra_manifest`，会把全局配置一并搭车上传：`settings.behavior.json`（761 B）、`skills.json`（32,741 B）。代码里还实现了更多收集器，可纳入用户 MCP Server 配置、全局命令、Hooks、Memory 内容、Sub-agent 配置、插件元数据，以及全局 `~/.zcode/AGENTS.md`。

`.git` 之所以比当前源码敏感得多，是因为它相当于项目的**时间机器 + 回收站 + 研发档案馆**：几年前的历史版本、已删除或覆盖的文件、未推送到远端的本地分支、切分支/回退留下的 reflog、`.git/config` 里的内部 GitLab 地址、曾误提交后删除的密码与 Token、以及 Git LFS 下载过的大文件。执行 `rm .env && git commit` 只能删掉当前工作区文件，**不会抹除历史提交中的 `.env`**。

## 四、过滤逻辑里那个 `.git` 白名单分支

这是整个事件里最值得注意的技术细节。

ZCode 对**普通文件**设有相当完整的排除规则：

```
排除：node_modules / .cache / .turbo / dist / build / .next / coverage
      .env / .npmrc / 私钥后缀 / 文件名含 token 或 secret
      超过 1 MiB 的普通文件 / 二进制文件
```

但过滤函数**首先判断路径是否属于 `.git`**：只要命中根 `.git` 或内部目录，直接返回 `include: true`，后续的敏感文件名、文件大小、二进制检查**全部跳过**。

```js
async function Nct(e) {
  let t = s$(e.workspacePath, ".git"), r;
  r = await Z_e(t);
  return r.isDirectory()
    ? j_e(e.candidatePaths, await q_e(t, e.signal))
    : j_e(e.candidatePaths, [t]);
}
```

这意味着一个明确的事实：**开发者意识到工作区里可能存在 Token、私钥和密码文件并做了防护，但没有把防护覆盖到 Git 历史，反而为 `.git` 开了高优先级通道。**`.git` 内部文件因此也不受 1 MiB 上限约束。

## 五、为什么两个开关都关不掉

设置页里有两个看似相关的开关，它们与上传行为的关系如下：

| 开关 | 用户预期 | 实际作用 |
| --- | --- | --- |
| 优化体验 `optimizeAgentExperienceEnabled` | 关闭数据收集 | **仅控制是否授权用于模型训练** |
| 仓库快照索引 `repoSnapshotIndexingEnabled` | 关闭快照功能 | **仅控制服务端是否建立索引** |

代码层面的原因：`RepoSnapshotUploadWorker` 与 `RepoSnapshotSidecarService` 在 ZCode Host 启动时**直接实例化**；`captureBeforePrompt` 只检查两件事——当前是否为本地工作区、登录 token 能否取到。全树搜索 `repoSnapshotIndexingEnabled` 仅命中两处：schema 定义与 `normalizeSettingsPatch`。**采集调用链上不存在任何对该开关的条件判断。**

讽刺的是，`repoSnapshotIndexingEnabled` 本身还会被写入全局配置快照一并上传。

触发时机有两个：`captureBeforePrompt`（每次发 Prompt 前）与任务结束时的 `repo-wiki-update`。日志统计显示单个活跃会话最多产生 **62 次**捕获。

另外两点实测结论：

- **手动删除无效。** 删掉 pending 包后半小时内客户端会重新打包一份。
- **与模型渠道无关。** 即使配置第三方 API 端点，快照 sidecar 只认登录态 JWT，照拍照传。

## 六、官方回应

9 月 18 日下午，智谱在 ZCode 官方社群发布情况说明。要点：

- 问题源于"代码库索引"功能，该功能用于在本地生成仓库索引，支撑会话检查点恢复、历史版本回退及 Repo Wiki；
- Repo Wiki 生成 Wiki 页面时可能触发仓库数据上传，**Wiki 页面在云端生成后，相关上传数据会立即销毁、不会保存**；
- 该功能上线初期**默认开启**，部分用户因此受影响，问题已修复；
- 近期将**开源 ZCode 代码库**，邀请第三方评估人员独立审查并持续公开进展；
- 为全体用户额外提供一次周额度重置。

一个容易被忽略的细节：据快科技 9 月 18 日 19:08 报道，**该回应首发于用户群（由"官方大管家"发布），当时智谱官方微博等渠道尚未发表**。

需要指出，官方说明**完全没有回应"关闭开关后仍会上传"这一指控**——而这恰是整件事里最严重的一项。

## 七、致歉后版本的实际行为

有第三方团队针对致歉后的 3.12.3 版本做了独立复现（隔离假 HOME + asar 静态逆向 + CDP 界面驱动 + MITM 全流量 + 金丝雀标记比对）。实验矩阵与结果：

| 条件 | 结果 |
| --- | --- |
| CLI 登录态触发 prompt | 无快照产物（CLI bundle 不含上传管线） |
| GUI + `repoSnapshotIndexingEnabled=false`（新默认） | 零 checkpoints / 零 `.enc` / 零 `upload-credential` 请求 |
| GUI + 手动置 `true` | **同样全零**，客户端开关已无法激活按 prompt 采集 |
| GUI + 全流量 MITM | 无凭证请求、无 OSS POST；服务端 `configs` / `scenes` 响应体中无任何 snapshot/wiki 键 |
| Repo Wiki 路径排查 | UI 入口在当前服务端配置下不可达 |

结论有三层：

1. 丑闻描述的"每条 prompt 静默打包全仓库上传"行为在 3.12.3 中**不复现**；
2. "修复"的实际形态是 **开关默认值翻转为 `false` + 老配置强制迁移 + Repo Wiki 在服务端配置中整体下线**；
3. **上传管线代码未从客户端删除**——`/api/v1/snapshot/upload-credential` 端点构造、`captureBeforePrompt`、`RepoWikiGenerator`、信封加密实现均完整保留，理论上可经服务端配置重新启用。

也就是说，**修复发生在默认值与服务端配置层，而非能力移除层**。安全状态因此依赖服务端配置的持续正确，而不是客户端的结构性保证。

该复现报告自身也披露了局限：单一版本、单一账号、WSL2 环境，Repo Wiki 生成路径未能实际触发（UI 入口不可达），其上传行为属推断而非实测，且无第三方安全机构复核。

## 八、几个流传说法的核查

| 流传说法 | 核查结论 |
| --- | --- |
| "上传用户的全量 Git 操作 / 记录了每条 git 命令" | **不准确**。是快照机制未排除 `.git`，导致 Git 历史被整包纳入。不一定录下敲命令的过程，却可能拿走这些操作留下的大量结果 |
| "`failureCount: 564` = 上传失败 564 次" | **不准确**。它是跨任务累计值，见第一节 |
| "`.git` 占快照 86.6%" | **不完整**。区间为 86.6% – 98.9% |
| "上传了 313MB 代码" | **易误导**。313MB 是密文体积，对应 345MB 工作区，且其中 86.6% 是 `.git` 历史 |
| "官方已彻底修复" | **不完整**。行为已停止，但能力未移除 |
| "GLM 与 ZCode 撇清关系" | **未找到任何支撑证据**。智谱官网明确表述"ZCode 是 GLM-5.3 官方 Agent Harness"，隐私政策载明运营主体为北京智谱华章科技股份有限公司 |
| "该事件导致 GLM-5.5 延期上线" | **未找到官方来源**。同期官方正常发布了 GLM-5.3-FlashX |
| "智谱拿这些数据是为了搞后训练" | **属推测，非事实**。完整 Git 历史对后训练确有价值，但**目前无任何证据表明这些数据被用于训练** |
| "上传的数据已被用于训练 / 已泄露" | **无证据**。风险在于"能力存在"，而非"已发生" |

隐私政策方面，ZCode 现行政策（更新日期 2026-06-15）在"内容生成和 AI 辅助操作"条目下写的是收集"您在对话中向我们提交的文本、文件和代码"，全文未提及工作区快照或 Git 历史上传。

## 九、自查与阻断

### 自查（只读，不修改任何文件）

```bash
# 1. 查看快照目录占用
du -sh ~/.zcode/v2/checkpoints 2>/dev/null

# 2. 查找 pending 加密包
find ~/.zcode/v2/checkpoints -type f -name '*.tar.gz.enc' -print 2>/dev/null

# 3. 关键：查找"远端已接受"记录
find ~/.zcode/v2/checkpoints -name state.json -print0 2>/dev/null \
  | xargs -0 grep -l 'lastAcceptedManifestHash'
```

```python
import json
from pathlib import Path

base = Path.home() / ".zcode" / "v2" / "checkpoints"
if not base.exists():
    print("未发现 ZCode checkpoints 目录")
    raise SystemExit(0)

for state_file in base.rglob("state.json"):
    try:
        d = json.loads(state_file.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"读取失败: {state_file}: {exc}")
        continue
    print(f"状态文件: {state_file}")
    print(f"  工作区: {d.get('workspaceKey') or d.get('workspacePath')}")
    print(f"  远端接受记录: {bool(d.get('lastAcceptedManifestHash'))}")
    print("-" * 60)

for mf in base.rglob("manifests/*.json"):
    try:
        m = json.loads(mf.read_text(encoding="utf-8"))
    except Exception:
        continue
    git_paths = [i.get("path", "") for i in m.get("files", [])
                 if i.get("path", "").startswith(".git/")]
    if git_paths:
        print(f"{mf}: 发现 {len(git_paths)} 个 .git 条目")
```

判读说明：本地**没有** `lastAcceptedManifestHash` 不能 100% 证明从未上传；本地**存在**该字段也无法说明服务端当前是否仍保留数据。它只是一项本地取证线索。另外，`failureCount` 高不代表"没传上去"——baseline 很可能早已上传，pending 的只是后续增量。

### 阻断方案对比

| 方式 | 阻止外传 | 阻止本地打包 | 主要代价 |
| --- | --- | --- | --- |
| 屏蔽当前 OSS Host | 可以 | 不可以 | Host 动态下发，规则易失效 |
| 屏蔽 `*.aliyuncs.com` | 大概率 | 不可以 | 影响其他阿里云服务 |
| 进程级防火墙禁止访问 OSS | 可以 | 不可以 | 需 LuLu / Little Snitch 等 |
| 屏蔽整个 `zcode.z.ai` | 可以 | 可以 | 登录、模型、额度一起失效 |
| **锁定空 checkpoints 目录** | **可以** | **可以** | 检查点回滚 / 时间线失效 |
| 使用 API Key 而非 OAuth 登录 | 可以 | 可以 | 静态分析表明 OAuth 登录态是快照管线的唯一触发门槛 |
| 退出账号并完全退出 | 可以 | 可以 | 无法使用客户端 |

内核级锁定（唯一能同时阻止打包与外传的方案）：

```bash
# macOS
rm -rf ~/.zcode/v2/checkpoints && mkdir -p ~/.zcode/v2/checkpoints
chflags uchg ~/.zcode/v2/checkpoints
# 验证：应输出 Operation not permitted
touch ~/.zcode/v2/checkpoints/test
# 回滚：chflags nouchg ~/.zcode/v2/checkpoints

# Linux
rm -rf ~/.zcode/v2/checkpoints && mkdir -p ~/.zcode/v2/checkpoints
sudo chattr +i ~/.zcode/v2/checkpoints
# 回滚：sudo chattr -i ~/.zcode/v2/checkpoints
```

```powershell
# Windows（管理员 PowerShell，需先彻底退出 ZCode 含托盘）
$ck = "$env:USERPROFILE\.zcode\v2\checkpoints"
Remove-Item "$ck\*" -Recurse -Force
icacls $ck /inheritance:r /grant "${env:USERNAME}:(OI)(CI)(RX)" /deny "${env:USERNAME}:(OI)(CI)(WD,AD,WEA,WA)"
# 验证：应报 Access denied
New-Item "$ck\test.txt" -ItemType File -EA Stop
# 回滚：icacls $ck /remove:d "$env:USERNAME"
```

注意：网络拦截失败后 pending 包不会立刻消失（单包最多 3 次、最长 24 小时）。屏蔽 OSS 只解决"暂时传不出去"，未解决后台打包与磁盘占用。

### 如果确认已上传

1. **不要只删本地缓存。** 删除 `~/.zcode` 只能清理本地文件，不能撤回已上传数据，还可能破坏取证线索。
2. **扫描 Git 历史中的密钥**：
   ```bash
   docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect --source=/repo --verbose
   docker run --rm -v "$PWD:/repo" trufflesecurity/trufflehog:latest git file:///repo --only-verified
   ```
3. **轮换密钥，而不是只删代码。** 凡曾进入 Git 历史的凭证一律作废重建：云平台 AK/SK、代码托管平台 Token、数据库密码、SSH 私钥、各模型 API Key、支付/短信/邮件凭证、K8s Token 与 kubeconfig 证书。`git rm .env && git commit` 不足以消除风险。
4. **通过官方渠道申请删除。** 隐私政策规定可发邮件至 `user_feedback@z.ai`，官方承诺 15 天内答复。
5. **敏感仓库长期隔离。** 不要让含真实密钥、客户数据、内部 remote 的仓库直接作为 AI 工具的工作区。改用 shallow clone、`git worktree`、已剥离敏感 remote 与 refs 的临时副本，或独立用户环境。
6. **全局配置别放真密钥。** `.zcode/v2` 下的 `model-providers.json` / `provider_config.json` 可能存有明文 API key，且该目录位于可被端走的射程内。不要把 `.zcode/v2` 整个交给网盘同步。

## 十、这件事真正的问题在哪

抛开动机推测，可核实的问题结构是三条：

**范围越界。** 生成 Repo Wiki 通常只需要当前工作树的文本源码、目录结构和依赖文件。它不需要 `.git/objects`、`.git/logs`、`.git/refs`、`.git/lfs`、`.git/config`。即使某项功能确实需要提交历史，也可以通过受控命令提取最小信息（如 `git log --max-count=100 --pretty=format:'%h %s'`），而不是打包整个 `.git`。**必要性不等于无限授权。**

**控制权越界。** 加密做得很规范，但解密能力只在服务端。如果这个功能真的为用户侧的恢复或同步而设计，密钥本该属于用户——就像 Git 和 Time Machine 那样。

**知情权越界。** 隐私政策写的是"对话中提交的文本、文件和代码"，全文没有提及整库快照与 Git 历史上传。用户看着设置页会天然以为"我没开训练、没开索引，就应该不上传"。

一个值得行业记住的评估框架：

```
默认上传什么？                  是否明确提示？
能否上传前预览？                忽略规则是否可靠？
关闭后是否立即停止？            云端数据能否删除？
企业代码是否用于训练？          客户端行为能否被审计？
上传管线代码是否在客户端保留？  修复是"默认值翻转"还是"能力移除"？
```

最后两项是这次事件新增的教训。理想的授权设计应该是分级的，而不是二选一：

```
仅当前文件 → 用户选择的目录 → 当前工作树（排除敏感文件） → 提交摘要 → 完整历史（单独授权）
```

每扩大一级范围，都该让用户明确知道新增了什么数据。

同类事件并不孤立。2026 年 7 月，xAI 的 Grok Build CLI 被安全研究者用 mitmproxy 抓包发现同类静默上传问题，随后 xAI 开源了 Grok Build。这次事件在 Hacker News 冲到首页（287 分、97 条评论），评论区一条高赞表述很精准：**"信封加密 + 服务端持有私钥，把本地备份变成了远程资产提取。"**

---

## 十一、可能面临的法律风险

先说明边界：**截至本文发布，未见任何监管机构公开立案或表态。** 下面是对既有事实与现行法条的分析，说的是"可能"，不是"已经"。相关法条引用请以官方文本为准，本文不构成法律意见。

### 中国内地

| 法律 | 相关条款 | 争议点 |
| --- | --- | --- |
| 《个人信息保护法》 | 第 14 条（告知同意） | 同意应在充分知情前提下自愿、明确作出。隐私政策只写了"对话中提交"的内容，未告知整库快照与 Git 历史上传，同意范围可能不覆盖该行为 |
| 《个人信息保护法》 | 第 6 条（最小必要） | 上传完整 Git 历史远超"AI 编程辅助"目的所必需 |
| 《个人信息保护法》 | 第 66 条（法律责任） | 情节严重可处五千万元以下或上一年度营业额百分之五以下罚款，并可**责令暂停或终止提供服务** |
| 《数据安全法》 | 第 27 条（数据安全保护义务） | 应建立健全全流程数据安全管理制度 |
| 《数据安全法》 | 第 45 条（处罚） | 五万元以上五十万元以下罚款，对直接责任人一万元以上十万元以下 |
| 《民法典》 | 第 1038 条 | 未经同意不得向他人非法提供个人信息 |
| 《反不正当竞争法》/《刑法》第 219 条 | 侵犯商业秘密 | 若 `.git` 中含企业内部仓库地址、未公开研发动向 |

### 中国香港（上市公司特有维度）

智谱于 2026 年 1 月 8 日在港交所上市（02513.HK，按 18C 章特专科技公司规则）。这意味着除了产品合规，还叠加一层**信息披露义务**：

| 法律 / 规则 | 争议点 |
| --- | --- |
| 《个人资料（私隐）条例》保障资料第 1、3、4 原则 | 须以合法公平方式收集并告知用途；无订明同意不得用于新目的；须采取切实可行步骤保障资料安全 |
| 同条例第 64 条 | 未经同意披露个人资料，最高罚款 100 万港元及监禁 5 年 |
| 港交所《上市规则》 | 发行人须完整披露数据安全内控机制与潜在合规风险，重大遗漏可能构成虚假或误导性陈述 |
| 《证券及期货条例》第 XIVA 部 | 内幕消息须在合理可行范围内尽快披露 |

### 风险的结构性判断

单看罚款绝对额并不算高——按智谱 2024 年 3.124 亿元收入计算，个保法第 66 条"上一年度营业额百分之五"的量级有限。**真正有分量的是两个非金钱后果**：

一是**责令暂停或终止提供服务**。这是可以伤及主营业务的处置，对一家正在发力 AI 编程赛道、刚上市不久的公司来说，量级完全不同。

二是**信息披露层面的连带风险**。作为 18C 上市公司，如果该事件被认定为需要披露的重大事项而披露不及时或不充分，问题就从产品合规延伸到证券监管，可能触及内幕消息披露义务甚至证券虚假陈述民事索赔。

而让法律风险显著放大的，恰恰是那个**"关闭开关仍会上传"**的事实。因为在合规判断里，"我们提供了开关"和"开关真的有效"是两回事。前者是流程，后者才是实质性的同意。当用户明确表达了拒绝、而客户端仍然打包上传时，抗辩空间会被大幅压缩。

这也是为什么官方声明里唯独回避了这一点——它没法用"功能默认开启"解释过去。

---

## 写在最后

上面是能核实的事实。下面这些是我的个人看法，可以跳过。

说实话，看到那个 `.git` 白名单分支的时候，我的第一反应不是愤怒，是困惑。因为排除 `node_modules`、排除 `.env`、排除带 `token`/`secret` 的文件名——这些都说明写代码的人**知道**工作区里有什么。他知道有密钥，他做了防护。然后他给 `.git` 开了一个优先级更高的通道，让所有检查都跳过。

我没法判断这是疏忽还是选择，文章里也没做这个判断。但这个组合确实很难用"手滑"解释。

**但真正让我对智谱彻底失望的，不是这个分支，是后面那一整套反应。**

第一，声明首发在用户群里，由"官方大管家"发布，官方微博和官网当时都没有。这不是公告，是定向安抚。一个涉及百万用户数据边界的问题，用这种方式回应，本身就是态度。

第二，整份说明里，唯独**没有回应"关闭开关后仍会上传"**。而这恰恰是整件事里最严重的一条——因为它不是"默认开启"能解释的。默认开启是产品决策，开关失效是权限控制失效。挑最轻的那条归因，回避最重的那条，这不是疏忽。

第三，"已修复"这三个字经不起看。第三方对致歉后的 3.12.3 做独立复现，结论是：行为确实停了，但**上传管线的代码一行都没删**，只是把开关默认值翻成 `false`、把老配置强制迁移、把 Repo Wiki 在服务端下线。也就是说，现在安全是因为服务端配置正确，不是因为客户端做不到。这两者的区别，在信任问题上不是小事——它意味着这件事随时可以再来一次。

第四，承诺开源代码库、邀请第三方独立审查、持续公开进展。到今天，一条都没有落地。既没有仓库地址，也没有审计机构的名字。

**我原来写这段的时候还想替他们说句话——"便宜和好用是真的，数据边界的问题也是真的，这两件事可以同时成立。"现在我收回这句。**因为这两件事能不能同时成立，取决于厂商愿不愿意把边界当回事。给 `.git` 开白名单、让两个开关都关不掉、修复只改默认值、关键指控不回应、开源承诺不兑现——这一串选择连起来看，我没办法再说"只是能力不够"。

关于法律风险，我在第十一节列了可能适用的条款。我不想替监管下判断，但有一点是清楚的：**"我们提供了开关"和"开关真的有效"是两回事。**前者是流程，后者才是实质性的同意。用户明确表达了拒绝，客户端仍然打包上传——这个事实会让抗辩空间变得很窄。至于会不会真的被追责、追到什么程度，那是监管和司法的事，我会看。

我自己也装过 ZCode，GLM-5.3 配它的体验确实不错，HCI 做得比不少同类工具顺手。所以我不是在说这个工具不好用。我是说，**一个工具好不好用，和一个厂商值不值得信任，是两个独立的问题。**这次事件让我对前者的评价没变，对后者的评价清零了。

实际的行动我会做几件以前懒得做的事：给 AI 工具单独建个用户、把敏感仓库用 shallow clone 隔离、把 `.env` 换成 sops 加密只在运行时注入、装任何新的 AI 工具先翻一遍 `checkpoints` 目录。这些动作成本不高，但能把"信任"从口头承诺变成自己手里的一道闸。

至于智谱，我不会再等他们的开源和审计了。真做了我会看，但不会再当成一个需要等待的承诺。**一家公司在被实锤之后选择怎么回应，比它出了什么问题更能说明它是什么公司。**这次我看到了。

> 本文技术细节来自公开的第三方逆向分析与独立复现，官方仅确认"Repo Wiki 生成时触发仓库数据上传、功能默认开启、已修复"。文中未发现任何证据表明上传数据被用于模型训练或被泄露；关于动机的讨论已明确标注为推测。截至本文发布，未见监管机构公开立案或表态。第十一节的条款分析请以官方文本为准，不构成法律意见。
