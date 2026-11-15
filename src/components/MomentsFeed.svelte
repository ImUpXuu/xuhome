<script lang="ts">
  import { onMount } from 'svelte';
  import { loadMoments, type MomentItem } from '../utils/momentsClient';

  export let endpoint = 'https://friend.upxuu.com/moments.json';

  interface DayGroup {
    key: string;
    date: Date;
    items: MomentItem[];
  }

  const PAGE_SIZE = 18;
  let moments: MomentItem[] = [];
  let visibleCount = PAGE_SIZE;
  let generatedAt = '';
  const dateFormatter = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' });
  const timeFormatter = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const updatedFormatter = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  let relativeTimeTick = 0;
  const SNAPSHOT_KEY = '__xuhomeMomentsSnapshot';
  const SLOW_LOAD_MS = 4000;
  const TIMEOUT_HINT_MS = 10000;
  let loading = true;
  let refreshing = false;
  let errorMessage = '';
  let slowLoading = false;
  let timeoutHint = false;
  let destroyed = false;
  let failedAvatars = new Set<string>();
  let loadTimer: number | undefined;

  $: visibleMoments = moments.slice(0, visibleCount);
  $: dayGroups = groupByDay(visibleMoments);
  $: sourceCount = new Set(moments.map(item => item.source)).size;
  $: hasMore = visibleCount < moments.length;

  onMount(() => {
    destroyed = false;
    try {
      const raw = sessionStorage.getItem(SNAPSHOT_KEY);
      if (raw) {
        const snapshot: unknown = JSON.parse(raw);
        if (snapshot && typeof snapshot === 'object' && Array.isArray((snapshot as { items?: unknown }).items)) {
          const items = (snapshot as { items: unknown[] }).items;
          if (items.every((item) => item && typeof item === 'object' && typeof (item as MomentItem).id === 'string' && typeof (item as MomentItem).publishedAt === 'string')) {
            moments = items as MomentItem[];
            visibleCount = Math.min(Math.max(visibleCount, PAGE_SIZE), moments.length);
            generatedAt = typeof (snapshot as { generatedAt?: unknown }).generatedAt === 'string' ? (snapshot as { generatedAt: string }).generatedAt : '';
            loading = false;
          }
        }
      }
    } catch { /* Ignore malformed or unavailable session storage. */ }
    beginLoadTimers();
    void refresh();
    const interval = window.setInterval(() => { relativeTimeTick += 1; }, 60000);
    return () => {
      destroyed = true;
      window.clearInterval(interval);
      if (loadTimer) window.clearTimeout(loadTimer);
    };
  });

  function beginLoadTimers() {
    if (loadTimer) window.clearTimeout(loadTimer);
    slowLoading = false;
    timeoutHint = false;
    loadTimer = window.setTimeout(() => {
      if (!destroyed && loading) slowLoading = true;
    }, SLOW_LOAD_MS);
    window.setTimeout(() => {
      if (!destroyed && loading) timeoutHint = true;
    }, TIMEOUT_HINT_MS);
  }

  async function refresh(force = false) {
    if (refreshing) return;
    refreshing = true;
    errorMessage = '';
    if (loading) beginLoadTimers();
    try {
      const result = await loadMoments(endpoint, force);
      if (destroyed) return;
      moments = result.items;
      visibleCount = Math.min(Math.max(visibleCount, PAGE_SIZE), result.items.length);
      generatedAt = result.generatedAt;
      try { sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(result)); } catch { /* Storage is optional. */ }
    } catch (error) {
      if (destroyed) return;
      errorMessage = error instanceof DOMException && error.name === 'AbortError'
        ? '连接等待超时了，请稍后再试。'
        : error instanceof Error ? error.message : '暂时无法连接朋友圈。';
    } finally {
      if (!destroyed) {
        loading = false;
        refreshing = false;
        slowLoading = false;
        timeoutHint = false;
      }
    }
  }

  function loadMore() {
    visibleCount = Math.min(visibleCount + PAGE_SIZE, moments.length);
  }

  function groupByDay(items: MomentItem[]): DayGroup[] {
    const groups = new Map<string, DayGroup>();
    for (const item of items) {
      const date = new Date(item.publishedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!groups.has(key)) groups.set(key, { key, date, items: [] });
      groups.get(key)?.items.push(item);
    }
    return Array.from(groups.values());
  }

  function dayLabel(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const difference = Math.round((today.getTime() - day.getTime()) / 86400000);
    if (difference === 0) return '今天';
    if (difference === 1) return '昨天';
    return dateFormatter.format(date);
  }

  function formatTime(value: string): string {
    return timeFormatter.format(new Date(value));
  }

  function formatUpdatedAt(value: string): string {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '同步时间未知';
    return `${updatedFormatter.format(date)} 更新`;
  }

  function relativeTime(value: string): string {
    void relativeTimeTick;
    const difference = Math.max(0, Date.now() - Date.parse(value));
    const hours = Math.floor(difference / 3600000);
    if (hours < 1) return '一小时内';
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    return days <= 1 ? '昨天' : `${days} 天前`;
  }

  function hostname(value: string): string {
    try { return new URL(value).hostname.replace(/^www\./, ''); }
    catch { return '独立博客'; }
  }

  const avatarColors = ['#dff2fc', '#e8e4fa', '#e2f3e9', '#faedcf', '#f9e5e7'];
  function avatarStyle(name: string): string {
    const hash = Array.from(name).reduce((total, letter) => total + (letter.codePointAt(0) || 0), 0);
    return `background:${avatarColors[hash % avatarColors.length]}`;
  }

  function markAvatarFailed(id: string) {
    failedAvatars = new Set(failedAvatars).add(id);
  }
