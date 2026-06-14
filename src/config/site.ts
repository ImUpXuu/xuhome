export const siteConfig = {
  title: "UpXuu",
  subtitle: "HI I AM UPXUU / UPXUU AND YOU",
  description: "UpXuu's personal blog and portfolio",
  author: "UpXuu",
  url: "https://upxuu.com", // Base URL of the site
  avatar: "https://upxuu.com/images/me.jpg",
  socials: {
    github: "https://github.com/ImUpXuu",
    bilibili: "https://space.bilibili.com/3546855124240550",
    email: "upxuu@outlook.com",
    website: "https://upxuu.com"
  },
  waline: {
    serverURL: 'https://comment.upxuu.com'
  },
  // Umami Analytics settings (leave source/id empty or fill in to enable scripts)
  umami: {
    src: "https://analytics.umami.is/script.js",
    id: "your-umami-website-id"
  }
};

export const navConfig = [
  { name: "博客", path: "/", icon: "BookOpen" },
  { name: "说说", path: "/talk", icon: "MessageSquare" },
  { name: "关于我", path: "/about", icon: "User" }
];

export const themeConfig = {
  colors: {
    primary: "#0284c7",
    secondary: "#0ea5e9",
    accent: "#f59e0b",
    background: "#faf8f5"
  }
};
