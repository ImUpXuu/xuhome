<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  export let images: string[] = [];
  export let initialIndex: number = 0;
  export let onClose: () => void;

  let currentIndex = initialIndex;

  function prev(e?: Event) {
    if (e) e.stopPropagation();
    currentIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
  }

  function next(e?: Event) {
    if (e) e.stopPropagation();
    currentIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
  }

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div 
  class="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/90 backdrop-blur-md overflow-hidden" 
  on:click|stopPropagation={onClose}
  transition:fade={{ duration: 155 }}
>
  <button 
    on:click|stopPropagation={onClose} 
    class="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/30 text-white border-2 border-white/20 rounded-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] transition-all cursor-pointer z-[310]"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
  
  {#if images.length > 1}
    <button 
      on:click={prev} 
      class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-white/10 hover:bg-white/30 text-white border-2 border-white/20 rounded-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] transition-all cursor-pointer z-[310]"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  {/if}

  {#if images.length > 1}
    <button 
      on:click={next} 
      class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-white/10 hover:bg-white/30 text-white border-2 border-white/20 rounded-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] transition-all cursor-pointer z-[310]"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  {/if}

  <!-- svelte-ignore a11y-missing-attribute -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  {#key currentIndex}
    <img
      src={images[currentIndex]}
      on:click|stopPropagation
      class="absolute max-w-[95vw] max-h-[90vh] sm:max-w-[85vw] sm:max-h-[85vh] object-contain rounded-sm border-4 border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] z-[300] select-none"
      alt="lightbox visualization"
    />
  {/key}
  
  {#if images.length > 1}
     <div class="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-1.5 rounded-sm border-2 border-white/20 font-mono font-bold tracking-widest text-sm z-[310] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] select-none">
        {currentIndex + 1} / {images.length}
     </div>
  {/if}
</div>
