import { useEffect, useRef } from 'react';
import { init } from '@waline/client';
import '@waline/client/waline.css';
import { siteConfig } from '../config/site';

// Cap CAPTCHA 配置（编程模式：new Cap().solve()，本地资源）
const CAP_API_ENDPOINT = 'https://cap.upxuu.com/20fe56c780/';
const CAP_WIDGET_SRC = '/cap/cap.min.js';
const CAP_WASM_URL = '/cap/cap_wasm_bg.wasm';

// 全局 Cap 实例 + token
let capInstance: any = null;
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

// 求解 Cap 验证，返回 token
async function solveCap(): Promise<string> {
  if (capTokenRef) return capTokenRef;
  try {
    const W: any = window;
    if (!capInstance) {
      if (!W.Cap) {
        await loadScript(CAP_WIDGET_SRC);
        // 等 Cap 类注册
        const wait = new Promise<void>((res) => {
          const t = setInterval(() => { if (W.Cap) { clearInterval(t); res(); } }, 100);
          setTimeout(() => { clearInterval(t); res(); }, 5000);
        });
        await wait;
      }
      if (W.Cap) {
        capInstance = new W.Cap({ apiEndpoint: CAP_API_ENDPOINT });
      }
    }
    if (capInstance) {
      const sol = await capInstance.solve();
      capTokenRef = sol?.token || '';
      return capTokenRef;
    }
  } catch (e) {
    console.warn('Cap solve error:', e);
  }
  return '';
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

    // 指定 wasm 本地加载
    try { (window as any).CAP_CUSTOM_WASM_URL = CAP_WASM_URL; } catch {}
    // 预加载 Cap 脚本
    loadScript(CAP_WIDGET_SRC);

    // 拦截 fetch：给 Waline 评论提交注入 cap-token（编程模式后台 solve）
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
                // 编程模式：后台 solve 拿 token 注入
                const token = await solveCap();
                if (token) {
                  parsed['cap-token'] = token;
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
