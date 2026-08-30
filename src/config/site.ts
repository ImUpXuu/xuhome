

export const siteConfig = {
  
  title: "UpXuu",
  
  subtitle: "HI I AM UPXUU / UPXUU AND YOU",
  
  description: "UpXuu's personal blog and portfolio",
  
  author: "UpXuu",
  
  url: "https://upxuu.com", // Base URL of the site
  
  avatar: "https://upxuu.com/images/me.jpg",
  
  signature: "逐光而上！",

  
  socials: {
    github: "https://github.com/ImUpXuu",
    
    githubUser: "IMUPXUU",
    bilibili: "https://space.bilibili.com/3546855124240550",
    
    bilibiliMid: "3546855124240550",
    
    bilibiliDisplayName: "UPXUU",
    email: "upxuu@outlook.com",
    website: "https://upxuu.com",
    
    twitter: "https://x.com/IMUPXUU",
    youtube: "https://youtube.com/@UpXuu",
    wechat: "@imljxu",
    qq: "3697773416",
    
    qqGroup: "https://qun.qq.com/universal-share/share?ac=1&authKey=NZ9BP%2BPT44nu34JWAL4Jdz25Bq7ueQoOfOqA4iYPT1JvQKYktml43kgBTMfqTkNl&busi_data=eyJncm91cENvZGUiOiIxMTAzMjMyNDIyIiwidG9rZW4iOiJTZDh2RmhWbXFTL3ZHbVBXeXhJZndQTVcrOUlhNXRSNlczVG1GNUIzQnlQejFZSThWYStSSEVEWUtDcHdHSTM3IiwidWluIjoiMzY5Nzc3MzQxNiJ9&data=HZcezojmJTU_U4qRqv_3ODAb7vm86b6wP8YEp9Stz5b4EzngKNFllXJneyVO7qr4u-plsM84FyvpZl6kkuyZgg&svctype=4&tempid=h5_group_info",
    
    subscribe: "https://github.com/ImUpXuu/xuhome/issues",
  },

  
  waline: {
    
    serverURL: 'https://comment.upxuu.com',
  },

  
  analytics: {
    umami: [
      { src: "https://stats.upxuu.com/script.js", id: "cd983d6c-e011-489d-903f-4757ce41c14d" },
    ],
    
    statsApi: {
      alltime: 'https://blogapi.476543.xyz/statsapi/alltime',
      active: 'https://blogapi.476543.xyz/api/active',
    },
  },

  
  assets: {
    
    defaultPostCover: "",
    
    randomImage: "https://bing.biturl.top/",
    
    favicon: "/images/me.jpg",
  },

  
  startTime: new Date(2025, 8, 30, 20, 20, 0),

  
  trustedDomains: [
    'github.com',
    'bilibili.com',
    'space.bilibili.com',
    'icp.gov.moe',
  ],
};


export interface NavItem {
  
  name: string;
  
  href: string;
  
  external?: boolean;
}

export const navConfig: {
  desktop: NavItem[];
  mobileMore: NavItem[];
  external: NavItem[];
} = {
  
  desktop: [
    { name: "首页", href: "/" },
    { name: "说说", href: "/talks" },
    { name: "友链", href: "/friends" },
    { name: "关于", href: "/about" },
    { name: "归档", href: "/posts" },
    { name: "统计", href: "/stats" },
    { name: "标签", href: "/tags" },
    { name: "AI", href: "/ai" },
    { name: "音乐", href: "/music" },
  ],
  
  mobileMore: [
    { name: "友链", href: "/friends" },
    { name: "关于", href: "/about" },
    { name: "归档页面", href: "/posts" },
    { name: "网站统计", href: "/stats" },
    { name: "标签", href: "/tags" },
    { name: "AI", href: "/ai" },
    { name: "音乐", href: "/music" },
  ],
  
  external: [
    { name: "开往", href: "https://www.travellings.cn/go.html", external: true },
    { name: "服务状态", href: "https://up.upxuu.com/status/1", external: true },
    { name: "QQ群", href: siteConfig.socials.qqGroup, external: true },
  ],
};


