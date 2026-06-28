import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const postsDir = join(__dirname, "..", "..", "src", "content", "posts");
const outputPath = join(__dirname, "..", "..", "articles-index.json");

function parseFrontmatter(filePath) {
  const text = readFileSync(filePath, "utf-8");
  const parts = text.split("---\n");
  if (parts.length < 3) return null;
  const raw = parts[1];
  const body = parts.slice(2).join("---\n");

  const get = (key) => {
    const m = raw.match(new RegExp(`^${key}[:\\s]+(.+)$`, "m"));
    if (!m) return null;
    let v = m[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    return v;
  };

  const title = get("title");
  const publishedRaw = get("published");
  const description = get("description") || "";
  const category = get("category") || "";
  const tagsRaw = get("tags");

  let tags = [];
  if (tagsRaw && tagsRaw.startsWith("[")) {
    tags = tagsRaw
      .slice(1, -1)
      .split(",")
      .map((t) => t.trim().replace(/["']/g, ""))
      .filter(Boolean);
  }

  const slug = filePath.split(/[\\/]/).pop().replace(/\.md$/, "");
  const wordCount = body.replace(/[\s\n\r]+/g, " ").split(" ").filter(Boolean).length;

  return {
    title,
    slug,
    description,
    category,
    tags,
    wordCount,
    published: publishedRaw
      ? new Date(publishedRaw).toISOString()
      : null,
    updated: null,
  };
}

const files = readdirSync(postsDir)
  .filter((f) => f.endsWith(".md"))
  .sort();

const articles = [];
for (const file of files) {
  const result = parseFrontmatter(join(postsDir, file));
  if (result && result.title) {
    articles.push(result);
  }
}

articles.sort((a, b) => {
  if (a.published && b.published) return b.published.localeCompare(a.published);
  if (a.published) return -1;
  if (b.published) return 1;
  return 0;
});

writeFileSync(outputPath, JSON.stringify(articles, null, 2), "utf-8");
console.log(`Generated articles-index.json with ${articles.length} articles`);
