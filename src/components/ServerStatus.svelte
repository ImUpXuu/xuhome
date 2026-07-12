<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  const API = 'https://monitor-api.upxuu.com';

  let currentDown = 0;
  let currentUp = 0;
  let avg60mDown = 0;
  let avg60mUp = 0;
  let history: { time: string; download: number; upload: number }[] = [];
  let canvasEl: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let bwTimer: ReturnType<typeof setInterval>;
  let trendTimer: ReturnType<typeof setInterval>;

  function drawChart() {
    if (!canvasEl || !history.length) return;
    ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvasEl.getBoundingClientRect();
    canvasEl.width = rect.width * dpr;
    canvasEl.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, w, h);

    const pad = { top: 8, bottom: 16, left: 8, right: 8 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    // Find max for scale
    let maxVal = 0;
    history.forEach(function(p) {
      if (p.download > maxVal) maxVal = p.download;
      if (p.upload > maxVal) maxVal = p.upload;
    });
    maxVal = Math.max(maxVal, 0.1);

    // Grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    for (var i = 0; i <= 4; i++) {
      var y = pad.top + (ch / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
    }

    function xPos(idx: number) {
      return pad.left + (idx / (history.length - 1 || 1)) * cw;
    }

    function yPos(val: number) {
      return pad.top + ch - (val / maxVal) * ch;
    }

    // Draw download line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < history.length; i++) {
      var x = xPos(i);
      var y = yPos(history[i].download);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw upload line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < history.length; i++) {
      var x = xPos(i);
      var y = yPos(history[i].upload);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    if (history.length > 0) {
      var step = Math.max(1, Math.floor(history.length / 4));
      for (var i = 0; i < history.length; i += step) {
        var t = history[i].time;
        ctx.fillText(t.slice(11, 16), xPos(i), h - 2);
      }
    }
  }

  async function fetchCurrent() {
    try {
      var r = await fetch(API + '/api/traffic/current', { signal: AbortSignal.timeout(5000) });
      var j = await r.json();
      currentDown = j.download || 0;
      currentUp = j.upload || 0;
    } catch {}
  }

  async function fetchAverage() {
    try {
      var r = await fetch(API + '/api/traffic/average?minutes=60', { signal: AbortSignal.timeout(5000) });
      var j = await r.json();
      avg60mDown = j.avg_download || 0;
      avg60mUp = j.avg_upload || 0;
    } catch {}
  }

  async function fetchTrend() {
    try {
      var r = await fetch(API + '/api/traffic/trend?seconds=60', { signal: AbortSignal.timeout(5000) });
      var j = await r.json();
      history = j.data || [];
      drawChart();
    } catch {}
  }

  onMount(function() {
    fetchCurrent();
    fetchAverage();
    fetchTrend();
    bwTimer = setInterval(fetchCurrent, 120000);
    trendTimer = setInterval(fetchTrend, 120000);
  });

  onDestroy(function() {
    if (bwTimer) clearInterval(bwTimer);
    if (trendTimer) clearInterval(trendTimer);
  });
</script>

<div class="bg-white border-4 border-[#0284c7] p-4 sm:p-6 shadow-[6px_6px_0px_0px_#10b981] rounded-sm">
  <h2 class="text-xl sm:text-2xl font-black text-[#0284c7] tracking-wider mb-4 flex items-center gap-2">
    <span>🖥</span> 服务器带宽状态
  </h2>

  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
    <div class="bg-[#faf8f5] border-2 border-[#0284c7]/20 rounded-sm px-3 py-2">
      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">实时下载</div>
      <div class="text-lg font-black text-[#10b981] font-mono">{currentDown.toFixed(2)} <span class="text-xs text-slate-400">MB/s</span></div>
    </div>
    <div class="bg-[#faf8f5] border-2 border-[#0284c7]/20 rounded-sm px-3 py-2">
      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">实时上传</div>
      <div class="text-lg font-black text-[#f59e0b] font-mono">{currentUp.toFixed(2)} <span class="text-xs text-slate-400">MB/s</span></div>
    </div>
    <div class="bg-[#faf8f5] border-2 border-[#0284c7]/20 rounded-sm px-3 py-2">
      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">60m 平均</div>
      <div class="text-lg font-black text-[#0284c7] font-mono">{avg60mDown.toFixed(2)}/{avg60mUp.toFixed(2)} <span class="text-xs text-slate-400">MB/s</span></div>
    </div>
  </div>

  <div class="bg-[#faf8f5] border-2 border-[#0284c7]/20 rounded-sm p-2">
    <div class="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
      <span class="inline-flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-[#10b981]"></span> 下载
        <span class="w-2 h-2 rounded-full bg-[#f59e0b]"></span> 上传
        <span class="text-slate-300">| 60s 趋势</span>
      </span>
    </div>
    <canvas bind:this={canvasEl} class="w-full h-[120px] sm:h-[160px] rounded-sm"></canvas>
  </div>

  <div class="mt-2 text-[9px] text-slate-400 font-mono text-right">每 2 分钟自动刷新</div>
</div>
