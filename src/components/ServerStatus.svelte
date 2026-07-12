<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  const API = 'https://monitor-api.upxuu.com';

  let currentDown = 0;
  let currentUp = 0;
  let currentCpu = 0;
  let currentMem = 0;
  let avg60mDown = 0;
  let avg60mUp = 0;
  let avg60mCpu = 0;
  let avg60mMem = 0;
  let trendTimes: string[] = [];
  let trendDown: number[] = [];
  let trendUp: number[] = [];
  let trendCpu: number[] = [];
  let trendMem: number[] = [];
  let canvasEl: HTMLCanvasElement;
  let bwTimer: ReturnType<typeof setInterval>;
  let trendTimer: ReturnType<typeof setInterval>;
  let avgTimer: ReturnType<typeof setInterval>;
  let toastEl: HTMLDivElement | null = null;

  let cpuColor = '#0284c7';
  let memColor = '#8b5cf6';

  function drawChart() {
    if (!canvasEl || !trendTimes.length) return;
    var ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    var dpr = window.devicePixelRatio || 1;
    var rect = canvasEl.getBoundingClientRect();
    canvasEl.width = rect.width * dpr;
    canvasEl.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    var w = rect.width;
    var h = rect.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, w, h);

    var pad = { top: 8, bottom: 16, left: 8, right: 8 };
    var cw = w - pad.left - pad.right;
    var ch = h - pad.top - pad.bottom;

    // Find max across all series
    var allVals: number[] = [];
    trendDown.forEach(function(v) { allVals.push(v); });
    trendUp.forEach(function(v) { allVals.push(v); });
    trendCpu.forEach(function(v) { allVals.push(v); });
    trendMem.forEach(function(v) { allVals.push(v); });
    var maxVal = Math.max(...allVals, 0.1);

    // Grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    for (var gi = 0; gi <= 4; gi++) {
      var gy = pad.top + (ch / 4) * gi;
      ctx.beginPath();
      ctx.moveTo(pad.left, gy);
      ctx.lineTo(w - pad.right, gy);
      ctx.stroke();
    }

    function xPos(idx: number) {
      return pad.left + (idx / (trendTimes.length - 1 || 1)) * cw;
    }
    function yPos(val: number) {
      return pad.top + ch - (val / maxVal) * ch;
    }

    // Draw lines
    var series = [
      { data: trendDown, color: '#10b981', label: '下载' },
      { data: trendUp, color: '#f59e0b', label: '上传' },
      { data: trendCpu, color: cpuColor, label: 'CPU' },
      { data: trendMem, color: memColor, label: '内存' }
    ];

    series.forEach(function(s) {
      if (!s.data.length) return;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var si = 0; si < s.data.length; si++) {
        var sx = xPos(si);
        var sy = yPos(s.data[si]);
        if (si === 0) ctx.moveTo(sx, sy);
        else {
          var prevX = xPos(si - 1);
          var prevY = yPos(s.data[si - 1]);
          var cpX = (prevX + sx) / 2;
          ctx.bezierCurveTo(cpX, prevY, cpX, sy, sx, sy);
        }
      }
      ctx.stroke();
    });

    // X-axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    var step = Math.max(1, Math.floor(trendTimes.length / 4));
    for (var ti = 0; ti < trendTimes.length; ti += step) {
      ctx.fillText(trendTimes[ti], xPos(ti), h - 2);
    }
  }

  async function fetchCurrent() {
    try {
      var r = await fetch(API + '/api/stats/current', { signal: AbortSignal.timeout(5000) });
      var j = await r.json();
      currentDown = j.network?.download || 0;
      currentUp = j.network?.upload || 0;
      currentCpu = j.cpu?.cpu || 0;
      currentMem = j.memory?.memory || 0;
    } catch {}
  }

  async function fetchAverage() {
    try {
      var r = await fetch(API + '/api/stats/average?minutes=60', { signal: AbortSignal.timeout(5000) });
      var j = await r.json();
      avg60mDown = j.network?.avg_download || 0;
      avg60mUp = j.network?.avg_upload || 0;
      avg60mCpu = j.cpu?.avg || 0;
      avg60mMem = j.memory?.avg || 0;
    } catch {}
  }

  async function fetchTrend() {
    try {
      var r = await fetch(API + '/api/stats/trend?seconds=60', { signal: AbortSignal.timeout(5000) });
      var j = await r.json();
      trendTimes = j.times || [];
      trendDown = j.download || [];
      trendUp = j.upload || [];
      trendCpu = j.cpu || [];
      trendMem = j.memory || [];
      drawChart();
    } catch {}
  }

  async function checkLoadWarning() {
    try {
      var r = await fetch(API + '/api/stats/average?minutes=1', { signal: AbortSignal.timeout(5000) });
      var j = await r.json();
      var avgDown = j.network?.avg_download || 0;
      if (avgDown >= 8) {
        showToast('当前服务器负载过高，建议前往 <a href="https://cf.upxuu.com" target="_blank" class="underline font-black text-[#f59e0b]">cf.upxuu.com</a>');
      }
    } catch {}
  }

  function showToast(msg: string) {
    if (document.getElementById('svr-toast')) return;
    var t = document.createElement('div');
    t.id = 'svr-toast';
    t.setAttribute('data-nosnippet', 'true');
    t.innerHTML = [
      '<div class="fixed bottom-4 left-2 right-2 sm:left-4 sm:right-auto z-[2000] translate-y-0 opacity-100 transition-all duration-500 ease-out" style="max-width:360px">',
      '  <div class="bg-white dark:bg-slate-800 border-2 border-[#ef4444] shadow-[4px_4px_0px_0px_#ef4444] rounded-sm p-2">',
      '    <div class="bg-red-500 text-white text-[10px] font-black text-center px-2 py-1 rounded-sm mb-1.5">⚠ 服务器负载警告</div>',
      '    <div class="px-1 py-1 text-xs font-bold text-slate-700 dark:text-slate-200">' + msg + '</div>',
      '    <button class="js-toast-close mt-1 text-[10px] text-slate-400 hover:text-[#0284c7] font-bold" style="display:block;margin-left:auto">关闭</button>',
      '  </div>',
      '</div>'
    ].join('\n');
    document.body.appendChild(t);
    toastEl = t;
    var closeBtn = t.querySelector('.js-toast-close') as HTMLElement;
    if (closeBtn) closeBtn.addEventListener('click', function() { t.remove(); });
    setTimeout(function() { if (t && t.parentNode) t.remove(); }, 10000);
  }

  onMount(function() {
    fetchCurrent();
    fetchAverage();
    fetchTrend();
    checkLoadWarning();
    bwTimer = setInterval(fetchCurrent, 5000);
    trendTimer = setInterval(fetchTrend, 5000);
    avgTimer = setInterval(fetchAverage, 120000);
  });

  onDestroy(function() {
    if (bwTimer) clearInterval(bwTimer);
    if (trendTimer) clearInterval(trendTimer);
    if (avgTimer) clearInterval(avgTimer);
  });
