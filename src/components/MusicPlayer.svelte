<script lang="ts">
  import { onMount, onDestroy, afterUpdate } from 'svelte';

  interface Song { title: string; author: string; pic: string; url: string; lrc?: string; }
  interface LyricLine { time: number; text: string; }

  const API = 'https://music.upxuu.com/api';

  
  const PLAYLISTS = [
    { id: '18169619282', name: '我的收藏歌单' },
    { id: '19723756', name: '云音乐飙升榜' },
    { id: '3778678', name: '云音乐热歌榜' },
    { id: '3779629', name: '云音乐新歌榜' },
    { id: '2884035', name: '原创音乐榜' },
  ];

  
  let activePlaylistId = PLAYLISTS[0].id;
  let songs: Song[] = [];
  let loading = false;
  let loadError = '';
  let listScrollEl: HTMLElement;
  let showPlaylistMobile = false;

  
  let searchMode = false;
  let searchQuery = '';
  let searching = false;
  let searchResults: Song[] = [];
  let searchDone = false;

  let currentIndex = -1;
  let playing = false;
  let duration = 0;
  let currentTime = 0;
  let volume = 0.8;
  
  let mode: 'list' | 'single' | 'random' = 'list';
  let lyrics: LyricLine[] = [];
  let lyricText = '';
  let lyricsOpen = false;
  let lyricScrollEl: HTMLElement;
  let lastScrolledIdx = -1;

  let audio: HTMLAudioElement;
  let mounted = false;

  
  let isMusicPage = true;
  
  let backgroundPlay = false;

  
  let userScrolling = false;
  let userScrollTimer: ReturnType<typeof setTimeout> | null = null;

  
  let sheetHeight = 62;
  let draggingSheet = false;
  let dragStartY = 0;
  let dragStartH = 0;
  let dragMovedY = 0;

  let playlistCounts: Record<string, number> = {};

  
  onMount(() => {
    audio = new Audio();
    audio.preload = 'none';
    audio.volume = volume;

    const onTimeUpdate = () => {
      currentTime = audio.currentTime;
      if (lyrics.length) {
        let cur = '';
        for (let i = lyrics.length - 1; i >= 0; i--) {
          if (lyrics[i].time <= currentTime) { cur = lyrics[i].text; break; }
        }
        lyricText = cur;
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', () => { duration = audio.duration; });
    audio.addEventListener('play', () => { playing = true; });
    audio.addEventListener('pause', () => { playing = false; });
    audio.addEventListener('ended', () => {
      if (mode === 'single') { audio.currentTime = 0; audio.play(); return; }
      next(true);
    });

    try {
      const saved = localStorage.getItem('music-volume');
      if (saved !== null && saved !== '') {
        const v = Number(saved);
        if (isFinite(v) && v >= 0 && v <= 1) volume = v;
      }
    } catch {}
    audio.volume = volume;

    mounted = true;
    sheetHeight = defaultSheetHeight();
    isMusicPage = window.location.pathname === '/music' || window.location.pathname.startsWith('/music/');
    try { backgroundPlay = sessionStorage.getItem('music-bg') === '1'; } catch {}
    loadPlaylist(activePlaylistId);

    
    const onPageLoad = () => {
      isMusicPage = window.location.pathname === '/music' || window.location.pathname.startsWith('/music/');
    };
    document.addEventListener('astro:page-load', onPageLoad);

    return () => {
      document.removeEventListener('astro:page-load', onPageLoad);
      if (userScrollTimer) clearTimeout(userScrollTimer);
      if (!backgroundPlay) audio.pause();
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  });

  
  function toggleBackgroundPlay() {
    backgroundPlay = !backgroundPlay;
    try { sessionStorage.setItem('music-bg', backgroundPlay ? '1' : '0'); } catch {}
  }

  
  function apiUrl(...params: [string, string][]) {
    return `${API}?server=netease&${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
  }

  function fixUrl(u?: string) { return u ? u.replace(/^http:\/\//, 'https://') : ''; }
  function songId(s: Song) { return (s.url || s.lrc || '').match(/id=(\d+)/)?.[1] || ''; }

  async function loadPlaylist(id: string) {
    activePlaylistId = id;
    searchMode = false;
    loading = true;
    loadError = '';
    try {
      const res = await fetch(apiUrl(['type', 'playlist'], ['id', id]));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      songs = (Array.isArray(data) ? data : []).map((s: any) => ({
        title: s.title || '未知歌名',
        author: s.author || '未知歌手',
        pic: fixUrl(s.pic) || '',
        url: fixUrl(s.url) || '',
        lrc: fixUrl(s.lrc) || '',
      }));
      playlistCounts[id] = songs.length;
      if (listScrollEl) listScrollEl.scrollTop = 0;
    } catch (e: any) {
      loadError = e?.message || '加载失败';
    } finally {
      loading = false;
    }
  }

  
  async function doSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    searchMode = true;
    searching = true;
    searchDone = false;
    searchResults = [];
    try {
      const res = await fetch(apiUrl(['type', 'search'], ['id', q]));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      searchResults = (Array.isArray(data) ? data : []).map((s: any) => ({
        title: s.title || '未知歌名',
        author: s.author || '未知歌手',
        pic: fixUrl(s.pic) || '',
        url: fixUrl(s.url) || '',
        lrc: fixUrl(s.lrc) || '',
      }));
      
      songs = searchResults;
      if (listScrollEl) listScrollEl.scrollTop = 0;
    } catch (e: any) {
      loadError = e?.message || '搜索失败';
    } finally {
      searching = false;
      searchDone = true;
      loading = false;
    }
  }

  
  function exitSearch() {
    searchMode = false;
    searchQuery = '';
    searchResults = [];
    searchDone = false;
    loadPlaylist(activePlaylistId);
  }

  async function loadLyrics(song: Song) {
    lyrics = [];
    lyricText = '';
    lastScrolledIdx = -1;
    if (!song.lrc) return;
    try {
      const res = await fetch(song.lrc);
      if (!res.ok) return;
      lyrics = await parseLrc(await res.text());
    } catch {}
  }

  async function parseLrc(text: string): Promise<LyricLine[]> {
    const out: LyricLine[] = [];
    for (const line of text.split('\n')) {
      const m = line.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
      if (!m) continue;
      const time = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
      const txt = m[3].trim();
      if (txt) out.push({ time, text: txt });
    }
    return out.sort((a, b) => a.time - b.time);
  }

  
  async function play(index: number) {
    if (index < 0 || index >= songs.length) return;
    currentIndex = index;
    const song = songs[index];
    audio.src = song.url;
    loadLyrics(song);
    try { await audio.play(); } catch {}
  }

  function toggle() {
    if (!audio.src) { if (songs.length) play(0); return; }
    if (audio.paused) audio.play(); else audio.pause();
  }

  function prev() {
    if (!songs.length) return;
    play(mode === 'random' ? randomIndex() : currentIndex <= 0 ? songs.length - 1 : currentIndex - 1);
  }

  function next(auto = false) {
    if (!songs.length) return;
    play(mode === 'random' ? randomIndex() : (currentIndex + 1 >= songs.length ? (mode === 'list' ? 0 : (auto ? -1 : 0)) : currentIndex + 1));
  }

  function randomIndex(): number {
    if (songs.length < 2) return currentIndex;
    let r = Math.floor(Math.random() * songs.length);
    return r === currentIndex ? (r + 1) % songs.length : r;
  }

  
  $: progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  $: currentSong = currentIndex >= 0 ? songs[currentIndex] : null;
  $: activeName = PLAYLISTS.find(p => p.id === activePlaylistId)?.name || '';

  function fmt(t: number) {
    if (!isFinite(t) || t < 0) return '00:00';
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  }

  function setVolume(v: number) {
    volume = Math.max(0, Math.min(1, v));
    if (audio) audio.volume = volume;
    try { localStorage.setItem('music-volume', String(volume)); } catch {}
  }

  function seek(e: MouseEvent) {
    if (!duration) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
    currentTime = audio.currentTime;
  }

  function changeMode() { mode = mode === 'list' ? 'single' : mode === 'single' ? 'random' : 'list'; }

  
  $: activeLyricIdx = (() => {
    if (!lyrics.length) return -1;
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time > currentTime) break;
      idx = i;
    }
    return idx;
  })();

  
  afterUpdate(() => {
    if (!lyricsOpen || !lyricScrollEl || activeLyricIdx < 0) return;
    
    if (userScrolling) return;
    if (lastScrolledIdx === activeLyricIdx) return;
    lastScrolledIdx = activeLyricIdx;
    const el = lyricScrollEl.querySelector(`[data-lyric-idx="${activeLyricIdx}"]`);
    if (!el) return;
    
    const top = (el as HTMLElement).offsetTop - lyricScrollEl.offsetTop;
    const target = top - lyricScrollEl.clientHeight / 2 + (el as HTMLElement).offsetHeight / 2;
    lyricScrollEl.scrollTo({ top: target, behavior: 'smooth' });
  });

  
  function onLyricUserScroll() {
    userScrolling = true;
    if (userScrollTimer) clearTimeout(userScrollTimer);
    userScrollTimer = setTimeout(() => { userScrolling = false; }, 2500);
  }

  
  function setBodyScrollLock(lock: boolean) {
    const v = lock ? 'hidden' : '';
    document.documentElement.style.overflow = v;
    document.body.style.overflow = v;
  }

  function toggleLyrics() {
    lyricsOpen = !lyricsOpen;
    lastScrolledIdx = -1; 
    setBodyScrollLock(lyricsOpen);
  }

  function closeLyrics() {
    if (!lyricsOpen) return;
    lyricsOpen = false;
    lastScrolledIdx = -1;
    setBodyScrollLock(false);
  }

  
  function seekLyricLine(i: number) {
    const line = lyrics[i];
    if (!audio || !line) return;
    audio.currentTime = line.time;
    currentTime = line.time;
  }

  
  function defaultSheetHeight() {
    return typeof window !== 'undefined' && window.innerWidth >= 640 ? 70 : 62;
  }

  function onSheetDragStart(e: PointerEvent) {
    draggingSheet = true;
    dragStartY = e.clientY;
    dragStartH = sheetHeight;
    dragMovedY = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onSheetDragMove(e: PointerEvent) {
    if (!draggingSheet) return;
    dragMovedY = e.clientY - dragStartY;
    const h = dragStartH - (dragMovedY / window.innerHeight) * 100;
    sheetHeight = Math.max(32, Math.min(92, h));
  }

  function onSheetDragEnd() {
    if (!draggingSheet) return;
    draggingSheet = false;
    
    if (dragMovedY > window.innerHeight * 0.12) {
      closeLyrics();
      sheetHeight = defaultSheetHeight();
    }
  }
</script>




{#if isMusicPage}
<div
  class="fixed inset-x-0 top-[var(--navbar-height)] bottom-[70px] z-10 pt-2 sm:pt-4 md:bottom-[76px] w-full max-w-6xl mx-auto px-2 sm:px-4 pb-4 flex flex-col min-h-0 overflow-hidden"
>

  
  <form
    class="mb-4 shrink-0"
    on:submit|preventDefault={() => doSearch()}
    toolname="search_music"
    tooldescription="搜索网易云音乐，支持按歌曲名或歌手名搜索"
    toolautosubmit
  >
    <div class="flex items-center gap-2 bg-white dark:bg-slate-800 border-4 border-[#0284c7] shadow-[4px_4px_0px_0px#0284c7] rounded-sm p-2">
      <svg class="w-5 h-5 shrink-0 text-[#0284c7] ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input
        type="search"
        name="q"
        placeholder="搜索歌曲 / 歌手…（回车搜索）"
        bind:value={searchQuery}
        aria-label="搜索音乐"
        toolparamdescription="搜索关键词，可以是歌曲名、歌手名或专辑名"
        class="flex-1 min-w-0 bg-transparent outline-none text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-medium"
      />
      {#if searchMode}
        <button type="button" on:click={exitSearch} aria-label="退出搜索，返回歌单"
          class="shrink-0 px-2 py-1.5 text-xs font-black text-[#0284c7] border-2 border-[#0284c7] rounded-sm bg-[#fde68a] shadow-[2px_2px_0px_0px_#0284c7] active:shadow-none active:translate-y-0.5 transition-all">退出搜索</button>
      {:else}
        <button type="submit" disabled={searching}
          class="shrink-0 px-4 py-1.5 text-sm font-black text-white bg-[#0284c7] rounded-sm active:translate-y-0.5 transition-all disabled:opacity-60">
          {searching ? '搜索中…' : '搜索'}
        </button>
      {/if}
    </div>
  </form>

  
  <div class="lg:hidden mb-3 shrink-0">
    <button
      on:click={() => showPlaylistMobile = !showPlaylistMobile}
      class="w-full bg-white dark:bg-slate-800 border-4 border-[#0284c7] shadow-[4px_4px_0px_0px_#0284c7] rounded-sm px-4 py-3 flex items-center justify-between gap-8"
    >
      <span class="font-black text-sm text-[#0284c7] flex items-center gap-2 truncate">
        <span>🎵</span>
        <span class="truncate">{activeName || '歌单'}</span>
      </span>
      <span class="text-[10px] font-black text-[#0284c7]/70 shrink-0">
        {showPlaylistMobile ? '收起 ▲' : '展开 ▼'}
      </span>
    </button>
  </div>

  <div class="flex flex-col lg:flex-row gap-4 items-stretch flex-1 min-h-0">

    
    <aside class="hidden lg:block lg:w-52 shrink-0 min-h-0">
      <div class="h-full bg-white dark:bg-slate-800 border-4 border-[#0284c7] shadow-[4px_4px_0px_0px_#0284c7] rounded-sm overflow-hidden flex flex-col">
        <div class="px-4 py-3 border-b-2 border-[#0284c7] bg-[#fde68a] shrink-0">
          <span class="font-black text-sm text-[#0284c7] tracking-wider">🎵 歌单</span>
        </div>
        <div class="p-2 flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {#each PLAYLISTS as p (p.id)}
            <button
              on:click={() => loadPlaylist(p.id)}
              class={`w-full text-left px-3 py-2.5 text-sm font-bold rounded-sm transition-colors flex items-center justify-between gap-2
                ${activePlaylistId === p.id
                  ? 'bg-[#cdeeff] text-[#0284c7] border-l-4 border-l-[#0284c7]'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
              <span class="truncate">{p.name}</span>
              {#if playlistCounts[p.id]}
                <span class="shrink-0 text-[10px] font-black text-slate-400">{playlistCounts[p.id]}</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </aside>

    
    <div class="relative flex-1 min-w-0 min-h-0 flex flex-col">

      
      {#if showPlaylistMobile}
        <div class="lg:hidden absolute inset-x-0 top-0 z-20 bg-white dark:bg-slate-800 border-4 border-[#0284c7] shadow-[4px_4px_0px_0px_#0284c7] rounded-sm overflow-hidden">
          <div class="px-4 py-2.5 border-b-2 border-[#0284c7] bg-[#fde68a] flex items-center justify-between">
            <span class="font-black text-sm text-[#0284c7] tracking-wider">🎵 选歌单</span>
            <button on:click={() => showPlaylistMobile = false} class="text-xs font-black text-[#0284c7]/60">收起 ↑</button>
          </div>
          <div class="p-2 max-h-60 overflow-y-auto">
            {#each PLAYLISTS as p (p.id)}
              <button
                on:click={() => { loadPlaylist(p.id); showPlaylistMobile = false; }}
                class={`w-full text-left px-3 py-2.5 text-sm font-bold rounded-sm transition-colors flex items-center justify-between gap-2
                  ${activePlaylistId === p.id
                    ? 'bg-[#cdeeff] text-[#0284c7] border-l-4 border-l-[#0284c7]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
              >
                <span>{p.name}</span>
                {#if playlistCounts[p.id]}
                  <span class="shrink-0 text-[10px] font-black text-slate-400">{playlistCounts[p.id]}</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      
      <div class="bg-white dark:bg-slate-800 border-4 border-[#0284c7] shadow-[4px_4px_0px_0px_#0284c7] rounded-sm overflow-hidden flex flex-col h-full min-h-0">

      
      <div class="px-5 py-4 border-b-2 border-[#0284c7] bg-[#fde68a] flex items-center justify-between gap-3">
        <div class="min-w-0">
          {#if searchMode}
            <h3 class="font-black text-lg sm:text-xl text-[#0284c7] leading-tight truncate">🔍 “{searchQuery.trim() || '搜索' }”</h3>
            <p class="text-xs font-bold text-[#0284c7]/60 mt-0.5">{searchDone ? `${songs.length} 条结果` : '搜索中…'}</p>
          {:else}
            <h3 class="font-black text-lg sm:text-xl text-[#0284c7] leading-tight truncate">{activeName}</h3>
            {#if songs.length && !loading}
              <p class="text-xs font-bold text-[#0284c7]/60 mt-0.5">{songs.length} 首</p>
            {/if}
          {/if}
        </div>
        {#if songs.length && !loading && !searching}
          <button on:click={() => play(0)}
            class="shrink-0 px-4 py-2 bg-white border-2 border-[#0284c7] text-[#0284c7] font-black text-sm rounded-sm shadow-[2px_2px_0px_0px_#0284c7] hover:-translate-y-0.5 transition-transform active:translate-y-0 active:shadow-none">
            ▶ 播放全部
          </button>
        {/if}
      </div>

      
      {#if loadError}
        <div class="p-10 text-center text-[#0284c7]">
          <p class="font-black mb-3">加载失败：{loadError}</p>
          <button on:click={() => searchMode ? doSearch() : loadPlaylist(activePlaylistId)}
            class="px-4 py-2 bg-[#fde68a] border-2 border-[#0284c7] text-[#0284c7] font-black text-sm rounded-sm shadow-[2px_2px_0px_0px_#0284c7] hover:-translate-y-0.5 transition-transform">
            重试
          </button>
        </div>
      {:else if loading || searching}
        <div class="p-12 text-center text-slate-400">
          <div class="inline-block w-6 h-6 border-4 border-[#0284c7] border-t-transparent rounded-full animate-spin mb-2"></div>
          <p class="font-bold text-sm">{searching ? '搜索中…' : '加载歌单中…'}</p>
        </div>
      {:else if songs.length === 0}
        <div class="p-12 text-center text-slate-400">
          <p class="font-bold text-sm">{searchMode ? '没有找到相关歌曲，换个关键词试试' : '暂无歌曲'}</p>
        </div>
      {:else}
        <div class="flex-1 min-h-0 overflow-y-auto overscroll-contain" bind:this={listScrollEl}>
          <ul>
            {#each songs as song, i (songId(song) + i)}
              <li class={i % 2 === 0 ? '' : 'bg-slate-50/60 dark:bg-slate-700/20'}>
                <button
                  on:click={() => (i === currentIndex && playing ? toggle() : play(i))}
                  class="w-full text-left flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-[#e0f2fe] dark:hover:bg-slate-700/40 transition-colors"
                >
                  <span class={`w-5 shrink-0 text-center text-sm font-black tabular-nums ${i === currentIndex ? 'text-[#0284c7]' : 'text-slate-400'}`}>
                    {i === currentIndex && playing ? '♪' : i + 1}
                  </span>
                  <span class="flex-1 min-w-0">
                    <span class={`block truncate font-bold ${i === currentIndex ? 'text-[#0284c7]' : 'text-slate-800 dark:text-slate-100'}`}>
                      {song.title}
                    </span>
                    <span class="block text-xs text-slate-400 truncate">{song.author}</span>
                  </span>
                  {#if i === currentIndex && playing}
                    <span class="text-[#0284c7] text-xs font-black shrink-0 hidden sm:inline">正在播放</span>
                  {/if}
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
      </div>
    </div>
  </div>
</div>
{/if}




{#if mounted && songs.length && (isMusicPage || backgroundPlay)}
{#if isMusicPage}

<div class="fixed bottom-0 left-0 right-0 z-[90] bg-white dark:bg-slate-900">
  
  <div class="w-full cursor-pointer select-none" on:click={seek} aria-label="播放进度">
    <div class="h-[5px] w-full bg-slate-200 dark:bg-slate-700 relative">
      <div class="absolute left-0 top-0 h-full bg-[#0284c7]" style="width: {progressPct}%" />
    </div>
  </div>

  
  <div class="px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 max-w-6xl mx-auto w-full">
    
    <div class="flex items-center gap-2.5 flex-1 min-w-0 lg:w-64 lg:shrink-0">
      <button
        type="button"
        on:click={toggleLyrics}
        title={lyrics.length ? '查看完整歌词' : '暂无歌词'}
        aria-label={lyrics.length ? '查看歌词' : '暂无歌词'}
        class={`shrink-0 w-11 h-11 rounded-full border-3 border-[#0284c7] overflow-hidden bg-slate-100 dark:bg-slate-800 transition-transform hover:scale-110 active:scale-95 cursor-pointer ${playing ? 'rotate-180 scale-105' : ''}`}
      >
        {#if currentSong?.pic}
          <img src={currentSong.pic} alt={currentSong.title} class="w-full h-full object-cover" />
        {:else}
          <span class="w-full h-full flex items-center justify-center text-[#0284c7] font-black text-base">♪</span>
        {/if}
      </button>
      <div class="min-w-0 flex-1">
        <div class="font-black text-sm text-slate-800 dark:text-slate-100 truncate">
          {currentSong ? currentSong.title : '——'}
        </div>
        <button
          type="button"
          on:click={toggleLyrics}
          title={lyrics.length ? '查看完整歌词' : '暂无歌词'}
          aria-label={lyrics.length ? '查看歌词' : '暂无歌词'}
          class="block w-full text-left text-xs text-slate-400 truncate hover:text-[#0284c7] hover:underline transition-colors"
        >
          {lyricText && playing ? lyricText : (currentSong?.author || '——')}
        </button>
      </div>
    </div>

    
    <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
      <button on:click={prev} aria-label="上一首"
        class="w-9 h-9 flex items-center justify-center bg-[#fde68a] border-2 border-[#0284c7] rounded-sm text-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] active:shadow-none active:translate-y-0.5 transition-all hover:-translate-y-0.5">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 4h3v16h-3V4zM19 5v14L8 12l11-7z"/></svg>
      </button>
      <button on:click={toggle} aria-label={playing ? '暂停' : '播放'}
        class="w-11 h-11 flex items-center justify-center bg-[#fde68a] border-3 border-[#0284c7] rounded-sm text-[#0284c7] shadow-[3px_3px_0px_0px_#0284c7] active:shadow-none active:translate-y-0 transition-all hover:-translate-y-0.5">
        {#if playing}
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
        {:else}
          <svg class="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>
        {/if}
      </button>
      <button on:click={() => next(false)} aria-label="下一首"
        class="w-9 h-9 flex items-center justify-center bg-[#fde68a] border-2 border-[#0284c7] rounded-sm text-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] active:shadow-none active:translate-y-0.5 transition-all hover:-translate-y-0.5">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 4h3v16h-3V4zM5 5l10 7-10 7V5z"/></svg>
      </button>
    </div>

    
    <div class="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
      <span class="text-xs font-black tabular-nums whitespace-nowrap text-slate-500 dark:text-slate-400 hidden sm:inline">
        {fmt(currentTime)} / {fmt(duration)}
      </span>
      <button on:click={changeMode} aria-label="播放模式"
        class="w-9 h-9 flex-shrink-0 flex items-center justify-center border-2 border-[#0284c7] text-[#0284c7] bg-[#fde68a] rounded-sm shadow-[2px_2px_0px_0px_#0284c7] active:shadow-none active:translate-y-0.5 transition-all hover:-translate-y-0.5"
        title="当前模式：{mode === 'list' ? '列表循环' : mode === 'single' ? '单曲循环' : '随机播放'}">
        {#if mode === 'list'}
          
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        {:else if mode === 'single'}
          
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><path d="M11 10h1v4"/></svg>
        {:else}
          
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/></svg>
        {/if}
      </button>
      <button on:click={toggleBackgroundPlay} aria-label="后台播放"
        class={`w-9 h-9 flex-shrink-0 flex items-center justify-center border-2 rounded-sm shadow-[2px_2px_0px_0px_#0284c7] active:shadow-none active:translate-y-0.5 transition-all hover:-translate-y-0.5 ${backgroundPlay ? 'bg-[#0284c7] text-white' : 'bg-[#fde68a] text-[#0284c7] border-[#0284c7]'}`}
        title={backgroundPlay ? '后台播放已开启：离开本页将继续播放' : '开启后台播放：离开音乐页也能继续听'}>
        
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><rect x="12" y="11" width="8" height="6" rx="1" fill="currentColor" stroke="none"/></svg>
      </button>
      <div class="hidden lg:flex items-center gap-2 w-20">
        <span class="text-[10px] font-black text-slate-400">音量</span>
        <input type="range" min="0" max="1" step="0.01"
          class="w-full h-1.5 bg-[#fde68a] border border-[#0284c7] rounded-sm appearance-none cursor-pointer accent-[#0284c7]"
          bind:value={volume} on:input={(e) => setVolume((e.target as HTMLInputElement).valueAsNumber)} />
      </div>
    </div>
  </div>
</div>
{:else}

<div class="fixed bottom-4 right-4 z-[90] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border-3 border-[#0284c7] rounded-full shadow-[4px_4px_0px_0px_#0284c7] pl-1.5 pr-2 py-1.5 flex items-center gap-2">
  <button on:click={toggle} aria-label={playing ? '暂停' : '播放'}
    class="shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 border-[#0284c7] bg-slate-100 dark:bg-slate-800 relative group">
    {#if currentSong?.pic}
      <img src={currentSong.pic} alt={currentSong.title} class="w-full h-full object-cover" />
    {:else}
      <span class="w-full h-full flex items-center justify-center text-[#0284c7] font-black">♪</span>
    {/if}
    
    <span class="absolute inset-0 bg-slate-900/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
      {#if playing}
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
      {:else}
        <svg class="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>
      {/if}
    </span>
  </button>
  <div class="min-w-0 max-w-32 sm:max-w-44">
    <div class="text-xs font-black text-slate-800 dark:text-slate-100 truncate leading-tight">{currentSong ? currentSong.title : '——'}</div>
    <div class="text-[10px] text-slate-400 truncate leading-tight">{currentSong?.author || ''}</div>
  </div>
  <button on:click={prev} aria-label="上一首" class="shrink-0 w-8 h-8 hidden sm:flex items-center justify-center text-[#0284c7] hover:bg-[#fde68a]/50 rounded-full transition-colors">
    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 4h3v16h-3V4zM19 5v14L8 12l11-7z"/></svg>
  </button>
  <button on:click={() => next(false)} aria-label="下一首" class="shrink-0 w-8 h-8 hidden sm:flex items-center justify-center text-[#0284c7] hover:bg-[#fde68a]/50 rounded-full transition-colors">
    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 4h3v16h-3V4zM5 5l10 7-10 7V5z"/></svg>
  </button>
  <button on:click={() => { toggleBackgroundPlay(); audio.pause(); }} aria-label="停止后台播放"
    class="shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
    title="停止并关闭">
    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
  </button>
</div>
{/if}
{/if}




{#if currentSong && isMusicPage}
<div class="fixed inset-0 z-[100] pointer-events-none" aria-hidden={!lyricsOpen}>

  
  <div
    class="absolute inset-0 bottom-[70px] md:bottom-[76px] bg-slate-900/50 transition-opacity duration-300"
    class:opacity-100={lyricsOpen}
    class:opacity-0={!lyricsOpen}
    class:pointer-events-auto={lyricsOpen}
    on:click={closeLyrics}
  ></div>

  
  <aside
    style={`height:${sheetHeight}vh`}
    class={`absolute left-0 right-0 mx-auto bottom-[70px] md:bottom-[76px] w-full max-w-2xl flex flex-col bg-white dark:bg-slate-900 rounded-t-[24px] border-t-4 border-[#0284c7] shadow-[0_-16px_50px_rgba(2,132,199,0.25)] ${draggingSheet ? '' : 'transition-transform duration-400 ease-out'} ${lyricsOpen ? 'translate-y-0 pointer-events-auto' : 'translate-y-[calc(100%+90px)] pointer-events-none'}`}
  >
    
    <div class="shrink-0 px-4 pt-2.5 pb-2 border-b-2 border-[#0284c7] bg-[#fde68a] rounded-t-[28px]">
      <div
        class="w-16 h-2 rounded-full bg-[#0284c7]/30 mx-auto mb-2 cursor-grab active:cursor-grabbing touch-none select-none"
        role="separator"
        aria-label="拖拽调整歌词面板高度"
        on:pointerdown={onSheetDragStart}
        on:pointermove={onSheetDragMove}
        on:pointerup={onSheetDragEnd}
        on:pointercancel={onSheetDragEnd}
      ></div>
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="font-black text-sm text-[#0284c7] truncate">{currentSong.title}</div>
          <div class="text-[11px] font-bold text-[#0284c7]/70 truncate">{currentSong.author}</div>
        </div>
        <button type="button" on:click={closeLyrics} aria-label="关闭歌词"
          class="shrink-0 w-11 h-11 flex items-center justify-center bg-white border-2 border-[#0284c7] text-[#0284c7] rounded-full shadow-[2px_2px_0px_0px_#0284c7] active:shadow-none active:translate-y-0.5 transition-all font-black text-xl">×</button>
      </div>
    </div>

    
    <div class="flex-1 min-h-0 overflow-y-auto px-5 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] select-none touch-pan-y overscroll-contain" bind:this={lyricScrollEl}
      on:wheel={onLyricUserScroll}
      on:touchstart={onLyricUserScroll}
      on:touchmove={onLyricUserScroll}>
      {#if !lyrics.length}
        <p class="mt-24 text-center text-sm font-bold text-slate-400 dark:text-slate-500">暂无歌词</p>
      {:else}
        
        <div class="h-[28%]"></div>
        <ul class="space-y-6">
          {#each lyrics as line, i (i)}
            <li
              data-lyric-idx={i}
              aria-current={i === activeLyricIdx}
              on:click={() => seekLyricLine(i)}
              class={`cursor-pointer transition-all duration-300 leading-relaxed text-center text-[15px] sm:text-base
                ${i === activeLyricIdx
                  ? 'text-[#0284c7] font-black text-xl sm:text-2xl'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0284c7]/80'}`}
            >
              {line.text}
            </li>
          {/each}
        </ul>
        <div class="h-[28%]"></div>
      {/if}
    </div>
  </aside>
</div>
{/if}

<style>
  /* 页面内内容不被 footer 遮挡 */
  :global(body) { padding-bottom: 0 !important; }
</style>
