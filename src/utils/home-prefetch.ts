const PREFETCH_ROOT_MARGIN = '300px';
const MAX_PREFETCH_REQUESTS = 2;

const attemptedUrls = new Set<string>();
const queuedUrls = new Set<string>();
const inflightUrls = new Set<string>();

let prefetchObserver: IntersectionObserver | null = null;
let domObserver: MutationObserver | null = null;
let isRunning = false;

function getConnection() {
  return (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
}

function getMaxConcurrentPrefetches() {
  const connection = getConnection();
  if (connection?.saveData) return 0;
  if (/^(slow-)?2g$/.test(connection?.effectiveType || '')) return 0;
  if (connection?.effectiveType === '3g') return 1;
  return MAX_PREFETCH_REQUESTS;
}

function urlKey(href: string) {
  const url = new URL(href, window.location.href);
  return url.pathname + url.search;
}

async function prefetchArticle(url: string) {
  try {
    const response = await fetch(url, {
      credentials: 'same-origin',
      redirect: 'follow',
      priority: 'low',
    } as RequestInit);
    if (response.ok) await response.arrayBuffer();
  } catch {
    // Keep the homepage clean if a prefetch fails.
  } finally {
    inflightUrls.delete(urlKey(url));
    drainPrefetchQueue();
  }
}

function drainPrefetchQueue() {
  const limit = Math.max(0, getMaxConcurrentPrefetches() - inflightUrls.size);
  for (const url of Array.from(queuedUrls).slice(0, limit)) {
    queuedUrls.delete(url);
    inflightUrls.add(url);
    void prefetchArticle(url);
  }
}

function queuePrefetch(href: string) {
  const key = urlKey(href);
  if (key === urlKey(window.location.href) || attemptedUrls.has(key)) return;

  attemptedUrls.add(key);
  queuedUrls.add(key);
  drainPrefetchQueue();
}

function scanLinks(root: ParentNode = document) {
  if (!prefetchObserver) return;

  for (const link of root.querySelectorAll<HTMLAnchorElement>('a[href^="/posts/"]')) {
    const key = urlKey(link.href);
    if (key === '/posts/' || attemptedUrls.has(key)) continue;

    prefetchObserver.observe(link);
  }
}

function handlePrefetchEntries(entries: IntersectionObserverEntry[]) {
  const visible = entries
    .filter(entry => entry.isIntersecting)
    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

  for (const entry of visible) {
    prefetchObserver?.unobserve(entry.target);
    if (entry.target instanceof HTMLAnchorElement) queuePrefetch(entry.target.href);
  }
}

function setupHomePrefetch() {
  if (isRunning || window.location.pathname !== '/') return;

  prefetchObserver = new IntersectionObserver(handlePrefetchEntries, {
    rootMargin: PREFETCH_ROOT_MARGIN,
    threshold: 0,
  });
  domObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') scanLinks(mutation.target as ParentNode);
    }
  });
  domObserver.observe(document.body, { childList: true, subtree: true });
  scanLinks(document);
  isRunning = true;
}

function teardownHomePrefetch() {
  prefetchObserver?.disconnect();
  prefetchObserver = null;
  domObserver?.disconnect();
  domObserver = null;
  isRunning = false;
  queuedUrls.clear();
  inflightUrls.clear();
}

function onPageLoad() {
  if (window.location.pathname === '/') {
    setupHomePrefetch();
  } else {
    teardownHomePrefetch();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onPageLoad);
} else {
  onPageLoad();
}

document.addEventListener('astro:before-swap', teardownHomePrefetch);
document.addEventListener('astro:page-load', onPageLoad);
