<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Song { title: string; author: string; pic: string; url: string; lrc?: string; }
  interface PlaylistMeta { id: string; name: string; }
  interface LyricLine { time: number; text: string; }

  const API = 'https://music.upxuu.com/api';

  /** 歌单配置：第一个是用户自己的歌单，其余是网易云的公开榜 */
  const PLAYLISTS: PlaylistMeta[] = [
    { id: '18169619282', name: '我的收藏歌单' },
    { id: '19723756', name: '飙升榜' },
    { id: '3778678', name: '热歌榜' },
    { id: '3779629', name: '新歌榜' },
    { id: '2884035', name: '原创音乐榜' },
  ];

  // === 运行状态 ===
  let activePlaylistId = PLAYLISTS[0].id;
  let songs: Song[] = [];
  let loading = false;
  let loadError = '';

  let currentIndex = -1;
  let playing = false;
  let duration = 0;
  let currentTime = 0;
  let volume = 0.8;
  /** random=随机播放 list=列表循环 single=单曲循环 */
  let mode: 'list' | 'single' | 'random' = 'list';
  let lyricText = '';
  let lyrics: LyricLine[] = [];

  let audio: HTMLAudioElement;

  onMount(() => {
    audio = new Audio();
    audio.preload = 'none';

    const onTimeUpdate = () => {
      currentTime = audio.currentTime;
      if (lyrics.length) {
        const l = lyrics[lyrics.length - 1];
        let cur = '';
        for (let i = lyrics.length - 1; i >= 0; i--) {
          if (lyrics[i].time <= currentTime) { cur = lyrics[i].text; break; }
        }
        lyricText = cur || (lyrics[0] ? lyrics[0].text : '');
      }
    };
    const onLoadedMetadata = () => { duration = audio.duration; };
    const onPlay = () => { playing = true; };
    const onPause = () => { playing = false; };
    const onEnded = () => { next(true); };
    const onError = () => { playing = false; };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    // 音量恢复
    try {
      const saved = localStorage.getItem('music-volume');
      if (saved) volume = Math.max(0, Math.min(1, Number(saved) || 0.8));
    } catch {}
    audio.volume = volume;

    loadPlaylist(activePlaylistId);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
    };
  });

  // === 网络 ===
  async function fetchJson(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  /** 把 API 返回的 url 归一到 https://music.upxuu.com（上游返回可能是 http） */
  function fixUrl(u?: string): string {
    if (!u) return '';
    return u.replace(/^http:\/\/(?:music\.upxuu\.com|8\.220\.197\.92(?::3000)?)/, 'https://music.upxuu.com');
  }

  /** 从歌曲的 url/lrc 字段提取 id（上游 JSON 没有单独 id 字段） */
  function songId(song: Song): string {
    const m = (song.url || song.lrc || '').match(/id=(\d+)/);
    return m ? m[1] : '';
  }

  async function loadPlaylist(id: string) {
    activePlaylistId = id;
    loading = true;
    loadError = '';
    songs = [];
    currentIndex = -1;
    lyrics = [];
    lyricText = '';

    try {
      const data = await fetchJson(`${API}?server=netease&type=playlist&id=${encodeURIComponent(id)}`);
      songs = (Array.isArray(data) ? data : []).map((s: any) => ({
        title: s.title || '未知歌名',
        author: s.author || '未知歌手',
        pic: fixUrl(s.pic) || '',
        url: fixUrl(s.url) || '',
        lrc: fixUrl(s.lrc) || '',
      }));
      playlistCounts[id] = songs.length;
    } catch (e: any) {
      loadError = e?.message || '加载失败';
    } finally {
      loading = false;
    }
  }

  // === 播放控制 ===
  async function play(index: number) {
    if (index < 0 || index >= songs.length) return;
    currentIndex = index;
    const song = songs[index];
    audio.src = normApiUrl(song.url);
    loadLyrics(song);
    try {
      await audio.play();
    } catch {}
  }

  function toggle() {
    if (!audio.src) {
      if (songs.length) play(0);
      return;
    }
    if (audio.paused) audio.play(); else audio.pause();
  }

  function prev() {
    if (!songs.length) return;
    if (mode === 'random') { play(randomIndex()); return; }
    play(currentIndex <= 0 ? songs.length - 1 : currentIndex - 1);
  }

  function next(auto = false) {
    if (!songs.length) return;
    if (mode === 'random') { play(randomIndex()); return; }
    const n = currentIndex + 1;
    if (n >= songs.length) {
      if (mode === 'list') play(0);
      else if (!auto) play(0);
    } else {
      play(n);
    }
  }

  function randomIndex(): number {
    if (songs.length < 2) return currentIndex;
    let r = Math.floor(Math.random() * songs.length);
    return r === currentIndex ? (r + 1) % songs.length : r;
  }

  function normApiUrl(u?: string): string { return fixUrl(u); }

  // === 歌词 ===
  async function loadLyrics(song: Song) {
    lyrics = [];
    lyricText = '';
    const url = song.lrc;
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const text = await res.text();
      lyrics = parseLrc(text);
    } catch {}
  }

  function parseLrc(text: string): LyricLine[] {
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

  // === UI 辅助 ===
  $: progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  function fmt(t: number): string {
    if (!isFinite(t) || t < 0) return '00:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function setVolume(v: number) {
    volume = Math.max(0, Math.min(1, v));
    if (audio) audio.volume = volume;
    try { localStorage.setItem('music-volume', String(volume)); } catch {}
  }

  function seek(e: MouseEvent) {
    if (!duration) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
    currentTime = audio.currentTime;
  }

  function changeMode() {
    mode = mode === 'list' ? 'single' : mode === 'single' ? 'random' : 'list';
  }

  const modeLabel = { list: '列', single: '单', random: '随' };

  // === 歌单计数（加载后填充到本地侧面板） ===
  let playlistCounts: Record<string, number> = {};

  // 当前歌曲
  $: currentSong = currentIndex >= 0 ? songs[currentIndex] : null;

  // 响应式：切歌时更新歌词
</script>

<div class="music-player w-full max-w-6xl mx-auto px-3 sm:px-4 pb-40">
  <div class="flex flex-col lg:flex-row gap-4 items-start">

    <!-- 左侧：歌单列表 -->
    <aside class="w-full lg:w-56 shrink-0">
      <div class="bg-white dark:bg-slate-800 border-4 border-[#0284c7] shadow-[6px_6px_0px_0px_#0284c7] rounded-sm p-3">
        <h2 class="font-black text-[#0284c7] text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
          <span class="inline-block w-3 h-3 bg-[#f59e0b] border-2 border-[#0284c7]" style="box-shadow:2px 2px 0 #0284c7"></span>
          歌单列表
        </h2>
        <ul class="space-y-1">
          {#each PLAYLISTS as p (p.id)}
            <li>
              <button
                on:click={() => loadPlaylist(p.id)}
                class={`w-full text-left px-3 py-2 border-2 text-xs sm:text-sm font-bold transition-all flex items-center justify-between gap-2 rounded-sm
                  ${activePlaylistId === p.id
                    ? 'bg-[#fde68a] border-[#0284c7] text-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7]'
                    : 'bg-transparent border-transparent hover:border-[#bae6fd] hover:bg-[#e0f2fe] dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
              >
                <span class="truncate">{p.name}</span>
                {#if playlistCounts[p.id] !== undefined}
                  <span class="shrink-0 text-[10px] text-slate-400 font-normal">{playlistCounts[p.id]} 首</span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    </aside>

    <!-- 中间：歌单内容 -->
    <main class="flex-1 min-w-0">
      <div class="bg-white dark:bg-slate-800 border-4 border-[#0284c7] shadow-[6px_6px_0px_0px_#0284c7] rounded-sm overflow-hidden">
        <!-- 歌单头 -->
        <div class="px-4 sm:px-6 py-4 border-b-4 border-[#0284c7] bg-[#fde68a] flex items-center gap-3 flex-wrap">
          <h1 class="font-black text-lg sm:text-xl text-[#0284c7] truncate">
            {PLAYLISTS.find(p => p.id === activePlaylistId)?.name}
          </h1>
          <span class="text-xs font-bold text-[#0284c7]/70">{songs.length ? `共 ${songs.length} 首` : ''}</span>
          {#if loading}<span class="text-xs font-bold text-[#0284c7]/60 animate-pulse ml-auto">加载中…</span>{/if}
        </div>

        <!-- 加载失败 -->
        {#if loadError}
          <div class="p-8 text-center text-[#0284c7]">
            <p class="font-black mb-2">歌单加载失败：{loadError}</p>
            <button on:click={() => loadPlaylist(activePlaylistId)}
              class="text-xs font-black bg-[#fde68a] border-2 border-[#0284c7] px-3 py-1.5 rounded-sm shadow-[2px_2px_0px_0px_#0284c7] hover:-translate-y-0.5 transition-all">
              重试
            </button>
          </div>
        {:else if songs.length === 0}
          <div class="p-8 text-center text-slate-400 font-bold">
            {#if loading}……{:else}暂无歌曲{/if}
          </div>
        {:else}
          <!-- 歌曲行 -->
          <ul class="divide-y divide-slate-100 dark:divide-slate-700/40">
            {#each songs as song, i (i)}
              <li>
                <button
                  on:click={() => (i === currentIndex && playing ? toggle() : play(i))}
                  class={`w-full text-left flex items-center gap-3 px-3 sm:px-5 py-3 transition-colors rounded-sm
                    ${i === currentIndex
                      ? 'bg-[#e0f2fe] dark:bg-sky-950/60'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}
                >
                  <!-- 序号/等号指示 -->
                  <span class={`w-6 shrink-0 text-center text-[11px] font-black ${i === currentIndex ? 'text-[#0284c7]' : 'text-slate-400'}`}>
                    {#if i === currentIndex && playing}♪{:else}{i + 1}{/if}
                  </span>
                  <!-- 封面 -->
                  <span class="shrink-0 w-11 h-11 border-2 border-[#0284c7] rounded-sm overflow-hidden shadow-[2px_2px_0px_0px_#0284c7] bg-slate-200 flex items-center justify-center">
                    {#if song.pic}
                      <img src={song.pic} alt={song.title} class="w-full h-full object-cover">
                    {:else}
                      <span class="text-[#0284c7] text-sm font-black">♪</span>
                    {/if}
                  </span>
                  <!-- 名称 -->
                  <span class="flex-1 min-w-0">
                    <span class={`block font-black truncate ${i === currentIndex ? 'text-[#0284c7]' : 'text-slate-800 dark:text-slate-100'}`}>
                      {song.title}
                    </span>
                    <span class="block text-xs text-slate-400 truncate">{song.author}</span>
                  </span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </main>
  </div>

    <!-- 音频通过 JS 的 Audio() API 管理，无 DOM 元素 -->
</div>

<!-- 底部网易云式横条播放器 -->
{#if currentSong || songs.length}
<div class="fixed bottom-0 left-0 right-0 z-[120] border-t-4 border-[#0284c7] bg-white dark:bg-slate-900 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] select-none">
  <!-- 拖移/点击进度条（整包横条顶细条） -->
  <div class="absolute inset-x-0 -top-1.5 h-3 cursor-pointer group/progress" on:click={seek} on:keydown={seek} role="slider" aria-label="进度" aria-valuenow={progressPct} tabindex="0">
    <div class="absolute inset-x-0 top-1.5 h-[5px] bg-slate-200 dark:bg-slate-700"/>
    <div class="absolute top-1.5 h-[5px] bg-gradient-to-r from-[#0284c7] to-[#f59e0b]" style="width:{progressPct}%"></div>
  </div>

  <div class="max-w-6xl mx-auto px-3 sm:px-4 pt-4 pb-3 flex items-center gap-3">

    <!-- 封面 + 歌名/歌手 -->
    <div class="flex items-center gap-2.5 min-w-0 flex-1 lg:flex-initial lg:w-64">
      <button on:click={() => currentSong && toggle()} class={`shrink-0 relative w-12 h-12 rounded-full border-3 border-[#0284c7] overflow-hidden shadow-[3px_3px_0px_0px_#0284c7] bg-slate-200 transition-transform ${playing ? 'animate-music-spin' : ''}`} aria-label={playing ? '暂停' : '播放'}>
        {#if currentSong?.pic}
          <img src={currentSong.pic} alt={currentSong.title} class="w-full h-full object-cover" />
        {:else}
          <span class="absolute inset-0 flex items-center justify-center text-[#0284c7] font-black text-xl">♪</span>
        {/if}
      </button>
      <div class="min-w-0 flex-1">
        <div class="font-black text-sm text-slate-800 dark:text-slate-100 truncate">
          {currentSong ? currentSong.title : '暂无'}
        </div>
        <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {lyricText && playing ? lyricText : (currentSong?.author || '——')}
        </div>
      </div>
    </div>

    <!-- 播放控制（中间） -->
    <div class="hidden sm:flex items-center gap-2 shrink-0">
      <button on:click={prev} aria-label="上一首" class="w-9 h-9 flex items-center justify-center border-2 border-[#0284c7] rounded-sm bg-[#fde68a] text-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] hover:-translate-y-0.5 transition-transform">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="19 20 9 12 19 4"/><polyline points="9 12 9 4"/></svg>
      </button>
      <button on:click={toggle} aria-label={playing ? '暂停' : '播放'} class="w-12 h-12 flex items-center justify-center border-3 border-[#0284c7] rounded-sm bg-[#fde68a] text-[#0284c7] shadow-[4px_4px_0px_0px_#0284c7] hover:-translate-y-0.5 transition-transform">
        {#if playing}
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
        {:else}
          <svg class="w-6 h-6 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>
        {/if}
      </button>
      <button on:click={() => next(false)} aria-label="下一首" class="w-9 h-9 flex items-center justify-center border-2 border-[#0284c7] rounded-sm bg-[#fde68a] text-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] hover:-translate-y-0.5 transition-transform">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 4 15 12 5 20"/><polyline points="15 12 15 20"/></svg>
      </button>
    </div>

    <!-- 手机简控：只有一个播放/暂停 -->
    <div class="flex sm:hidden items-center gap-2 shrink-0">
      <button on:click={toggle} aria-label={playing ? '暂停' : '播放'} class="w-10 h-10 flex items-center justify-center border-2 border-[#0284c7] rounded-sm bg-[#fde68a] text-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7]">
        {#if playing}
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
        {:else}
          <svg class="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>
        {/if}
      </button>
    </div>

    <!-- 时间 -->
    <div class="hidden md:block shrink-0 text-[11px] font-black tabular-nums text-slate-500 dark:text-slate-400 text-right">
      {fmt(currentTime)}<span class="opacity-50"> / </span>{fmt(duration)}
    </div>

    <!-- 模式 + 音量（桌面） -->
    <div class="hidden lg:flex items-center gap-2 shrink-0 ml-auto pl-2">
      <button on:click={changeMode} aria-label="播放模式" class="px-2 py-1 border-2 border-[#0284c7] text-[10px] font-black text-[#0284c7] bg-[#fde68a] rounded-sm shadow-[2px_2px_0px_0px_#0284c7] hover:-translate-y-0.5 transition-transform">
        {modeLabel[mode]}
      </button>
      <input
        type="range" min="0" max="1" step="0.02"
        class="w-20 accent-[#0284c7] cursor-pointer h-2 bg-[#fde68a] border border-[#0284c7] rounded-sm appearance-none"
        bind:value={volume}
        on:input={(e) => setVolume((e.target as HTMLInputElement).valueAsNumber)}
      />
    </div>
  </div>
</div>
{/if}

<style>
  @keyframes music-spin { to { transform: rotate(360deg); } }
  .animate-music-spin { animation: music-spin 18s linear infinite; }
  .music-player button { outline: none; }
  .music-player button:focus-visible { box-shadow: 0 0 0 3px #0284c7; }
  input[type='range'] { -webkit-appearance: none; appearance: none; }
</style>
