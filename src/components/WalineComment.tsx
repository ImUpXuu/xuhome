import { useEffect, useRef, useState } from 'react';
import { siteConfig } from '../config/site';
// CSS 只取 URL 字符串，不进页面 <head> 的阻塞 <link>；等评论区激活后再插入
import walineCssUrl from '@waline/client/waline.css?url';

interface StatusHint {
  kind: 'waiting' | 'approved' | 'rejected' | '';
  text: string;
}

export function WalineComment() {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const walineInstanceConfig = useRef<any>(null);
  const lastPathRef = useRef<string>('');
  const [hint, setHint] = useState<StatusHint>({ kind: '', text: '' });
  // 评论区进入视口（或用户点「加载评论」、或深链到 #comment-*）后才开始加载 Waline 资源
  const [activated, setActivated] = useState(false);
  const [showManualLoad, setShowManualLoad] = useState(false);
  const [ready, setReady] = useState(false);

  // Waline 服务端地址（与评论同域走代理时用 serverURL；否则用面板域名）
  const panelOrigin = 'https://safecom.upxuu.com';

  // 计算评论绑定的路由 path
  const resolvedPath = () => {
    let p = window.location.pathname.replace(/\/+/g, '/');
    if (!p.endsWith('/')) p += '/';
    return p;
  };

  // 轮询评论审核状态：等待→通过/被拒，通过后自动刷新评论列表
  const pollCommentStatus = (commentId: number) => {
    const maxAttempts = 14; // 约 14 × 6s = 84s
    let attempt = 0;
    const tick = async () => {
      try {
        const res = await fetch(`${panelOrigin}/api/cmt-status?id=${commentId}`);
        if (!res.ok) throw new Error('status');
        const data = await res.json();
        if (data.status === 'approved') {
          setHint({ kind: 'approved', text: '✓ 评论已通过审核，正在刷新…' });
          try { walineInstanceConfig.current?.update(); } catch (_) {}
          setTimeout(() => setHint({ kind: '', text: '' }), 5000);
          return;
        }
        if (data.status === 'spam') {
          setHint({ kind: 'rejected', text: '✗ 评论未通过审核（可能包含广告/违规内容）' });
          return;
        }
        // waiting：继续等
        setHint({ kind: 'waiting', text: '⏳ 评论正在审核中，通过后自动显示…' });
      } catch (_) {
        // 网络失败不打断轮询
      }
      attempt += 1;
      if (attempt < maxAttempts) setTimeout(tick, 6000);
      else setHint({ kind: 'waiting', text: '⏳ 仍在审核中，稍后刷新即可查看' });
    };
    setTimeout(tick, 4000); // 首次 4s 后查
  };

  const initWaline = (init: typeof import('@waline/client').init) => {
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
    setReady(true);
  };

  // 进入视口：200px 提前量，避免滚到评论区才看到空白
  useEffect(() => {
    if (activated) return;
    if (!rootRef.current) return;
    // 深链跳到具体评论：必须立即加载，否则锚点无处可去
    if (/^#comment/.test(window.location.hash)) {
      setActivated(true);
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      setActivated(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setActivated(true);
        io.disconnect();
      }
    }, { rootMargin: '200px 0px' });
    io.observe(rootRef.current);
    // 3 秒还没滚到就露出一个手动加载按钮，避免用户一直等
    const t = setTimeout(() => setShowManualLoad(true), 3000);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, [activated]);

  useEffect(() => {
    if (!activated) return;
    let cancelled = false;
    let origFetch: typeof window.fetch | null = null;
    let onPageLoad: (() => void) | null = null;
    let onRejection: ((e: PromiseRejectionEvent) => void) | null = null;
    let initFn: typeof import('@waline/client').init | null = null;

    const handleRejection = (e: PromiseRejectionEvent) => {
      if (e.reason && e.reason.message === 'Failed to fetch') {
        e.preventDefault();
        console.warn('Waline fetch failed globally intercepted.');
      }
    };
    onRejection = handleRejection;
    window.addEventListener('unhandledrejection', handleRejection);

    (async () => {
      // 样式与主体都按需加载：评论区进入视口前不下载 216KB JS / 24KB CSS
      try {
        if (walineCssUrl && !document.querySelector('link[data-waline-css]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = walineCssUrl;
          link.dataset.walineCss = '1';
          document.head.appendChild(link);
        }
        const mod = await import('@waline/client');
        if (cancelled) return;
        initFn = mod.init;
      } catch (err) {
        // 网络失败时退化为手动加载按钮，不阻塞页面
        if (!cancelled) setShowManualLoad(true);
        return;
      }
      initWaline(initFn as typeof import('@waline/client').init);
      if (cancelled) return;

      // 拦截 Waline 提交评论的 POST 响应，拿到新评论 ID 后开始轮询审核状态
      const currentFetch = window.fetch;
      origFetch = currentFetch;
      const commentEndpoint = (siteConfig.waline.serverURL || '').replace(/\/+$/, '');
      (window as any).fetch = (...args: any[]) => {
        const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
        const method = (args[1]?.method || 'GET') as string;
        const isCommentPost =
          method.toUpperCase() === 'POST' &&
          url.startsWith(commentEndpoint) &&
          url.includes('/comment');
        return currentFetch.apply(window, args as any).then((resp: Response) => {
          if (isCommentPost) {
            // 克隆响应，读取 body 里的 objectId（不影响 waline 自身消费）
            resp.clone().json().then((data: any) => {
              const oid = data?.data && (data.data.objectId ?? data.data.id);
              if (oid) pollCommentStatus(Number(oid));
            }).catch(() => {});
          }
          return resp;
        });
      };

      // View Transitions 每次导航完成后重新对齐评论路由
      onPageLoad = () => {
        if (resolvedPath() !== lastPathRef.current) {
          if (initFn) initWaline(initFn);
        }
      };
      document.addEventListener('astro:page-load', onPageLoad);
    })();

    return () => {
      cancelled = true;
      walineInstanceConfig.current?.destroy();
      if (onPageLoad) document.removeEventListener('astro:page-load', onPageLoad);
      if (onRejection) window.removeEventListener('unhandledrejection', onRejection);
      if (origFetch) (window as any).fetch = origFetch;
    };
  }, [activated]);

  const hintStyle =
    hint.kind === 'approved'
      ? { background: '#dcfce7', color: '#15803d', borderColor: '#86efac' }
      : hint.kind === 'rejected'
        ? { background: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5' }
        : { background: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' };

  return (
    <div ref={rootRef} className="waline-custom-theme bg-white dark:bg-slate-800 border-4 border-brand p-3 sm:p-5 shadow-[6px_6px_0px_0px_#0284c7] sm:shadow-[8px_8px_0px_0px_#0284c7] rounded-sm mt-8">
      <h3 className="text-xl font-black text-brand border-b-4 border-brand pb-2 mb-4 uppercase inline-block pr-6 tracking-widest relative">
        Comments
        <div className="absolute -top-2 -right-3 w-4 h-4 bg-accent border-2 border-brand shadow-[2px_2px_0px_0px_#0284c7] rounded-sm transform rotate-12"></div>
      </h3>
      {hint.kind && (
        <div
          className="mb-3 px-3 py-2 rounded-md border text-sm font-semibold"
          style={hintStyle}
        >
          {hint.text}
        </div>
      )}
      {!ready && (
        <div className="min-h-[160px] flex flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed border-brand/30 py-8 text-center">
          <p className="text-sm font-bold text-brand/70">评论加载中…</p>
          {showManualLoad && (
            <button
              type="button"
              onClick={() => setActivated(true)}
              className="cursor-pointer rounded-sm border-2 border-brand bg-accent px-4 py-1.5 text-xs font-black text-brand shadow-[2px_2px_0px_0px_#0284c7] hover:bg-brand-soft hover:text-white transition-colors"
            >
              加载评论
            </button>
          )}
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
