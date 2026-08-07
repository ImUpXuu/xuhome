import { useEffect, useRef } from 'react';
import { init } from '@waline/client';
import '@waline/client/waline.css';
import { siteConfig } from '../config/site';

// Cap CAPTCHA 配置
const CAP_API_ENDPOINT = 'https://cap.upxuu.com/28ba1b0591/';
const CAP_WIDGET_SRC = '/vendor/cap.min.js';

export function WalineComment() {
  const containerRef = useRef<HTMLDivElement>(null);
  const capWrapRef = useRef<HTMLDivElement>(null);
  const walineInstanceConfig = useRef<any>(null);
  const capTokenRef = useRef<string | null>(null);
  const restoringFetchRef = useRef<boolean>(false);

  useEffect(() => {
    const handleRejection = (e: PromiseRejectionEvent) => {
      if (e.reason && e.reason.message === 'Failed to fetch') {
        e.preventDefault();
        console.warn('Waline fetch failed globally intercepted.');
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);

    // 动态加载 cap.min.js（定义 cap-widget 自定义元素）
    const loadCap = (): Promise<void> =>
      new Promise((resolve) => {
        if (window.customElements?.get('cap-widget')) return resolve();
        const s = document.createElement('script');
        s.src = CAP_WIDGET_SRC;
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.head.appendChild(s);
      });

    // 在评论区注入 cap-widget 元素，监听 solve 事件拿 token
    const setupCapWidget = async () => {
      await loadCap();
      const wrap = capWrapRef.current;
      if (!wrap || wrap.querySelector('cap-widget')) return;
      const widget = document.createElement('cap-widget');
      widget.setAttribute('data-cap-api-endpoint', CAP_API_ENDPOINT);
      widget.addEventListener('solve', (e: any) => {
        capTokenRef.current = e.detail?.token || null;
        console.log('Cap solved, token ready');
      });
      widget.addEventListener('reset', () => {
        capTokenRef.current = null;
      });
      widget.addEventListener('error', (e: any) => {
        console.error('Cap error:', e.detail?.message);
        capTokenRef.current = null;
      });
      wrap.appendChild(widget);
    };

    // 拦截 fetch：给 Waline 评论提交注入 cap-token
    const originalFetch = window.fetch.bind(window);
    let capInstalled = false;
    const installCapInterceptor = () => {
      if (capInstalled || restoringFetchRef.current) return;
      capInstalled = true;
      window.fetch = async (input: any, initOpts?: any) => {
        try {
          const url = typeof input === 'string' ? input : input?.url || '';
          const isCommentPost =
            url.includes('/comment') &&
            (!initOpts || !initOpts.method || initOpts.method.toUpperCase() === 'POST');
          if (isCommentPost && !restoringFetchRef.current) {
            let body = initOpts?.body;
            try {
              if (typeof body === 'string') {
                const parsed = JSON.parse(body);
                if (parsed && typeof parsed === 'object') {
                  if (!capTokenRef.current) {
                    // 无 token，阻止提交（返回 403 让 Waline 显示错误）
                    return new Response(JSON.stringify({ errno: 403, errmsg: '请先完成人机验证' }), {
                      status: 403,
                      headers: { 'Content-Type': 'application/json' },
                    });
                  }
                  parsed['cap-token'] = capTokenRef.current;
                  body = JSON.stringify(parsed);
                  initOpts = { ...initOpts, body };
                }
              }
            } catch {
              // body 非 JSON，跳过
            }
          }
        } catch (err) {
          console.warn('Cap interceptor error:', err);
        }
        return originalFetch(input, initOpts);
      };
    };
    installCapInterceptor();

    if (containerRef.current) {
      let p = window.location.pathname.replace(/\/+/g, '/');
      if (!p.endsWith('/')) p += '/';
      setupCapWidget();
      walineInstanceConfig.current = init({
        el: containerRef.current,
        serverURL: siteConfig.waline.serverURL,
        path: p,
        dark: 'html.dark',
        search: false,
        imageUploader: false,
        placeholder: '写几个字证明你来过~',
      });
    }

    return () => {
      if (capInstalled && !restoringFetchRef.current) {
        restoringFetchRef.current = true;
        try {
          window.fetch = originalFetch;
        } catch {
          // ignore
        }
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
      <div ref={capWrapRef} className="my-3" />
      <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 text-center mt-3 font-medium">
        （因不知名因素，海外IP暂时无法加载评论，请关闭代理）
      </p>
    </div>
  );
}
