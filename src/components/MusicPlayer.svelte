<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Song { title: string; author: string; pic: string; url: string; lrc?: string; }
  interface PlaylistMeta { id: string; name: string; }
  interface LyricLine { time: number; text: string; }

  const API = 'https://music.upxuu.com/api';
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
  let mode: 'list' | 'single' | 'random' = 'list';
  let lyricText = '';
  let lyrics: LyricLine[] = [];

  let audio: HTMLAudioElement;
  let mounted = false;

  // onMount 是客户端运行，组件的 HTML 在 SSR 阶段已经输出过
  onMount(() => {
    audio = new Audio();
    audio.preload = 'none';

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

    try {
      const saved = localStorage.getItem('music-volume');
      if (saved) volume = Math.max(0, Math.min(1, Number(saved) || 0.8));
    } catch {}
    audio.volume = volume;

    mounted = true; // 显示底部条（首次挂载后）
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

  async function fetchJson(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function fixUrl(u?: string): string {
    if (!u) return '';
    return u.replace(/^http:\/\//, 'https://');
  }

  function songId(s: Song): string {
    const m = (s.url || s.lrc || '').match(/id=(\d+)/);
    return m ? m[1] : '';
  }

  async function loadPlaylist(id: string) {
    activePlaylistId = id;
    loading = true;
    loadError = '';
    try {
      const data = await fetchJson(`${API}?server=netease&type=playlist&id=${encodeURIComponent(id)}`);
      songs = (Array.isArray(data) ? data : []).map((s: any) => ({
        title: s.title || '未知歌名',
        author: s.author || '未知歌手',
        pic: fixUrl(s.pic) || '',
        url: fixUrl(s.url) || '',
        lrc: fixUrl(s.lrc) || '',
      }));
    } catch (e: any) {
      loadError = e?.message || '加载失败';
    } finally {
      loading = false;
    }
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
    if (mode === 'random') { play(randomIndex()); return; }
    play(currentIndex <= 0 ? songs.length - 1 : currentIndex - 1);
  }

  function next(auto = false) {
    if (!songs.length) return;
    if (mode === 'random') { play(randomIndex()); return; }
    const n = currentIndex + 1;
    if (n >= songs.length) {
      if (mode === 'list' && auto) play(0); else if (!auto) play(0);
    } else play(n);
  }

  function randomIndex(): number {
    if (songs.length < 2) return currentIndex;
    let r = Math.floor(Math.random() * songs.length);
    return r === currentIndex ? (r + 1) % songs.length : r;
  }

  // === 歌词 ===
  async function loadLyrics(song: Song) {
    lyrics = [];
    lyricText = '';
    const url = song.lrc;
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      lyrics = parseLrc(await res.text());
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
  $: currentSong = currentIndex >= 0 ? songs[currentIndex] : null;
  $: activeName = PLAYLISTS.find(p => p.id === activePlaylistId)?.name || '';
  $: remaining = songs.length > 0 ? `${songs.length} 首` : '';

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
  const modeLabel = { list: '顺序', single: '单曲', random: '随机' };

  $: if (audio) audio.volume = volume;
</script>

<div class="w-full max-w-5xl mx-auto px-2 sm:px-4 pb-40">

  <!-- 主内容：左歌单 + 中歌曲列表 -->
  <div class="flex flex-col lg:flex-row gap-4 items-start">

    <!-- 左侧：歌单列表 -->
    <aside class="w-full lg:w-52 shrink-0">
      <div class="bg-white dark:bg-slate-800 border-4 border-[#0284c7] shadow-[4px_4px_0px_0px_#0284c7] rounded-sm">
        <div class="px-3 py-2.5 border-b-2 border-[#0284c7] bg-[#fde68a]">
          <span class="font-black text-xs text-[#0284c7] tracking-wider">🎵 歌单</span>
        </div>
        <ul>
          {#each PLAYLISTS as p (p.id)}
            <li>
              <button
                on:click={() => loadPlaylist(p.id)}
                class={`w-full text-left px-3 py-2.5 text-xs sm:text-sm font-bold border-l-2 transition-colors
                  ${activePlaylistId === p.id
                    ? 'bg-[#e0f2fe] dark:bg-sky-900/40 border-l-[#0284c7] text-[#0284c7] dark:text-sky-200'
                    : 'border-l-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}
              >
                {p.name}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    </aside>

    <!-- 中间：歌曲列表 -->
    <main class="flex-1 min-w-0">
      <div class="bg-white dark:bg-slate-800 border-4 border-[#0284c7] shadow-[4px_4px_0px_0px_#0284c7] rounded-sm overflow-hidden">
        <!-- 头：歌单名 + 状态 -->
        <div class="px-4 sm:px-6 py-3 border-b-2 border-[#0284c7] bg-[#fde68a] flex items-center gap-3 flex-wrap">
          <h1 class="font-black text-base sm:text-lg text-[#0284c7] truncate flex-1 min-w-0">
            {activeName}
          </h1>
          {#if loading}
            <span class="text-xs font-bold text-[#0284c7]/60 animate-pulse shrink-0">加载中…</span>
          {:else if songs.length}
            <span class="text-xs font-bold text-[#0284c7]/60 shrink-0">{songs.length} 首</span>
          {/if}
        </div>

        {#if loadError}
          <div class="p-8 text-center text-[#0284c7]">
            <p class="font-black mb-2">歌单加载失败：{loadError}</p>
            <button on:click={() => loadPlaylist(activePlaylistId)}
              class="text-xs font-black bg-[#fde68a] border-2 border-[#0284c7] px-3 py-1.5 rounded-sm hover:-translate-y-0.5 transition-transform">
              重试
            </button>
          </div>
        {:else if songs.length === 0}
          <div class="p-12 text-center text-slate-300 dark:text-slate-600">
            {#if loading}<p class="font-bold text-sm">正在加载…</p>{:else}<p class="font-bold text-sm">暂无歌曲</p>{/if}
          </div>
        {:else}
          <ul>
            {#each songs as song, i (songId(song) + i)}
              <li>
                <button
                  on:click={() => (i === currentIndex && playing ? toggle() : play(i))}
                  class={`w-full text-left flex items-center gap-3 px-4 sm:px-5 py-2.5 transition-colors
                    ${i === currentIndex ? 'bg-[#e0f2fe] dark:bg-sky-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}
                >
                  <span class={`w-5 shrink-0 text-center text-xs font-black tabular-nums ${i === currentIndex ? 'text-[#0284c7]' : 'text-slate-400'}`}>
                    {#if i === currentIndex && playing}♪{:else}{i + 1}{/if}
                  </span>
                  <span class="flex-1 min-w-0">
                    <span class={`block truncate font-bold ${i === currentIndex ? 'text-[#0284c7]' : 'text-slate-800 dark:text-slate-100'}`}>
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
</div>

<!-- 固定底部条：用 mounted 控制 opacity 滑 fade-in，无闪烁 -->
<div
  class={`fixed bottom-0 left-0 right-0 z-[90] border-t-4 border-[#0284c7] bg-white dark:bg-slate-900 transition-all duration-300
    ${mounted && songs.length ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
>
  <!-- 进度（高度固定，不闪烁） -->
  <div class="h-[7px] w-full bg-slate-200 dark:bg-slate-700 cursor-pointer relative" on:click={seek} on:keydown={seek} role="progressbar" aria-valuenow={progressPct} tabindex="0" aria-label="进度条">
    <div class="absolute left-0 top-0 h-full bg-[#0284c7] transition-none" style="width: {progressPct}%" />
  </div>

  <!-- 播放控制 -->
  <div class="px-3 sm:px-4 py-2.5 flex items-center gap-3 select-none">

    <!-- 封面（不稳定：不存在时不渲染，避免 SSR/hydration 跳闪） -->
    <div class="w-11 h-11 shrink-0 rounded-sm border-2 border-[#0284c7] overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
      {#if currentSong?.pic}
        <img src={currentSong.pic} alt={currentSong.title} class="w-full h-full object-cover" />
      {:else}
        <span class="text-[#0284c7] font-black">♪</span>
      {/if}
    </div>

    <!-- 歌名 + 歌手/歌词 -->
    <div class="flex-1 min-w-0">
      <div class="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
        {currentSong ? currentSong.title : '——'}
      </div>
      <div class="text-[11px] text-slate-400 truncate">
        {lyricText && playing ? lyricText : (currentSong?.author || '——')}
      </div>
    </div>

    <!-- 上/播/下 -->
    <div class="flex items-center gap-2 shrink-0">
      <button on:click={prev} aria-label="上一首"
        class="w-9 h-9 flex items-center justify-center bg-[#fde68a] border-2 border-[#0284c7] rounded-sm text-[#0284c7] hover:-translate-y-0.5 transition-transform">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="19 20 9 12 19 4" /><polygon points="9 12 9 4" />
        </svg>
      </button>
      <button on:click={toggle} aria-label={playing ? '暂停' : '播放'}
        class="w-11 h-11 flex items-center justify-center bg-[#fde68a] border-3 border-[#0284c7] rounded-sm text-[#0284c7] shadow-[3px_3px_0px_0px_#0284c7] hover:-translate-y-0.5 transition-transform">
        {#if playing}
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
        {:else}
          <svg class="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>
        {/if}
      </button>
      <button on:click={() => next(false)} aria-label="下一首"
        class="w-9 h-9 flex items-center justify-center bg-[#fde68a] border-2 border-[#0284c7] rounded-sm text-[#0284c7] hover:-translate-y-0.5 transition-transform">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 4 15 12 5 20" /><polygon points="15 12 15 20" />
        </svg>
      </button>
    </div>

    <!-- 时间 + 模式 + 音量（桌面） -->
    <div class="hidden md:flex items-center gap-3 shrink-0">
      <span class="text-xs font-black tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {fmt(currentTime)} / {fmt(duration)}
      </span>
      <button on:click={changeMode} aria-label="播放模式"
        class="px-2 py-1 border-2 border-[#0284c7] text-[10px] font-black text-[#0284c7] bg-[#fde68a] rounded-sm hover:-translate-y-0.5 transition-transform">
        {modeLabel[mode]}
      </button>
      <input type="range" min="0" max="1" step="0.02"
        class="w-20 h-2 bg-[#fde68a] border border-[#0284c7] rounded-sm accent-[#0284c7] cursor-pointer"
        bind:value={volume} on:input={(e) => setVolume((e.target as HTMLInputElement).valueAsNumber)} />
    </div>
  </div>
</div>
