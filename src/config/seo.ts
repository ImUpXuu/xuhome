export const seoConfig = {
  defaultTitle: "UpXuu's blog",
  titleTemplate: " - UpXuu",
  defaultDescription: "UpXuu's personal blog and portfolio - life, study, code and thoughts.",
  defaultImage: "https://f.xxu6.top/2427/in.jpg",
  keywords: ["UpXuu", "blog", "开发者", "生活", "学习", "技术分享", "upxuu的碎碎念"],
  twitter: {
    card: "summary_large_image",
    site: "@ImUpXuu",
    creator: "@ImUpXuu"
  },
  dnsPrefetch: [
    "//f.xxu6.top",
    "//comment.upxuu.com"
  ],
  preconnect: [
    { url: "https://f.xxu6.top", crossOrigin: "anonymous" },
    { url: "https://comment.upxuu.com", crossOrigin: "anonymous" }
  ],
  robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
};
