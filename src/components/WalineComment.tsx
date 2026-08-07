import { useEffect, useRef } from 'react';
import { init } from '@waline/client';
import '@waline/client/waline.css';
import { siteConfig } from '../config/site';

// Cap CAPTCHA 配置（浮动模式，本地资源）
const CAP_API_ENDPOINT = 'https://cap.upxuu.com/20fe56c780/';
const CAP_BASE = '/cap/';
const CAP_WIDGET_SRC = CAP_BASE + 'cap.min.js';
const CAP_WASM_URL = CAP_BASE + 'cap_wasm_bg.wasm';

// 全局 Cap token（由验证后写入，随提交注入）
let capTokenRef: string | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

export function WalineComment() {
  const containerRef = useRef<HTMLDivElement>(null);
  const walineInstanceConfig = useRef<any>(null);

  useEffect(() => {
    const handleRejection = (e: PromiseRejectionEvent) => {
      if (e.reason && e.reason.message === 'Failed to fetch') {
        e.preventDefault();
        console.warn('Waline fetch failed globally intercepted.');
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);

    // 拦截 fetch：给 Waline 评论提交注入 cap-token（若已有 token）
    const originalFetch = window.fetch.bind(window);
    let interceptorInstalled = false;
    const installInterceptor = () => {
      if (interceptorInstalled) return;
      interceptorInstalled = true;
      window.fetch = async (input: any, initOpts?: any) => {
        const url = typeof input === 'string' ? input : input?.url || '';
        const isCommentPost =
          url.includes('/comment') &&
          (!initOpts || !initOpts.method || initOpts.method.toUpperCase() === 'POST');
        if (isCommentPost) {
          let body = initOpts?.body;
          try {
            if (typeof body === 'string') {
              const parsed = JSON.parse(body);
              if (parsed && typeof parsed === 'object') {
                // 有 token 则注入（无 token 时由提交按钮拦截器负责验证）
                if (capTokenRef) {
                  parsed['cap-token'] = capTokenRef;
                  body = JSON.stringify(parsed);
                  initOpts = { ...initOpts, body };
                }
              }
            }
          } catch {
            // 忽略
          }
        }
        return originalFetch(input, initOpts);
      };
    };
    installInterceptor();

    // 显示 cap-widget 并等待 solve 返回 token
    async function solveCapWidget(): Promise<string> {
      const widget = document.getElementById('cap-comment-widget') as any;
      if (!widget || !widget.solve) {
        console.warn('Cap widget not ready');
        return '';
      }
      widget.style.display = 'block';
      try {
        await widget.solve();
        await new Promise((r) => setTimeout(r, 400)); // 等 solve 事件写 token
      } catch (e) {
        console.warn('Cap solve error:', e);
      }
      widget.style.display = 'none';
      return capTokenRef || '';
    }

    // 在 Waline 渲染后注入 cap-widget，并拦截提交按钮
    const setupCap = async () => {
      await loadScript(CAP_WIDGET_SRC);
      const container = containerRef.current;
      if (!container) return;

      let submitBound = false;
      const waitForForm = setInterval(() => {
        const form = container.querySelector('form');
        const submitBtn = form?.querySelector('[type="submit"]');
        if (!form || !submitBtn) return;

        // 注入隐藏 cap-widget
        let widget = form.querySelector('cap-widget') as any;
        if (!widget) {
          widget = document.createElement('cap-widget');
          widget.id = 'cap-comment-widget';
          widget.setAttribute('data-cap-api-endpoint', CAP_API_ENDPOINT);
          widget.style.cssText = 'display:none;position:absolute;bottom:100%;right:0;z-index:99999;background:#fff;border:2px solid #0284c7;border-radius:0;box-shadow:4px 4px 0 rgba(2,132,199,.3);padding:6px 10px;';
          widget.addEventListener('solve', (e: any) => {
            capTokenRef = e.detail?.token || null;
          });
          widget.addEventListener('reset', () => { capTokenRef = null; });
          form.appendChild(widget);
          try { if (window.customElements?.upgrade) window.customElements.upgrade(widget); } catch {}
        }

        // 拦截提交按钮：首次点击先验证，通过后再提交
        if (!submitBound) {
          submitBound = true;
          clearInterval(waitForForm);
          submitBtn.addEventListener('click', async (e: MouseEvent) => {
            // 已有 token 直接放行（fetch 拦截器会注入）
            if (capTokenRef) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            const token = await solveCapWidget();
            if (token) {
              capTokenRef = token;
              // 延迟后再触发提交（让 fetch 拦截器读到 token）
              setTimeout(() => submitBtn.click(), 200);
            }
          }, true);
        }
      }, 300);
      setTimeout(() => clearInterval(waitForForm), 8000);
    };

    if (containerRef.current) {
      let p = window.location.pathname.replace(/\/+/g, '/');
      if (!p.endsWith('/')) p += '/';
      try { (window as any).CAP_CUSTOM_WASM_URL = CAP_WASM_URL; } catch {}
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
      if (interceptorInstalled) {
        try { window.fetch = originalFetch; } catch {}
      }
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
      <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 text-center mt-3 font-medium">
        （因不知名因素，海外IP暂时无法加载评论，请关闭代理）
      </p>
    </div>
  );
}
