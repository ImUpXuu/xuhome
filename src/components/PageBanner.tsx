import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TypeAnimation } from "react-type-animation";
import { infoConfig } from "../config/info";

interface PageBannerProps {
  pathname?: string;
  categoryName?: string | null;
  tagName?: string | null;
  postsCount?: number;
  post?: any;
}

export function PageBanner({ 
  pathname: propPathname, 
  categoryName: propCategoryName, 
  tagName: propTagName, 
  postsCount: propPostsCount,
  post: propPost
}: PageBannerProps) {
  // Use props if provided, otherwise fallback to window.location (client-side only)
  const pathname = propPathname || (typeof window !== 'undefined' ? window.location.pathname : '');

  const categoryName = propCategoryName;
  const tagName = propTagName;
  const post = propPost;
  const postsCount = propPostsCount || 0;

  const hasRightContent = useMemo(() => {
    return !!(categoryName || tagName || post || pathname === "/talk" || pathname.startsWith("/talk/") || pathname.startsWith("/talks/"));
  }, [categoryName, tagName, post, pathname]);

  // Determine what type of content to render on the right side
  const rightSideContent = useMemo(() => {
    if (categoryName) {
      return (
        <motion.div
          key="category"
          initial={{ opacity: 0, x: 60, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -60, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="flex flex-col items-center md:items-end justify-center gap-1 md:gap-1.5 mt-2 md:mt-0 max-w-full"
        >
          <div className="text-[10px] md:text-xs font-black text-[#0ea5e9] bg-white dark:bg-slate-700 border-2 border-[#0284c7] px-2 py-0.5 rounded-sm shadow-[2px_2px_0px_0px_#0284c7] transform md:rotate-2 uppercase tracking-widest shrink-0 select-none">
            {infoConfig.banner.labels.category}
          </div>
          <h2 className="text-sm md:text-3xl font-black text-[#0284c7] bg-[#fde68a] border-2 md:border-3 border-[#0284c7] shadow-[2.5px_2.5px_0px_0px_#f59e0b] px-4 py-1 transform md:-rotate-1 shrink-0 max-w-[70vw] md:max-w-[450px] truncate">
            {categoryName}
          </h2>
          <div className="font-bold text-[#f59e0b] bg-white border-2 border-[#f59e0b] px-2.5 py-0.5 shadow-[2px_2px_0px_0px_#0284c7] text-[10px] md:text-xs shrink-0">
            {postsCount} 篇
          </div>
        </motion.div>
      );
    }

    if (tagName) {
      return (
        <motion.div
          key="tag"
          initial={{ opacity: 0, x: 60, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -60, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="flex flex-col items-center md:items-end justify-center gap-1 md:gap-1.5 mt-2 md:mt-0 max-w-full"
        >
          <div className="text-[10px] md:text-xs font-black text-[#0ea5e9] bg-white dark:bg-slate-700 border-2 border-[#0284c7] px-2 py-0.5 rounded-sm shadow-[2px_2px_0px_0px_#0284c7] transform md:rotate-2 uppercase tracking-widest shrink-0 select-none">
            {infoConfig.banner.labels.tag}
          </div>
          <h2 className="text-sm md:text-3xl font-black text-[#0284c7] bg-[#fde68a] border-2 md:border-3 border-[#0284c7] shadow-[2.5px_2.5px_0px_0px_#f59e0b] px-4 py-1 transform md:-rotate-1 shrink-0 max-w-[70vw] md:max-w-[450px] truncate font-sans">
            #{tagName}
          </h2>
          <div className="font-bold text-[#f59e0b] bg-white border-2 border-[#f59e0b] px-2.5 py-0.5 shadow-[2px_2px_0px_0px_#0284c7] text-[10px] md:text-xs shrink-0">
            {postsCount} 篇
          </div>
        </motion.div>
      );
    }

    if (post) {
      return (
        <motion.div
          key="post-detail"
          initial={{ opacity: 0, x: 60, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -60, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="flex flex-col items-center md:items-end justify-center gap-1 md:gap-2 mt-2 md:mt-0 max-w-full"
        >
          <div className="text-[10px] md:text-xs font-black text-[#0ea5e9] bg-white dark:bg-slate-700 border-2 border-[#0284c7] px-2 py-0.5 rounded-sm shadow-[2px_2px_0px_0px_#0284c7] transform md:rotate-2 uppercase tracking-widest shrink-0 select-none">
            {infoConfig.banner.labels.post}
          </div>
          <h2 className="text-xs sm:text-base md:text-2xl font-black text-[#0284c7] bg-[#fde68a] border-2 md:border-3 border-[#0284c7] shadow-[2.5px_2.5px_0px_0px_#f59e0b] px-3.5 py-1.5 transform md:-rotate-1 shrink-0 max-w-[70vw] md:max-w-[450px] leading-snug font-sans text-center md:text-right break-words line-clamp-2 md:line-clamp-1">
            {post.title}
          </h2>
          <div className="font-mono font-bold text-[#f59e0b] bg-white border-2 border-[#f59e0b] px-2 py-0.5 shadow-[2px_2px_0px_0px_#0284c7] text-[9px] md:text-xs shrink-0 tracking-wider animate-pulse">
            {post.date}
          </div>
        </motion.div>
      );
    }

    if (pathname === "/talk" || pathname.startsWith("/talk/") || pathname.startsWith("/talks/")) {
      return (
        <motion.div
          key="talk-list-detail"
          initial={{ opacity: 0, x: 60, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -60, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="flex flex-col items-center md:items-end justify-center gap-1.5 md:gap-2 mt-2 md:mt-0 max-w-full"
        >
          <div className="text-[10px] md:text-xs font-black text-[#0ea5e9] bg-white border-2 border-[#0284c7] px-2.5 py-0.5 rounded-sm shadow-[2px_2px_0px_0px_#0284c7] transform md:rotate-2 uppercase tracking-widest shrink-0 select-none">
            {infoConfig.banner.labels.talk}
          </div>
          <div className="text-xs md:text-lg font-bold text-slate-700 dark:text-slate-200 font-mono h-8 md:h-11 flex items-center justify-center md:justify-end -rotate-1 max-w-[70vw] md:max-w-[450px]">
            <TypeAnimation
              sequence={infoConfig.banner.talkTicker.sequence}
              wrapper="span"
              cursor={true}
              repeat={Infinity}
              className="bg-[#fde68a] px-3 py-1 shadow-[2px_2px_0px_0px_#0284c7] border-2 border-[#0284c7] inline-block font-sans whitespace-nowrap"
            />
          </div>
        </motion.div>
      );
    }

    return null;
  }, [categoryName, tagName, post, pathname, postsCount]);

  return (
    <motion.div
      layoutId="hero-banner"
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      className="bg-white border-4 border-[#0284c7] p-3.5 sm:p-6 md:p-10 shadow-[6px_6px_0px_0px_#0284c7] sm:shadow-[8px_8px_0px_0px_#0284c7] rounded-sm text-center relative overflow-hidden flex flex-col justify-center min-h-[110px] sm:min-h-[180px] md:min-h-[220px]"
    >
      {/* Handpainted/Retro grid styling */}
      <div 
        className="absolute top-0 left-0 w-full h-full pointer-events-none" 
        style={{ 
          backgroundImage: "linear-gradient(45deg, #fde68a 25%, transparent 25%, transparent 75%, #fde68a 75%, #fde68a), linear-gradient(45deg, #fde68a 25%, transparent 25%, transparent 75%, #fde68a 75%, #fde68a)", 
          backgroundSize: "20px 20px", 
          backgroundPosition: "0 0, 10px 10px", 
          opacity: infoConfig.banner.gridPatternOpacity 
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-200/10 via-transparent to-transparent pointer-events-none animate-pulse" />
      
      <div 
        className={`relative z-10 flex w-full h-full gap-2 sm:gap-6 md:gap-8 mx-auto max-w-4xl px-2 sm:px-6 md:px-10 transition-all duration-550 ${
          hasRightContent 
            ? "flex-col md:flex-row items-center justify-center md:justify-between" 
            : "flex-col items-center justify-center text-center"
        }`}
      >
        {/* Left Hand: Site Identity (Persistent / Morphing) */}
        <motion.div 
          layout="position"
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          className={`flex flex-col items-center shrink-0 ${
            hasRightContent ? "md:items-start text-center md:text-left" : "text-center"
          }`}
        >
          <a href="/" className="hover:opacity-90 active:scale-98 transition-all inline-block">
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#0284c7] mb-1.5 sm:mb-3 md:mb-5 tracking-widest transform -rotate-1 inline-block">
              {infoConfig.banner.title}'s blog
            </h1>
          </a>
          <div 
            className={`text-xs md:text-lg font-bold text-slate-600 dark:text-slate-300 font-mono h-6 sm:h-8 flex items-center justify-center -rotate-1 ${
              hasRightContent ? "md:justify-start" : ""
            }`}
          >
            <TypeAnimation
              sequence={infoConfig.subtitle.sequence}
              wrapper="span"
              cursor={true}
              repeat={Infinity}
              className="bg-[#fde68a] px-2.5 py-0.5 shadow-[2px_2px_0px_0px_#0284c7] border-2 border-[#0284c7] inline-block font-sans whitespace-nowrap"
            />
          </div>
        </motion.div>

        {/* Right Hand: Context Specific Cards (Transitioning smoothly) */}
        {hasRightContent && (
          <div className="flex items-center justify-center md:justify-end shrink-0 min-w-0 max-w-full">
            <AnimatePresence mode="popLayout">
              {rightSideContent}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
