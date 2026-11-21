<script lang="ts">
  import { onMount } from "svelte";
  import { friendsConfig, expiredFriendsConfig, type FriendLink } from "../config/friends";
  import { siteConfig } from "../config/site";

  let searchTerm = "";
  let copyStatus = "";
  let copyStatusTimeout: ReturnType<typeof setTimeout>;
  let shuffled: FriendLink[] = [...friendsConfig];
  let applicationPromptIndex = -1;

  function shuffleFriends() {
    shuffled = [...friendsConfig].sort(() => Math.random() - 0.5);
  }

  onMount(() => {
    // 提示条插入在列表中段；不参与搜索，输入关键词时隐藏。
    applicationPromptIndex = Math.min(12, Math.max(1, Math.ceil(friendsConfig.length / 2)));
    shuffleFriends();
    // 补扫 hydration 前已失败的图片：SSR HTML 的 img 在 JS 绑定 on:error 之前就 404 的话，
    // error 事件已丢失（on:error 永远不触发，断图一直挂着）。complete && naturalWidth===0 即已失败。
    document.querySelectorAll<HTMLImageElement>('img[data-friend-avatar]').forEach((img) => {
      const name = img.dataset.friendAvatar;
      if (name && img.complete && img.naturalWidth === 0) handleImgError(name);
    });
  });

  $: filteredFriends = searchTerm.trim() === ""
    ? shuffled
    : shuffled.filter(f =>
        (f.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.url || "").toLowerCase().includes(searchTerm.toLowerCase())
      );

  function copyText(text: string, label: string) {
    const finish = () => {
      copyStatus = `${label}已复制`;
      clearTimeout(copyStatusTimeout);
      copyStatusTimeout = setTimeout(() => { copyStatus = ""; }, 2200);
    };
    if (!navigator.clipboard) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        finish();
      } catch {
        copyStatus = "复制失败，请手动选择内容";
      }
      return;
    }
    navigator.clipboard.writeText(text).then(finish).catch(() => {
      copyStatus = "复制失败，请手动选择内容";
    });
  }

  const siteDetails = [
    { label: "站点名称", value: "UpXuu's blog" },
    { label: "站点域名", value: "https://upxuu.com" },
    { label: "站点头像", value: "https://upxuu.com/images/me.jpg" },
    { label: "站点简介", value: "逐光而上" }
  ];

  function copyTemplate() {
    const text = `=== 友链申请信息 ===\n名称: ${siteDetails[0].value}\n链接: ${siteDetails[1].value}\n头像: ${siteDetails[2].value}\n介绍: ${siteDetails[3].value}\n====================`;
    copyText(text, "全部资料");
  }

  // 无头像或图片加载失败时，以站名首字生成固定配色的积木底板。
  const avatarPalette = [
    "border-[#0284c7] bg-[#0284c7] text-white shadow-[2px_2px_0px_0px_#0ea5e9]",
    "border-[#0284c7] bg-[#bae6fd] text-[#075985] shadow-[2px_2px_0px_0px_#0284c7]",
    "border-[#b45309] bg-[#fde68a] text-[#92400e] shadow-[2px_2px_0px_0px_#f59e0b]"
  ];

  function getAvatarPalette(name: string) {
    const sum = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return avatarPalette[sum % avatarPalette.length];
  }

  let imgErrors = new Set<string>();

  function handleImgError(name: string) {
    imgErrors.add(name);
    imgErrors = imgErrors; // trigger Svelte reactivity update
  }
</script>

