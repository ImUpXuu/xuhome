<script>
  import { onMount } from 'svelte';

  const WEBSITE_ID = 'cd983d6c-e011-489d-903f-4757ce41c14d';

  // Loading states
  let loadingAlltime = true;
  let loadingToday = true;
  let loadingHourly = true;
  let loadingMetrics = true;

  // Data
  let total = { pageviews: 0, visitors: 0, visits: 0 };
  let today = { pageviews: 0, visitors: 0, visits: 0, bounces: 0, totalTime: 0 };
  let hourlyData = [];
  let browsers = [];
  let osList = [];
  let devices = [];
  let countries = [];

  // Time range
  let range = 'all';
  let customStart = '';
  let customEnd = '';
  let showRangePicker = false;

  // Tooltip
  let tooltip = { show: false, x: 0, y: 0, label: '', value: 0 };

  // Pie hover
  let pieHover = { browser: null, os: null, device: null, country: null };

  function val(v) {
    return v != null ? (typeof v === 'object' ? (v.value ?? 0) : v) : 0;
  }

  const COUNTRY_FLAGS = { 'China':'🇨🇳','United States':'🇺🇸','Japan':'🇯🇵','South Korea':'🇰🇷','United Kingdom':'🇬🇧','Germany':'🇩🇪','France':'🇫🇷','Singapore':'🇸🇬','Canada':'🇨🇦','Australia':'🇦🇺','Hong Kong':'🇭🇰','Taiwan':'🇹🇼','Russia':'🇷🇺','Brazil':'🇧🇷','India':'🇮🇳','Netherlands':'🇳🇱','Sweden':'🇸🇪','Switzerland':'🇨🇭','Italy':'🇮🇹','Spain':'🇪🇸','Malaysia':'🇲🇾','Indonesia':'🇮🇩','Thailand':'🇹🇭','Vietnam':'🇻🇳','Philippines':'🇵🇭','New Zealand':'🇳🇿','Ireland':'🇮🇪','Poland':'🇵🇱','Ukraine':'🇺🇦','Czech Republic':'🇨🇿','Norway':'🇳🇴','Denmark':'🇩🇰','Finland':'🇫🇮','Austria':'🇦🇹','Belgium':'🇧🇪','Portugal':'🇵🇹','Greece':'🇬🇷','Israel':'🇮🇱','Turkey':'🇹🇷','Egypt':'🇪🇬','South Africa':'🇿🇦','Nigeria':'🇳🇬','Kenya':'🇰🇪','Argentina':'🇦🇷','Colombia':'🇨🇴','Mexico':'🇲🇽','Chile':'🇨🇱','Peru':'🇵🇪','Unknown':'🌍' };
  function flag(label) {
    if (!label) return '🌍';
    if (label.length === 2) {
      return label.toUpperCase().replace(/./g, c => String.fromCodePoint(c.codePointAt(0) + 0x1F1E6 - 65));
    }
    return COUNTRY_FLAGS[label] || '🌍';
  }

  function getTodayRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { startAt: Math.floor(start.getTime()), endAt: Math.floor(now.getTime()) };
  }

  function getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }

  function getRangeTimestamps() {
    const now = Date.now();
    if (range === 'all') return { startAt: 0, endAt: now };
    if (range === '7d') return { startAt: now - 7 * 86400000, endAt: now };
    if (range === '30d') return { startAt: now - 30 * 86400000, endAt: now };
    if (range === 'custom' && customStart && customEnd) {
      return { startAt: new Date(customStart).getTime(), endAt: new Date(customEnd + 'T23:59:59').getTime() };
    }
    return { startAt: 0, endAt: now };
  }

  function setRange(r) {
    range = r;
    if (r !== 'custom') showRangePicker = false;
    fetchMetrics();
  }

  async function fetchMetrics() {
    loadingMetrics = true;
    const { startAt, endAt } = getRangeTimestamps();
    const m = (type) =>
      fetch(`https://vapi.upxuu.com/api/metrics?type=${type}&startAt=${startAt}&endAt=${endAt}`)
        .then(r => r.json()).catch(() => []);
    const [br, os, dev, co] = await Promise.all([m('browser'), m('os'), m('device'), m('country')]);
    browsers = br; osList = os; devices = dev; countries = co;
    loadingMetrics = false;
  }

  onMount(async () => {
    // 1. All-time
    fetch('https://vapi.upxuu.com/statsapi/alltime')
      .then(r => r.json()).then(d => {
        if (d) { total.pageviews = val(d.pageviews); total.visitors = val(d.visitors); total.visits = val(d.visits); }
      }).catch(() => {}).finally(() => loadingAlltime = false);

    // 2. Today
    const tr = getTodayRange();
    fetch(`https://vapi.upxuu.com/api/stats?startAt=${tr.startAt}&endAt=${tr.endAt}`)
      .then(r => r.json()).then(d => {
        if (d) { today.pageviews = val(d.pageviews); today.visitors = val(d.visitors); today.visits = val(d.visits); today.bounces = val(d.bounces); today.totalTime = val(d.totalTime); }
      }).catch(() => {}).finally(() => loadingToday = false);

    // 3. Hourly
    fetch('https://vapi.upxuu.com/statsapi/last24h?timezone=Asia/Shanghai')
      .then(r => r.json()).then(d => {
        if (Array.isArray(d)) {
          hourlyData = d;
          const ts = getTodayStr();
          for (const h of d) {
            if (h.hour && h.hour.startsWith(ts)) {
              today.pageviews += val(h.pageviews); today.visits += val(h.visits);
            }
          }
        }
      }).catch(() => {}).finally(() => loadingHourly = false);

    // 4. Metrics (initial load - all time)
    await fetchMetrics();
  });

  // Line chart
  $: maxPv = Math.max(...hourlyData.map(h => val(h.pageviews)), 1);
  const W = 800, H = 320, PAD = { top: 20, right: 20, bottom: 30, left: 40 };
  $: chartW = W - PAD.left - PAD.right;
  $: chartH = H - PAD.top - PAD.bottom;
  $: points = hourlyData.map((h, i) => {
    const x = PAD.left + (i / Math.max(hourlyData.length - 1, 1)) * chartW;
    const y = PAD.top + chartH - (val(h.pageviews) / maxPv) * chartH;
    return { x: +x.toFixed(1), y: +y.toFixed(1), v: val(h.pageviews), label: h.hour?.slice(11, 16) || '' };
  });
  $: linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  $: areaPath = linePath + ` L${points[points.length - 1]?.x || 0},${PAD.top + chartH} L${points[0]?.x || 0},${PAD.top + chartH} Z`;
  $: yTicks = [0, Math.round(maxPv / 2), maxPv];

  // Session info
  $: bounceRate = today.visits > 0 ? Math.round((today.bounces / today.visits) * 100) : 0;
  $: avgSessionSec = today.visits > 0 ? Math.round(today.totalTime / today.visits / 1000) : 0;

  // Pie chart helpers
  const PIE_COLORS = ['#0284c7','#f59e0b','#0ea5e9','#fde68a','#ef4444','#10b981','#8b5cf6','#f97316','#06b6d4','#ec4899'];

  function pieSlices(data) {
    if (!Array.isArray(data) || data.length === 0) return [];
    const total = data.reduce((s, d) => s + val(d.value), 0);
    if (total === 0) return [];
    const cx = 60, cy = 60, r = 55;
    let angle = -90;
    return data.map((d, i) => {
      const pct = val(d.value) / total;
      const a = pct * 360;
      const sr = (angle * Math.PI) / 180;
      const er = ((angle + a) * Math.PI) / 180;
      const x1 = cx + r * Math.cos(sr), y1 = cy + r * Math.sin(sr);
      const x2 = cx + r * Math.cos(er), y2 = cy + r * Math.sin(er);
      const large = a > 180 ? 1 : 0;
      const path = pct >= 1
        ? `M${cx-r},${cy}A${r},${r} 0 1,1 ${cx+r},${cy}A${r},${r} 0 1,1 ${cx-r},${cy}`
        : `M${cx},${cy}L${x1},${y1}A${r},${r} 0 ${large},1 ${x2},${y2}Z`;
      angle += a;
      return { path, pct: Math.round(pct * 100), label: d.x || '未知', value: val(d.value), color: PIE_COLORS[i % PIE_COLORS.length] };
    });
  }

  $: deviceSlices = pieSlices(devices);
  $: browserSlices = pieSlices(browsers);
  $: osSlices = pieSlices(osList);
  $: countrySlices = pieSlices(countries);
  $: slicesByKey = { device: deviceSlices, browser: browserSlices, os: osSlices };

  function handleChartMouse(e) {
    const svg = e.target.closest('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    if (!points.length) return;
    const idx = Math.round((mx - PAD.left) / chartW * (points.length - 1));
    const p = points[Math.max(0, Math.min(idx, points.length - 1))];
    if (!p) return;
    tooltip = { show: true, x: e.clientX + 12, y: e.clientY - 8, label: p.label, value: p.v };
  }

  function handleChartLeave() {
    tooltip.show = false;
  }
</script>

<div class="max-w-4xl mx-auto space-y-6 animate-card-entrance opacity-0" style="animation-delay: 0.06s">
  <!-- Header -->
  <div class="bg-white border-4 border-[#0284c7] p-6 shadow-[8px_8px_0px_0px_#f59e0b] rounded-sm">
    <h1 class="font-black text-[#0284c7] text-2xl uppercase tracking-widest flex items-center gap-3">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
      网站统计
    </h1>
  </div>

  <!-- 全站累计 -->
  <div class="bg-white border-4 border-[#0284c7] p-5 shadow-[6px_6px_0px_0px_#f59e0b] rounded-sm">
    <div class="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 select-none">全站累计</div>
    <div class="grid grid-cols-3 divide-x-2 divide-[#0284c7]/20">
      {#each ['浏览量','访问次数','访客数'] as label, i}
        <div class="text-center">
          {#if loadingAlltime}
            <div class="flex justify-center"><div class="h-8 w-20 bg-slate-100 rounded-sm animate-pulse" /></div>
          {:else}
            <div class="font-black text-[#0284c7] text-2xl md:text-3xl font-mono">{i === 0 ? total.pageviews.toLocaleString() : i === 1 ? total.visits.toLocaleString() : total.visitors.toLocaleString()}</div>
          {/if}
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{label}</div>
        </div>
      {/each}
    </div>
  </div>

  <!-- 今日数据 -->
  <div class="bg-white border-4 border-[#f59e0b] p-5 shadow-[6px_6px_0px_0px_#0284c7] rounded-sm">
    <div class="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 select-none">今日数据</div>
    <div class="grid grid-cols-3 divide-x-2 divide-[#f59e0b]/30">
      {#each ['浏览量','访问次数','访客数'] as label, i}
        <div class="text-center">
          {#if loadingToday}
            <div class="flex justify-center"><div class="h-8 w-16 bg-slate-100 rounded-sm animate-pulse" /></div>
          {:else}
            <div class="font-black text-[#f59e0b] text-2xl md:text-3xl font-mono">{i === 0 ? today.pageviews.toLocaleString() : i === 1 ? today.visits.toLocaleString() : today.visitors.toLocaleString()}</div>
          {/if}
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{label}</div>
        </div>
      {/each}
    </div>
    {#if !loadingToday && today.visits > 0}
      <div class="mt-4 pt-3 border-t-2 border-dashed border-[#f59e0b]/20 flex items-center justify-center gap-6 text-xs font-bold text-slate-500">
        <span>跳出率 <span class="font-mono text-[#0284c7]">{bounceRate}%</span></span>
        <span class="text-slate-300">|</span>
        <span>平均访问 <span class="font-mono text-[#0284c7]">{avgSessionSec}s</span></span>
      </div>
    {/if}
  </div>

  <!-- 24h Line Chart -->
  <div class="bg-white border-4 border-[#0284c7] p-5 md:p-6 shadow-[8px_8px_0px_0px_#f59e0b] rounded-sm">
    <h2 class="font-black text-[#0284c7] text-lg mb-1 flex items-center gap-2 select-none">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
      近 24 小时
    </h2>
    <div class="text-[10px] font-bold text-slate-400 mb-4 select-none">每小时浏览量趋势</div>
    {#if loadingHourly}
      <div class="h-[380px] bg-slate-100 rounded-sm animate-pulse" />
    {:else if points.length > 1}
      <div class="relative">
        <svg viewBox="0 0 {W} {H}" class="w-full h-auto max-h-[400px]" preserveAspectRatio="xMidYMid meet" on:mousemove={handleChartMouse} on:mouseleave={handleChartLeave}>
          {#each yTicks as tick}
            {@const y = PAD.top + chartH - (tick / maxPv) * chartH}
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4,4" />
            <text x={PAD.left - 6} y={y + 3} text-anchor="end" class="text-[10px]" fill="#94a3b8" font-weight="700" font-family="monospace">{tick}</text>
          {/each}
          <path d={areaPath} fill="url(#pvGrad)" opacity="0.25" />
          <path d={linePath} fill="none" stroke="#0284c7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          {#each points as p}
            <circle cx={p.x} cy={p.y} r="4" fill="#fde68a" stroke="#0284c7" stroke-width="2.5" class="cursor-pointer" />
          {/each}
          {#each points as p, i}
            {#if i % 4 === 0 || i === points.length - 1}
              <text x={p.x} y={H - 6} text-anchor="middle" class="text-[9px]" fill="#94a3b8" font-weight="700" font-family="monospace">{p.label}</text>
            {/if}
          {/each}
          <defs>
            <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0284c7" />
              <stop offset="100%" stop-color="#0284c7" stop-opacity="0" />
            </linearGradient>
          </defs>
        </svg>
        {#if tooltip.show}
          <div class="fixed z-50 pointer-events-none bg-white border-2 border-[#0284c7] px-3 py-1.5 rounded-sm shadow-[3px_3px_0px_0px_#0284c7] text-xs font-bold font-mono text-[#0284c7]" style="left:{tooltip.x}px;top:{tooltip.y}px">
            {tooltip.label} — {tooltip.value} 次
          </div>
        {/if}
      </div>
    {:else}
      <div class="text-center py-16 text-slate-400 font-bold text-sm">暂无数据</div>
    {/if}
  </div>

  <!-- 时间选择 + 设备/浏览器/OS -->
  <div class="flex items-center gap-2 flex-wrap">
    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">时间范围</span>
    {#each [['all','全部'],['7d','近7天'],['30d','近30天'],['custom','自定义']] as [v, l]}
      <button on:click={() => setRange(v)} class="px-3 py-1 border-2 text-xs font-black uppercase tracking-wider rounded-sm transition-all {range === v ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-[2px_2px_0px_0px_#f59e0b]' : 'bg-white text-[#0284c7] border-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] hover:bg-[#fde68a]'}">{l}</button>
    {/each}
    {#if range === 'custom'}
      <div class="flex items-center gap-1">
        <input type="date" bind:value={customStart} class="border-2 border-[#0284c7] px-2 py-1 text-xs font-bold font-mono rounded-sm outline-none focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0284c7]/30" />
        <span class="text-xs font-bold text-slate-400">~</span>
        <input type="date" bind:value={customEnd} class="border-2 border-[#0284c7] px-2 py-1 text-xs font-bold font-mono rounded-sm outline-none focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0284c7]/30" />
        <button on:click={fetchMetrics} class="px-2 py-1 bg-[#0284c7] text-white border-2 border-[#0284c7] text-xs font-black rounded-sm shadow-[2px_2px_0px_0px_#f59e0b]">确定</button>
      </div>
    {/if}
  </div>

  <!-- 设备 / 浏览器 / 操作系统 (pie charts) -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    {#each [['设备类型', devices, 'device'], ['浏览器', browsers, 'browser'], ['操作系统', osList, 'os']] as [title, data, key]}
      <div class="bg-white border-4 border-[#0284c7] p-4 shadow-[6px_6px_0px_0px_#f59e0b] rounded-sm">
        <div class="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 select-none">{title}</div>
        {#if loadingMetrics}
          <div class="h-40 bg-slate-100 rounded-sm animate-pulse" />
        {:else if data.length === 0}
          <div class="text-slate-300 font-bold text-xs text-center py-10">暂无数据</div>
        {:else}
          {@const slices = slicesByKey[key] || []}
          <div class="flex flex-col items-center">
            <svg viewBox="0 0 120 120" class="w-32 h-32" on:mousemove={(e) => {}}>
              {#each slices as s, i}
                <path d={s.path} fill={s.color} opacity={pieHover[key] === i ? 1 : 0.85} stroke="white" stroke-width="2" class="cursor-pointer transition-opacity" on:mouseenter={() => pieHover[key] = i} on:mouseleave={() => pieHover[key] = null}>
                  <title>{s.label}: {s.value} ({s.pct}%)</title>
                </path>
              {/each}
            </svg>
            <div class="mt-3 w-full space-y-1">
              {#each slices as s}
                <div class="flex items-center gap-2 text-xs">
                  <span class="w-2.5 h-2.5 rounded-sm shrink-0" style="background:{s.color}"></span>
                  <span class="font-bold text-slate-600 truncate flex-1">{s.label}</span>
                  <span class="font-mono font-bold text-slate-400">{s.pct}%</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- 访客位置 (pie chart) -->
  <div class="bg-white border-4 border-[#0284c7] p-5 shadow-[6px_6px_0px_0px_#f59e0b] rounded-sm">
    <div class="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 select-none">访客位置</div>
    {#if loadingMetrics}
      <div class="h-32 bg-slate-100 rounded-sm animate-pulse" />
    {:else if countries.length === 0}
      <div class="text-slate-300 font-bold text-xs text-center py-10">暂无数据</div>
    {:else}
      {@const slices = countrySlices}
      <div class="flex flex-col md:flex-row items-center gap-6">
        <svg viewBox="0 0 120 120" class="w-32 h-32 shrink-0">
          {#each slices as s, i}
            <path d={s.path} fill={s.color} opacity={pieHover.country === i ? 1 : 0.85} stroke="white" stroke-width="2" class="cursor-pointer transition-opacity" on:mouseenter={() => pieHover.country = i} on:mouseleave={() => pieHover.country = null}>
              <title>{s.label}: {s.value} ({s.pct}%)</title>
            </path>
          {/each}
        </svg>
        <div class="flex flex-wrap gap-2 flex-1">
          {#each slices as s}
            <span class="inline-flex items-center gap-1.5 bg-[#e0f2fe] border-2 border-[#0284c7] px-2.5 py-1 rounded-sm text-xs font-bold text-[#0284c7]">
              <span class="w-2.5 h-2.5 rounded-sm shrink-0" style="background:{s.color}"></span>
              {flag(s.label)} {s.label}
              <span class="font-mono text-[10px] text-slate-500">{s.value} ({s.pct}%)</span>
            </span>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Link -->
  <div class="text-center pb-8 select-none">
    <a href="https://stats.upxuu.com/share/sFftlqBkgk2z9JM2" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-5 py-3 border-3 border-[#0284c7] text-[#0284c7] bg-white font-black hover:bg-[#0284c7] hover:text-white transition-all rounded-sm shadow-[4px_4px_0px_0px_#0284c7] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 uppercase tracking-wider text-sm">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
      Umami
    </a>
  </div>
</div>

<style>
  :global(.animate-pulse) {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
  }
</style>
