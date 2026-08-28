<script lang="ts">
  import PageViews from './PageViews.svelte';
  import { afterUpdate, onMount } from 'svelte';
  import { flip } from 'svelte/animate';
  import { fade } from 'svelte/transition';
  import { siteConfig, i18nConfig } from '../config/site';

  interface SearchablePost {
    id: string;
    slug: string;
    title: string;
    date: string;
    description: string;
    img: string;
    tags: string[];
    category: string;
  }

  export let posts: SearchablePost[] = [];
  export let dataUrl: string = '';
  export let postsPerPage: number = 10;

  let searchQuery = '';
  let currentPage = 1;
  let isLoadingPosts = false;
  let loadFailed = false;
  let feedEl: HTMLElement;

  // Keep client bandwidth predictable: at most two article HTML requests run together.
  const MAX_PREFETCH_REQUESTS = 6;
  const PREFETCH_ROOT_MARGIN = '800px';
  const CACHE_NAME = 'xuhome-article-cache-v1';
  const CACHE_TTL = 30 * 60 * 1000; // 30 分钟
  const prefetchedUrls = new Set<string>();
  const queuedUrls = new Set<string>();
  const inflightUrls = new Set<string>();
  let prefetchObserver: IntersectionObserver | null = null;
  let prefetchAbortController: AbortController | null = null;

  // 预加载进度状态：link.href → 0~100（Svelte 响应式，用于卡片进度条）
  let prefetchProgress = new Map<string, number>();

  // ===== 缓存模块 =====

  function getCache(): Promise<Cache | null> {
    try { return caches.open(CACHE_NAME); }
    catch { return Promise.resolve(null); }
  }

  async function storeCachedArticle(url: string, html: string) {
    const cache = await getCache();
    if (!cache) return;
    const payload = JSON.stringify({ ts: Date.now(), html });
    const req = new Request(url.startsWith('http') ? url : location.origin + url);
    await cache.put(req, new Response(payload, { headers: { 'Content-Type': 'application/json' } }));
  }

  // 更新全局统计 + 面板显示
  function updatePanel() {
    if (typeof window === 'undefined') return;
    (window as any).__cacheStats = {
      cached: prefetchedUrls.size,
      queued: queuedUrls.size,
      loading: prefetchProgress.size,
    };
  }

  // 标记点击 HIT/MISS（供 Layout 面板读取）
  function markClick(hit: boolean, slug: string) {
    try {
      sessionStorage.setItem('[cache]lastClick', (hit ? 'HIT ' : 'MISS ') + slug);
    } catch {}
    updatePanel();
  }

  function getConnection() {
    return (navigator as Navigator & {
      connection?: {
        saveData?: boolean;
        effectiveType?: string;
      };
    }).connection;
  }

  function getMaxConcurrentPrefetches() {
    const connection = getConnection();
    if (connection?.saveData) return 0;
    if (/^(slow-)?2g$/.test(connection?.effectiveType || '')) return 0;
    if (connection?.effectiveType === '3g') return 1;
    return MAX_PREFETCH_REQUESTS;
  }

  async function prefetchArticle(url: string) {
    if (!prefetchAbortController) return;

    try {
      const response = await fetch(url, {
        signal: prefetchAbortController.signal,
        credentials: 'same-origin',
        redirect: 'follow',
        priority: 'low',
      } as RequestInit);

      if (!response.ok || !response.body) {
        inflightUrls.delete(url);
        prefetchProgress.delete(url);
        prefetchProgress = prefetchProgress;
        drainPrefetchQueue();
        return;
      }

      // 流式读取计算进度（有 Content-Length 按比例，否则按累计字节估算）
      const total = Number(response.headers.get('Content-Length')) || 0;
      const reader = response.body.getReader();
      let received = 0;
      const chunks: Uint8Array[] = [];

      const progressMinInterval = 100;
      let lastProgressAt = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          const now = Date.now();
          // 节流：100ms 内不重复触发 Svelte 重渲染（避免 afterUpdate 风暴）
          if (now - lastProgressAt >= progressMinInterval) {
            lastProgressAt = now;
            const pct = total
              ? Math.min(100, Math.round((received / total) * 100))
              : Math.min(99, Math.round(received / 1024));
            prefetchProgress.set(url, pct);
            prefetchProgress = prefetchProgress;
          }
        }
      }
      // 存入 Cache Storage
      const decoder = new TextDecoder();
      let html = '';
      for (const chunk of chunks) html += decoder.decode(chunk, { stream: true });
      html += decoder.decode();
      await storeCachedArticle(url, html);

      prefetchProgress.set(url, 100);
      prefetchProgress = prefetchProgress;
      updatePanel();
      // 完成后短暂展示满条，再淡出清除（视觉上"预加载完成"的提示）
      setTimeout(() => {
        prefetchProgress.delete(url);
        prefetchProgress = prefetchProgress;
        updatePanel();
      }, 400);
    } catch {
      // A failed prefetch must never turn into a visible homepage error.
      prefetchProgress.delete(url);
      prefetchProgress = prefetchProgress;
    } finally {
      inflightUrls.delete(url);
      drainPrefetchQueue();
    }
  }

  function drainPrefetchQueue() {
    const limit = Math.max(0, getMaxConcurrentPrefetches() - inflightUrls.size);
    const urls = Array.from(queuedUrls).slice(0, limit);

    for (const url of urls) {
      queuedUrls.delete(url);
      inflightUrls.add(url);
      void prefetchArticle(url);
    }
  }

  function queuePrefetch(link: HTMLAnchorElement) {
    const url = link.href;
    if (
      prefetchedUrls.has(url) ||
      queuedUrls.has(url) ||
      inflightUrls.has(url) ||
      url === window.location.href
    ) return;

    prefetchedUrls.add(url);
    queuedUrls.add(url);
    drainPrefetchQueue();
  }

  function addPrefetchLink(href: string) {
    if (prefetchedUrls.has(href)) return;
    const existing = document.querySelector(`link[rel="prefetch"][href="${href}"]`);
    if (existing) return;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    link.as = 'document';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }

  function scanPrefetchTargets(root: HTMLElement) {
    if (!prefetchObserver || getConnection()?.saveData) return;

    for (const link of root.querySelectorAll<HTMLAnchorElement>('a[href^="/posts/"]')) {
      const url = new URL(link.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        url.pathname === '/posts/' ||
        prefetchedUrls.has(url.href)
      ) continue;

      addPrefetchLink(url.href);
      prefetchObserver.observe(link);
    }
  }

  function handlePrefetchEntries(entries: IntersectionObserverEntry[]) {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

    for (const entry of visible) {
      const link = entry.target;
      prefetchObserver?.unobserve(link);
      if (link instanceof HTMLAnchorElement) queuePrefetch(link);
    }
  }

  function setupPrefetcher() {
    if (!feedEl || prefetchObserver) return;

    prefetchAbortController = new AbortController();
    prefetchObserver = new IntersectionObserver(handlePrefetchEntries, {
      rootMargin: PREFETCH_ROOT_MARGIN,
      threshold: 0,
    });
    scanPrefetchTargets(feedEl);
  }

  function teardownPrefetcher() {
    prefetchObserver?.disconnect();
    prefetchObserver = null;
    prefetchAbortController?.abort();
    prefetchAbortController = null;
    queuedUrls.clear();
    inflightUrls.clear();
    prefetchProgress.clear();
    prefetchProgress = prefetchProgress;
  }

  const placeholderImg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="190" height="120"%3E%3C/svg%3E';

  // React to search queries sent from navbar
  onMount(() => {
    // Populate from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const initialQ = urlParams.get('q') || '';
    searchQuery = initialQ;
    
    const pageParam = urlParams.get('page') || urlParams.get('p') || '';
    if (pageParam) {
      const pNum = parseInt(pageParam);
      if (!isNaN(pNum) && pNum > 0) {
        currentPage = pNum;
      }
    }

    const handleGlobalSearch = (e: any) => {
      if (e.detail && typeof e.detail.query === 'string') {
        searchQuery = e.detail.query;
        currentPage = 1;
      }
    };

    window.addEventListener('blog-search', handleGlobalSearch);

    // 点击追踪：判断 HIT/MISS（不阻止导航）
    // 提到具名变量，cleanup 中一并移除，避免 View Transitions 换页后堆积
    const handleClickTrack = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="/posts/"]') as HTMLAnchorElement | null;
      if (!link) return;
      if ((e as MouseEvent).metaKey || (e as MouseEvent).ctrlKey || (e as MouseEvent).shiftKey || (e as MouseEvent).altKey || (e as MouseEvent).button !== 0) return;
      const url = link.href;
      if (/\/posts\/?$/.test(url)) return;
      const slug = url.split('/').filter(Boolean).pop() || '';
      markClick(prefetchedUrls.has(url), slug);
    };
    document.addEventListener('click', handleClickTrack, true);

    updatePanel();

    if (dataUrl) {
      isLoadingPosts = posts.length === 0;
      fetch(dataUrl)
        .then(res => res.ok ? res.json() : Promise.reject(new Error(`Failed to load ${dataUrl}`)))
        .then((loadedPosts: SearchablePost[]) => {
          if (Array.isArray(loadedPosts) && loadedPosts.length > 0) {
            posts = loadedPosts;
          }
        })
        .catch(err => {
          loadFailed = true;
          console.warn('[SearchablePosts] post data unavailable', err);
        })
        .finally(() => {
          isLoadingPosts = false;
        });
    }

    return () => {
      window.removeEventListener('blog-search', handleGlobalSearch);
      document.removeEventListener('click', handleClickTrack, true);
      teardownPrefetcher();
    };
  });

  // 多个 chunk 在同一帧触发更新时，afterUpdate 只合帧跑一次
  let rafPending = false;
  afterUpdate(() => {
    if (isLoadingPosts || !feedEl) return;
    setupPrefetcher();
    if (!rafPending && prefetchObserver) {
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        if (feedEl && prefetchObserver) scanPrefetchTargets(feedEl);
      });
    }
  });

  $: filteredPosts = posts.filter(post => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      post.title?.toLowerCase().includes(q) ||
      post.description?.toLowerCase().includes(q) ||
      post.category?.toLowerCase().includes(q) ||
      (post.tags && post.tags.some(tag => tag.toLowerCase().includes(q)))
    );
  });

  $: totalPages = Math.ceil(filteredPosts.length / postsPerPage) || 1;
  $: safePage = Math.min(currentPage, totalPages);
  $: startIndex = (safePage - 1) * postsPerPage;
  $: displayedPosts = filteredPosts.slice(startIndex, startIndex + postsPerPage);

  function clearSearch() {
    searchQuery = '';
    currentPage = 1;
    // Notify navbar input to clear
    const input = document.getElementById('mobile-search-input') as HTMLInputElement;
    if (input) input.value = '';
    const mobileClear = document.getElementById('mobile-search-clear');
    if (mobileClear) mobileClear.classList.add('hidden');
  }

  function handleSearchInput(e: Event) {
    const target = e.target as HTMLInputElement;
    searchQuery = target.value;
    currentPage = 1;
  }

  function scrollToTop() {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function goToPage(p: number) {
    if (p >= 1 && p <= totalPages) {
      currentPage = p;
      scrollToTop();
      updateUrl();
    }
  }

  function updateUrl() {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (currentPage === 1) {
        url.searchParams.delete('page');
      } else {
        url.searchParams.set('page', currentPage.toString());
      }
      window.history.pushState({}, '', url.toString());
    }
  }

  function nextPage() {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  }

  function prevPage() {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }

  $: pageNumbers = (() => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);
      if (end === totalPages) start = Math.max(1, end - maxVisible + 1);
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  })();
</script>

