import { useEffect, useRef } from 'react';
import { init } from '@waline/client';
import '@waline/client/waline.css';
import { siteConfig } from '../config/site';

// Cap CAPTCHA 配置（官方 CDN 方式）
const CAP_API_ENDPOINT = 'https://cap.upxuu.com/28ba1b0591/';
const CAP_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/cap-widget@0.1.56';
const CAP_FLOATING_SRC = 'https://cdn.jsdelivr.net/npm/cap-widget@0.1.56/cap-floating.min.js';

export function WalineComment() {
  const containerRef = useRef<HTMLDivElement>(null);
  const walineInstanceConfig = useRef<any>(null);

  useEffect(() => {
    // 加载官方 cap-widget + 浮动模式脚本（CDN）
    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.head.appendChild(s);
      });

    // 在 Waline 渲染完成后，往评论区注入 cap-widget + 给提交按钮加浮动属性
    const setupCap = async () => {
      await loadScript(CAP_SCRIPT_SRC);
      await loadScript(CAP_FLOATING_SRC);
      const container = containerRef.current;
      if (!container) return;
      // 等 Waline 渲染出表单
      const waitForForm = setInterval(() => {
        const form = container.querySelector('form');
        const submitBtn = form?.querySelector('[type="submit"]');
        if (form && submitBtn) {
          clearInterval(waitForForm);
          // 1. 注入 cap-widget（隐藏，作浮动目标）
          if (!form.querySelector('cap-widget')) {
            const widget = document.createElement('cap-widget');
            widget.id = 'cap-floating-widget';
            widget.setAttribute('data-cap-api-endpoint', CAP_API_ENDPOINT);
            form.appendChild(widget);
          }
          // 2. 给提交按钮加浮动触发属性
          submitBtn.setAttribute('data-cap-floating', '#cap-floating-widget');
          submitBtn.setAttribute('data-cap-floating-position', 'bottom');
        }
      }, 300);
      setTimeout(() => clearInterval(waitForForm), 8000);
    };

    if (containerRef.current) {
      let p = window.location.pathname.replace(/\/+/g, '/');
      if (!p.endsWith('/')) p += '/';
      walineInstanceConfig.current = init({
        el: containerRef.current,
        serverURL: siteConfig.waline.serverURL,
        path: p,
        dark: 'html.dark',
        search: false,
        imageUploader: false,
        placeholder: '写几个字证明你来过~',
      });
      setupCap();
    }

    return () => {
      walineInstanceConfig.current?.destroy();
    };
  }, []);

  return (
    <div className="waline-custom-theme bg-white dark:bg-slate-800 border-4 border-[#0284c7] p-3 sm:p-5 shadow-[6px_6px_0px_0px_#0284c7] sm:shadow-[8px_8px_0px_0px_#0284c7] rounded-sm mt-8">
      <h3 className="text-xl font-black text-[#0284c7] border-b-4 border-[#0284c7] pb-2 mb-4 uppercase inline-block pr-6 tracking-widest relative">
        Comments
        <div className="absolute -top-2 -right-3 w-4 h-4 bg-[#fde68a] border-2 border-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] rounded-sm transform rotate-12"></div>
      </h3>
      <div ref={containerRef} />
      <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 text-center mt-3 font-medium">
        （因不知名因素，海外IP暂时无法加载评论，请关闭代理）
      </p>
    </div>
  );
}
