<script>
  import { onMount } from 'svelte';

  export let path = '';
  let views = 0;
  let loading = true;

  onMount(async () => {
    try {
      var p = path.startsWith('/') ? path : '/posts/' + path;
      if (!p.endsWith('/')) p += '/';
      const res = await fetch('https://beat.345696.xyz/api/stats?p=' + encodeURIComponent(p), { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (data) {
        var v = data[p];
        views = v !== undefined ? v : 0;
      }
    } catch {}
    loading = false;
  });
</script>

{#if loading}
  <span class="inline-flex items-center gap-1 text-xs sm:text-sm font-extrabold text-slate-400 dark:text-slate-500 shrink-0">
    <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <span class="opacity-50">--</span>
  </span>
{:else}
  <span class="inline-flex items-center gap-1 text-xs sm:text-sm font-extrabold text-slate-500 dark:text-slate-400 shrink-0">
    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
    {views}
  </span>
{/if}
