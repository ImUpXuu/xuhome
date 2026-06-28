<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let title: string = '';
  export let description: string = '';
  export let url: string = '';
  export let image: string = '';

  const dispatch = createEventDispatcher();
  let showModal = false;
  let generatingPoster = false;
  let posterDataUrl: string | null = null;
  let posterError = '';

  const shareData = {
    title: title || document.title,
    description: description || '',
    url: url || window.location.href,
    image: image || ''
  };

  function openModal() {
    showModal = true;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    showModal = false;
    posterDataUrl = null;
    posterError = '';
    document.body.style.overflow = '';
  }

  function copyLink() {
    navigator.clipboard.writeText(shareData.url).then(() => {
      const btn = document.querySelector('.copy-link-btn');
      if (btn) {
        btn.textContent = '已复制 ✓';
        setTimeout(() => { btn.textContent = '复制链接'; }, 2000);
      }
    });
  }

  function shareToQQ() {
    const qqUrl = `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${encodeURIComponent(shareData.url)}&title=${encodeURIComponent(shareData.title)}&desc=${encodeURIComponent(shareData.description)}&summary=${encodeURIComponent(shareData.description)}&site=UpXuu`;
    window.open(qqUrl, '_blank', 'width=700,height=600');
  }

  function shareToX() {
    const text = `${shareData.title}${shareData.description ? ' - ' + shareData.description : ''}`;
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareData.url)}`;
    window.open(xUrl, '_blank', 'width=600,height=400');
  }

  function shareToWeChat() {
    const text = `${shareData.title}\n${shareData.description}\n${shareData.url}`;
    navigator.clipboard.writeText(text).then(() => {
      alert('分享内容已复制到剪贴板，请打开微信粘贴给好友');
    });
  }

  async function generatePoster() {
    generatingPoster = true;
    posterError = '';
    posterDataUrl = null;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const width = 900;
      const height = 600;
      canvas.width = width;
      canvas.height = height;

      // Background
      ctx.fillStyle = '#faf8f5';
      ctx.fillRect(0, 0, width, height);

      // Outer border
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // Top accent bar
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(28, 28, width - 56, 6);

      // "UPXUU'S BLOG SHARING!" header
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 22px "Fredoka", "Noto Sans SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText("UPXUU'S BLOG SHARING!", 50, 80);

      // Decorative line after header
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(50, 100);
      ctx.lineTo(850, 100);
      ctx.stroke();
      ctx.setLineDash([]);

      // Left column: Image (if available)
      let textX = 500;
      if (shareData.image) {
        try {
          const img = await loadImage(shareData.image);
          const imgAreaW = 380;
          const imgAreaH = 380;
          const imgX = 60;
          const imgY = 130;
          const imgW = imgAreaW;
          const imgH = Math.min(imgAreaH, imgW * (img.height / img.width));
          
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(imgX - 4, imgY - 4, imgW + 8, imgH + 8);
          ctx.save();
          ctx.beginPath();
          ctx.rect(imgX, imgY, imgW, imgH);
          ctx.clip();
          ctx.drawImage(img, imgX, imgY, imgW, imgH);
          ctx.restore();
          textX = 480;
        } catch {
          textX = 60;
        }
      } else {
        textX = 60;
      }

      // Right column: Article title
      const maxTextWidth = width - textX - 60;
      const titleY = 170;
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 26px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'left';
      const titleLines = wrapText(ctx, shareData.title, maxTextWidth);
      titleLines.slice(0, 4).forEach((line, i) => {
        ctx.fillText(line, textX, titleY + i * 36);
      });
      const titleBottom = titleY + Math.min(titleLines.length, 4) * 36 + 20;

      // Description
      let descY = titleBottom + 10;
      if (shareData.description) {
        ctx.fillStyle = '#64748b';
        ctx.font = '16px "Noto Sans SC", sans-serif';
        const descLines = wrapText(ctx, shareData.description, maxTextWidth);
        descLines.slice(0, 4).forEach((line, i) => {
          ctx.fillText(line, textX, descY + i * 26);
        });
        descY += Math.min(descLines.length, 4) * 26 + 20;
      }

      // Bottom accent bar
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(28, height - 34, width - 56, 6);

      // URL at bottom
      ctx.fillStyle = '#0ea5e9';
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(shareData.url, 50, height - 70);

      // Site name at bottom right
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`UpXuu · ${new Date().toLocaleDateString('zh-CN')}`, 850, height - 70);

      posterDataUrl = canvas.toDataURL('image/png');
    } catch (e) {
      posterError = '海报生成失败，请重试';
    } finally {
      generatingPoster = false;
    }
  }

  async function sharePoster() {
    if (!posterDataUrl) return;
    try {
      const blob = await (await fetch(posterDataUrl)).blob();
      const file = new File([blob], `upxuu-poster-${Date.now()}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: shareData.title,
          text: shareData.description,
          files: [file]
        });
      } else {
        // Fallback to download
        downloadPoster();
      }
    } catch (e) {
      // User cancelled or share failed, fallback to download
      downloadPoster();
    }
  }

  function downloadPoster() {
    if (!posterDataUrl) return;
    const a = document.createElement('a');
    a.href = posterDataUrl;
    a.download = `upxuu-poster-${Date.now()}.png`;
    a.click();
  }

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let currentLine = '';
    for (const char of text) {
      const testLine = currentLine + char;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length ? lines : [text];
  }