<div class="w-full flex flex-col gap-4 sm:gap-6">
  <!-- Interactive Search input inside Desktop view -->
  <div class="relative w-full hidden sm:block">
    <input
      type="text"
      placeholder={i18nConfig.search.placeholder}
      value={searchQuery}
      on:input={handleSearchInput}
      class="w-full bg-white dark:bg-slate-700 border-4 border-[#0284c7] font-extrabold focus:outline-none px-4 sm:px-5 py-3 rounded-sm text-sm text-[#0284c7] dark:text-slate-200 placeholder-slate-400 shadow-[4px_4px_0px_0px_#0284c7] focus:shadow-[6px_6px_0px_0px_#0284c7] focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all outline-none"
    />
    <div class="absolute right-4.5 top-1/2 -translate-y-1/2 text-[#0284c7] flex items-center gap-2">
      {#if searchQuery}
        <button 
          on:click={clearSearch}
          class="text-slate-500 hover:text-[#0284c7] font-black text-xs uppercase cursor-pointer"
        >
          {i18nConfig.search.clear}
        </button>
      {/if}
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  </div>

  <div bind:this={feedEl} class="flex flex-col gap-4 sm:gap-6 md:gap-8 mt-2 sm:mt-1">
    {#if isLoadingPosts}
      <div class="bg-white dark:bg-slate-800 border-4 border-[#0284c7] p-12 shadow-[6px_6px_0px_0px_#0284c7] rounded-sm text-center">
        <p class="text-[#0284c7] font-black tracking-widest uppercase">文章加载中...</p>
      </div>
    {:else if displayedPosts.length === 0}
      <div class="bg-white dark:bg-slate-800 border-4 border-[#0284c7] p-12 shadow-[6px_6px_0px_0px_#0284c7] rounded-sm text-center">
        <p class="text-[#0284c7] font-black tracking-widest uppercase">{loadFailed ? '文章数据加载失败' : i18nConfig.search.noResults}</p>
      </div>
    {/if}

    {#each displayedPosts as post, i (post.slug)}
      <article 
        id={`post-${post.id}`} 
        class="block relative group animate-card-entrance opacity-0"
        style="animation-delay: {0.2 + (i % 12) * 0.05}s"
        animate:flip={{ duration: 400 }}
        transition:fade={{ duration: 250 }}
      >
        {#if prefetchProgress.has(`/posts/${encodeURIComponent(post.slug)}/`)}
          <div class="prefetch-bar-container">
            <div
              class="prefetch-bar"
              style="width: {prefetchProgress.get(`/posts/${encodeURIComponent(post.slug)}/`) ?? 0}%"
            ></div>
          </div>
        {/if}
        <div class="bg-white dark:bg-slate-800 border-4 border-[#0284c7] rounded-sm p-0 flex flex-row overflow-hidden shadow-[6px_6px_0px_0px_#0284c7] hover:shadow-[10px_10px_0px_0px_#10b981] hover:-translate-y-1 transition-all duration-300">
          <div class="flex-1 p-3.5 sm:p-5 md:p-6 flex flex-col justify-between min-w-0">
            <a href={`/posts/${encodeURIComponent(post.slug)}/`} class="block group">
              <h2 class="text-sm sm:text-base md:text-xl font-black text-[#0284c7] mb-1 md:mb-2 group-hover:text-[#0ea5e9] transition-colors leading-snug">
                {post.title}
              </h2>
              <p class="text-[11px] sm:text-xs md:text-sm text-slate-700 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed">
                {post.description}
              </p>
            </a>
            
            <div class="mt-2 md:mt-3.5 flex flex-wrap items-center gap-2 shrink-0">
              <span class="text-xs md:text-sm font-extrabold text-slate-500 dark:text-slate-400 shrink-0">{post.date}</span>
              <PageViews path={post.slug} />
              {#if post.category}
                <a 
                  href={`/category/${post.category}`}
                  class="bg-[#fde68a] dark:bg-amber-700/50 border-2 border-[#0284c7] px-2 py-0.5 shadow-[1px_1px_0px_0px_#0284c7] text-[#0284c7] font-bold text-[10px] md:text-xs hover:bg-[#0284c7] hover:text-white transition-colors uppercase cursor-pointer shrink-0"
                >
                  {post.category}
                </a>
              {/if}
              {#if post.tags}
                {#each post.tags.slice(0, 2) as tag}
                  <a 
                    href={`/tag/${tag}`}
                    class="bg-white dark:bg-slate-700 border-2 border-[#0284c7] text-slate-600 dark:text-slate-300 px-2 py-0.5 shadow-[1px_1px_0px_0px_#0284c7] font-bold text-[10px] md:text-xs hover:bg-[#0284c7] hover:text-white transition-colors cursor-pointer shrink-0"
                  >
                    #{tag}
                  </a>
                {/each}
              {/if}
            </div>
          </div>
          
          <a href={`/posts/${encodeURIComponent(post.slug)}/`} class="w-[100px] sm:w-[130px] md:w-[190px] shrink-0 border-l-4 border-[#0284c7] relative bg-[#fde68a] flex items-center justify-center overflow-hidden">
            <img src={post.img || placeholderImg} alt={post.title} width="190" height="120" loading="lazy" decoding="async" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerpolicy="no-referrer" on:error={(e) => { const imgEl = e.currentTarget as HTMLImageElement; if (imgEl.src !== placeholderImg) { imgEl.src = placeholderImg; } }} />
          </a>
        </div>
      </article>
    {/each}

    {#if totalPages > 1}
      <div class="flex flex-col items-center gap-6 mt-12 pb-12">
        <div class="flex flex-wrap justify-center items-center gap-2 sm:gap-3">
          <button
            on:click={prevPage}
            disabled={currentPage === 1}
            aria-label="Previous Page"
            class="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white dark:bg-slate-700 border-3 sm:border-4 border-[#0284c7] rounded-sm {currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#0ea5e9] hover:text-white transition-colors cursor-pointer shadow-[3px_3px_0px_0px_#0284c7] sm:shadow-[4px_4px_0px_0px_#0284c7]'} "
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <!-- Page numbers hidden on small screens, show only arrows -->
          <div class="hidden sm:flex items-center gap-2 sm:gap-3">
            {#if pageNumbers[0] > 1}
              <button on:click={() => goToPage(1)} class="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white dark:bg-slate-700 border-3 sm:border-4 border-[#0284c7] rounded-sm font-black text-sm sm:text-base text-[#0284c7] hover:bg-[#0ea5e9] hover:text-white transition-colors shadow-[3px_3px_0px_0px_#0284c7] sm:shadow-[4px_4px_0px_0px_#0284c7] cursor-pointer">1</button>
              {#if pageNumbers[0] > 2}
                <span class="text-[#0284c7] font-black px-1">...</span>
              {/if}
            {/if}

            {#each pageNumbers as p}
              <button
                on:click={() => goToPage(p)}
                class="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border-3 sm:border-4 border-[#0284c7] rounded-sm font-black text-sm sm:text-base transition-all cursor-pointer shadow-[3px_3px_0px_0px_#0284c7] sm:shadow-[4px_4px_0px_0px_#0284c7] active:translate-y-1 active:shadow-none {currentPage === p ? 'bg-[#0284c7] text-white' : 'bg-white dark:bg-slate-700 text-[#0284c7] hover:bg-[#ebf3ff] dark:hover:bg-slate-600'}"
              >
                {p}
              </button>
            {/each}

            {#if pageNumbers[pageNumbers.length - 1] < totalPages}
              {#if pageNumbers[pageNumbers.length - 1] < totalPages - 1}
                <span class="text-[#0284c7] font-black px-1">...</span>
              {/if}
              <button on:click={() => goToPage(totalPages)} class="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white dark:bg-slate-700 border-3 sm:border-4 border-[#0284c7] rounded-sm font-black text-sm sm:text-base text-[#0284c7] hover:bg-[#0ea5e9] hover:text-white transition-colors shadow-[3px_3px_0px_0px_#0284c7] sm:shadow-[4px_4px_0px_0px_#0284c7] cursor-pointer">{totalPages}</button>
            {/if}
          </div>

          <!-- Mobile page indicator -->
          <div class="sm:hidden px-4 h-10 flex items-center justify-center font-black text-sm font-mono text-[#0284c7] bg-[#fde68a] dark:bg-amber-700/50 border-3 border-[#0284c7] shadow-[3px_3px_0px_0px_#0284c7] rounded-sm">
            {currentPage} / {totalPages}
          </div>

          <button
            on:click={nextPage}
            disabled={currentPage === totalPages}
            aria-label="Next Page"
            class="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white dark:bg-slate-700 border-3 sm:border-4 border-[#0284c7] rounded-sm {currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#0ea5e9] hover:text-white transition-colors cursor-pointer shadow-[3px_3px_0px_0px_#0284c7] sm:shadow-[4px_4px_0px_0px_#0284c7] active:translate-y-1 active:shadow-none'}"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <!-- Jump to page input -->
        <div class="flex items-center gap-2">
          <div class="relative">
            <input 
              type="number" 
              min="1" 
              max={totalPages}
              placeholder={i18nConfig.search.jumpTo}
              class="w-20 pl-3 pr-2 py-1.5 text-sm font-bold border-3 border-[#0284c7] rounded-sm bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:shadow-[2px_2px_0px_0px_#0284c7] transition-all placeholder-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              on:keydown={(e) => {
                if (e.key === 'Enter') {
                  const val = parseInt(e.currentTarget.value);
                  if (val >= 1 && val <= totalPages) {
                    goToPage(val);
                    e.currentTarget.value = '';
                  }
                }
              }}
            />
          </div>
          <button 
            on:click={(e) => {
              const input = e.currentTarget.previousElementSibling?.querySelector('input');
              if (input) {
                const val = parseInt(input.value);
                if (val >= 1 && val <= totalPages) {
                  goToPage(val);
                  input.value = '';
                }
              }
            }}
            class="px-3 py-1.5 text-sm font-black text-[#0284c7] bg-[#fde68a] border-3 border-[#0284c7] rounded-sm shadow-[2px_2px_0px_0px_#0284c7] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            {i18nConfig.search.go}
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(.prefetch-bar-container) {
    position: absolute;
    left: 8px;
    right: 8px;
    top: 4px;
    height: 3px;
    background: rgba(2, 132, 199, 0.15);
    border-radius: 999px;
    overflow: hidden;
    z-index: 10;
    pointer-events: none;
  }
  :global(.prefetch-bar) {
    height: 100%;
    background: linear-gradient(90deg, #34d399, #10b981);
    border-radius: 999px;
    transition: width 0.18s ease-out;
    box-shadow: 0 0 6px rgba(16, 185, 129, 0.7);
  }
</style>