export const footerConfig = {
  
  copyrightText: "© 2026 UpXuu. All Rights Reserved. ",
  
  icp: {
    text: "",
    link: "https://icp.gov.moe/?keyword=20269996",
  },
  
  links: [
    { name: "友情链接", path: "/friends", external: false },
    { name: "RSS", path: "/rss.xml", external: true },
    { name: "Sitemap", path: "/sitemap.xml", external: true },
    { name: "隐私政策", path: "/privacy", external: false },
  ],
  
  repoText: "本站已开源 ",
  
  repoUrl: "https://github.com/ImUpXuu/xuhome",
  
  repoDisplayName: "IMUPXUU/XUHOME",
};


export const seoConfig = {
  
  defaultTitle: "UpXuu's blog",
  
  titleTemplate: " - UpXuu's blog",
  
  defaultDescription: "UpXuu 的个人博客，记录一位独立开发者的生活随笔、编程实践与技术思考。涵盖 Web 开发、Astro 建站、开源项目与日常感悟，用文字连接数字世界的每一份热爱。",
  
  defaultImage: "https://upxuu.com/images/me.jpg",
  
  keywords: ["UpXuu", "blog", "开发者", "生活", "学习", "技术分享", "upxuu的碎碎念"],
  
  twitter: {
    card: "summary_large_image",
    site: "@ImUpXuu",
    creator: "@ImUpXuu",
  },
  
  dnsPrefetch: [
    "//f.xxu6.top",
    "//" + new URL(siteConfig.waline.serverURL).host,
  ],
  
  preconnect: [
    { url: "https://f.xxu6.top", crossOrigin: "anonymous" },
    { url: siteConfig.waline.serverURL, crossOrigin: "anonymous" },
  ],
  
  robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
};


export const bannerConfig = {
  
  title: "UpXuu",
  
  gridPatternOpacity: 0.12,
  
  labels: {
    category: "Category",
    tag: "Tag",
    post: "POST",
    talk: "TALK",
  },
  
  talkTicker: {
    sequence: [
      "upxuu的碎碎念~",
      2500,
      "LIFE AND STUDY",
      2500,
    ],
  },
};


export const subtitleConfig = {
  sequence: [
    "HI I AM UPXUU",
    2500,
    "UPXUU AND YOU",
    2500,
  ],
};


export const welcomeConfig = {
  
  enabled: true,
  
  duration: 5000,
  
  weatherApi: "https://uapis.cn/api/v1/misc/weather",
  
  fallbackMessage: "Hi！远方的朋友",
  
  sessionKey: "xuhome_visit_flag",
  
  quickLinks: [
    { name: "QQ群", href: siteConfig.socials.qqGroup, color: "blue" },
    { name: "订阅", href: siteConfig.socials.subscribe, color: "green" },
    { name: "RSS", href: "", action: "copyRss", color: "orange" },
  ],
};


export const contentConfig = {
  
  postsPerPage: 10,
  
  readingSpeed: 400,
  
  license: {
    
    name: "All Rights Reserved",
    
    url: "/about",
  },
  
  aiSummaryModels: [
    { id: 'gpt-oss', name: 'GPT-OSS-120B', url: 'https://blogapi.upxuu.com/summarize', hasThinking: false },
    { id: 'gemma', name: 'Gemma-4-31b-it (OpenRouter)', url: 'https://blogapi.upxuu.com/summarize2', hasThinking: true },
    { id: 'deepseek-r1', name: 'DeepSeek-R1', url: 'https://blogapi.upxuu.com/summarize3', hasThinking: true },
  ],
  
  aiChatModels: [
    { id: 'gpt-oss', name: 'GPT-OSS-120B', url: 'https://blogapi.upxuu.com/chat', hasThinking: false },
    { id: 'gemma', name: 'Gemma-4-31b-it (OpenRouter)', url: 'https://blogapi.upxuu.com/chat2', hasThinking: true },
    { id: 'deepseek-r1', name: 'DeepSeek-R1', url: 'https://blogapi.upxuu.com/chat3', hasThinking: true },
  ],
};


