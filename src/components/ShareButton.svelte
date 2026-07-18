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

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  onMount(async () => {
    try {
      var p = new URL(shareUrl).pathname;
      if (!p.endsWith('/')) p += '/';
      const res = await fetch('https://beat.345696.xyz/api/stats?p=' + encodeURIComponent(p), { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (data) {
        var v = data[p];
        pageViews = v !== undefined ? v : 0;
      }
    } catch {}
  });

  function toggle() { expanded = !expanded; }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => { copied = true; setTimeout(() => copied = false, 2000); });
  }

  function shareToQQ() {
    window.open('https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=' + encodeURIComponent(shareUrl) + '&title=' + encodeURIComponent(title) + '&desc=' + encodeURIComponent(description) + '&summary=' + encodeURIComponent(description) + '&site=UpXuu', '_blank', 'width=700,height=600');
  }

  function shareToX() {
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(title + (description ? ' - ' + description : '')) + '&url=' + encodeURIComponent(shareUrl), '_blank', 'width=600,height=400');
  }

  function shareToWeChat() {
    navigator.clipboard.writeText(title + '\n' + description + '\n' + shareUrl).then(() => alert('已复制，打开微信粘贴给好友'));
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
      downloadPoster();
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
    const lines: string[] = [];
    let cur = '';
    for (const c of text) {
      const test = cur + c;
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = c;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [text];
  }

  async function generatePoster() {
    generatingPoster = true;
    posterError = '';
    posterDataUrl = null;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const W = 900;
      const H = 1200;
      canvas.width = W;
      canvas.height = H;

      // Outer cream + stacked shadow
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(18, 18, W - 24, H - 24);

      // Main card
      ctx.fillStyle = '#faf8f5';
      ctx.fillRect(8, 8, W - 32, H - 32);

      // Top accent bar
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(8, 8, W - 32, 14);

      // Header band
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(8, 22, W - 32, 72);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px "Fredoka", "Noto Sans SC", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('UPXUU · BLOG', 40, 68);
      ctx.font = 'bold 16px "Noto Sans SC", system-ui, sans-serif';
      ctx.fillStyle = '#bae6fd';
      ctx.fillText('分享一张好看的文章卡片', 40, 90);

      let y = 120;
      const pad = 40;
      const contentW = W - 32 - pad * 2;

      // Cover image
      if (image) {
        try {
          const img = await loadImage(image);
          const boxW = contentW;
          const boxH = 360;
          const scale = Math.max(boxW / img.width, boxH / img.height);
          const sw = boxW / scale;
          const sh = boxH / scale;
          const sx = (img.width - sw) / 2;
          const sy = (img.height - sh) / 2;

          ctx.fillStyle = '#0284c7';
          ctx.fillRect(pad - 4, y - 4, boxW + 8, boxH + 8);
          ctx.save();
          ctx.beginPath();
          ctx.rect(pad, y, boxW, boxH);
          ctx.clip();
          ctx.drawImage(img, sx, sy, sw, sh, pad, y, boxW, boxH);
          ctx.restore();
          y += boxH + 36;
        } catch {
          y += 12;
        }
      } else {
        // Decorative block when no cover
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(pad, y, contentW, 120);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 4;
        ctx.strokeRect(pad, y, contentW, 120);
        ctx.fillStyle = '#0284c7';
        ctx.font = 'bold 42px "Fredoka", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('UPXUU', pad + contentW / 2, y + 72);
        ctx.textAlign = 'left';
        y += 148;
      }

      // Title
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 40px "Noto Sans SC", system-ui, sans-serif';
      const titleLines = wrapText(ctx, title || '无标题', contentW);
      titleLines.slice(0, 3).forEach((line, i) => {
        ctx.fillText(line, pad, y + i * 52);
      });
      y += Math.min(titleLines.length, 3) * 52 + 18;

      // Meta chips
      const metaParts: string[] = [];
      if (date) metaParts.push(date);
      metaParts.push(`${pageViews} 次阅读`);
      const meta = metaParts.join('  ·  ');
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 18px "Noto Sans SC", system-ui, sans-serif';
      ctx.fillText(meta, pad, y);
      y += 36;

      // Description
      if (description) {
        ctx.fillStyle = '#475569';
        ctx.font = '22px "Noto Sans SC", system-ui, sans-serif';
        const descLines = wrapText(ctx, description, contentW);
        descLines.slice(0, 4).forEach((line, i) => {
          ctx.fillText(line, pad, y + i * 32);
        });
        y += Math.min(descLines.length, 4) * 32 + 28;
      }

      // Footer card
      const footerY = H - 220;
      const footerH = 150;
      const footerW = contentW;
      const footerX = pad;

      // Shadow
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(footerX + 6, footerY + 6, footerW, footerH);
      // Card
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(footerX, footerY, footerW, footerH);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 4;
      ctx.strokeRect(footerX, footerY, footerW, footerH);

      // Avatar
      const av = 72;
      const avX = footerX + 24;
      const avY = footerY + (footerH - av) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(avX + av / 2, avY + av / 2, av / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      try {
        const avImg = await loadImage('https://upxuu.com/images/me.jpg');
        ctx.drawImage(avImg, avX, avY, av, av);
      } catch {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(avX, avY, av, av);
      }
      ctx.restore();
      // Avatar ring
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(avX + av / 2, avY + av / 2, av / 2, 0, Math.PI * 2);
      ctx.stroke();

      // Name + link
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 26px "Noto Sans SC", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('UPXUU', avX + av + 20, footerY + 58);
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.fillText('upxuu.com', avX + av + 20, footerY + 90);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Noto Sans SC", system-ui, sans-serif';
      const shortUrl = shareUrl.replace(/^https?:\/\//, '').slice(0, 28);
      ctx.fillText(shortUrl, avX + av + 20, footerY + 118);

      // QR
      const qr = 96;
      const qrX = footerX + footerW - qr - 24;
      const qrY = footerY + (footerH - qr) / 2;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(qrX - 4, qrY - 4, qr + 8, qr + 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrX, qrY, qr, qr);
      try {
        const qrImg = await loadImage('https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=8&data=' + encodeURIComponent(shareUrl));
        ctx.drawImage(qrImg, qrX + 6, qrY + 6, qr - 12, qr - 12);
      } catch {}

      // Bottom strip
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(8, H - 40, W - 32, 16);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(8, H - 24, W - 32, 8);

      posterDataUrl = canvas.toDataURL('image/png');
      showPoster = true;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', onKeyDown);
    } catch {
      posterError = '生成失败';
    } finally {
      generatingPoster = false;
    }
  }

  function downloadPoster() {
    if (posterDataUrl) {
      const a = document.createElement('a');
      a.href = posterDataUrl;
      a.download = 'upxuu-poster-' + Date.now() + '.png';
      a.click();
    }
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
        {#if generatingPoster}<span class="animate-spin">⟳</span>{:else}海报{/if}
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
    <div class="absolute bottom-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:w-[420px] max-h-[90vh] bg-[rgba(250,248,245,0.95)] dark:bg-slate-800 border-t-[6px] sm:border-[6px] border-[#0284c7] rounded-t-3xl sm:rounded-sm shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.5),6px_6px_0px_0px_#0284c7] overflow-y-auto" on:click|stopPropagation>
      <div class="flex items-center justify-between p-4 border-b-4 border-[#0284c7] bg-white dark:bg-slate-800 sticky top-0 z-10">
        <h3 class="font-black text-[#0284c7] text-base uppercase tracking-wider">分享卡片</h3>
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
