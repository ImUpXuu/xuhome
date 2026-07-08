<script lang="ts">
  import { onMount } from 'svelte';

  export let title: string = '';
  export let description: string = '';
  export let url: string = '';
  export let image: string = '';
  export let date: string = '';

  let expanded = false;
  let pageViews = 0;
  let copied = false;
  let generatingPoster = false;
  let posterDataUrl: string | null = null;
  let posterError = '';
  let showPoster = false;

  const encodedUrl = encodeURI(url || window.location.href);

  onMount(async () => {
    try {
      const p = new URL(url || window.location.href).pathname;
      const res = await fetch('https://vapi.upxuu.com/statsapi/alltime?path=' + encodeURIComponent(p));
      const data = await res.json();
      if (data) {
        pageViews = typeof data.pageviews === 'object' ? (data.pageviews?.value ?? 0) : (data.pageviews ?? 0);
      }
    } catch {}
  });

  function toggle() { expanded = !expanded; }

  function copyLink() {
    navigator.clipboard.writeText(encodedUrl).then(() => { copied = true; setTimeout(() => copied = false, 2000); });
  }

  function shareToQQ() {
    window.open('https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title) + '&desc=' + encodeURIComponent(description) + '&summary=' + encodeURIComponent(description) + '&site=UpXuu', '_blank', 'width=700,height=600');
  }

  function shareToX() {
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(title + (description ? ' - ' + description : '')) + '&url=' + encodeURIComponent(url), '_blank', 'width=600,height=400');
  }

  function shareToWeChat() {
    navigator.clipboard.writeText(title + '\n' + description + '\n' + url).then(() => alert('已复制，打开微信粘贴给好友'));
  }

  function closePoster() {
    showPoster = false; posterDataUrl = null; posterError = '';
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeyDown);
  }

  function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') closePoster(); }

  async function copyPoster() {
    if (!posterDataUrl) return;
    try {
      const blob = await (await fetch(posterDataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch {
      const a = document.createElement('a'); a.href = posterDataUrl; a.download = 'poster-' + Date.now() + '.png'; a.click();
    }
  }

  async function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const lines: string[] = []; let cur = '';
    for (const c of text) { const test = cur + c; if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = c; } else cur = test; }
    if (cur) lines.push(cur); return lines.length ? lines : [text];
  }

  async function generatePoster() {
    generatingPoster = true; posterError = ''; posterDataUrl = null;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const W = 900, H = 600;
      canvas.width = W; canvas.height = H;

      // Background & border
      ctx.fillStyle = '#faf8f5'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 8; ctx.strokeRect(20, 20, W - 40, H - 40);
      ctx.fillStyle = '#fde68a'; ctx.fillRect(28, 28, W - 56, 6);

      // Header
      ctx.fillStyle = '#0284c7'; ctx.font = 'bold 20px "Fredoka", "Noto Sans SC", sans-serif'; ctx.textAlign = 'left';
      ctx.fillText("UPXUU'S BLOG SHARING!", 50, 75);
      ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(50, 95); ctx.lineTo(850, 95); ctx.stroke(); ctx.setLineDash([]);

      let leftX = 60, rightX = 480, hasImg = false;

      // Left: article image
      if (image) {
        try {
          const img = await loadImage(image);
          const imgH = Math.min(400, 400 * (img.height / img.width));
          ctx.fillStyle = '#0284c7'; ctx.fillRect(leftX - 4, 112, 388, imgH + 8);
          ctx.save(); ctx.beginPath(); ctx.rect(leftX, 116, 380, imgH); ctx.clip();
          ctx.drawImage(img, leftX, 116, 380, imgH); ctx.restore();
          hasImg = true;
        } catch {}
      }

      if (!hasImg) rightX = 60;
      const maxW = W - rightX - 60;

      // Title
      ctx.fillStyle = '#1e293b'; ctx.font = 'bold 24px "Noto Sans SC", sans-serif'; ctx.textAlign = 'left';
      const tLines = wrapText(ctx, title || '', maxW);
      let y = 140;
      tLines.slice(0, 3).forEach((l, i) => ctx.fillText(l, rightX, y + i * 34));
      y += Math.min(tLines.length, 3) * 34 + 8;

      // Date (bold, below title)
      if (date) {
        ctx.fillStyle = '#0284c7'; ctx.font = 'bold 16px "Noto Sans SC", sans-serif';
        ctx.fillText(date, rightX, y + 20);
        y += 34;
      }

      // Description
      if (description) {
        ctx.fillStyle = '#64748b'; ctx.font = '14px "Noto Sans SC", sans-serif';
        const dLines = wrapText(ctx, description, maxW);
        dLines.slice(0, 3).forEach((l, i) => ctx.fillText(l, rightX, y + i * 22));
        y += Math.min(dLines.length, 3) * 22 + 8;
      }

      // Separator
      y += 4;
      ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(rightX, y); ctx.lineTo(W - 60, y); ctx.stroke(); ctx.setLineDash([]);
      y += 14;

      // Personal card
      const cardW = Math.min(260, maxW);
      const cardH = 72;
      const cardX = rightX;
      const cardY = y;
      // Card shadow
      ctx.fillStyle = '#0284c7'; ctx.shadowColor = '#0284c7'; ctx.shadowBlur = 0;
      ctx.fillRect(cardX + 3, cardY + 3, cardW, cardH);
      ctx.shadowBlur = 0;
      // Card background
      ctx.fillStyle = '#faf8f5'; ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 3;
      ctx.fillRect(cardX, cardY, cardW, cardH); ctx.strokeRect(cardX, cardY, cardW, cardH);
      // Avatar
      const avatarSize = 44;
      const avatarX = cardX + 14, avatarY = cardY + 14;
      ctx.save(); ctx.beginPath(); ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2); ctx.clip();
      try {
        const avImg = await loadImage('https://upxuu.com/images/me.jpg');
        ctx.drawImage(avImg, avatarX, avatarY, avatarSize, avatarSize);
      } catch { ctx.fillStyle = '#0284c7'; ctx.beginPath(); ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      // Name
      ctx.fillStyle = '#1e293b'; ctx.font = 'bold 18px "Noto Sans SC", sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('UPXUU', cardX + 68, cardY + 30);
      // Blog link
      ctx.fillStyle = '#0ea5e9'; ctx.font = '13px "JetBrains Mono", monospace';
      ctx.fillText('UPXUU.COM', cardX + 68, cardY + 54);
      y += cardH + 12;

      // Views
      ctx.fillStyle = '#94a3b8'; ctx.font = '13px "Noto Sans SC", sans-serif';
      ctx.fillText('\uD83D\uDC41 ' + pageViews + ' views', rightX, y + 16);

      // Bottom accent
      ctx.fillStyle = '#fde68a'; ctx.fillRect(28, H - 40, W - 56, 6);

      // URL
      ctx.fillStyle = '#0ea5e9'; ctx.font = '13px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
      ctx.fillText(url, 50, H - 58);

      // QR with decorative border
      const qrSize = 100;
      const qrX = W - 145, qrY = H - 145;
      ctx.fillStyle = '#0284c7'; ctx.fillRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
      ctx.fillStyle = 'white'; ctx.fillRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4);
      try {
        const qrImg = await loadImage('https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=' + encodeURIComponent(url));
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      } catch {}

      // Footer text
      ctx.fillStyle = '#94a3b8'; ctx.font = '11px "Noto Sans SC", sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('UpXuu \u00B7 ' + (date || new Date().toLocaleDateString('zh-CN')), 850, H - 44);

      posterDataUrl = canvas.toDataURL('image/png');
      showPoster = true;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', onKeyDown);
    } catch { posterError = '生成失败'; } finally { generatingPoster = false; }
  }

  function downloadPoster() {
    if (posterDataUrl) { const a = document.createElement('a'); a.href = posterDataUrl; a.download = 'poster-' + Date.now() + '.png'; a.click(); }
  }
