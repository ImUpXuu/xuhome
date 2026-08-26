import { useEffect, useRef } from 'react';
import { init } from '@waline/client';
import '@waline/client/waline.css';
import { siteConfig } from '../config/site';

export function WalineComment() {
  const containerRef = useRef<HTMLDivElement>(null);
  const walineInstanceConfig = useRef<any>(null);
  const lastPathRef = useRef<string>('');

  // 计算评论绑定的路由 path
  const resolvedPath = () => {
    let p = window.location.pathname.replace(/\/+/g, '/');
    if (!p.endsWith('/')) p += '/';
    return p;
  };

  const initWaline = () => {
    if (!containerRef.current) return;
    const p = resolvedPath();
    lastPathRef.current = p;
    // 先销毁旧实例，再按新路径重新初始化（View Transitions 切换文章/页面时）
    walineInstanceConfig.current?.destroy();
    walineInstanceConfig.current = init({
      el: containerRef.current,
      serverURL: siteConfig.waline.serverURL,
      path: p,
      dark: 'html.dark',
      search: false,
      imageUploader: false,
    });
  };

  useEffect(() => {
    const handleRejection = (e: PromiseRejectionEvent) => {
      if (e.reason && e.reason.message === 'Failed to fetch') {
        e.preventDefault();
        console.warn('Waline fetch failed globally intercepted.');
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);

    initWaline();

    // View Transitions 每次导航完成后重新对齐评论路由
    const onPageLoad = () => {
      if (resolvedPath() !== lastPathRef.current) {
        initWaline();
      }
    };
    document.addEventListener('astro:page-load', onPageLoad);

    return () => {
      walineInstanceConfig.current?.destroy();
      document.removeEventListener('astro:page-load', onPageLoad);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return (
    <div className="waline-custom-theme bg-white dark:bg-slate-800 border-4 border-[#0284c7] p-3 sm:p-5 shadow-[6px_6px_0px_0px_#0284c7] sm:shadow-[8px_8px_0px_0px_#0284c7] rounded-sm mt-8">
      <h3 className="text-xl font-black text-[#0284c7] border-b-4 border-[#0284c7] pb-2 mb-4 uppercase inline-block pr-6 tracking-widest relative">
        Comments
        <div className="absolute -top-2 -right-3 w-4 h-4 bg-[#fde68a] border-2 border-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] rounded-sm transform rotate-12"></div>
      </h3>
      <div ref={containerRef} />
    </div>
  );
}