</script>

<button
  on:click={openModal}
  class="share-trigger w-12 h-12 rounded-sm border-3 sm:border-4 border-[#0284c7] bg-[#fde68a] dark:bg-[#fde68a]/20 text-[#0284c7] flex items-center justify-center cursor-pointer shadow-[4px_4px_0px_0px_#0284c7] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0284c7] active:translate-y-0 active:shadow-none transition-all duration-150"
  aria-label="分享"
>
  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
    <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
</button>

{#if showModal}
  <div class="fixed inset-0 z-[3000]" 
    style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);"
    on:click|self={closeModal}
  >
    <div 
      class="absolute bottom-0 sm:bottom-24 left-0 sm:left-6 w-full sm:w-[420px] max-h-[90vh] bg-[#faf8f5] dark:bg-slate-800 border-t-[10px] sm:border-[10px] border-[#0284c7] rounded-t-3xl sm:rounded-sm shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.5),8px_8px_0px_0px_#0284c7] overflow-y-auto"
      on:click|stopPropagation
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-5 border-b-4 border-[#0284c7] bg-white dark:bg-slate-800 sticky top-0 z-10">
        <h3 class="font-black text-[#0284c7] text-lg uppercase tracking-wider">分享</h3>
        <button on:click={closeModal} class="w-10 h-10 flex items-center justify-center hover:bg-[#fde68a] dark:hover:bg-[#fde68a]/20 rounded-sm transition-all text-[#0284c7] cursor-pointer border-2 border-[#0284c7] bg-white dark:bg-slate-700 shadow-[2px_2px_0px_0px_#0284c7] active:translate-y-0.5 active:shadow-none">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Share options -->
      <div class="p-5 space-y-3">

        <!-- Generate Poster -->
        <button
          on:click={generatePoster}
          disabled={generatingPoster}
          class="w-full flex items-center gap-4 p-4 bg-white dark:bg-slate-700 border-3 border-[#0284c7] rounded-sm shadow-[4px_4px_0px_0px_#0284c7] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
        >
          <div class="w-10 h-10 flex items-center justify-center bg-[#fde68a] border-2 border-[#0284c7] rounded-sm shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-[#0284c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="text-left">
            <div class="font-black text-[#0284c7] text-sm">生成海报</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 font-bold">横向分享图 · 可直接分享</div>
          </div>
          {#if generatingPoster}
            <span class="ml-auto text-[#0284c7] font-black animate-spin">⟳</span>
          {/if}
        </button>

        <!-- Poster Preview & Download -->
        {#if posterDataUrl}
          <div class="bg-white border-3 border-[#0ea5e9] rounded-sm p-3 shadow-[3px_3px_0px_0px_#0ea5e9]">
            <img src={posterDataUrl} alt="海报预览" class="w-full h-auto rounded-sm" />
            <div class="mt-3 flex gap-2">
              <button
                on:click={sharePoster}
                class="flex-1 bg-[#0284c7] text-white font-black py-2.5 border-3 border-[#0284c7] rounded-sm shadow-[3px_3px_0px_0px_#fde68a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-sm uppercase tracking-wider cursor-pointer"
              >
                分享
              </button>
              <button
                on:click={downloadPoster}
                class="flex-1 bg-white dark:bg-slate-700 text-[#0284c7] font-black py-2.5 border-3 border-[#0284c7] rounded-sm shadow-[3px_3px_0px_0px_#0284c7] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-sm uppercase tracking-wider cursor-pointer"
              >
                下载
              </button>
            </div>
          </div>
        {/if}

        {#if posterError}
          <p class="text-red-500 text-xs font-bold text-center">{posterError}</p>
        {/if}

        <!-- Share to QQ Zone -->
        <button
          on:click={shareToQQ}
          class="w-full flex items-center gap-4 p-4 bg-white dark:bg-slate-700 border-3 border-[#0284c7] rounded-sm shadow-[4px_4px_0px_0px_#0284c7] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
        >
          <div class="w-10 h-10 flex items-center justify-center bg-[#0284c7] border-2 border-[#0284c7] rounded-sm shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 14h-9c-.83 0-1.5-.67-1.5-1.5S6.67 13 7.5 13h9c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5zm0-5h-9c-.83 0-1.5-.67-1.5-1.5S6.67 8 7.5 8h9c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>
            </svg>
          </div>
          <div class="text-left">
            <div class="font-black text-[#0284c7] text-sm">QQ 空间</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 font-bold">分享到 QQ 空间</div>
          </div>
        </button>

        <!-- Share to X -->
        <button
          on:click={shareToX}
          class="w-full flex items-center gap-4 p-4 bg-white dark:bg-slate-700 border-3 border-[#0284c7] rounded-sm shadow-[4px_4px_0px_0px_#0284c7] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
        >
          <div class="w-10 h-10 flex items-center justify-center bg-black border-2 border-black rounded-sm shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </div>
          <div class="text-left">
            <div class="font-black text-[#0284c7] text-sm">X (Twitter)</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 font-bold">分享到 X</div>
          </div>
        </button>

        <!-- Share to WeChat -->
        <button
          on:click={shareToWeChat}
          class="w-full flex items-center gap-4 p-4 bg-white dark:bg-slate-700 border-3 border-[#0284c7] rounded-sm shadow-[4px_4px_0px_0px_#0284c7] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
        >
          <div class="w-10 h-10 flex items-center justify-center bg-[#07c160] border-2 border-[#07c160] rounded-sm shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm2.869 3.714c-.482 0-.872.396-.872.884 0 .489.39.885.872.885.481 0 .872-.396.872-.885a.878.878 0 00-.872-.884zm-4.951.004c-.481 0-.872.396-.872.884 0 .489.39.885.872.885.481 0 .872-.396.872-.885a.878.878 0 00-.872-.884zm1.256 4.403c-2.092 0-3.95.586-5.122 1.443 1.426.936 3.252 1.486 5.222 1.486.799 0 1.568-.11 2.29-.308a.864.864 0 01.716.098l1.904 1.114a.326.326 0 00.167.054c.16 0 .29-.132.29-.295 0-.072-.029-.143-.048-.213l-.39-1.48a.59.59 0 01.213-.665c1.19-.942 2.02-2.294 2.228-3.826-1.215.652-2.662 1.035-4.27 1.035-1.09 0-2.124-.177-3.04-.488z"/>
            </svg>
          </div>
          <div class="text-left">
            <div class="font-black text-[#0284c7] text-sm">微信</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 font-bold">复制内容，打开微信粘贴</div>
          </div>
        </button>

        <!-- Copy Link -->
        <button
          on:click={copyLink}
          class="copy-link-btn w-full flex items-center gap-4 p-4 bg-white dark:bg-slate-700 border-3 border-[#0284c7] rounded-sm shadow-[4px_4px_0px_0px_#0284c7] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
        >
          <div class="w-10 h-10 flex items-center justify-center bg-slate-100 border-2 border-[#0284c7] rounded-sm shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-[#0284c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div class="text-left">
            <div class="font-black text-[#0284c7] text-sm">复制链接</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 font-bold">复制文章链接到剪贴板</div>
          </div>
        </button>

      </div>
    </div>
  </div>
{/if}

<style>
  .share-trigger {
    position: fixed;
    bottom: 5.5rem;
    left: 1.5rem;
    z-index: 2000;
  }
</style>


