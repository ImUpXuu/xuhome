<script lang="ts">
  import { onMount } from 'svelte';

  export let title: string = '';
  export let description: string = '';
  export let url: string = '';
  export let image: string = '';
  export let date: string = '';
  export let readTime: number | null = null;
  export let tags: string[] = [];

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
      const res = await fetch('https://blog.api.upxuu.com/api/views?path=' + encodeURIComponent(p), { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (data && typeof data.views === 'number') {
        pageViews = data.views;
      }
    } catch {}
  });

  function toggle() {
    expanded = !expanded;
    if (expanded) document.addEventListener('keydown', onKeyDown);
    else document.removeEventListener('keydown', onKeyDown);
  }

  function closeShare() {
    expanded = false;
    document.removeEventListener('keydown', onKeyDown);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      copied = true;
      setTimeout(() => copied = false, 2000);
    } catch {
      copied = false;
    }
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

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    if (showPoster) closePoster();
    else if (expanded) closeShare();
  }

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
    closeShare();
    generatingPoster = true;
    posterError = '';
    posterDataUrl = null;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const W = 1080;
      const H = 1080; 
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.scale(dpr, dpr);

      
      const bg = '#faf8f5';
      const brand = '#0284c7';
      const brandSoft = '#e0f2fe';
      const accent = '#fde68a';
      const ink = '#0f172a';
      const muted = '#64748b';
      const FONT = '"Fredoka", "PingFang SC", "Noto Sans SC", system-ui, sans-serif';
      const pad = 60;
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
      const ellipsize = (lines: string[], max: number): string[] => {
        if (lines.length <= max) return lines;
        const out = lines.slice(0, max);
        let last = out[max - 1];
        while (last.length && ctx.measureText(last + '…').width > contentW) last = last.slice(0, -1);
        out[max - 1] = last + '…';
        return out;
      };

      
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(2, 132, 199, 0.07)';
      for (let gx = 12; gx < W; gx += 24) {
        for (let gy = 12; gy < H; gy += 24) {
          ctx.fillRect(gx, gy, 2.2, 2.2);
        }
      }

      
      ctx.fillStyle = brand;
      ctx.fillRect(0, 0, W, 14);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 14, W, 5);

      
      const logoS = 46;
      const logoX = pad, logoY = 48;
      ctx.save();
      ctx.translate(logoX + logoS / 2, logoY + logoS / 2);
      ctx.rotate(-0.1);
      ctx.fillStyle = accent;
      ctx.strokeStyle = brand;
      ctx.lineWidth = 3;
      roundedRect(-logoS / 2, -logoS / 2, logoS, logoS, 9);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = brand;
      ctx.font = `900 26px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('U', 0, 1);
      ctx.restore();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      ctx.fillStyle = ink;
      ctx.font = `900 27px ${FONT}`;
      ctx.fillText('UpXuu', logoX + logoS + 18, logoY + 24);
      ctx.fillStyle = muted;
      ctx.font = `500 15px ${FONT}`;
      ctx.fillText('upxuu.com', logoX + logoS + 18, logoY + 46);

      
      const pillText = '文章分享';
      ctx.font = `800 19px ${FONT}`;
      const pillW = ctx.measureText(pillText).width + 40;
      const pillH = 44;
      const pillX = W - pad - pillW;
      const pillY = 48;
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;
      ctx.shadowBlur = 0;
      fillRound(pillX, pillY, pillW, pillH, 9, '#ffffff');
      ctx.restore();
      ctx.strokeStyle = brand;
      ctx.lineWidth = 3;
      roundedRect(pillX, pillY, pillW, pillH, 9);
      ctx.stroke();
      ctx.fillStyle = brand;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, pillX + pillW / 2, pillY + pillH / 2 + 1);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      
      const covX = pad, covY = 122, covW = contentW, covH = 336;
      const drawCoverPlaceholder = () => {
        ctx.fillStyle = brandSoft;
        roundedRect(covX, covY, covW, covH, 20);
        ctx.fill();
        ctx.fillStyle = brand;
        ctx.font = `900 110px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('U', W / 2, covY + covH / 2 - 12);
        const bs = 22, gap = 14;
        const total = bs * 3 + gap * 2;
        const dotY = covY + covH / 2 + 58;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = accent; ctx.fillRect(W / 2 - total / 2, dotY, bs, bs);
        ctx.fillStyle = brand; ctx.fillRect(W / 2 - total / 2 + bs + gap, dotY, bs, bs);
        ctx.fillStyle = '#7dd3fc'; ctx.fillRect(W / 2 - total / 2 + (bs + gap) * 2, dotY, bs, bs);
      };

      ctx.save();
      ctx.shadowColor = brand;
      ctx.shadowOffsetX = 10;
      ctx.shadowOffsetY = 10;
      ctx.shadowBlur = 0;
      fillRound(covX, covY, covW, covH, 20, '#ffffff');
      ctx.restore();
      if (image) {
        try {
          const img = await loadImage(image);
          const scale = Math.max(covW / img.width, covH / img.height);
          const sw = covW / scale;
          const sh = covH / scale;
          const sx = (img.width - sw) / 2;
          const sy = (img.height - sh) / 2;
          ctx.save();
          roundedRect(covX, covY, covW, covH, 20);
          ctx.clip();
          ctx.drawImage(img, sx, sy, sw, sh, covX, covY, covW, covH);
          ctx.restore();
        } catch {
          drawCoverPlaceholder();
        }
      } else {
        drawCoverPlaceholder();
      }
      ctx.strokeStyle = brand;
      ctx.lineWidth = 5;
      roundedRect(covX, covY, covW, covH, 20);
      ctx.stroke();

      
      let ty = covY + covH + 66;
      ctx.fillStyle = ink;
      ctx.font = `900 44px ${FONT}`;
      const titleLines = ellipsize(wrapText(ctx, title || '无标题', contentW), 2);
      titleLines.forEach((line, i) => ctx.fillText(line, pad, ty + i * 58));
      ty += titleLines.length * 58;

      
      if (description) {
        ty += 28;
        ctx.fillStyle = muted;
        ctx.font = `400 22px ${FONT}`;
        const descLines = ellipsize(wrapText(ctx, description, contentW), 2);
        descLines.forEach((line, i) => ctx.fillText(line, pad, ty + i * 34));
        ty += descLines.length * 34;
      }

      
      ty += 42;
      const metaY = ty;
      ctx.fillStyle = accent;
      ctx.strokeStyle = brand;
      ctx.lineWidth = 2.5;
      roundedRect(pad, metaY - 14, 14, 14, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = brand;
      ctx.font = `700 19px ${FONT}`;
      const date10 = (date || '').slice(0, 10);
      const metaParts: string[] = [];
      if (date10) metaParts.push(date10);
      if (readTime) metaParts.push(`阅读约 ${readTime} 分钟`);
      if (pageViews > 0) metaParts.push(`${pageViews} 次阅读`);
      ctx.fillText(metaParts.join('  ·  '), pad + 26, metaY);

      
      ty += 46;
      ctx.font = `700 20px ${FONT}`;
      let tx = pad;
      const tagH = 46;
      for (const t of (tags || []).slice(0, 3)) {
        const label = '# ' + t;
        const w = ctx.measureText(label).width + 40;
        if (tx + w > W - pad) break;
        ctx.save();
        ctx.shadowColor = '#bae6fd';
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
        ctx.shadowBlur = 0;
        fillRound(tx, ty, w, tagH, 10, '#ffffff');
        ctx.restore();
        ctx.strokeStyle = brand;
        ctx.lineWidth = 2.5;
        roundedRect(tx, ty, w, tagH, 10);
        ctx.stroke();
        ctx.fillStyle = '#475569';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, tx + 20, ty + tagH / 2 + 1);
        ctx.textBaseline = 'alphabetic';
        tx += w + 14;
      }

      
      const footH = 150;
      const footY = H - pad - footH;
      ctx.save();
      ctx.shadowColor = brand;
      ctx.shadowOffsetX = 8;
      ctx.shadowOffsetY = 8;
      ctx.shadowBlur = 0;
      fillRound(pad, footY, contentW, footH, 18, '#ffffff');
      ctx.restore();
      ctx.strokeStyle = brand;
      ctx.lineWidth = 4;
      roundedRect(pad, footY, contentW, footH, 18);
      ctx.stroke();

      const av = 92;
      const avX = pad + 26;
      const avY = footY + (footH - av) / 2;
      ctx.save();
      roundedRect(avX, avY, av, av, 18);
      ctx.clip();
      try {
        const avImg = await loadImage('https://upxuu.com/images/me.jpg');
        ctx.drawImage(avImg, avX, avY, av, av);
      } catch {
        ctx.fillStyle = brand;
        ctx.fillRect(avX, avY, av, av);
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 44px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('U', avX + av / 2, avY + av / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }
      ctx.restore();
      ctx.strokeStyle = brand;
      ctx.lineWidth = 3.5;
      roundedRect(avX, avY, av, av, 18);
      ctx.stroke();

      ctx.fillStyle = ink;
      ctx.font = `900 25px ${FONT}`;
      ctx.fillText('UpXuu', avX + av + 22, footY + 58);
      ctx.fillStyle = muted;
      ctx.font = `500 16px ${FONT}`;
      ctx.fillText('逐光而上！ · upxuu.com', avX + av + 22, footY + 88);

      
      const qr = 108;
      const qrX = pad + contentW - qr - 22;
      const qrY = footY + (footH - qr) / 2;
      fillRound(qrX - 7, qrY - 7, qr + 14, qr + 14, 10, '#ffffff');
      ctx.strokeStyle = brand;
      ctx.lineWidth = 2.5;
      roundedRect(qrX - 7, qrY - 7, qr + 14, qr + 14, 10);
      ctx.stroke();
      try {
        const qrImg = await loadImage('https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=' + encodeURIComponent(shareUrl));
        ctx.drawImage(qrImg, qrX, qrY, qr, qr);
      } catch {
        ctx.fillStyle = muted;
        ctx.font = `600 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('二维码', qrX + qr / 2, qrY + qr / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }
      ctx.fillStyle = muted;
      ctx.font = `500 15px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText('扫描二维码', qrX - 20, footY + footH / 2 - 9);
      ctx.fillText('阅读全文', qrX - 20, footY + footH / 2 + 15);
      ctx.textAlign = 'left';

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

  
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy() { node.remove(); } };
  }
