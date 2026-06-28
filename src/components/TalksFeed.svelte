<script lang="ts">
  import type { TalkItem } from '../utils/postsFetcher';
  import SvelteLightbox from './SvelteLightbox.svelte';
  import TalkShareModal from './TalkShareModal.svelte';
  import PageViews from './PageViews.svelte';
  import { onMount, afterUpdate, tick } from 'svelte';

  export let talks: TalkItem[] = [];
  export let talksPerPage: number = 10;

  let selectedTag: string | null = null;
  let currentPage = 1;
  let shareTalk: TalkItem | null = null;
  let showShareModal = false;

  // Lightbox state
  let isLightboxOpen = false;
  let lightboxImages: string[] = [];
  let lightboxInitialIndex = 0;

  $: allTags = Array.from(new Set(talks.flatMap(t => t.tags || []))).filter(Boolean);

  $: filteredTalks = talks.filter(t => 
    selectedTag ? t.tags && t.tags.includes(selectedTag) : true
  );

  $: totalPages = Math.ceil(filteredTalks.length / talksPerPage) || 1;
  $: safePage = Math.min(currentPage, totalPages);
  $: startIndex = (safePage - 1) * talksPerPage;
  $: displayedTalks = filteredTalks.slice(startIndex, startIndex + talksPerPage);

  function handleTagSelect(tag: string | null) {
    selectedTag = selectedTag === tag ? null : tag;
    currentPage = 1;
    scrollToTop();
  }

  function nextPage() {
    if (currentPage < totalPages) {
      currentPage += 1;
      scrollToTop();
    }
  }

  function prevPage() {
    if (currentPage > 1) {
      currentPage -= 1;
      scrollToTop();
    }
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Parse markdown helper
  function formatMarkdown(text: string): string {
    if (!text) return "";
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a class="text-[#0ea5e9] font-bold hover:underline" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return html.split('\n\n').map(p => `<p class="mb-3.5 leading-relaxed break-words">${p.replace(/\n/g, '<br/>')}</p>`).join('');
  }

  // Get image list inside post
  function extractImages(content: string): string[] {
    const imageRegex = /!\[.*?\]\((.*?)\)/g;
    const matches = Array.from(content.matchAll(imageRegex)).map((m) => m[1]);
    return matches;
  }

  function getContentWithoutImages(content: string): string {
    return content.replace(/!\[.*?\]\((.*?)\)/g, '').trim();
  }

  function openShare(talk: TalkItem, e: Event) {
    e.stopPropagation();
    shareTalk = talk;
    showShareModal = true;
    document.body.style.overflow = 'hidden';
  }

  function closeShare() {
    showShareModal = false;
    document.body.style.overflow = '';
  }

  function openLightbox(imagesList: string[], index: number, e: Event) {
    e.stopPropagation();
    lightboxImages = imagesList;
    lightboxInitialIndex = index;
    isLightboxOpen = true;
  }

  // Fold long talk content
  function setupTalkFold() {
    document.querySelectorAll('.talk-content').forEach(el => {
      const wrap = el.querySelector('.talk-fold-wrap');
      if (!wrap) return;
      const existingOverlay = el.querySelector('.talk-fold-overlay');
      if (existingOverlay) existingOverlay.remove();
      el.style.maxHeight = '';
      el.classList.remove('overflow-hidden', 'transition-all', 'duration-700', 'ease-in-out', 'relative');

      const contentHeight = wrap.scrollHeight;
      const threshold = Math.min(2500, window.innerHeight * 2.5);
      if (contentHeight <= threshold) return;

      el.style.maxHeight = `${threshold}px`;
      el.classList.add('overflow-hidden', 'transition-all', 'duration-700', 'ease-in-out', 'relative');

      const isDark = document.documentElement.classList.contains('dark');
      const overlay = document.createElement('div');
      overlay.className = 'talk-fold-overlay absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t z-10 flex items-end justify-center pb-4 pointer-events-none';
      overlay.style.background = isDark
        ? 'linear-gradient(to top, #1e293b, transparent)'
        : 'linear-gradient(to top, white, transparent)';
      const btn = document.createElement('button');
      btn.className = 'pointer-events-auto bg-[#0284c7] border-2 border-[#0284c7] text-white font-black px-5 py-1.5 flex items-center gap-2 shadow-[4px_4px_0px_0px_#fde68a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs rounded-sm uppercase tracking-wider cursor-pointer';
      btn.innerHTML = '展开阅读全文 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
      overlay.appendChild(btn);
      el.appendChild(overlay);

      btn.addEventListener('click', function expand() {
        el.style.maxHeight = `${contentHeight + 50}px`;
        overlay.classList.add('opacity-0');
        setTimeout(() => {
          const collapseWrap = document.createElement('div');
          collapseWrap.className = 'talk-collapse-wrap flex justify-center pt-3 pb-1';
          const collapseBtn = document.createElement('button');
          collapseBtn.className = 'bg-white dark:bg-slate-700 border-2 border-[#0284c7] text-[#0284c7] dark:text-white font-black px-3 py-1 flex items-center gap-2 shadow-[3px_3px_0px_0px_#0284c7] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-[10px] rounded-sm uppercase tracking-wider cursor-pointer';
          collapseBtn.innerHTML = '收起 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>';
          collapseWrap.appendChild(collapseBtn);
          el.after(collapseWrap);
          collapseBtn.addEventListener('click', () => {
            el.style.maxHeight = `${threshold}px`;
            overlay.classList.remove('opacity-0');
            collapseWrap.remove();
            window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
          });
        }, 700);
      }, { once: true });
    });
  }

  onMount(async () => {
    await tick();
    setupTalkFold();

    // Scroll and highlight deep links
    const hash = window.location.hash;
    if (hash) {
      const elementId = hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          const yOffset = -80;
          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
          element.classList.add('ring-4', 'ring-[#0ea5e9]');
          setTimeout(() => element.classList.remove('ring-4', 'ring-[#0ea5e9]'), 1500);
        }
      }, 300);
    }
  });

  afterUpdate(async () => {
    await tick();
    setupTalkFold();
  });
