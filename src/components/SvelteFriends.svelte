<script lang="ts">
  import { onMount } from "svelte";
  import { friendsConfig, type Friend } from "../config/friends";
  import { siteConfig } from "../config/site";

  let searchTerm = "";
  let copied = false;
  let shuffled: Friend[] = [];

  onMount(() => {
    shuffled = [...friendsConfig].sort(() => Math.random() - 0.5);
  });

  $: filteredFriends = searchTerm.trim() === "" 
    ? shuffled 
    : shuffled.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.url.toLowerCase().includes(searchTerm.toLowerCase())
      );

  let copiedLabel = "";

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    copied = true;
    copiedLabel = label;
    setTimeout(() => { copied = false; copiedLabel = ""; }, 2000);
  }

  function copyTemplate() {
    const text = `=== 友链申请信息 ===\n名称: UpXuu's blog\n链接: https://upxuu.com\n头像: https://upxuu.com/images/me.jpg\n介绍: 逐光而上\n====================`;
    copyText(text, "全部");
  }

  // Fallback unique avatars gradient builder based on name hashes
  const presets = [
    "from-rose-400 to-amber-300",
    "from-sky-400 to-emerald-300",
    "from-violet-400 to-fuchsia-300",
    "from-teal-400 to-lime-300",
    "from-amber-400 to-orange-400"
  ];
  
  function getGradient(name: string) {
    const sum = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return presets[sum % presets.length];
  }

  let imgErrors = new Set<string>();

  function handleImgError(name: string) {
    imgErrors.add(name);
    imgErrors = imgErrors; // trigger Svelte reactivity update
  }
</script>

