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
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.scale(dpr, dpr);

      const warmWhite = '#f8fbff';
      const ink = '#17324d';
      const muted = '#6b8298';
      const blue = '#dceefa';
      const blueStrong = '#78b9dc';
      const pad = 58;
      const contentW = W - pad * 2;
      const roundedRect = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      };
      const fillRound = (x: number, y: number, w: number, h: number, r: number, color: string) => {
        roundedRect(x, y, w, h, r);
        ctx.fillStyle = color;
        ctx.fill();
      };

      ctx.fillStyle = warmWhite;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = blue;
      ctx.fillRect(0, 0, W, 18);
      ctx.fillStyle = '#eef7fc';
      ctx.fillRect(0, H - 16, W, 16);

      ctx.textAlign = 'left';
      ctx.fillStyle = blueStrong;
      ctx.font = 'bold 24px "Noto Sans SC", system-ui, sans-serif';
      ctx.fillText('UPXUU  ·  STORY', pad, 68);
      ctx.fillStyle = muted;
      ctx.font = '16px "Noto Sans SC", system-ui, sans-serif';
      ctx.fillText('把值得分享的内容，留在一张卡片里', pad, 96);

      let y = 126;
      const coverH = 370;
      if (image) {
        try {
          const img = await loadImage(image);
          const scale = Math.max(contentW / img.width, coverH / img.height);
          const sw = contentW / scale;
          const sh = coverH / scale;
          const sx = (img.width - sw) / 2;
          const sy = (img.height - sh) / 2;
          ctx.save();
          roundedRect(pad, y, contentW, coverH, 24);
          ctx.clip();
          ctx.drawImage(img, sx, sy, sw, sh, pad, y, contentW, coverH);
          ctx.restore();
          ctx.strokeStyle = '#c5e2f2';
          ctx.lineWidth = 3;
          roundedRect(pad, y, contentW, coverH, 24);
          ctx.stroke();
          y += coverH + 42;
        } catch {
          y += 12;
        }
      } else {
        fillRound(pad, y, contentW, 150, 24, blue);
        ctx.fillStyle = blueStrong;
        ctx.font = 'bold 48px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('UPXUU', W / 2, y + 92);
        ctx.textAlign = 'left';
        y += 188;
      }

      ctx.fillStyle = ink;
      ctx.font = 'bold 40px "Noto Sans SC", system-ui, sans-serif';
      const titleLines = wrapText(ctx, title || '无标题', contentW);
      titleLines.slice(0, 3).forEach((line, i) => ctx.fillText(line, pad, y + i * 52));
      y += Math.min(titleLines.length, 3) * 52 + 18;

      ctx.fillStyle = blueStrong;
      ctx.font = 'bold 18px "Noto Sans SC", system-ui, sans-serif';
      const metaParts: string[] = [];
      if (date) metaParts.push(date);
      metaParts.push(`${pageViews} 次阅读`);
      ctx.fillText(metaParts.join('  ·  '), pad, y);
      y += 34;

      if (description) {
        ctx.fillStyle = muted;
        ctx.font = '21px "Noto Sans SC", system-ui, sans-serif';
        const descLines = wrapText(ctx, description, contentW);
        descLines.slice(0, 3).forEach((line, i) => ctx.fillText(line, pad, y + i * 31));
      }

      const footerY = H - 210;
      const footerH = 142;
      fillRound(pad, footerY, contentW, footerH, 22, '#edf7fc');
      ctx.strokeStyle = '#c5e2f2';
      ctx.lineWidth = 2;
      roundedRect(pad, footerY, contentW, footerH, 22);
      ctx.stroke();

      const av = 72;
      const avX = pad + 24;
      const avY = footerY + (footerH - av) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(avX + av / 2, avY + av / 2, av / 2, 0, Math.PI * 2);
      ctx.clip();
      try {
        const avImg = await loadImage('https://upxuu.com/images/me.jpg');
        ctx.drawImage(avImg, avX, avY, av, av);
      } catch {
        ctx.fillStyle = blueStrong;
        ctx.fillRect(avX, avY, av, av);
      }
      ctx.restore();
      ctx.fillStyle = ink;
      ctx.font = 'bold 26px "Noto Sans SC", system-ui, sans-serif';
      ctx.fillText('UPXUU', avX + av + 20, footerY + 58);
      ctx.fillStyle = muted;
      ctx.font = '16px "Noto Sans SC", system-ui, sans-serif';
      ctx.fillText('upxuu.com', avX + av + 20, footerY + 88);

      const qr = 100;
      const qrX = pad + contentW - qr - 28;
      const qrY = footerY + (footerH - qr) / 2;
      fillRound(qrX - 9, qrY - 9, qr + 18, qr + 18, 14, '#ffffff');
      try {
        const qrImg = await loadImage('https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=8&data=' + encodeURIComponent(shareUrl));
        ctx.drawImage(qrImg, qrX, qrY, qr, qr);
      } catch {}

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
  <div class="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-6" style="background: rgba(23,50,77,0.38); backdrop-filter: blur(8px);" role="dialog" aria-modal="true" on:click={closePoster}>
    <div class="w-full sm:max-w-[440px] max-h-[94vh] overflow-y-auto bg-[#f8fbff] dark:bg-slate-800 rounded-t-[28px] sm:rounded-[28px] shadow-[0_24px_80px_rgba(23,50,77,0.28)] border border-[#c5e2f2]" on:click|stopPropagation>
      <div class="flex items-center justify-between px-5 py-4 border-b border-[#dceefa] sticky top-0 z-10 bg-[#f8fbff]/95 dark:bg-slate-800/95 backdrop-blur">
        <div><h3 class="font-bold text-[#17324d] dark:text-slate-100 text-base">分享海报</h3><p class="text-xs text-[#6b8298] mt-0.5">下载或复制给朋友</p></div>
        <button on:click={closePoster} aria-label="关闭" class="w-9 h-9 flex items-center justify-center rounded-full bg-[#dceefa] text-[#4b83a5] hover:bg-[#c5e2f2] transition-colors cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div class="p-4 sm:p-5">
        <img src={posterDataUrl} alt="海报" class="w-full h-auto rounded-2xl border border-[#c5e2f2] shadow-sm" />
        <div class="mt-4 flex gap-3">
          <button on:click={downloadPoster} class="flex-1 bg-[#78b9dc] text-white font-bold py-3 rounded-xl hover:bg-[#5fa8d0] transition-colors text-sm cursor-pointer">下载海报</button>
          <button on:click={copyPoster} class="flex-1 bg-white dark:bg-slate-700 text-[#4b83a5] font-bold py-3 rounded-xl border border-[#c5e2f2] hover:bg-[#eef7fc] transition-colors text-sm cursor-pointer">复制图片</button>
        </div>
      </div>
    </div>
  </div>
{/if}