</script>

<div class="w-full flex flex-col gap-4 sm:gap-6">
  {#if allTags.length > 0}
    <div class="flex flex-wrap gap-2">
      {#each allTags as tag}
        <button
          on:click={() => handleTagSelect(tag)}
          class="text-xs px-2.5 py-1 rounded-sm font-bold transition-all border-2 border-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] cursor-pointer flex items-center gap-1 {selectedTag === tag ? 'bg-[#f59e0b] text-white' : 'bg-[#faf8f5] dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-[#fde68a] hover:translate-y-[-1px]'}"
        >
          <span>#{tag}</span>
        </button>
      {/each}
      {#if selectedTag}
        <button
          on:click={() => handleTagSelect(null)}
          class="text-xs px-2.5 py-1 rounded-sm font-bold transition-all border-2 border-red-400 shadow-[2px_2px_0px_0px_red-400] cursor-pointer bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
        >
          清除筛选
        </button>
      {/if}
    </div>
  {/if}
    {#if displayedTalks.length === 0}
      <div class="bg-white dark:bg-slate-800 border-4 border-[#0284c7] p-12 shadow-[6px_6px_0px_0px_#0284c7] rounded-sm text-center">
        <p class="text-[#0284c7] font-black tracking-widest uppercase">哎呀，没有找到相关的说说</p>
      </div>
    {/if}

    {#each displayedTalks as talk, i (talk.id)}
      {@const images = extractImages(talk.content)}
      {@const textOnly = getContentWithoutImages(talk.content)}
      
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div 
        id={`talk-${talk.id}`}
        class="bg-white dark:bg-slate-800 border-4 border-[#0284c7] p-5 md:p-6 shadow-[8px_8px_0px_0px_#0284c7] hover:shadow-[10px_10px_0px_0px_#f59e0b] hover:-translate-y-1 transition-all rounded-sm relative group cursor-pointer animate-card-entrance opacity-0"
        style="animation-delay: {0.2 + (i % 12) * 0.05}s"
        on:click={() => window.location.href = `/talk/${talk.slug}`}
      >
        <!-- Share Button -->
        <button
          on:click={(e) => openShare(talk, e)}
          class="absolute top-4 right-4 p-1.5 sm:p-2 border-2 border-[#0284c7] text-xs font-black rounded-sm transition-all cursor-pointer z-10 flex items-center justify-center gap-1 shadow-[2px_2px_0px_0px_#0284c7] h-8 sm:h-9 bg-[#faf8f5] dark:bg-slate-700 text-[#0284c7] hover:bg-[#fde68a] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          title="分享 / Share"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 10.742l4.137-2.11M8.684 13.258l4.137 2.11M17 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2zm0-8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2zm-10 4c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z" />
          </svg>
          <span class="text-[10px] hidden sm:inline font-bold">分享</span>
        </button>

        <!-- Avatar & Meta Header -->
        <div class="flex gap-4 items-center mb-4 select-none">
          <div class="rounded-sm bg-[#0ea5e9] border-3 border-[#0284c7] shadow-[4px_4px_0px_0px_#0284c7] flex-shrink-0 flex items-center justify-center transform -rotate-3 overflow-hidden w-10 h-10">
             <img src="https://upxuu.com/images/me.jpg" alt="UpXuu" class="w-full h-full object-cover" />
          </div>
          <div>
             <div class="font-black text-[#0284c7] tracking-wide flex items-center gap-2 text-sm leading-none">
                UpXuu
                {#if talk.mood}
                  <span class="text-xs ml-1" title="心情">{talk.mood}</span>
                {/if}
             </div>
             <div class="flex items-center gap-2 mt-1 leading-none">
                <span class="text-[10px] sm:text-xs text-slate-500 font-mono font-bold">{talk.date}</span>
                <PageViews path={`/talk/${talk.slug}`} />
             </div>
          </div>
        </div>

        <!-- Content area -->
        <div class="talk-content mt-2 pl-1 sm:pl-[56px] text-sm text-slate-700 dark:text-slate-300">
          {#if talk.title && talk.title !== '日常动态'}
            <div class="flex items-center gap-2 mb-2 select-none">
              <span class="w-2 h-2 bg-[#f59e0b] border border-[#0284c7] inline-block shadow-[1px_1px_0px_0px_#0284c7] skew-x-12"></span>
              <h3 class="font-black text-[#0284c7] text-md">{talk.title}</h3>
            </div>
          {/if}
          
          {#if textOnly}
            <div class="talk-fold-wrap">
              <div class="prose max-w-none text-slate-755 dark:text-slate-300 leading-relaxed font-medium">
                {@html formatMarkdown(textOnly)}
              </div>
            </div>
          {/if}

          <!-- Nine-grid Image Gallery -->
          {#if images.length > 0}
            <div class="mt-4 grid gap-2 {images.length === 1 ? 'grid-cols-1 max-w-sm' : images.length === 2 || images.length === 4 ? 'grid-cols-2 max-w-xs' : 'grid-cols-3 max-w-md'}">
              {#each images as src, idx}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div 
                  class="w-full overflow-hidden rounded-sm border-2 border-[#0284c7] hover:border-[#f59e0b] shadow-[2px_2px_0px_0px_rgba(2,132,199,0.15)] hover:shadow-[3px_3px_0px_0px_#0284c7] transition-all cursor-pointer bg-slate-50 relative group-hover:scale-[1.015] {images.length === 1 ? 'aspect-video sm:aspect-[4/3] max-h-80' : 'aspect-square'}"
                  on:click|stopPropagation={(e) => openLightbox(images, idx, e)}
                >
                  <img src={src} alt="talk visualization asset" class="w-full h-full object-cover transition-transform duration-550 hover:scale-[1.06]" loading="lazy" />
                </div>
              {/each}
            </div>
          {/if}

          <!-- Bottom Metadata: Location, Weather, Device -->
          {#if talk.location || talk.weather || talk.device}
            <div class="mt-4 flex flex-wrap gap-3 items-center text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 select-none border-t border-dashed border-slate-100 dark:border-slate-700 pt-2.5">
              {#if talk.location}
                <span class="flex items-center gap-1 hover:text-[#0284c7] transition-colors"><span>📍</span> {talk.location}</span>
              {/if}
              {#if talk.weather}
                <span class="flex items-center gap-1 hover:text-[#0284c7] transition-colors"><span>⛅</span> {talk.weather}</span>
              {/if}
              {#if talk.device}
                <span class="flex items-center gap-1 hover:text-[#0284c7] transition-colors font-mono"><span class="text-slate-400">📱</span> {talk.device}</span>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/each}

    {#if totalPages > 1}
      <div class="flex justify-center gap-3 mt-8 pb-12">
        <button
          on:click={prevPage}
          disabled={currentPage === 1}
          class="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border-3 border-[#0284c7] rounded-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0ea5e9] hover:text-white transition-colors cursor-pointer shadow-[4px_4px_0px_0px_#0284c7] disabled:shadow-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div class="h-10 px-4 flex items-center justify-center font-black font-mono text-[#0284c7] bg-[#fde68a] dark:bg-amber-700/50 border-3 border-[#0284c7] shadow-[4px_4px_0px_0px_#0284c7] rounded-sm select-none">
          {currentPage} / {totalPages}
        </div>
        <button
          on:click={nextPage}
          disabled={currentPage === totalPages}
          class="w-10 h-10 flex items-center justify-center bg-white border-3 border-[#0284c7] rounded-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0ea5e9] hover:text-white transition-colors cursor-pointer shadow-[4px_4px_0px_0px_#0284c7] disabled:shadow-none active:translate-y-1 active:shadow-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    {/if}
  </div>

{#if isLightboxOpen}
  <SvelteLightbox images={lightboxImages} initialIndex={lightboxInitialIndex} onClose={() => isLightboxOpen = false} />
{/if}

{#if showShareModal && shareTalk}
  {@const images = extractImages(shareTalk.content)}
  {@const textOnly = getContentWithoutImages(shareTalk.content)}
  <TalkShareModal
    talkTitle={shareTalk.title || '日常动态'}
    talkContent={textOnly}
    talkUrl={`${window.location.origin}/talk/${shareTalk.slug}`}
    talkImage={images[0] || ''}
    bind:show={showShareModal}
    on:close={closeShare}
  />
{/if}
