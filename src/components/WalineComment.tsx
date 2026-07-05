import { useEffect, useRef } from 'react';
import { init } from '@waline/client';
import '@waline/client/waline.css';
import { siteConfig } from '../config/site';

export function WalineComment() {
  const containerRef = useRef<HTMLDivElement>(null);
  const walineInstanceConfig = useRef<any>(null);

  useEffect(() => {
    const handleRejection = (e: PromiseRejectionEvent) => {
      if (e.reason && e.reason.message === 'Failed to fetch') {
        // Prevent Waline fetch errors from bubbling up to the error overlay
        e.preventDefault();
        console.warn('Waline fetch failed globally intercepted.');
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);

    if (containerRef.current) {
      let p = window.location.pathname;
      if (!p.endsWith('/')) p += '/';
      walineInstanceConfig.current = init({
        el: containerRef.current,
        serverURL: siteConfig.waline.serverURL,
        path: p,
        dark: 'html.dark',
        search: false,
        imageUploader: false,
      });
    }

    return () => {
      walineInstanceConfig.current?.destroy();
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
