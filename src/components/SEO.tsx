import { siteConfig } from "../config/site";
import { seoConfig } from "../config/seo";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  url?: string;
  isArticle?: boolean;
  keywords?: string[];
}

export function SEO({
  title,
  description,
  image = seoConfig.defaultImage,
  type = "website",
  url = typeof window !== 'undefined' ? window.location.href : '',
  isArticle = false,
  keywords,
}: SEOProps) {
  const pageTitle = title 
    ? `${title}${seoConfig.titleTemplate}` 
    : `${siteConfig.title} - ${siteConfig.subtitle.split(' / ')[0]}`;
  const pageDescription = description || seoConfig.defaultDescription;
  const pageKeywords = keywords?.length ? keywords : seoConfig.keywords;
  
  
  const canonicalUrl = siteConfig.url 
    ? `${siteConfig.url}${typeof window !== 'undefined' ? window.location.pathname : ''}` 
    : url;

  return (
    <>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords.join(", ")} />
      <meta name="author" content={siteConfig.author} />
      <meta name="robots" content={seoConfig.robots} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content={isArticle ? "article" : type} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteConfig.title} />
      <meta property="og:locale" content="zh-CN" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      
      <meta name="twitter:card" content={seoConfig.twitter.card} />
      <meta name="twitter:site" content={seoConfig.twitter.site} />
      <meta name="twitter:creator" content={seoConfig.twitter.creator} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={image} />

      
      {seoConfig.dnsPrefetch.map(domain => (
        <link key={domain} rel="dns-prefetch" href={domain} />
      ))}
      {seoConfig.preconnect.map(conn => (
        <link key={conn.url} rel="preconnect" href={conn.url} crossOrigin={conn.crossOrigin as any} />
      ))}
    </>
  );
}
