import{w as i,s as l}from"./site.C1zJe1ag.js";const g=i.sessionKey;let u=!1;function k(){const t=document.createElement("div");return t.id="welcome-toast",t.setAttribute("data-nosnippet","true"),t.setAttribute("aria-hidden","true"),t.className="fixed bottom-4 left-2 right-2 sm:left-4 sm:right-auto z-[2000] translate-y-[calc(100%+20px)] opacity-0 transition-all duration-500 ease-out",t.innerHTML=`
      <div class="bg-[#faf8f5] dark:bg-slate-800 border-2 border-[#0284c7] shadow-[4px_4px_0px_0px_#0284c7] rounded-sm p-2 sm:p-0">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 sm:px-3 py-1.5 sm:py-0 sm:h-9">
          <span class="text-xs font-black text-[#0284c7]">👋</span>
          <span id="welcome-message" class="text-xs font-bold text-slate-700 dark:text-slate-200">加载中...</span>
          <span class="text-slate-300 dark:text-slate-600 text-xs font-black hidden sm:inline">|</span>
          <span id="welcome-stats" class="text-xs font-bold text-slate-500 dark:text-slate-400"></span>
          <div class="flex items-center gap-1.5 ml-auto sm:ml-1 shrink-0">
            <a href="${l.socials.qqGroup}" target="_blank" rel="noopener noreferrer" class="text-[10px] font-black text-blue-500 hover:text-[#0284c7] dark:hover:text-blue-400 transition-colors shrink-0 uppercase tracking-wider">QQ群</a>
            <span class="text-slate-300 dark:text-slate-600 text-[10px] font-black">|</span>
            <a href="${l.socials.subscribe}" class="text-[10px] font-black text-green-500 hover:text-[#0284c7] dark:hover:text-green-400 transition-colors shrink-0 uppercase tracking-wider">订阅</a>
            <span class="text-slate-300 dark:text-slate-600 text-[10px] font-black">|</span>
            <a href="javascript:void(0)" onclick="copyRssLink()" class="text-[10px] font-black text-orange-500 hover:text-[#0284c7] dark:hover:text-orange-400 transition-colors shrink-0 uppercase tracking-wider">RSS</a>
            <button
              onclick="closeWelcomeToast()"
              class="text-slate-400 hover:text-[#0284c7] dark:hover:text-white transition-colors shrink-0 ml-1"
              aria-label="关闭"
            >
              <svg class="w-3 h-3 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `,document.body.appendChild(t),t}function v(){const t=document.getElementById("welcome-toast");t&&(t.classList.remove("translate-y-0","opacity-100"),t.classList.add("translate-y-[calc(100%+20px)]","opacity-0"),setTimeout(()=>{t.remove()},500))}async function b(){try{const s=await(await fetch(i.weatherApi)).json(),o=document.getElementById("welcome-message");if(!o)return;const n=s.city||"",e=s.district||"",a=s.weather||"",r=s.temperature??"",y=e?`${n}${e}`:n,d=a&&r!==""?`${a} ${r}°C`:"",p=[`Hi！来自${y||"远方"}的朋友`];if(d&&p.push(d),o.textContent=p.join(" · "),s.alerts&&s.alerts.length>0){const m=o.closest('[class*="bg-"]');if(m){const c=document.createElement("button");c.className="text-[10px] font-black text-red-500 hover:text-red-600 transition-colors shrink-0 ml-1",c.textContent=`⚠${s.alerts.length}条预警`,c.onclick=()=>{const x=s.alerts[0];window.alert(`${x.title}

${x.text}`)},m.querySelector(".flex-wrap")?.appendChild(c)}}}catch{const t=document.getElementById("welcome-message");t&&(t.textContent=i.fallbackMessage)}}async function S(){try{const[t,s]=await Promise.allSettled([fetch(l.analytics.statsApi.alltime),fetch(l.analytics.statsApi.active)]);let o="";if(t.status==="fulfilled"){const e=await t.value.json();if(e){const a=typeof e.pageviews=="object"?e.pageviews?.value??0:e.pageviews??0;o+=`你是第 ${a.toLocaleString()} 位访客`}}if(s.status==="fulfilled"){const e=await s.value.json();let a=0;Array.isArray(e)?a=e.length:e&&(a=e.total??e.visitors??e.totals?.visitors?.value??e.totals?.pageviews?.value??e.sessions?.length??0),a>0&&(o+=(o?" · ":"")+`${a} 人在线`)}const n=document.getElementById("welcome-stats");n&&(n.textContent=o||"")}catch{const t=document.getElementById("welcome-stats");t&&(t.textContent="")}}async function f(){if(u)return;const t=k();setTimeout(()=>{t.classList.remove("translate-y-[calc(100%+20px)]","opacity-0"),t.classList.add("translate-y-0","opacity-100")},100),u=!0,await Promise.allSettled([b(),S()]),setTimeout(()=>{v()},i.duration)}function h(){return!sessionStorage.getItem(g)}function w(){sessionStorage.setItem(g,"true")}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",async()=>{h()&&(w(),await f())}):h()&&(w(),await f());window.closeWelcomeToast=v;window.copyRssLink=async()=>{try{await navigator.clipboard.writeText(window.location.origin+"/rss.xml")}catch{const t=document.createElement("input");t.value=window.location.origin+"/rss.xml",document.body.appendChild(t),t.select(),document.execCommand("copy"),document.body.removeChild(t)}};
