<script>
  import { onMount } from 'svelte';

  export let compact = false;

  let pageviews = 0;
  let uniques = 0;
  let visits = 0;
  let active = 0;
  let loaded = false;

  onMount(async () => {
    try {
      const [statsRes, activeRes] = await Promise.allSettled([
        fetch('https://vapi.upxuu.com/statsapi/alltime'),
        fetch('https://vapi.upxuu.com/api/active')
      ]);

      if (statsRes.status === 'fulfilled') {
        const data = await statsRes.value.json();
        if (data) {
          pageviews = typeof data.pageviews === 'object' ? (data.pageviews?.value ?? 0) : (data.pageviews ?? 0);
          uniques = typeof data.visitors === 'object' ? (data.visitors?.value ?? 0) : (data.visitors ?? 0);
          visits = typeof data.visits === 'object' ? (data.visits?.value ?? 0) : (data.visits ?? 0);
        }
      }

      if (activeRes.status === 'fulfilled') {
        const data = await activeRes.value.json();
        if (Array.isArray(data)) {
          active = data.length;
        } else if (data) {
          active = data.total ?? data.visitors ?? data.totals?.visitors?.value ?? data.totals?.pageviews?.value ?? data.sessions?.length ?? 0;
        }
      }
    } catch {}
    loaded = true;
  });
</script>

{#if compact}
  {#if loaded}
    <div class="flex flex-col items-center gap-2">
      <div class="flex flex-wrap items-center justify-center gap-3 md:gap-5 bg-white dark:bg-slate-800 border-2 border-[#0284c7] px-4 py-2.5 shadow-[4px_4px_0px_0px_#0284c7]">
        <span class="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
         访问量 <span class="font-black text-[#0284c7] dark:text-[#0ea5e9]">{pageviews.toLocaleString()}</span>
        </span>
        <span class="text-slate-300 dark:text-slate-600">|</span>
        <span class="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
         访客 <span class="font-black text-[#0284c7] dark:text-[#0ea5e9]">{uniques.toLocaleString()}</span>
        </span>
        <span class="text-slate-300 dark:text-slate-600">|</span>
        <span class="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
         次数 <span class="font-black text-[#0284c7] dark:text-[#0ea5e9]">{visits.toLocaleString()}</span>
        </span>
      </div>
      <div class="text-xs font-bold text-slate-500 dark:text-slate-400 select-none">
        <span class="inline-flex items-center gap-1.5">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
            <span class="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]" />
          </span>
          你正在和 <span class="font-black text-[#0284c7] dark:text-[#0ea5e9] mx-0.5">{active}</span> 个小伙伴一起观看本博客
        </span>
      </div>
    </div>
  {:else}
    <div class="flex flex-col items-center gap-2">
      <div class="flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border-2 border-[#0284c7] px-4 py-2.5 shadow-[4px_4px_0px_0px_#0284c7] min-h-[38px]">
        <div class="h-3 w-16 bg-slate-100 rounded-sm animate-pulse" />
        <span class="text-slate-300">|</span>
        <div class="h-3 w-12 bg-slate-100 rounded-sm animate-pulse" />
        <span class="text-slate-300">|</span>
        <div class="h-3 w-12 bg-slate-100 rounded-sm animate-pulse" />
      </div>
    </div>
  {/if}
{:else}
  <div class="bg-white dark:bg-slate-800 border-4 border-[#0284c7] p-5 shadow-[6px_6px_0px_0px_#f59e0b] rounded-sm w-full">
    <h3 class="font-black text-[#0284c7] text-lg mb-4 flex items-center gap-2 border-b-2 border-dashed border-[#0284c7]/30 pb-2 select-none">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
      <span>网站统计</span>
    </h3>
    {#if loaded}
      <div class="space-y-3">
        <div class="flex items-center justify-between bg-[#faf8f5] dark:bg-slate-700 border-2 border-[#0284c7]/20 rounded-sm px-3 py-2">
          <span class="text-xs font-bold text-slate-600 dark:text-slate-300">访问量</span>
          <span class="font-black text-[#0284c7] font-mono text-sm">{pageviews.toLocaleString()}</span>
        </div>
        <div class="flex items-center justify-between bg-[#faf8f5] dark:bg-slate-700 border-2 border-[#0284c7]/20 rounded-sm px-3 py-2">
          <span class="text-xs font-bold text-slate-600 dark:text-slate-300">访客数</span>
          <span class="font-black text-[#0284c7] font-mono text-sm">{uniques.toLocaleString()}</span>
        </div>
        <div class="flex items-center justify-between bg-[#faf8f5] dark:bg-slate-700 border-2 border-[#0284c7]/20 rounded-sm px-3 py-2">
          <span class="text-xs font-bold text-slate-600 dark:text-slate-300">访问次数</span>
          <span class="font-black text-[#0284c7] font-mono text-sm">{visits.toLocaleString()}</span>
        </div>
        <div class="flex items-center justify-center bg-[#fde68a]/50 dark:bg-amber-800/30 border-2 border-[#0284c7] rounded-sm px-3 py-2">
          <span class="text-xs font-bold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
              <span class="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]" />
            </span>
            你正在和 <span class="font-black text-[#0284c7] mx-0.5">{active}</span> 个小伙伴一起观看本博客
          </span>
        </div>
      </div>
    {:else}
      <div class="space-y-3">
        {#each [1,2,3] as _}
          <div class="h-[34px] bg-slate-100 border-2 border-[#0284c7]/10 rounded-sm animate-pulse" />
        {/each}
      </div>
    {/if}
  </div>
{/if}
