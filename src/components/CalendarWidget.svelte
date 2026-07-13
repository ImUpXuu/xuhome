<script lang="ts">
  import { onMount } from 'svelte';

  interface CalendarPost {
    slug: string;
    title: string;
    date: string;
    description: string;
  }

  export let posts: CalendarPost[] = [];

  let currentDate = new Date();
  let selectedDate: Date | null = null;
  let isPickerOpen = false;

  $: currentYear = currentDate.getFullYear();
  $: currentMonth = currentDate.getMonth();

  // Get days in current month
  $: daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Get starting day of week
  $: startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  // Generate days array
  $: days = Array.from({ length: daysInMonth }, (_, i) => new Date(currentYear, currentMonth, i + 1));

  $: postsByDay = posts.reduce((acc, p) => {
    if (!p.date || p.date === '未知时间') return acc;
    const key = p.date.slice(0, 10);
    acc[key] = acc[key] || [];
    acc[key].push(p);
    return acc;
  }, {} as Record<string, CalendarPost[]>);

  function prevMonth() {
    currentDate = new Date(currentYear, currentMonth - 1, 1);
    selectedDate = null;
  }

  function nextMonth() {
    currentDate = new Date(currentYear, currentMonth + 1, 1);
    selectedDate = null;
  }

  function formatYMD(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function handleDayClick(dayObj: Date, hasEvents: boolean) {
    if (selectedDate && selectedDate.getTime() === dayObj.getTime()) {
      selectedDate = null;
    } else {
      selectedDate = dayObj;
    }
  }

  $: selectedDateEvents = selectedDate ? (postsByDay[formatYMD(selectedDate)] || []) : [];

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
</script>

<div class="bg-white dark:bg-slate-800 border-2 border-[#0284c7]/30 p-3.5 rounded-sm w-full relative animate-card-entrance opacity-0" data-nosnippet aria-hidden="true" style="animation-delay: 0.08s">
  <div class="text-center font-mono text-[11px] font-black text-slate-450 mb-1.5 uppercase tracking-widest block select-none">
    #upxuu的创作日历
  </div>
  
  <div class="flex justify-between items-center mb-4 border-b-2 border-dashed border-[#0284c7]/20 pb-2">
    <button on:click={prevMonth} aria-label="Previous Month" class="p-1 px-1.5 hover:bg-[#0ea5e9] hover:text-white border-2 border-transparent hover:border-[#0284c7] rounded-sm transition-colors cursor-pointer text-[#0284c7]">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    
    <div class="font-extrabold text-[#0284c7] text-sm tracking-widest px-2 py-1 rounded-sm select-none">
      {currentYear} / {String(currentMonth + 1).padStart(2, '0')}
    </div>
    
    <button on:click={nextMonth} aria-label="Next Month" class="p-1 px-1.5 hover:bg-[#0ea5e9] hover:text-white border-2 border-transparent hover:border-[#0284c7] rounded-sm transition-colors cursor-pointer text-[#0284c7]">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>

  <div>
    <div class="grid grid-cols-7 gap-1 text-center mb-2 select-none">
      {#each weekdays as day}
        <div class="text-[10px] font-black text-[#0284c7]/65">{day}</div>
      {/each}
    </div>
    <div class="grid grid-cols-7 gap-1">
      {#each Array(startDayOfWeek) as _}
        <div></div>
      {/each}
      {#each days as day}
        {@const ymd = formatYMD(day)}
        {@const hasEvents = !!postsByDay[ymd]}
        {@const isSelected = selectedDate && selectedDate.getTime() === day.getTime()}
        <button 
          on:click={() => handleDayClick(day, hasEvents)}
          class="relative flex items-center justify-center h-[28px] text-[11px] rounded-sm border-2 font-black select-none cursor-pointer duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] focus-visible:ring-offset-2
            {hasEvents             ? 'border-[#0284c7] hover:bg-[#fde68a] text-[#0284c7]' : 'border-transparent text-slate-450 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}
            {isSelected ? 'bg-[#0ea5e9] text-white border-[#0284c7]' : hasEvents ? '' : ''}
          "
        >
          {day.getDate()}
          {#if hasEvents}
            <div class="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full border border-white {isSelected ? 'bg-white' : 'bg-[#0ea5e9]'}"></div>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  {#if selectedDate && selectedDateEvents.length > 0}
    <div class="mt-4 pt-3 border-t-2 border-dashed border-[#0284c7]/20 animate-fade-in">
      <div class="flex justify-between items-center mb-2 gap-2">
        <span class="text-[10px] font-black text-[#0284c7] tracking-wider shrink-0 bg-[#fde68a] px-1.5 py-0.5 border-2 border-[#0284c7]">
          {formatYMD(selectedDate)} 作品
        </span>
        <button 
          on:click={() => selectedDate = null} 
          class="text-[9px] font-black bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-red-500 px-1 border-2 border-[#0284c7] rounded-sm cursor-pointer transition-all"
        >
          关闭
        </button>
      </div>
      
      <div class="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1 pt-1">
        {#each selectedDateEvents as event}
          <a 
            href={`/posts/${event.slug}`}
            class="p-2 text-left bg-[rgba(250,248,245,0.35)] dark:bg-slate-700 hover:bg-[#fffbeb] dark:hover:bg-slate-600 border-2 border-[#0284c7] hover:shadow-none hover:translate-y-[1px] rounded-sm transition-all cursor-pointer group block"
          >
            <h4 class="text-xs font-black text-[#0284c7] line-clamp-1 group-hover:text-[#0ea5e9] transition-colors mb-1 flex items-center gap-1">
              <span class="w-1.5 h-1.5 bg-[#0284c7] rounded-sm inline-block"></span>
              {event.title}
            </h4>
            {#if event.description}
              <p class="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {event.description}
              </p>
            {/if}
          </a>
        {/each}
      </div>
    </div>
  {:else if selectedDate}
    <div class="mt-4 pt-3 border-t-2 border-dashed border-[#0284c7]/20 text-center animate-fade-in">
      <div class="flex justify-between items-center mb-2 gap-2">
        <span class="text-[10px] font-black text-[#0284c7] tracking-wider shrink-0 bg-[#fde68a] px-1.5 py-0.5 border-2 border-[#0284c7]">
          {formatYMD(selectedDate)}
        </span>
        <button 
          on:click={() => selectedDate = null} 
          class="text-[9px] font-black bg-white dark:bg-slate-700 text-slate-550 dark:text-slate-300 hover:text-red-500 px-1 border-2 border-[#0284c7] shadow-[1px_1px_0px_0px_#0284c7] hover:shadow-none hover:translate-y-[1px] rounded-sm cursor-pointer transition-all"
        >
          关闭
        </button>
      </div>
      <p class="text-[10px] text-slate-400 dark:text-slate-500 font-bold italic py-2">这天没有发布文章哦~</p>
    </div>
  {/if}
</div>