</script>

<div class="mx-auto w-full max-w-[1180px] px-2 pb-14 sm:px-5">
  <header class="mb-5 flex flex-col items-center justify-between gap-4 border-b-4 border-[#0284c7] pb-5 text-center sm:flex-row sm:text-left" data-reveal>
    <div>
      <h1 class="mb-2 text-xl font-black uppercase leading-tight text-[#0284c7] dark:text-[#38bdf8] sm:text-2xl md:text-3xl">Moments 朋友圈</h1>
      <div class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
        <span class="rounded-sm border-2 border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">那些人，那些新文章</span>
        <span class="rounded-sm border-2 border-[#f59e0b] bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-bold text-[#b45309] dark:bg-amber-900/30 dark:text-amber-300">近 15 天</span>
        <span class="rounded-sm border-2 border-emerald-400 bg-green-50 px-2 py-0.5 font-mono text-[11px] font-bold text-green-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{loading ? '— 篇 · — 位朋友' : `${moments.length} 篇 · ${sourceCount} 位朋友`}</span>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <span class="hidden text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 sm:inline">{#if generatedAt}{formatUpdatedAt(generatedAt)}{:else}RSS 聚合{/if}</span>
      <button
        type="button"
        class="flex min-w-[88px] items-center justify-center gap-1.5 rounded-sm border-2 border-[#0284c7] bg-white px-3 py-1.5 text-xs font-black text-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] transition-[transform,box-shadow,border-color] hover:bg-[#fde68a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-wait disabled:opacity-60 dark:bg-slate-800 dark:text-sky-400"
        on:click={() => refresh(true)}
        disabled={refreshing}
        aria-label="重新获取朋友圈文章"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" class:animate-spin={refreshing} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 11a8.1 8.1 0 00-15.5-2M4 4v5h5M4 13a8.1 8.1 0 0015.5 2M20 20v-5h-5" /></svg>
        {refreshing ? '同步中' : '刷新动态'}
      </button>
    </div>
  </header>

  {#if errorMessage && moments.length > 0}
    <div class="mb-4 border-l-4 border-amber-400 bg-amber-50/90 px-3 py-2 text-xs font-bold text-amber-800 dark:bg-amber-950/30 dark:text-amber-200" role="status">这次同步没有成功，下面保留上次读到的内容。{errorMessage}</div>
  {/if}

  <div aria-busy={loading || refreshing}>
    {#if loading}
      <div class="space-y-6 pt-1 sm:space-y-7" role="status" aria-live="polite">
        {#each Array(4) as _}
          <div class="grid gap-2 sm:grid-cols-[78px_minmax(0,1fr)] sm:gap-4">
            <div class="flex items-center gap-2 pl-1 sm:flex-col sm:items-start sm:gap-1 sm:pl-0"><div class="h-5 w-12 rounded-sm bg-slate-200 animate-pulse dark:bg-slate-700"></div><div class="h-3 w-10 rounded-sm bg-slate-200 animate-pulse dark:bg-slate-700"></div></div>
            <div class="min-h-[128px] border-2 border-slate-200 bg-[rgba(250,248,245,0.9)] p-4 shadow-[2px_2px_0px_0px_rgba(2,132,199,0.12)] dark:border-slate-700 dark:bg-slate-800">
              <div class="flex items-center gap-3"><div class="h-9 w-9 rounded-sm bg-slate-200 animate-pulse dark:bg-slate-700"></div><div class="h-3 w-28 rounded-sm bg-slate-200 animate-pulse dark:bg-slate-700"></div></div>
              <div class="mt-4 h-5 w-3/4 rounded-sm bg-slate-200 animate-pulse dark:bg-slate-700"></div>
              <div class="mt-3 h-3 w-full rounded-sm bg-slate-200/80 animate-pulse dark:bg-slate-700/80"></div>
            </div>
          </div>
        {/each}
        {#if slowLoading}<p class="text-center text-xs font-bold text-slate-500 dark:text-slate-400">还在连朋友圈的 RSS，请稍等…</p>{/if}
        {#if timeoutHint}<button type="button" class="mx-auto block text-xs font-bold text-[#0284c7] underline" on:click={() => refresh(true)}>等待较久，重试</button>{/if}
      </div>
    {:else if errorMessage && moments.length === 0}
      <section class="my-8 border-2 border-dashed border-[#0284c7] bg-[rgba(250,248,245,0.92)] px-5 py-10 text-center shadow-[3px_3px_0px_0px_#0284c7] dark:bg-slate-800" role="alert">
        <div class="mx-auto flex h-10 w-10 rotate-2 items-center justify-center border-2 border-[#0284c7] bg-[#fde68a] text-lg font-black text-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7]">!</div>
        <h2 class="mt-4 font-black text-[#0284c7] dark:text-sky-400">朋友圈暂时没连上</h2>
        <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{errorMessage} 可以重新拉取，或者稍后再来看看。</p>
        <button type="button" class="mt-4 border-2 border-[#0284c7] bg-[#0284c7] px-4 py-2 text-xs font-black text-white shadow-[2px_2px_0px_0px_#f59e0b] transition-all hover:bg-[#0ea5e9] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none" on:click={() => refresh(true)}>重新连接</button>
      </section>
    {:else if moments.length === 0}
      <section class="my-8 border-2 border-dashed border-[#0284c7] bg-[rgba(250,248,245,0.92)] px-5 py-10 text-center shadow-[3px_3px_0px_0px_#0284c7] dark:bg-slate-800">
        <span class="inline-block -rotate-3 border-2 border-[#0284c7] bg-[#fde68a] px-2 py-1 font-mono text-xs font-black text-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7]">15 DAYS</span>
        <h2 class="mt-4 font-black text-[#0284c7] dark:text-sky-400">这十五天，有点安静</h2>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">朋友们大概正在认真生活。先去友链里串串门吧。</p>
        <a href="/friends" class="mt-4 inline-block border-2 border-[#0284c7] bg-white px-4 py-2 text-xs font-black text-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] transition-colors hover:bg-[#fde68a] dark:bg-slate-700">去友链看看 →</a>
      </section>
    {:else}
      <div class="space-y-6 pt-1 sm:space-y-7">
        {#each dayGroups as group (group.key)}
          <section class="grid gap-2 sm:grid-cols-[78px_minmax(0,1fr)] sm:gap-4">
            <div class="flex items-center gap-2 pl-1 sm:flex-col sm:items-start sm:gap-1 sm:pl-0">
              <span class="inline-block -rotate-1 border-2 border-[#0284c7] bg-[#fde68a] px-2 py-0.5 font-mono text-[11px] font-black text-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7]">{String(group.date.getMonth() + 1).padStart(2, '0')}.{String(group.date.getDate()).padStart(2, '0')}</span>
              <span class="text-[10px] font-black text-[#0284c7] dark:text-sky-400 sm:pl-1">{dayLabel(group.date)}</span>
            </div>

              <div class="space-y-3.5 sm:space-y-4">
              {#each group.items as item (item.id)}
                <article data-reveal-card class="group border-4 border-[#0284c7] bg-[rgba(250,248,245,0.94)] p-4 shadow-[5px_5px_0px_0px_#0284c7] transition-[transform,box-shadow,border-color] duration-150 ease-out hover:-translate-x-1 hover:-translate-y-1 hover:border-[#f59e0b] hover:shadow-[8px_8px_0px_0px_#f59e0b] focus-within:ring-4 focus-within:ring-[#f59e0b] focus-within:ring-offset-2 sm:p-5 dark:bg-slate-800">
                  <div class="flex items-center justify-between gap-3">
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" class="flex min-w-0 items-center gap-2.5 text-[11px] font-black text-[#0284c7] transition-colors hover:text-[#0ea5e9] dark:text-sky-400">
                      {#if item.avatar && !failedAvatars.has(item.id)}
                        <img src={item.avatar} alt="" width="36" height="36" loading="lazy" decoding="async" referrerpolicy="no-referrer" class="h-9 w-9 shrink-0 -rotate-2 rounded-sm border-2 border-[#0284c7] bg-white object-cover shadow-[2px_2px_0px_0px_#0284c7]" on:error={() => markAvatarFailed(item.id)} />
                      {:else}
                        <span class="flex h-9 w-9 shrink-0 -rotate-2 items-center justify-center rounded-sm border-2 border-[#0284c7] text-sm font-black text-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] dark:text-sky-400" style={avatarStyle(item.source)} aria-hidden="true">{Array.from(item.source)[0] || '友'}</span>
                      {/if}
                      <span class="truncate rv-txt">{item.source}</span>
                    </a>
                    <time datetime={item.publishedAt} class="shrink-0 border-2 border-amber-300 bg-amber-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300" title={relativeTime(item.publishedAt)}>{formatTime(item.publishedAt)}</time>
                  </div>

                  <div class="mt-3 flex items-start gap-2">
                    <span class="mt-2 h-2 w-2 shrink-0 -skew-x-12 border border-[#0284c7] bg-[#f59e0b] shadow-[1px_1px_0px_0px_#0284c7]" aria-hidden="true"></span>
                    <h2 class="min-w-0 text-base font-black leading-6 text-slate-800 dark:text-slate-100 sm:text-[17px] rv-txt">
                      <a href={item.link} target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true" class="transition-colors hover:text-[#0284c7] dark:hover:text-sky-400">{item.title}<svg xmlns="http://www.w3.org/2000/svg" class="mb-0.5 ml-1 inline h-3.5 w-3.5 text-[#0284c7] opacity-60 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M7 17L17 7M7 7h10v10" /></svg></a>
                    </h2>
                  </div>
                  {#if item.description}
                    <p class="mt-2 line-clamp-2 pl-4 text-[13px] font-medium leading-6 text-slate-600 dark:text-slate-300 rv-txt">{item.description}</p>
                  {/if}
                  <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-sky-200/80 pt-2 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400 rv-txt">
                    <span class="truncate">{hostname(item.sourceUrl)}</span>
                    <a href={item.link} target="_blank" rel="noopener noreferrer" class="shrink-0 border-2 border-[#0284c7] px-2 py-0.5 text-[#0284c7] hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2 dark:text-sky-400">阅读全文 →</a>
                  </div>
                </article>
              {/each}
            </div>
          </section>
        {/each}
      </div>

      {#if hasMore}
        <div class="flex justify-center py-7">
          <button type="button" on:click={loadMore} class="border-2 border-[#0284c7] bg-white px-6 py-2.5 text-xs font-black uppercase tracking-wider text-[#0284c7] shadow-[3px_3px_0px_0px_#0284c7] transition-all hover:bg-[#fde68a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none dark:bg-slate-700">再看一些（{visibleMoments.length}/{moments.length}）</button>
        </div>
      {/if}

      <footer class="mt-3 flex flex-wrap items-center justify-between gap-3 border-t-2 border-[#0284c7]/25 pt-4 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400" data-reveal>
        <span>文章版权归原作者所有，点击标题前往原站阅读。</span>
        <div class="flex items-center gap-3">
          <a href="https://friend.upxuu.com/moments.xml" target="_blank" rel="noopener noreferrer" class="border border-[#0284c7] bg-white px-2 py-1 text-[#0284c7] transition-colors hover:bg-[#fde68a] dark:bg-slate-800 dark:text-sky-400">RSS 订阅 ↗</a>
          <a href="https://friend.upxuu.com/" target="_blank" rel="noopener noreferrer" class="text-[#0284c7] transition-colors hover:text-[#0ea5e9] dark:text-sky-400">Friend RSS Hub ↗</a>
        </div>
      </footer>
    {/if}
  </div>
</div>

<style>
  @media (prefers-reduced-motion: reduce) {
    :global([data-reveal-card]), :global(.animate-pulse) { animation: none !important; }
    :global(.group:hover) { transform: none !important; }
  }
</style>
