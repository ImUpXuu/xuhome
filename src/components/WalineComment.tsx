import { useEffect, useRef } from 'react';
import { init } from '@waline/client';
import '@waline/client/waline.css';
import { siteConfig } from '../config/site';

// Cap CAPTCHA 配置（官方方式：cap-widget 自动注入 cap-token）
const CAP_API_ENDPOINT = 'https://cap.upxuu.com/28ba1b0591/';
// 本地静态资源（国内可加载，避免 jsdelivr 被墙）
const CAP_WIDGET_SRC = '/cap/cap.min.js';
const CAP_WASM_URL = '/cap/cap_wasm_bg.wasm';

export function WalineComment() {
  const containerRef = useRef<HTMLDivElement>(null);
  const walineInstanceConfig = useRef<any>(null);
  const capTokenRef = useRef<string | null>(null);

  useEffect(() => {
    // 指定 wasm 从本地加载（cap.min.js 默认从 jsdelivr 拉 wasm，国内会失败）
    try {
      (window as any).CAP_CUSTOM_WASM_URL = CAP_WASM_URL;
    } catch {
      // ignore
    }

    // 动态加载本地 cap-widget（定义 cap-widget 自定义元素）
    const loadCap = (): Promise<void> =>
      new Promise((resolve) => {
        if (window.customElements?.get('cap-widget')) return resolve();
        const s = document.createElement('script');
        s.src = CAP_WIDGET_SRC;
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.head.appendChild(s);
      });

    // 官方方式：在 Waline 渲染完成后，往评论区注入 cap-widget
    // cap-widget 在表单内会自动注入 hidden 的 cap-token 输入框
    const setupCap = async () => {
      await loadCap();
      const container = containerRef.current;
      if (!container) return;
      // 等 Waline 渲染出表单
      const waitForForm = setInterval(() => {
        const form = container.querySelector('form');
        if (form) {
          clearInterval(waitForForm);
          // 在表单提交按钮前插入 cap-widget
          if (!form.querySelector('cap-widget')) {
            const widget = document.createElement('cap-widget');
            widget.setAttribute('data-cap-api-endpoint', CAP_API_ENDPOINT);
            widget.setAttribute('data-cap-hidden-field-name', 'cap-token');
            const submitBtn = form.querySelector('[type="submit"]');
            if (submitBtn) {
              form.insertBefore(widget, submitBtn);
            } else {
              form.appendChild(widget);
            }
          }
        }
      }, 300);
      // 5 秒后停止等待（避免内存泄漏）
      setTimeout(() => clearInterval(waitForForm), 5000);
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