<div class="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start w-full">
  <!-- Left Column Profile Sidebar Card -->
  <div class="hidden lg:flex w-[260px] shrink-0 flex-col gap-6 sticky top-[100px] select-none">
     <div class="bg-white border-4 border-[#0284c7] p-5 shadow-[6px_6px_0px_0px_#f59e0b] rounded-sm transform -rotate-1">
        <div class="flex items-center justify-center mb-4">
            <div class="w-16 h-16 rounded-sm bg-[#0ea5e9] border-3 border-[#0284c7] shadow-[3px_3px_0px_0px_#0284c7] overflow-hidden flex items-center justify-center">
              <img src={siteConfig.avatar} alt={siteConfig.author} class="w-full h-full object-cover" />
            </div>
         </div>
         <h1 class="text-base font-black text-[#0284c7] text-center tracking-wider mb-1">{siteConfig.author}</h1>
         <div class="h-0 border-b-2 border-dashed border-[#0284c7]/30 my-2 w-4/5 mx-auto"></div>
         
         <div class="text-xs font-bold text-slate-600 text-center mb-3 leading-relaxed">
            {siteConfig.description}
         </div>
     </div>
  </div>

  <!-- Main content pane -->
  <div class="flex-1 min-w-0 w-full space-y-6 sm:space-y-8">
    <div class="bg-white border-4 border-[#0284c7] p-4 sm:p-6 md:p-8 shadow-[8px_8px_0px_0px_#0284c7] rounded-sm">
      <!-- Title bar header -->
      <div class="border-b-4 border-[#0284c7] pb-6 mb-6 md:mb-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl md:text-3xl font-black text-[#0284c7] mb-3 leading-tight uppercase font-sans">Friends 友情链接</h1>
          <div class="flex flex-wrap items-center gap-2.5 sm:gap-4 justify-center md:justify-start">
            <span class="text-slate-500 font-bold font-mono text-xs bg-slate-100 px-20 py-0.5 border border-slate-200 rounded-sm">那些人，那些事</span>
            <span class="text-[10px] sm:text-xs font-mono font-bold text-[#f59e0b] bg-amber-50 px-2 py-0.5 border border-[#f59e0b] rounded-sm">
              共计 {friendsConfig.length} 位好友
            </span>
            <span class="text-[10px] sm:text-xs font-mono font-bold text-green-600 bg-green-50 px-2 py-0.5 border border-green-400 rounded-sm">
              随机排序 (:
            </span>
          </div>
        </div>

        <!-- Dynamic Client-side Search and Filter Bar -->
        <div class="relative max-w-full md:max-w-xs w-full shrink-0">
          <input
            type="text"
            placeholder="搜索好友、博客名称..."
            bind:value={searchTerm}
            class="w-full pl-9 pr-4 py-2 text-xs sm:text-sm font-bold bg-[rgba(250,248,245,0.55)] text-slate-700 border-3 border-[#0284c7] rounded-sm focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_0px_#0284c7] transition-all placeholder-slate-400"
          />
          <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-2.5 w-4 h-4 text-slate-400 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <!-- Friends Card grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {#each filteredFriends as friend (friend.url)}
          <a
            href={friend.url}
            target="_blank"
            rel="noopener noreferrer"
            class="group bg-white border-4 border-[#0284c7] p-3 sm:p-4 shadow-[5px_5px_0px_0px_#0284c7] hover:shadow-[8px_8px_0px_0px_#f59e0b] hover:border-[#f59e0b] hover:-translate-x-1 hover:-translate-y-1 rounded-sm flex items-start gap-3 transition-all duration-300 select-none cursor-pointer"
            id={`friend-${friend.name.replace(/\s+/g, '-').toLowerCase()}`}
          >
            {#if imgErrors.has(friend.name) || !friend.avatar}
              <div class="w-10 h-10 rounded-full border-3 border-[#0284c7] bg-gradient-to-br {getGradient(friend.name)} flex items-center justify-center text-white font-black text-base shadow-[2px_2px_0px_0px_#0284c7] select-none shrink-0 uppercase">
                {friend.name.charAt(0)}
              </div>
            {:else}
              <div class="relative shrink-0 select-none">
                <img
                  src={friend.avatar}
                  alt={friend.name}
                  width="40"
                  height="40"
                  loading="lazy"
                  decoding="async"
                  referrerpolicy="no-referrer"
                  on:error={() => handleImgError(friend.name)}
                  class="w-10 h-10 rounded-full border-3 border-[#0284c7] object-cover bg-white shadow-[2px_2px_0px_0px_#0284c7]"
                />
                <div class="absolute inset-0 rounded-full border border-black/10 pointer-events-none" />
              </div>
            {/if}

            <div class="flex-1 min-w-0 flex flex-col justify-between h-full pt-0.5">
              <div>
                <h3 class="font-extrabold text-sm sm:text-base text-slate-800 tracking-wide group-hover:text-[#0ea5e9] transition-colors truncate">
                  {friend.name}
                </h3>
                <p class="text-[10px] sm:text-xs text-slate-400 font-bold font-mono tracking-wider truncate mt-0.5 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-[#0ea5e9] stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span>{friend.url.replace(/^https?:\/\/(www\.)?/, "")}</span>
                </p>
                <p class="text-xs text-slate-500 font-medium line-clamp-2 mt-2 leading-relaxed h-[36px]">
                  {friend.description || "这位好友很神秘，暂时没有简介~"}
                </p>
              </div>

              {#if friend.issue_id}
                <div class="mt-2.5 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50/70 border border-emerald-200 px-1.5 py-0.5 rounded-sm w-fit select-none">
                  GitHub Issue #{friend.issue_id}
                </div>
              {/if}
            </div>
          </a>
        {/each}

        {#if filteredFriends.length === 0}
          <div class="col-span-full bg-white border-4 border-[#0284c7] p-10 text-center shadow-[4px_4px_0px_0px_#0284c7]">
            <p class="font-black text-[#0284c7] uppercase">没有筛选到任何符合条件的好友哦</p>
            <button
              on:click={() => searchTerm = ""}
              class="mt-3 px-4 py-1.5 font-bold border-2 border-[#0284c7] bg-[#ebf3ff] text-[#0284c7] hover:bg-[#0ea5e9] hover:text-white transition-all text-xs rounded-sm shadow-[2px_2px_0px_0px_#0284c7] cursor-pointer"
            >
              清除搜索条件
            </button>
          </div>
        {/if}
      </div>
    </div>

    <!-- Application segment -->
    <div class="bg-white border-4 border-[#0284c7] p-5 sm:p-6 shadow-[8px_8px_0px_0px_#0284c7] rounded-sm relative">
      <div class="flex items-center gap-2 mb-4 select-none">
        <div class="p-1 px-2.5 bg-[#fde68a] border-2 border-[#0284c7] text-[#0284c7] text-xs font-black rounded-sm transform -rotate-2 shadow-[1.5px_1.5px_0px_0px_#0284c7]">
          APPLICATION
        </div>
        <h3 class="text-base sm:text-lg font-black text-[#0284c7] tracking-wider">
          交换友情链接
        </h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start font-mono text-xs sm:text-sm">
        <!-- Rules -->
        <div class="space-y-3 font-semibold text-slate-700 leading-relaxed">
          <p>
            欢迎同人、技术、设计、ACG、自媒体等各类健康有特色的独立博客相互串链。
          </p>
          <div class="border-l-4 border-amber-400 pl-3 py-1 space-y-1 bg-[#fffbeb] rounded-r-md">
            <span class="font-bold text-amber-700 block">⚠️ 交换要求</span>
            <ul class="list-disc pl-4 text-xs font-medium space-y-1">
              <li>全站 HTTPS 加密访问</li>
              <li>内容健康、经常更新、拥有独立域名</li>
              <li>请先将本站添加为友情链接后再发送申请</li>
            </ul>
          </div>
          <p class="text-xs text-slate-400">
            添加完毕后，可以通过下方 GitHub Issue 快速申请，或发邮件联系：
            <a href="mailto:upxuu6@gmail.com" class="text-[#0284c7] hover:underline font-bold ml-1">
              upxuu6@gmail.com
            </a>
          </p>
          <a 
            href="https://github.com/ImUpXuu/xuhome/issues/new?template=friend-request.yml" 
            target="_blank" 
            rel="noopener noreferrer"
            class="inline-block px-4 py-2 bg-[#0284c7] text-white font-black text-xs rounded-sm hover:bg-[#0ea5e9] transition-all"
          >
            👉 快速申请友情链接
          </a>
        </div>

        <!-- Form elements to copy -->
        <div class="bg-[rgba(250,248,245,0.55)] border-3 border-dashed border-[#0284c7] p-4 rounded-sm relative">
          <span class="absolute -top-3 right-4 bg-white border-2 border-[#0284c7] px-2 py-0.5 text-[9px] text-[#0284c7] font-bold shadow-[1px_1px_0px_0px_#0284c7] select-none">
            本站信息 INFO
          </span>
          
          <ul class="space-y-1.5 text-xs text-slate-600 list-none leading-loose">
            <li on:click={() => copyText("UpXuu's blog", "站点名称")} class="cursor-pointer hover:bg-slate-100 rounded-sm px-1 -mx-1 transition-colors">
              <strong class="text-slate-800">站点名称：</strong> UpXuu's blog
            </li>
            <li on:click={() => copyText("https://upxuu.com", "站点域名")} class="cursor-pointer hover:bg-slate-100 rounded-sm px-1 -mx-1 transition-colors">
              <strong class="text-slate-800">站点域名：</strong> https://upxuu.com
            </li>
            <li on:click={() => copyText("https://upxuu.com/images/me.jpg", "站点头像")} class="cursor-pointer hover:bg-slate-100 rounded-sm px-1 -mx-1 transition-colors">
              <strong class="text-slate-800">站点头像：</strong> https://upxuu.com/images/me.jpg
            </li>
            <li on:click={() => copyText("逐光而上", "站点简介")} class="cursor-pointer hover:bg-slate-100 rounded-sm px-1 -mx-1 transition-colors">
              <strong class="text-slate-800">站点简介：</strong> 逐光而上
            </li>
          </ul>

          <div class="flex items-center gap-2 mt-4">
            <button
              on:click={copyTemplate}
              class="flex-1 py-2 bg-[#0ea5e9] text-white border-3 border-slate-800 hover:bg-[#0284c7] transition-all cursor-pointer font-black rounded-sm shadow-[3px_3px_0px_0px_rgba(2,132,199,0.3)] flex items-center justify-center gap-1.5 uppercase text-xs hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>复制全部</span>
            </button>
            {#if copied}
              <span class="text-[10px] font-black text-emerald-600 shrink-0 animate-pulse">已复制 {copiedLabel}</span>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Waline comments placeholder (handled in Astro page) -->
    <div id="waline-placeholder"></div>
  </div>
</div>
