<script lang="ts">
  import { onMount } from 'svelte';

  const MAX_PREFETCH_REQUESTS = 6;
  const attemptedUrls = new Set<string>();
  const queuedUrls = new Set<string>();
  const inflightUrls = new Set<string>();

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

  function sameOriginUrl(href: string) {
    try {
      const url = new URL(href, window.location.href);
      return url.origin === window.location.origin ? url : null;
    } catch {
      return null;
    }
  }

  async function prefetchPage(url: string) {
    try {
      const response = await fetch(url, {
        credentials: 'same-origin',
        redirect: 'follow',
        priority: 'low',
      } as RequestInit);
      if (response.ok) await response.arrayBuffer();
    } catch {
      // Prefetch failures are silent; the real click still works normally.
    } finally {
      inflightUrls.delete(url);
      drainPrefetchQueue();
    }
  }

  function drainPrefetchQueue() {
    const limit = Math.max(0, getMaxConcurrentPrefetches() - inflightUrls.size);
    for (const url of Array.from(queuedUrls).slice(0, limit)) {
      queuedUrls.delete(url);
      inflightUrls.add(url);
      void prefetchPage(url);
    }
  }

  function queuePrefetch(href: string) {
    const url = sameOriginUrl(href);
    if (!url || url.hash) return;
    const key = url.href;
    if (key === window.location.href) return;
    if (attemptedUrls.has(key) || queuedUrls.has(key) || inflightUrls.has(key)) return;

    attemptedUrls.add(key);
    queuedUrls.add(key);
    drainPrefetchQueue();
  }

  function scanPrefetchScopes() {
    document.querySelectorAll<HTMLElement>('[data-prefetch]').forEach(scope => {
      scope.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(link => {
        queuePrefetch(link.href);
      });
    });
  }

  function resetForPage() {
    attemptedUrls.clear();
    queuedUrls.clear();
    inflightUrls.clear();
  }

  onMount(() => {
    const timer = window.setTimeout(scanPrefetchScopes, 0);
    document.addEventListener('astro:page-load', scanPrefetchScopes);
    document.addEventListener('astro:before-swap', resetForPage);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('astro:page-load', scanPrefetchScopes);
      document.removeEventListener('astro:before-swap', resetForPage);
    };
  });
</script>

<!-- no visible UI; only prefetches marked links -->