</script>

<div class="bg-white border-4 border-[#0284c7] p-4 sm:p-6 shadow-[6px_6px_0px_0px_#10b981] rounded-sm">
  <h2 class="text-xl sm:text-2xl font-black text-[#0284c7] tracking-wider mb-4 flex items-center gap-2">
    <span>🖥</span> 服务器状态
  </h2>

  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
    <div class="bg-[#faf8f5] border-2 border-[#0284c7]/20 rounded-sm px-3 py-2">
      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">实时下载</div>
      <div class="text-lg font-black text-[#10b981] font-mono">{currentDown.toFixed(2)} <span class="text-xs text-slate-400">MB/s</span></div>
    </div>
    <div class="bg-[#faf8f5] border-2 border-[#0284c7]/20 rounded-sm px-3 py-2">
      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">实时上传</div>
      <div class="text-lg font-black text-[#f59e0b] font-mono">{currentUp.toFixed(2)} <span class="text-xs text-slate-400">MB/s</span></div>
    </div>
    <div class="bg-[#faf8f5] border-2 border-[#0284c7]/20 rounded-sm px-3 py-2">
      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CPU 使用率</div>
      <div class="text-lg font-black" style="color: {cpuColor}" class:font-mono>{currentCpu.toFixed(1)} <span class="text-xs text-slate-400">%</span></div>
    </div>
    <div class="bg-[#faf8f5] border-2 border-[#0284c7]/20 rounded-sm px-3 py-2">
      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">内存使用率</div>
      <div class="text-lg font-black" style="color: {memColor}" class:font-mono>{currentMem.toFixed(1)} <span class="text-xs text-slate-400">%</span></div>
    </div>
  </div>

  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
    <div class="bg-[#faf8f5] border-2 border-[#0284c7]/20 rounded-sm px-3 py-2">
      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">60m 平均下载</div>
      <div class="text-base sm:text-lg font-black text-[#10b981] font-mono">{avg60mDown.toFixed(2)} <span class="text-xs text-slate-400">MB/s</span></div>
    </div>
    <div class="bg-[#faf8f5] border-2 border-[#0284c7]/20 rounded-sm px-3 py-2">
      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">60m 平均上传</div>
      <div class="text-base sm:text-lg font-black text-[#f59e0b] font-mono">{avg60mUp.toFixed(2)} <span class="text-xs text-slate-400">MB/s</span></div>
    </div>
    <div class="bg-[#faf8f5] border-2 border-[#0284c7]/20 rounded-sm px-3 py-2">
      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">60m 平均 CPU</div>
      <div class="text-base sm:text-lg font-black font-mono" style="color: {cpuColor}">{avg60mCpu.toFixed(1)} <span class="text-xs text-slate-400">%</span></div>
    </div>
    <div class="bg-[#faf8f5] border-2 border-[#0284c7]/20 rounded-sm px-3 py-2">
      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">60m 平均内存</div>
      <div class="text-base sm:text-lg font-black font-mono" style="color: {memColor}">{avg60mMem.toFixed(1)} <span class="text-xs text-slate-400">%</span></div>
    </div>
  </div>

  <div class="bg-[#faf8f5] border-2 border-[#0284c7]/20 rounded-sm p-2">
    <div class="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
      <span class="inline-flex items-center gap-2 flex-wrap">
        <span class="w-2 h-2 rounded-full bg-[#10b981]"></span> 下载
        <span class="w-2 h-2 rounded-full bg-[#f59e0b]"></span> 上传
        <span class="w-2 h-2 rounded-full" style="background:{cpuColor}"></span> CPU
        <span class="w-2 h-2 rounded-full" style="background:{memColor}"></span> 内存
        <span class="text-slate-300">| 60s 趋势</span>
      </span>
    </div>
    <canvas bind:this={canvasEl} class="w-full h-[160px] sm:h-[200px] rounded-sm"></canvas>
  </div>

  <div class="mt-2 text-[9px] text-slate-400 font-mono text-right flex items-center justify-end gap-3">
    <span>每 5 秒自动刷新</span>
    <span class="text-[#10b981]">●</span> 下载
    <span class="text-[#f59e0b]">●</span> 上传
    <span class="text-[#0284c7]">●</span> CPU
    <span class="text-[#8b5cf6]">●</span> 内存
  </div>
</div>