</script>

<button
  on:click={toggle}
  class="w-9 h-9 rounded-sm border-2 border-[#0284c7] bg-[#fde68a] dark:bg-[#fde68a]/20 text-[#0284c7] flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_0px_#0284c7] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#0284c7] active:translate-y-0 active:shadow-none transition-all duration-150 shrink-0"
  aria-label="分享"
>
  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
    <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
</button>

{#if expanded}
  <div class="mt-3 border-t-2 border-dashed border-[#0284c7]/20 pt-3 space-y-2">
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <button on:click={generatePoster} disabled={generatingPoster} class="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-700 border-2 border-[#0284c7] rounded-sm shadow-[2px_2px_0px_0px_#0284c7] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs font-black text-[#0284c7] cursor-pointer disabled:opacity-50">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        {#if generatingPoster}<span class="animate-spin">{'\u27F3'}</span>{:else}海报{/if}
      </button>
      <button on:click={shareToQQ} class="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-700 border-2 border-[#0284c7] rounded-sm shadow-[2px_2px_0px_0px_#0284c7] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs font-black text-[#0284c7] cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0 fill-[#0284c7]" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 14h-9c-.83 0-1.5-.67-1.5-1.5S6.67 13 7.5 13h9c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5zm0-5h-9c-.83 0-1.5-.67-1.5-1.5S6.67 8 7.5 8h9c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
        QQ
      </button>
      <button on:click={shareToX} class="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-700 border-2 border-[#0284c7] rounded-sm shadow-[2px_2px_0px_0px_#0284c7] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs font-black text-[#0284c7] cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        X
      </button>
      <button on:click={shareToWeChat} class="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-700 border-2 border-[#0284c7] rounded-sm shadow-[2px_2px_0px_0px_#0284c7] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs font-black text-[#0284c7] cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0 fill-[#07c160]" viewBox="0 0 24 24"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348z"/></svg>
        微信
      </button>
      <button on:click={copyLink} class="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-700 border-2 border-[#0284c7] rounded-sm shadow-[2px_2px_0px_0px_#0284c7] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs font-black text-[#0284c7] cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
        {copied ? '已复制' : '复制链接'}
      </button>
    </div>

    {#if posterError}
      <p class="text-xs font-bold text-red-500 text-center">{posterError}</p>
    {/if}
  </div>
{/if}

{#if showPoster && posterDataUrl}
  <div class="fixed inset-0 z-[9999]" style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);" role="dialog" aria-modal="true" on:click={closePoster}>
    <div class="absolute bottom-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:w-[520px] max-h-[90vh] bg-[#faf8f5] dark:bg-slate-800 border-t-[10px] sm:border-[10px] border-[#0284c7] rounded-t-3xl sm:rounded-sm shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.5),8px_8px_0px_0px_#0284c7] overflow-y-auto" on:click|stopPropagation>
      <div class="flex items-center justify-between p-4 border-b-4 border-[#0284c7] bg-white dark:bg-slate-800 sticky top-0 z-10">
        <h3 class="font-black text-[#0284c7] text-base uppercase tracking-wider">海报预览</h3>
        <button on:click={closePoster} class="w-9 h-9 flex items-center justify-center hover:bg-[#fde68a] dark:hover:bg-[#fde68a]/20 rounded-sm transition-all text-[#0284c7] cursor-pointer border-2 border-[#0284c7] bg-white dark:bg-slate-700 shadow-[2px_2px_0px_0px_#0284c7] active:translate-y-0.5 active:shadow-none">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div class="p-4">
        <img src={posterDataUrl} alt="海报" class="w-full h-auto rounded-sm border-2 border-[#0284c7]/20" />
        <div class="mt-3 flex gap-2">
          <button on:click={downloadPoster} class="flex-1 bg-[#0284c7] text-white font-black py-2.5 border-3 border-[#0284c7] rounded-sm shadow-[3px_3px_0px_0px_#fde68a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-sm cursor-pointer">
            下载
          </button>
          <button on:click={copyPoster} class="flex-1 bg-white dark:bg-slate-700 text-[#0284c7] font-black py-2.5 border-3 border-[#0284c7] rounded-sm shadow-[3px_3px_0px_0px_#0284c7] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-sm cursor-pointer">
            复制
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
