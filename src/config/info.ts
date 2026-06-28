export const infoConfig = {
  // Configures the animated typing under the site title
  subtitle: {
    sequence: [
      "HI I AM UPXUU",   // First message
      2500,               // Delay (ms)
      "UPXUU AND YOU",    // Second message
      2500,               // Delay (ms)
    ],
  },

  // Page banner labels, grid style opacity and sub-typing anims for Talks
  banner: {
    title: "UpXuu",
    gridPatternOpacity: 0.12, // subtle background grid pattern mapping
    labels: {
      category: "Category",
      tag: "Tag",
      post: "POST",
      talk: "TALK"
    },
    talkTicker: {
      sequence: [
        "upxuu的碎碎念~",
        2500,
        "LIFE AND STUDY",
        2500,
      ]
    }
  },

  // Redesigned custom footer configuration
  footer: {
    copyrightText: "© 2026 UpXuu. All Rights Reserved. ",
    icp: {
      text: "萌 ICP 备 20269996 号",
      link: "https://icp.gov.moe/?keyword=20269996"
    },
    links: [
      { name: "友情链接", path: "/friends", external: false },
      { name: "RSS", path: "/rss.xml", external: true },
      { name: "更新订阅", path: "/sub", external: true },
      { name: "Sitemap", path: "/sitemap.xml", external: true }
    ]
  }
};
