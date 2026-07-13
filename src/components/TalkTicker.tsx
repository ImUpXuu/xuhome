import { useState, useEffect } from "react";
import { type TalkItem } from "../utils/postsFetcher";
import { getAllTalks, type TalkEntry } from "../utils/talks";
import { MessageSquare, Calendar } from "lucide-react";

interface Props {
  talks?: TalkItem[];
}

export function TalkTicker({ talks: propTalks }: Props) {
  // Use propTalks if available (passed from server), otherwise fallback to getAllTalks
  // We cast to any or ensure types match for the state
  const initialTalks = propTalks && propTalks.length > 0 ? propTalks.slice(0, 5) : (getAllTalks() as any[]).slice(0, 5);
  const [talks, setTalks] = useState<any[]>(initialTalks);
  const [index, setIndex] = useState(0);

  // Synchronize state if propTalks changes (e.g. during hydration)
  useEffect(() => {
    if (propTalks && propTalks.length > 0) {
      setTalks(propTalks.slice(0, 5));
    } else if (!propTalks) {
      // If no props passed (standalone client use), try to get from global data
      setTalks(getAllTalks().slice(0, 5));
    }
  }, [propTalks]);

  useEffect(() => {
    if (talks.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % talks.length);
    }, 4500); // Auto rotate every 4.5 seconds
    return () => clearInterval(interval);
  }, [talks]);

  if (talks.length === 0) {
    return <div className="h-[48px] w-full border-4 border-[#0284c7] bg-[#f8fafc] rounded-sm shadow-[4px_4px_0px_0px_#0284c7]"></div>;
  }

  const currentTalk = talks[index];
  
  // Clean text by stripping markdown elements
  const cleanContent = currentTalk.content
    .replace(/!\[.*?\]\(.*?\)/g, "[图片]")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[#*`_\[\]()\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const titleText = currentTalk.title || (cleanContent.length > 50 ? cleanContent.substring(0, 50) + "..." : cleanContent);
  const formattedDate = currentTalk.date.split(" ")[0];

  return (
    <div 
      className="w-full bg-[#f8fafc] hover:bg-[#f1f5f9] border-4 border-[#0284c7] px-3 py-2 shadow-[4px_4px_0px_0px_#0284c7] hover:shadow-[2px_2px_0px_0px_#0284c7] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 md:h-[48px] overflow-hidden rounded-sm font-sans animate-card-entrance opacity-0"
      id="talk-ticker-bar"
      style={{ animationDelay: '0.1s' }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Static Prefix Label */}
        <div className="bg-[#fde68a] border-2 border-[#0284c7] px-2.5 py-1 shadow-[2px_2px_0px_0px_#0284c7] font-black text-[10px] sm:text-xs text-[#0284c7] transform -skew-x-12 shrink-0 flex items-center gap-1 cursor-default select-none">
          <MessageSquare className="w-3 h-3 text-[#0284c7]" />
          <span>看了又看 <span className="hidden sm:inline">- UPXUU的碎碎念</span></span>
        </div>

        {/* Vertically Scrolling Area */}
        <div className="relative flex-1 h-[24px] overflow-hidden min-w-0">
          <div
            key={index}
            className="absolute inset-0 flex items-center min-w-0 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <a 
              href={`/talk/${encodeURIComponent(currentTalk.slug)}/`} 
              className="hover:text-[#0ea5e9] hover:underline truncate block w-full text-left font-black text-xs sm:text-sm text-slate-700"
            >
              {titleText}
            </a>
          </div>
        </div>
      </div>

      {/* Date (Right aligned) */}
      <div className="shrink-0 flex items-center gap-1 font-mono text-[10px] sm:text-xs text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-sm self-end sm:self-auto">
        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
        <span>{formattedDate}</span>
      </div>
    </div>
  );
}