<div class="w-full space-y-6 sm:space-y-8">
  <!-- 友联底座：让入口、统计与检索先形成清晰的首屏层级。 -->
  <header class="relative border-4 border-[#0284c7] bg-[rgba(250,248,245,0.94)] p-5 shadow-[4px_4px_0px_0px_#0284c7] sm:p-7 dark:border-sky-400 dark:bg-[rgba(30,41,59,0.94)] dark:shadow-[4px_4px_0px_0px_#0369a1]" data-reveal>
    <div class="absolute -top-3 right-6 flex gap-2 select-none" aria-hidden="true">
      <span class="h-3 w-3 -rotate-6 border-2 border-[#0284c7] bg-[#0ea5e9] shadow-[1px_1px_0px_0px_#0284c7] dark:border-sky-300"></span>
      <span class="h-3 w-3 rotate-3 border-2 border-[#0284c7] bg-[#f59e0b] shadow-[1px_1px_0px_0px_#0284c7] dark:border-sky-300"></span>
    </div>

    <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex min-w-0 items-center gap-4 sm:gap-5">
        <div class="h-14 w-14 shrink-0 -rotate-3 overflow-hidden rounded-md border-3 border-[#0284c7] bg-[#0ea5e9] shadow-[3px_3px_0px_0px_#f59e0b] sm:h-16 sm:w-16 dark:border-sky-300">
          <img src={siteConfig.avatar} alt={siteConfig.author} class="h-full w-full object-cover" width="64" height="64" />
        </div>
        <div class="min-w-0">
          <p class="mb-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#0ea5e9]">Friends / 友情链接</p>
          <h1 class="text-2xl font-black leading-tight text-[#0284c7] sm:text-3xl dark:text-[#38bdf8]">和有趣的人，互相抵达</h1>
          <p class="mt-2 text-xs font-bold leading-relaxed text-slate-500 sm:text-sm dark:text-slate-300">在互联网的不同角落，收藏一些认真生长的小站。</p>
          <div class="mt-3 flex flex-wrap gap-2 font-mono text-[10px] font-bold sm:text-xs">
            <span class="border border-[#f59e0b] bg-amber-50 px-2 py-0.5 text-[#b45309] dark:bg-amber-900/30 dark:text-amber-300">共计 {friendsConfig.length} 位好友</span>
            <span class="border border-[#0ea5e9]/40 bg-sky-50 px-2 py-0.5 text-[#0284c7] dark:bg-sky-900/30 dark:text-sky-300">随机排列 · 发现新邻居</span>
          </div>
        </div>
      </div>

      <div class="w-full shrink-0 lg:max-w-[340px]" role="search">
        <label for="friend-search" class="sr-only">搜索好友、博客名称或简介</label>
        <div class="relative">
          <input
            id="friend-search"
            type="search"
            name="q"
            placeholder="搜索好友、博客名称..."
            bind:value={searchTerm}
            class="w-full rounded-sm border-3 border-[#0284c7] bg-white/80 py-2.5 pl-9 pr-4 text-xs font-bold text-slate-700 transition-all placeholder:text-slate-400 focus:bg-white focus:shadow-[2px_2px_0px_0px_#0284c7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2 sm:text-sm dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-700"
          />
          <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-3 h-4 w-4 text-slate-400 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div class="mt-3 flex flex-wrap gap-2.5">
          <button
            type="button"
            on:click={shuffleFriends}
            class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm border-2 border-[#0284c7] bg-[#0ea5e9] px-3 py-2 text-xs font-black text-white shadow-[2px_2px_0px_0px_#0284c7] transition-all hover:-translate-y-0.5 hover:bg-[#0284c7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
            换一批
          </button>
          <a
            href="#friend-application"
            class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm border-2 border-[#0284c7] bg-[#f59e0b] px-3 py-2 text-xs font-black text-slate-900 shadow-[2px_2px_0px_0px_#0284c7] transition-all hover:-translate-y-0.5 hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] focus-visible:ring-offset-2 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            申请友联 <span aria-hidden="true">↓</span>
          </a>
        </div>
        <p class="mt-2 text-right font-mono text-[10px] font-bold text-slate-400 dark:text-slate-400" aria-live="polite">当前找到 {filteredFriends.length} 位好友</p>
      </div>
    </div>
  </header>

  <!-- Friends Card grid -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 2xl:grid-cols-4" aria-label="友情链接列表">
    {#each filteredFriends as friend, index (friend.url)}
      <div data-reveal-card>
        <a
          href={friend.url}
          target="_blank"
          rel="noopener noreferrer"
          class="group flex h-full cursor-pointer items-start gap-3.5 rounded-sm border-3 border-[#0284c7] bg-[rgba(250,248,245,0.94)] p-4 shadow-[3px_3px_0px_0px_#0284c7] transition-[transform,box-shadow] duration-200 select-none hover:-translate-y-[3px] hover:shadow-[4px_5px_0px_0px_#f59e0b] focus-visible:-translate-y-[3px] focus-visible:shadow-[4px_5px_0px_0px_#f59e0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2 sm:p-[18px] dark:border-sky-500 dark:bg-[rgba(30,41,59,0.94)] dark:shadow-[3px_3px_0px_0px_#0369a1]"
          id={`friend-${friend.name.replace(/\s+/g, '-').toLowerCase()}`}
        >
          {#if imgErrors.has(friend.name) || !friend.avatar}
            <div class="flex h-12 w-12 shrink-0 select-none items-center justify-center rounded-md border-2 font-black uppercase {getAvatarPalette(friend.name)} sm:h-[52px] sm:w-[52px]" aria-hidden="true">
              <span class="text-xl">{friend.name.charAt(0)}</span>
            </div>
          {:else}
            <div class="relative h-12 w-12 shrink-0 select-none sm:h-[52px] sm:w-[52px]">
              <img
                src={friend.avatar}
                alt={`${friend.name} 头像`}
                width="52"
                height="52"
                loading="lazy"
                decoding="async"
                referrerpolicy="no-referrer"
                data-friend-avatar={friend.name}
                on:error={() => handleImgError(friend.name)}
                class="h-full w-full rounded-md border-2 border-[#0284c7] bg-white object-cover shadow-[2px_2px_0px_0px_#0ea5e9] dark:border-sky-400 dark:bg-slate-800"
              />
            </div>
          {/if}

          <div class="flex min-w-0 flex-1 flex-col self-stretch">
            <div class="flex items-start gap-2">
              <h2 class="min-w-0 flex-1 text-sm font-extrabold leading-snug tracking-wide text-slate-800 transition-colors group-hover:text-[#0284c7] group-focus-visible:text-[#0284c7] sm:text-base dark:text-slate-100 dark:group-hover:text-[#38bdf8]">{friend.name}</h2>
              <svg xmlns="http://www.w3.org/2000/svg" class="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-[#0284c7] dark:group-hover:text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5h5v5M10 14L19 5M19 14v4a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1h4" />
              </svg>
            </div>
            <p class="mt-1 truncate font-mono text-[10px] font-bold tracking-wide text-slate-400 sm:text-xs" title={friend.url}>{friend.url.replace(/^https?:\/\/(www\.)?/, "")}</p>

            <div class="flex flex-1 flex-col justify-end">
              {#if friend.description}
                <p class="mt-2.5 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">{friend.description}</p>
              {/if}

              <div class="mt-auto flex min-h-6 items-center justify-between gap-2 pt-3 font-mono text-[9px] font-bold">
                <span class="inline-flex items-center gap-1.5 text-slate-400">
                  {#if friend.rss}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-[#0ea5e9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 11a9 9 0 019 9M4 4a16 16 0 0116 16" /><circle cx="5" cy="19" r="1.5" fill="currentColor" stroke="none" /></svg>
                    RSS 可订阅
                  {:else}
                    <span class="h-1.5 w-1.5 bg-[#0ea5e9]" aria-hidden="true"></span>
                    独立小站
                  {/if}
                </span>
                {#if friend.issue_id}
                  <span class="inline-flex items-center rounded-sm border border-slate-200 bg-slate-100/70 px-1.5 py-0.5 text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400" title="通过 GitHub Issue 申请收录">Issue #{friend.issue_id}</span>
                {:else}
                  <span class="text-slate-400 transition-colors group-hover:text-[#f59e0b]">前往小站 →</span>
                {/if}
              </div>
            </div>
          </div>
        </a>
      </div>
      {#if searchTerm.trim() === "" && index === applicationPromptIndex}
        <a href="#friend-application" class="col-span-full flex items-center justify-center gap-2 rounded-sm border-3 border-dashed border-[#0284c7] bg-sky-50/70 px-4 py-3.5 text-center text-xs font-black text-[#0284c7] transition-all hover:bg-[#0ea5e9] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] sm:text-sm dark:border-sky-500 dark:bg-sky-900/20 dark:text-sky-300 dark:hover:bg-sky-600 dark:hover:text-white" data-reveal>
          也想把自己的小站放进这面墙？查看交换要求并提交申请 <span aria-hidden="true">→</span>
        </a>
      {/if}
    {/each}

    {#if filteredFriends.length === 0}
      <div class="col-span-full rounded-sm border-4 border-[#0284c7] bg-[rgba(250,248,245,0.94)] p-10 text-center shadow-[4px_4px_0px_0px_#0284c7] dark:bg-slate-800" data-reveal>
        <p class="font-black text-[#0284c7] dark:text-[#38bdf8]">没有找到符合“{searchTerm.trim()}”的好友</p>
        <p class="mt-2 text-xs font-bold text-slate-400">换个名称、简介或域名关键词试试。</p>
        <button
          type="button"
          on:click={() => searchTerm = ""}
          class="mt-4 cursor-pointer rounded-sm border-2 border-[#0284c7] bg-[#ebf3ff] px-4 py-1.5 text-xs font-bold text-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] transition-all hover:bg-[#0ea5e9] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2"
        >
          清除搜索条件
        </button>
      </div>
    {/if}
  </div>

  <!-- Application segment -->
  <div class="relative scroll-mt-24" id="friend-application" data-reveal>
    <div class="flex items-center gap-2 mb-4 select-none">
      <div class="p-1 px-2.5 bg-[#fde68a] border-2 border-[#0284c7] text-[#0284c7] text-xs font-black rounded-sm transform -rotate-2 shadow-[1.5px_1.5px_0px_0px_#0284c7]">
        APPLICATION
      </div>
      <h3 class="text-base sm:text-lg font-black text-[#0284c7] dark:text-[#38bdf8] tracking-wider">
        交换友情链接
      </h3>
    </div>

    <div class="border-4 border-[#0284c7] bg-[rgba(250,248,245,0.94)] shadow-[4px_4px_0px_0px_#0284c7] dark:border-sky-400 dark:bg-[rgba(30,41,59,0.94)] dark:shadow-[4px_4px_0px_0px_#0369a1]">
      <div class="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
        <!-- 左：申请流程与交换要求 -->
        <div class="p-5 sm:p-6">
          <ol class="space-y-4">
            <li class="flex gap-3.5">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-[#0284c7] bg-[#0ea5e9] font-mono text-xs font-black text-white shadow-[2px_2px_0px_0px_#0284c7]">01</span>
              <div>
                <p class="text-sm font-black text-slate-800 dark:text-slate-100">添加本站</p>
                <p class="mt-0.5 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">先把本站加进你的友情链接页。</p>
              </div>
            </li>
            <li class="flex gap-3.5">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-[#0284c7] bg-[#0ea5e9] font-mono text-xs font-black text-white shadow-[2px_2px_0px_0px_#0284c7]">02</span>
              <div>
                <p class="text-sm font-black text-slate-800 dark:text-slate-100">准备资料</p>
                <p class="mt-0.5 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">从右侧复制本站信息，填进你的友联页。</p>
              </div>
            </li>
            <li class="flex gap-3.5">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-[#0284c7] bg-[#0ea5e9] font-mono text-xs font-black text-white shadow-[2px_2px_0px_0px_#0284c7]">03</span>
              <div>
                <p class="text-sm font-black text-slate-800 dark:text-slate-100">提交申请</p>
                <p class="mt-0.5 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">通过 GitHub Issue 或邮件，发来你的站点信息。</p>
              </div>
            </li>
          </ol>
          <div class="mt-5 rounded-r-md border-l-4 border-amber-400 bg-[#fffbeb] py-2 pl-3 dark:bg-amber-900/20">
            <p class="text-xs font-black text-amber-700 dark:text-amber-300">交换要求</p>
            <ul class="mt-1 list-disc space-y-1 pl-4 text-xs font-medium text-slate-600 dark:text-slate-300">
              <li>全站 HTTPS 加密访问</li>
              <li>内容健康、经常更新、拥有独立域名</li>
              <li>先添加本站，再提交申请</li>
            </ul>
          </div>
          <div class="mt-5 flex flex-wrap items-center gap-3">
            <a href="https://github.com/ImUpXuu/xuhome/issues/new?template=friend-request.yml" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 rounded-sm border-2 border-[#0284c7] bg-[#f59e0b] px-4 py-2.5 text-xs font-black text-slate-900 shadow-[2px_2px_0px_0px_#0284c7] transition-all hover:-translate-y-0.5 hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] focus-visible:ring-offset-2 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
              通过 GitHub Issue 申请
            </a>
            <a href="mailto:xu@i.upxuu.com" class="text-xs font-bold text-[#0284c7] hover:underline dark:text-sky-300">或发邮件到 xu@i.upxuu.com</a>
          </div>
        </div>

        <!-- 右：本站名片与资料复制 -->
        <div class="border-t-4 border-[#0284c7] p-5 sm:p-6 lg:border-l-4 lg:border-t-0 dark:border-sky-400">
          <div class="flex items-center gap-3">
            <img src={siteConfig.avatar} alt={siteConfig.author} class="h-11 w-11 rounded-md border-2 border-[#0284c7] object-cover shadow-[2px_2px_0px_0px_#0ea5e9]" width="44" height="44" />
            <div>
              <p class="text-sm font-black text-slate-800 dark:text-slate-100">UpXuu's blog</p>
              <p class="text-xs font-medium text-slate-500 dark:text-slate-400">逐光而上</p>
            </div>
          </div>
          <ul class="mt-4 space-y-2">
            {#each siteDetails as detail}
              <li class="flex items-center gap-2">
                <span class="w-16 shrink-0 text-[11px] font-black text-slate-500 dark:text-slate-400">{detail.label}</span>
                <span class="min-w-0 flex-1 truncate font-mono text-xs font-bold text-slate-700 dark:text-slate-200" title={detail.value}>{detail.value}</span>
                <button type="button" on:click={() => copyText(detail.value, detail.label)} aria-label={`复制${detail.label}`} class="shrink-0 cursor-pointer rounded-sm border-2 border-[#0284c7] bg-white/70 p-1.5 text-[#0284c7] shadow-[1.5px_1.5px_0px_0px_#0284c7] transition-all hover:bg-[#0ea5e9] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none dark:bg-slate-800">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="1.5" /><path stroke-linecap="round" d="M5 15V6a1.5 1.5 0 011.5-1.5H15" /></svg>
                </button>
              </li>
            {/each}
          </ul>
          <button type="button" on:click={copyTemplate} class="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm border-2 border-[#0284c7] bg-[#0ea5e9] px-4 py-2.5 text-xs font-black text-white shadow-[2px_2px_0px_0px_#0284c7] transition-all hover:bg-[#0284c7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="1.5" /><path stroke-linecap="round" d="M5 15V6a1.5 1.5 0 011.5-1.5H15" /></svg>
            复制全部资料
          </button>
          <p class="mt-2.5 h-4 text-center font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400" aria-live="polite">{copyStatus}</p>
        </div>
      </div>
    </div>
  </div>

  {#if expiredFriendsConfig.length > 0}
    <!-- 暂时失效的友联：只留名称，不做链接、不跳转 -->
    <div class="mt-8 pt-5 border-t-2 border-dashed border-slate-300 dark:border-slate-600" data-reveal>
      <div class="flex flex-wrap items-center gap-2 mb-3 select-none">
        <span class="text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 border border-slate-300 dark:border-slate-600 rounded-sm">
          暂时失效的友联
        </span>
        <span class="text-[10px] font-mono font-bold text-slate-400">（暂不可访问，仅保留名称）</span>
      </div>
      <div class="flex flex-wrap gap-2">
        {#each expiredFriendsConfig as item (item.url)}
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-800/60 border-2 border-slate-300 dark:border-slate-600 px-2.5 py-1 rounded-sm opacity-60 cursor-default select-none">
            {item.name}
          </span>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Waline comments placeholder (handled in Astro page) -->
  <div id="waline-placeholder"></div>
</div>
