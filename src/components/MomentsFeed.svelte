<script lang="ts">
  import { onMount } from 'svelte';
  import { loadMoments, type MomentItem } from '../utils/momentsClient';

  export let endpoint = 'https://friend.upxuu.com/moments.json';

  interface DayGroup {
    key: string;
    date: Date;
    items: MomentItem[];
  }

  let moments: MomentItem[] = [];
  let generatedAt = '';
  let loading = true;
  let refreshing = false;
  let errorMessage = '';
  let destroyed = false;
  let failedAvatars = new Set<string>();

  $: dayGroups = groupByDay(moments);
  $: sourceCount = new Set(moments.map(item => item.source)).size;

  onMount(() => {
    destroyed = false;
    void refresh();
    return () => { destroyed = true; };
  });

  async function refresh(force = false) {
    if (refreshing) return;
    refreshing = true;
    errorMessage = '';
    try {
      const result = await loadMoments(endpoint, force);
      if (destroyed) return;
      moments = result.items;
      generatedAt = result.generatedAt;
    } catch (error) {
      if (destroyed) return;
      errorMessage = error instanceof DOMException && error.name === 'AbortError'
        ? '连接等待超时了，请稍后再试。'
        : error instanceof Error ? error.message : '暂时无法连接朋友圈。';
    } finally {
      if (!destroyed) {
        loading = false;
        refreshing = false;
      }
    }
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
    return new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date);
  }

  function formatTime(value: string): string {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(value));
  }

  function formatUpdatedAt(value: string): string {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '刚刚同步';
    return `${new Intl.DateTimeFormat('zh-CN', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(date)} 更新`;
  }

  function relativeTime(value: string): string {
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

<div class="mx-auto w-full max-w-[1080px] px-2 pb-16 pt-4 sm:px-5 sm:pt-8">
  <header class="relative border-b border-slate-300/80 pb-7 dark:border-slate-700 sm:pb-9" data-reveal>
    <div class="pointer-events-none absolute -right-1 -top-5 hidden select-none text-[112px] font-black leading-none tracking-tighter text-sky-500/[0.045] dark:text-sky-300/[0.04] md:block" aria-hidden="true">15</div>
    <div class="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
      <div class="max-w-2xl">
        <div class="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#0284c7] dark:text-sky-400">
          <span class="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
          Social · Friends' recent notes
        </div>
        <h1 class="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 sm:text-4xl md:text-[44px]">
          <span class="relative inline-block">朋友圈<span class="absolute -bottom-1 left-0 h-[3px] w-3/5 -rotate-2 rounded-full bg-amber-300"></span></span>
          <span class="ml-2 align-middle font-mono text-xs font-bold tracking-normal text-slate-400 dark:text-slate-500 sm:text-sm">/ 见字如面</span>
        </h1>
        <p class="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-500 dark:text-slate-400 sm:text-[15px]">
          不只是交换一个链接，也看看彼此最近在认真写些什么。
          这里静静收录独立博客朋友们的新文章。
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-3 border-l-2 border-sky-200 pl-4 dark:border-slate-700 sm:mb-1 sm:flex-col sm:items-end sm:gap-0 sm:border-l-0 sm:pl-0 sm:text-right">
        <div class="flex items-baseline gap-2 text-[#0284c7] dark:text-sky-400">
          <strong class="font-mono text-4xl font-black leading-none tracking-tighter sm:text-5xl">15</strong>
          <span class="text-[10px] font-black uppercase tracking-[0.2em]">days</span>
        </div>
        <span class="max-w-24 text-xs font-bold leading-5 text-slate-400 dark:text-slate-500 sm:mt-1 sm:max-w-none">只保留最近的新鲜事</span>
      </div>
    </div>
  </header>

  <div class="flex flex-wrap items-center justify-between gap-3 py-4 text-xs text-slate-500 dark:text-slate-400" data-reveal>
    <div class="flex items-center gap-2.5" aria-live="polite">
      <span class="relative flex h-2 w-2"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50"></span><span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span></span>
      {#if loading}
        <span class="font-bold">正在收取朋友们的新文章…</span>
      {:else if errorMessage && moments.length === 0}
        <span class="font-bold">聚合服务暂时走神了</span>
      {:else}
        <span><strong class="font-mono text-slate-700 dark:text-slate-200">{moments.length}</strong> 篇新文章<span class="mx-2 text-slate-300 dark:text-slate-600">/</span>来自 <strong class="font-mono text-slate-700 dark:text-slate-200">{sourceCount}</strong> 位朋友</span>
        <span class="hidden text-slate-400 dark:text-slate-500 sm:inline">{formatUpdatedAt(generatedAt)}</span>
      {/if}
    </div>
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/60 px-3.5 py-1.5 font-bold text-slate-600 transition-colors hover:border-[#0284c7] hover:text-[#0284c7] disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-400"
      on:click={() => refresh(true)}
      disabled={refreshing}
      aria-label="重新获取朋友圈文章"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" class:animate-spin={refreshing} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 11a8.1 8.1 0 00-15.5-2M4 4v5h5M4 13a8.1 8.1 0 0015.5 2M20 20v-5h-5" /></svg>
      {refreshing ? '正在同步' : '同步一下'}
    </button>
  </div>

  {#if errorMessage && moments.length > 0}
    <div class="mb-5 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200" role="status">这次同步没有成功，下面保留的是上次读到的内容。{errorMessage}</div>
  {/if}

  <div aria-busy={loading || refreshing}>
    {#if loading}
      <div class="space-y-10 pt-4" role="status" aria-label="正在加载朋友圈">
        {#each Array(3) as _}
          <div class="grid animate-pulse gap-4 md:grid-cols-[100px_minmax(0,1fr)] md:gap-7">
            <div class="hidden md:block"><div class="h-9 w-12 rounded bg-slate-200/70 dark:bg-slate-700/70"></div><div class="mt-2 h-3 w-16 rounded bg-slate-200/60 dark:bg-slate-700/60"></div></div>
            <div class="space-y-5 rounded-2xl border border-slate-200/80 bg-white/45 p-5 dark:border-slate-700 dark:bg-slate-800/40 sm:p-7">
              <div class="flex items-center gap-3"><div class="h-9 w-9 rounded-full bg-slate-200/80 dark:bg-slate-700"></div><div class="h-3 w-24 rounded bg-slate-200/80 dark:bg-slate-700"></div></div>
              <div class="h-5 w-3/4 rounded bg-slate-200/80 dark:bg-slate-700"></div>
              <div class="h-3 w-full rounded bg-slate-200/60 dark:bg-slate-700/60"></div>
              <div class="h-3 w-2/3 rounded bg-slate-200/60 dark:bg-slate-700/60"></div>
            </div>
          </div>
        {/each}
      </div>
    {:else if errorMessage && moments.length === 0}
      <section class="my-10 rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-800/40" role="alert">
        <div class="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-[#0284c7] dark:bg-sky-900/50 dark:text-sky-300"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M8.7 3.5h6.6l5.2 5.2v6.6l-5.2 5.2H8.7l-5.2-5.2V8.7zM12 8v4m0 4h.01" /></svg></div>
        <h2 class="mt-4 text-base font-black text-slate-700 dark:text-slate-200">信号暂时没有抵达</h2>
        <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{errorMessage} 文章不会在等待中丢失，可以重新连接聚合服务。</p>
        <button type="button" class="mt-5 rounded-full bg-[#0284c7] px-5 py-2 text-xs font-black text-white transition-colors hover:bg-sky-500" on:click={() => refresh(true)}>重新连接</button>
      </section>
    {:else if moments.length === 0}
      <section class="my-10 rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-800/40">
        <span class="font-mono text-4xl text-sky-300" aria-hidden="true">☁</span>
        <h2 class="mt-3 text-lg font-black text-slate-700 dark:text-slate-200">这十五天，有点安静</h2>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">朋友们大概正在认真生活。先去友链里串串门，也很不错的样子。</p>
        <a href="/friends" class="mt-5 inline-flex rounded-full border border-[#0284c7] px-5 py-2 text-xs font-black text-[#0284c7] transition-colors hover:bg-[#0284c7] hover:text-white dark:text-sky-400">去友链看看 →</a>
      </section>
    {:else}
      <div class="space-y-8 pt-3 sm:space-y-11">
        {#each dayGroups as group (group.key)}
          <section class="grid gap-3 md:grid-cols-[100px_minmax(0,1fr)] md:gap-7" data-reveal-card>
            <div class="flex items-baseline gap-2 pl-1 md:block md:pl-0 md:pt-5">
              <time datetime={group.key} class="font-mono text-xl font-black tracking-tight text-slate-700 dark:text-slate-200 md:text-[32px]">{String(group.date.getDate()).padStart(2, '0')}</time>
              <div class="text-[11px] font-bold text-slate-400 dark:text-slate-500 md:mt-1">
                <span>{new Intl.DateTimeFormat('zh-CN', { month: 'long', year: 'numeric' }).format(group.date)}</span>
                <span class="ml-2 font-black text-[#0284c7] dark:text-sky-400 md:ml-0 md:mt-1 md:block">{dayLabel(group.date)}</span>
              </div>
            </div>

            <div class="relative">
              <span class="absolute -left-[7px] top-8 hidden h-3 w-3 rounded-full border-2 border-white bg-sky-400 shadow-[0_0_0_1px_#7dd3fc] dark:border-slate-900 md:-left-[35px] md:block" aria-hidden="true"></span>
              <div class="overflow-hidden rounded-2xl border border-slate-200/90 bg-white/65 shadow-[0_5px_24px_rgba(15,23,42,0.035)] backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-800/60">
                {#each group.items as item, index (item.id)}
                  <article class="group relative px-4 py-5 transition-colors hover:bg-sky-50/70 dark:hover:bg-slate-700/35 sm:px-6 sm:py-6 {index < group.items.length - 1 ? 'border-b border-slate-200/80 dark:border-slate-700/80' : ''}">
                    <div class="flex items-center justify-between gap-4">
                      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" class="flex min-w-0 items-center gap-2.5 text-xs font-bold text-slate-600 transition-colors hover:text-[#0284c7] dark:text-slate-300 dark:hover:text-sky-400">
                        {#if item.avatar && !failedAvatars.has(item.id)}
                          <img src={item.avatar} alt="" width="34" height="34" loading="lazy" decoding="async" referrerpolicy="no-referrer" class="h-[34px] w-[34px] shrink-0 rounded-full border border-slate-200 bg-white object-cover dark:border-slate-600" on:error={() => markAvatarFailed(item.id)} />
                        {:else}
                          <span class="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-slate-200 text-xs font-black text-slate-600 dark:border-slate-600 dark:text-slate-300" style={avatarStyle(item.source)} aria-hidden="true">{Array.from(item.source)[0] || '友'}</span>
                        {/if}
                        <span class="truncate">{item.source}</span>
                      </a>
                      <time datetime={item.publishedAt} class="shrink-0 font-mono text-[10px] text-slate-400 dark:text-slate-500" title={relativeTime(item.publishedAt)}>{formatTime(item.publishedAt)}</time>
                    </div>

                    <h2 class="mt-3.5 text-[17px] font-black leading-7 tracking-tight text-slate-800 dark:text-slate-100 sm:text-lg">
                      <a href={item.link} target="_blank" rel="noopener noreferrer" class="inline transition-colors hover:text-[#0284c7] dark:hover:text-sky-400">
                        {item.title}<svg xmlns="http://www.w3.org/2000/svg" class="mb-0.5 ml-1.5 inline h-3.5 w-3.5 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-sky-500 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M7 17L17 7M7 7h10v10" /></svg>
                      </a>
                    </h2>
                    {#if item.description}
                      <p class="mt-2 line-clamp-2 text-[13px] font-medium leading-6 text-slate-500 dark:text-slate-400">{item.description}</p>
                    {/if}
                    <div class="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      <span class="truncate">{hostname(item.sourceUrl)}</span><span class="text-slate-300 dark:text-slate-600">·</span><span>{relativeTime(item.publishedAt)}</span>
                    </div>
                  </article>
                {/each}
              </div>
            </div>
          </section>
        {/each}
      </div>

      <footer class="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-[11px] font-bold text-slate-400 dark:border-slate-700 dark:text-slate-500" data-reveal>
        <span>文章版权归原作者所有，点击标题前往原站阅读。</span>
        <div class="flex items-center gap-4">
          <a href="https://friend.upxuu.com/moments.xml" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-[#0284c7] dark:hover:text-sky-400">RSS 订阅 ↗</a>
          <a href="https://friend.upxuu.com/" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 transition-colors hover:text-[#0284c7] dark:hover:text-sky-400"><span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>Friend RSS Hub ↗</a>
        </div>
      </footer>
    {/if}
  </div>
</div>