</script>

<button
  on:click={toggle}
  class="inline-flex items-center gap-2 h-11 px-4 rounded-sm border-[3px] border-[#0284c7] bg-[#fde68a] dark:bg-[#fde68a]/20 text-[#0284c7] font-black text-sm cursor-pointer shadow-[3px_3px_0px_0px_#0284c7] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0284c7] active:translate-y-0 active:shadow-none transition-all duration-150 shrink-0"
  aria-label="分享文章"
>
  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
    <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
  <span>分享</span>
</button>

{#if expanded}
  <div use:portal class="fixed inset-0 z-[2147483000] flex items-end sm:items-center justify-center p-0 sm:p-6" role="presentation" on:click={closeShare}>
    <div class="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"></div>
    <section
      class="relative w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-[#f8fbff] dark:bg-slate-800 border border-[#c5e2f2] shadow-[0_24px_80px_rgba(23,50,77,0.25)]"
      role="dialog" aria-modal="true" aria-labelledby="share-dialog-title" on:click|stopPropagation
    >
      <div class="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 py-4 border-b border-[#dceefa] bg-[#f8fbff]/95 dark:bg-slate-800/95 backdrop-blur">
        <div>
          <h2 id="share-dialog-title" class="text-lg font-bold text-[#17324d] dark:text-slate-100">分享这篇文章</h2>
          <p class="mt-1 text-xs text-[#6b8298]">选择方式，把内容分享给朋友</p>
        </div>
        <button type="button" on:click={closeShare} aria-label="关闭分享窗口" class="w-10 h-10 shrink-0 rounded-full bg-[#dceefa] text-[#4b83a5] hover:bg-[#c5e2f2] transition-colors flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div class="p-5 sm:p-6">
        <div class="flex items-start gap-3 p-4 rounded-2xl bg-white dark:bg-slate-700 border border-[#dceefa]">
          {#if image}<img src={image} alt="" class="w-14 h-14 rounded-xl object-cover shrink-0" />{/if}
          <div class="min-w-0">
            <h3 class="font-bold text-[#17324d] dark:text-slate-100 line-clamp-2">{title || '无标题'}</h3>
            <p class="mt-1 text-xs text-[#6b8298] line-clamp-2">{description || '来自 UpXuu 的文章分享'}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
          <button type="button" on:click={() => { closeShare(); generatePoster(); }} disabled={generatingPoster} class="min-h-16 rounded-2xl bg-[#78b9dc] text-white font-bold text-sm hover:bg-[#5fa8d0] transition-colors disabled:opacity-60 flex flex-col items-center justify-center gap-1">
            <span class="text-lg">{generatingPoster ? '⟳' : '▧'}</span><span>{generatingPoster ? '生成中…' : '海报'}</span>
          </button>
          <button type="button" on:click={copyLink} class="min-h-16 rounded-2xl bg-white dark:bg-slate-700 border border-[#c5e2f2] text-[#4b83a5] font-bold text-sm hover:bg-[#eef7fc] transition-colors flex flex-col items-center justify-center gap-1">
            <span class="text-lg">⌁</span><span>{copied ? '已复制' : '复制链接'}</span>
          </button>
          <button type="button" on:click={shareToWeChat} class="min-h-16 rounded-2xl bg-white dark:bg-slate-700 border border-[#c5e2f2] text-[#4b83a5] font-bold text-sm hover:bg-[#eef7fc] transition-colors flex flex-col items-center justify-center gap-1">
            <span class="text-lg text-[#07c160]">●</span><span>微信</span>
          </button>
          <button type="button" on:click={shareToQQ} class="min-h-16 rounded-2xl bg-white dark:bg-slate-700 border border-[#c5e2f2] text-[#4b83a5] font-bold text-sm hover:bg-[#eef7fc] transition-colors flex flex-col items-center justify-center gap-1">
            <span class="text-lg">Q</span><span>QQ 空间</span>
          </button>
          <button type="button" on:click={shareToX} class="min-h-16 rounded-2xl bg-white dark:bg-slate-700 border border-[#c5e2f2] text-[#4b83a5] font-bold text-sm hover:bg-[#eef7fc] transition-colors flex flex-col items-center justify-center gap-1">
            <span class="text-lg">𝕏</span><span>分享到 X</span>
          </button>
        </div>
        {#if posterError}<p class="mt-3 text-center text-xs font-medium text-red-500">{posterError}</p>{/if}
      </div>
    </section>
  </div>
{/if}

{#if showPoster && posterDataUrl}
  <div use:portal class="fixed inset-0 z-[2147483001] flex items-end sm:items-center justify-center p-0 sm:p-6" style="background: rgba(23,50,77,0.38); backdrop-filter: blur(8px);" role="dialog" aria-modal="true" on:click={closePoster}>
    <div class="w-full sm:max-w-[480px] max-h-[94vh] overflow-y-auto bg-[#f8fbff] dark:bg-slate-800 rounded-t-[28px] sm:rounded-[28px] shadow-[0_24px_80px_rgba(23,50,77,0.28)] border border-[#c5e2f2]" on:click|stopPropagation>
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
