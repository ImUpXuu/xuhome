---

title: "?Android Studio 打开，等 Gradle sync 完直?Run"
published: 2026-06-07 17:50:00
description: "之前搞了blog-admin-workers当静态博客后台，Vditor在手机上体验一般。于是我用Kotlin+Compose搓了个原生Android客户端，和Worker后端完美配对?"
category: "技术?"
---

之前不是写了?[blog-admin-workers](https://github.com/ImUpXuu/blog-admin-workers) 嘛，一整套基于 Cloudflare Workers 的静态博客管理后台?

Worker 后端确实好用，Vditor 编辑器该有的都有，自动保存草稿、图床上传、友链管理、IndexNow 提交，真没得喷。但问题来了—?*手机端浏览器打开 Vditor，体验还是差点意?*。操作按钮太小，键盘和工具栏打架，想传个图片还得先开 PC ?Typora 跑上传脚本。属于是出门在外想改个文章，很不爽?

于是我一拍脑袋：**搓个原生 Android 客户端吧?*

直接开干，搞了个叫 XUCMS 的玩意，和之前那个静态博客后台完美对接上力。先看个 repo?

::github{repo="imupxuu/XUCMS"}

## App 架构

XUCMS 是用 **Kotlin + Jetpack Compose + Material 3** 写的 Android 原生应用。整?App 的导航结构很简单：

```
Splash ?Login ?Main (底部?tab)
                    ├── PostList ?PostEdit
                    ├── TalkEdit (直接进入编辑?
                    ├── Gallery
                    └── Settings ?About
```

登录后会进主界面，底部导航四个页签：文章列表、说说编辑、图库、设置。右下角有个 FAB，一键新建文章或说说?

![XUCMS 主界面](https://img.476543.xyz/img/2026/6/7/20260607180158_060.png)

```kotlin
sealed class Screen(val route: String) {
    data object Splash : Screen("splash")
    data object Login : Screen("login")
    data object PostList : Screen("post_list")
    data class PostEdit(val filename: String, val sha: String?) : Screen("post_edit/{filename}?sha={sha}")
    data class TalkEdit(val filename: String, val sha: String?) : Screen("talk_edit/{filename}?sha={sha}")
    data object Gallery : Screen("gallery")
    data object Settings : Screen("settings")
    data object About : Screen("about")
}
```

## API 对接

核心 API 客户端在 `data/Api.kt`，基?OkHttp + kotlinx.serialization，直接调?Worker 后端?REST 接口。Base URL 完全可配置，登录的时候自己填?

```kotlin
object Api {
    var BASE_URL = ""
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    // 文章
    suspend fun getPosts(token: String): List<PostItem>
    suspend fun getPost(token: String, filename: String): PostDetail
    suspend fun putPost(token: String, filename: String, body: PostPutBody): PostPutResponse
    suspend fun deletePost(token: String, filename: String, sha: String)

    // 说说
    suspend fun getTalks(token: String): List<TalkItem>
    suspend fun getTalk(token: String, filename: String): TalkDetail
    suspend fun putTalk(token: String, filename: String, body: TalkPutBody): TalkPutResponse
    suspend fun deleteTalk(token: String, filename: String, sha: String)

    // 图片
    suspend fun getImages(token: String): List<ImageItem>
    suspend fun deleteImage(token: String, filename: String, sha: String)
    suspend fun uploadImage(token: String, body: UploadImageBody): UploadImageResponse
}
```

Worker 后端负责?GitHub 仓库交互，App 只管?API 就行。所有的 Token 认证?header，登录时输入的密码作?Token 存到 SharedPreferences 里?

```kotlin
// data/Models.kt - 数据模型
@Serializable
data class PostItem(val name: String, val sha: String, val title: String? = null,
                    val date: String? = null, val type: String? = null)
@Serializable
data class PostDetail(val content: String, val sha: String)
@Serializable
data class PostPutBody(val content: String, val sha: String? = null)
```

## 数据模型设计

Worker 后端存储?Markdown 文件有严格的 frontmatter 格式，App 里用 `FrontmatterParser.kt` 来解析和生成?

```kotlin
class FrontmatterParser {
    // 解析 --- 包裹?YAML ?
    fun parse(content: String): FrontmatterResult

    // 生成 frontmatter + body
    fun generate(title: String, date: String?, category: String?,
                 tags: List<String>?, description: String?, image: String?,
                 draft: Boolean?, sticky: Int?, body: String): String

    // 根据标题自动生成文件名（去掉特殊字符，中英混合）
    fun generateFilename(title: String): String
}
```

解析的时候把 frontmatter 字段读出来填充到 UI 上，编辑完再重新拼回去。文件名?`generateFilename` 自动从标题生成，不用手动命名，清爽?

## 几个亮点

**1. 双模?Markdown 编辑?*

编辑器基?richeditor-compose，支?*富文本可视化模式**?*源码模式**一键切换?

可视化模式下工具栏提供了?
- H1 / H2 / H3 / P 段落（Dropdown 选择?
- 粗体、斜体、下划线、删除线
- 无序列表（UL）、有序列表（OL?
- 分割?`---`
- 图片插入（从设备上传或从图库选）

切到源码模式可以直接手写 Markdown，满足硬核需求?

![文章编辑?- 超级简洁](https://img.476543.xyz/img/2026/6/7/20260607180241_025.png)

**2. Frontmatter 元数据管?*

编辑文章的时候，顶部有一?Frontmatter 面板，可以设置：
- **标题**（自动填充到 frontmatter title?
- **发布日期**（DatePicker 选择?
- **分类 & 标签**
- **描述 / 摘要**
- **封面?URL**
- **草稿状?*（draft: true 不发布）
- **置顶优先?*（sticky 数字，越大越靠前?

保存的时?`FrontmatterParser.generate()` 把这些字段拼成完整的 frontmatter 块，再加正文内容，一条完整的 `.md` 文件就生成了?

**3. 30s 自动保存 + 崩溃恢复**

这功能我是真心觉得重要。写文章写到一?App 崩了，啥都没了，那不得气死。所以搞了个自动保存机制?

```
编辑器启??30s 后开始周期自动保???30s 存一?
  ├─ 文章内容 ?SharedPreferences（key 为文件名?
  ├─ 保存时间?
  └─ 通知栏显?"已自动保存草?
```

下次打开编辑器时检测到有未发布的草稿，弹窗提示恢复。列表里的草稿项会打?**[缓存]** 徽章，一眼识别?

```kotlin
// AppPreferences.kt
fun saveDraft(key: String, content: String)
fun getDraft(key: String): String?
fun clearDraft(key: String)
fun getAllDraftKeys(): Set<String>
```

**4. 自定义登录端?+ Token 管理**

登录界面不是硬编码的。Base URL 和密码都能自己填?

```
┌─────────────────────────?
?服务器地址              ?
?https://img.476543.xyz  ?
?                        ?
?管理员密?             ?
?********                ?
?                        ?
?[        登录        ]  ?
└─────────────────────────?
```

填好之后调用 `Api.getTalks(password)` 验证。密码就?Token，存?SharedPreferences 里，后续所?API 请求都带这个 Token ?header 里?

```kotlin
class TokenManager(context: Context) {
    private val prefs = context.getSharedPreferences("auth", Context.MODE_PRIVATE)

    fun getToken(): String? = prefs.getString("token", null)
    fun saveToken(token: String) = prefs.edit().putString("token", token).apply()
    fun clearToken() = prefs.edit().remove("token").apply()
    fun hasToken(): Boolean = getToken() != null
}
```

**5. 图库管理**

Worker 后端有个 `/api/images` 接口，会递归列出 photo 仓库下所有图片（按年/?日组织）。App 里用 `GalleryScreen` 展示所有图片，支持搜索过滤?

图片列表里每?item 显示缩略图、文件名、路径。点击放大预览，长按弹出操作菜单?
- 复制纯链接（直接贴到 Markdown 里）
- 复制 Markdown 格式（`![](url)`?
- 删除图片
- 多选批量操?

上传新图的时候走 `ImageUtil.kt`?

```kotlin
object ImageUtil {
    // ?URI 读取图片，压缩编码为 Base64
    suspend fun encodeImage(context: Context, uri: Uri): String

    // 生成唯一文件? yyyy/M/d/yyyyMMddHHmmss_XXX.ext
    fun generateFilename(context: Context, uri: Uri): String
}
```

图片压缩后再?Base64 ?Worker，Worker 再提交到 GitHub photo 仓库。虽?Base64 比二进制?30%，但 Worker 免费额度完全扛得住，不用白不用?

**6. Material 3 主题**

UI 完全基于 Material 3 设计规范，支持三种主题模式：

```kotlin
enum class ThemeMode { SYSTEM, LIGHT, DARK }
```

?Settings 里切换，用的?Compose ?`MaterialTheme` 动态配色。浅色干净，深色护眼，系统模式自动跟随。图标也重新设计了一?2D 矢量风格的深蓝色启动图标，和 UpXuu 品牌色一致?

![XUCMS 海报](https://img.476543.xyz/img/2026/6/7/20260607180417_146.png)

## ?Worker 后端的血缘关?

这俩东西本来就是一套系统?

```
┌──────────?    HTTP/HTTPS     ┌──────────────?    GitHub API     ┌─────────?
? XUCMS   ? ────────────────  ?blog-admin-  ? ───────────────  ? GitHub ?
?Android  ? ←──────────────  ?workers      ? ←────────────── ? Repos   ?
?  App    ?   JSON + Token    ?(Cloudflare) ?  git commit     ?(存储)  ?
└──────────?                   └──────────────?                  └─────────?
```

- **XUCMS (Android)**：提?UI 界面，发 HTTP 请求
- **Worker 后端**：处理请求，操作 GitHub 仓库文件
- **GitHub**：Markdown 文章 + 图片的实际存储层

Worker 免费额度每天 10 万次调用，GitHub 无限私有仓库。中间没有任何传统服务器?*零成本跑一整套静态博客管理系?*?

| 层级 | 技?| 成本 |
|------|------|------|
| 客户?| Kotlin + Jetpack Compose + Material 3 | 免费 |
| 后端 API | Cloudflare Workers | 免费?0万次/天） |
| 文章存储 | GitHub Repo (Git API) | 免费 |
| 图片存储 | GitHub Repo (photo 仓库) | 免费 |
| CI/CD | GitHub Actions | 免费 |

属于是零成本一条龙了属于是?

## 项目结构

```
XUCMS/
├── app/src/main/java/com/example/
?  ├── MainActivity.kt              # 入口，初始化 Base URL
?  ├── auth/
?  ?  └── LoginScreen.kt           # 登录?
?  ├── data/
?  ?  ├── Api.kt                   # HTTP API 客户?
?  ?  ├── AppPreferences.kt        # 本地设置 + 草稿存储
?  ?  ├── Models.kt                # 数据模型
?  ?  └── TokenManager.kt          # Token 管理
?  ├── gallery/
?  ?  ├── GalleryScreen.kt         # 图库管理
?  ?  └── GallerySelectionModal.kt # 图库选择弹窗
?  ├── navigation/
?  ?  └── AppNavigation.kt         # 导航路由
?  ├── post/
?  ?  ├── PostEditScreen.kt        # 文章编辑?
?  ?  └── PostListScreen.kt        # 文章列表
?  ├── settings/
?  ?  ├── AboutScreen.kt           # 关于页面
?  ?  └── SettingsScreen.kt        # 设置页面
?  ├── splash/
?  ?  └── SplashScreen.kt          # 启动动画
?  ├── talk/
?  ?  └── TalkEditScreen.kt        # 说说编辑?
?  ├── ui/theme/
?  ?  ├── Color.kt                 # 颜色定义
?  ?  ├── Theme.kt                 # Material 3 主题
?  ?  └── Type.kt                  # 字体排版
?  └── util/
?      ├── FrontmatterParser.kt     # Frontmatter 解析/生成
?      └── ImageUtil.kt             # 图片压缩编码
```

## 部署与安?

项目?GitHub 上开源，可以直接?Android Studio 打开构建?

```bash
git clone https://github.com/ImUpXuu/XUCMS.git
# ?Android Studio 打开，等 Gradle sync 完直?Run
```

环境要求?
- AGP 8+
- Gradle 8.5+ / 9.3
- JDK 17

GitHub Actions 也已经配好了 CI/CD。打一?`v1.0.0` 之类?tag，Action 会自动跑 `assembleRelease` 然后?APK 发布?Releases 页面。我现在已经?debug APK 放在 `.build-outputs/` 目录下了，直接下载就能装?

```yaml
# .github/workflows/release.yml
on:
  push:
    tags:
      - 'v*'
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
      - name: Build Release APK
        run: ./gradlew assembleRelease
      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          files: app/build/outputs/apk/release/*.apk
```

## 最后说两句

之前写完 blog-admin-workers 的时候就想，要是有个手机上能直接用的原生客户端就爽了。现在终于把它搓出来了捏?

?Worker 后端?Android 客户端，整条链路上没有花一分钱。Cloudflare Workers 免费额度、GitHub 免费仓库、GitHub Actions 免费构建——全是白嫖，体验还不错。虽然功能还没到完美，但日常写写文章、发发说说、管管图片已经完全够用?

App 是开源的，如果你也在?blog-admin-workers 那一?Worker 博客后台，可以直接装 XUCMS 来管理。有啥建议或?bug 欢迎?Issue，awa

---

**相关阅读?*
- [还在本地写博客？来试试基于worker的博客后台](/posts/blog-admin/)
- [ExTalk - 下一代边缘计算评论系统](/posts/extalk/)
