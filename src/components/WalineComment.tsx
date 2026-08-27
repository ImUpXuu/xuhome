import { useEffect, useRef, useState } from 'react';
import { init } from '@waline/client';
import '@waline/client/waline.css';
import { siteConfig } from '../config/site';

interface StatusHint {
  kind: 'waiting' | 'approved' | 'rejected' | '';
  text: string;
}

export function WalineComment() {
  const containerRef = useRef<HTMLDivElement>(null);
  const walineInstanceConfig = useRef<any>(null);
  const lastPathRef = useRef<string>('');
  const [hint, setHint] = useState<StatusHint>({ kind: '', text: '' });

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

    // 拦截 Waline 提交评论的 POST 响应，拿到新评论 ID 后开始轮询审核状态
    const origFetch = window.fetch;
    const commentEndpoint = (siteConfig.waline.serverURL || '').replace(/\/+$/, '');
    (window as any).fetch = (...args: any[]) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      const method = (args[1]?.method || 'GET') as string;
      const isCommentPost =
        method.toUpperCase() === 'POST' &&
        url.startsWith(commentEndpoint) &&
        url.includes('/comment');
      return origFetch.apply(window, args as any).then((resp: Response) => {
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
      (window as any).fetch = origFetch;
    };
  }, []);

  const hintStyle =
    hint.kind === 'approved'
      ? { background: '#dcfce7', color: '#15803d', borderColor: '#86efac' }
      : hint.kind === 'rejected'
        ? { background: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5' }
        : { background: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' };

  return (
    <div className="waline-custom-theme bg-white dark:bg-slate-800 border-4 border-[#0284c7] p-3 sm:p-5 shadow-[6px_6px_0px_0px_#0284c7] sm:shadow-[8px_8px_0px_0px_#0284c7] rounded-sm mt-8">
      <h3 className="text-xl font-black text-[#0284c7] border-b-4 border-[#0284c7] pb-2 mb-4 uppercase inline-block pr-6 tracking-widest relative">
        Comments
        <div className="absolute -top-2 -right-3 w-4 h-4 bg-[#fde68a] border-2 border-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] rounded-sm transform rotate-12"></div>
      </h3>
      {hint.kind && (
        <div
          className="mb-3 px-3 py-2 rounded-md border text-sm font-semibold"
          style={hintStyle}
        >
          {hint.text}
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}