export const aboutConfig = {
  
  title: "关于我",
  
  description: "UpXuu的个人介绍、独立开发者履历与前端技术栈栈架构建。",
  
  role: "前端开发者 / 独立创作者",
  
  intro: `你好，世界！我是 ${siteConfig.author}-(ljx)。一个在sb河北上学的cs\n目前专注于学习前端 Python（其实是上学罢了） 热爱分享，持续折腾（hardly）。`,
  
  skills: [
    "React", "TypeScript", "Node.js", "Astro", "Tailwind CSS",
    "Next.js", "Vue", "Vite", "Git", "Figma",
  ],
  
  githubBio: "HI I am UpXuu. A developer, student, simple people from HeBei, China.",
  
  bilibiliTitle: "MY bilibili @UPXUU",
  
  githubLink: "https://github.com/Imupxuu",
  
  githubValue: "@ImUpXuu\nupxuu",
  
  emailValue: "ME@UPXUU.COM",
  
  emailLink: "mailto:ME@UPXUU.COM",
  
  wechatValue: "@imljxu",
  
  qqValue: "3697773416",
  
  socialEmailLink: "mailto:me@upxuu.com",
};


export const i18nConfig = {
  
  notFound: {
    title: "页面未找到",
    bigText: "404",
    message: "这个页面好像不见了",
    backHome: "回到首页",
    browseArchive: "浏览归档",
  },
  
  archive: {
    title: "文章归档",
    description: "博客文章时间轴归档",
    timelineTitle: "时间轴",
    emptyText: "暂无文章归档",
    emptySubtext: "还没有发布任何文章",
    
    sectionTitle: "归档",
  },
  
  home: {
    
    title: "UPXUU的博客",
    
    description: "UpXuu 的个人博客，分享 Web 开发、Astro 建站与开源项目实践的技术文章，以及一名初中生的日常随笔与生活思考。原创内容覆盖前端开发、Vite 生态、AI 应用与中考纪实，适合开发者与年轻创作者阅读。",
    
    sectionTitle: "最新文章",
  },
  
  talks: {
    
    title: "说说",
    
    sectionTitle: "说说",
    
    description: "UpXuu 的说说微动态——生活碎碎念、随手记录与日常分享。",
  },
  
  talk: {
    
    detailFallbackTitle: "说说详情",
  },
  
  category: {
    
    titleSuffix: " 分类",
    
    descriptionTemplate: "{name} 分类下的全部文章 - UpXuu的个人博客",
  },
  
  tag: {
    
    titleSuffix: " 标签",
    
    descriptionTemplate: "标签 {name} 下的全部文章 - UpXuu的个人博客",
  },
  
  friends: {
    title: "友情链接",
    description: "UpXuu的友情链接，汇集各路神仙的有趣博客、个人小站。",
  },
  
  privacy: {
    title: "隐私政策",
    description: "UpXuu 博客的隐私政策——我们如何收集、使用和保护你的个人信息。",
    lastUpdated: "2026 年 8 月 12 日",
    effectiveDate: "2026 年 8 月 12 日",
    contactEmail: "me@upxuu.com",
  },
  
  stats: {
    title: "网站统计",
  },
  
  post: {
    readingTime: "预计阅读",
    readingTimeUnit: "分钟",
    copyrightTitle: "作者",
    publishedTitle: "发布于",
    licenseTitle: "许可协议",
    relatedPosts: "相关文章",
    prevPost: "上一篇",
    nextPost: "下一篇",
    noMorePrev: "没有更多上一篇了",
    noMoreNext: "没有更多下一篇了",
    tocTitle: "目录",
    tocEmpty: "无目录",
    
    viewToc: "查看目录",
  },
  
  search: {
    placeholder: "搜索文章标题、简述、内容或标签...",
    clear: "清除",
    noResults: "哎呀，没有找到文章",
    jumpTo: "跳转...",
    go: "GO",
  },
  
  common: {
    darkMode: "暗色",
    lightMode: "亮色",
    more: "更多",
    openMenu: "打开菜单",
    closeMenu: "关闭菜单",
    toggleDarkMode: "切换暗色模式",
  },
};
