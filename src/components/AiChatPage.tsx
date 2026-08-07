import { useState, useRef, useEffect, useCallback } from 'react';

// upxuu-ai 后端 API
const API_BASE = 'https://ai.upxuu.com';
const HISTORY_KEY = 'upxuu_ai_history';

interface Msg {
  role: 'user' | 'ai';
  text: string;
  sources?: { title: string; url: string }[];
}

interface Step {
  kind: 'tool' | 'result';
  html: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(text: string): string {
  let t = esc(text);
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  t = t.replace(/(?<!=")(https?:\/\/[^\s<>")\]]+)/g, '<a href="$1" target="_blank">$1</a>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return t;
}

function renderMarkdown(text: string): string {
  if (!text) return '';
  const parts = text.split(/(```[\s\S]*?```)/g);
  let out = '';
  for (const part of parts) {
    if (part.startsWith('```')) {
      out += '<pre class="mdcode">' + esc(part.replace(/```/g, '')) + '</pre>';
      continue;
    }
    out += renderLines(part);
  }
  return out;
}

function renderLines(text: string): string {
  const tableRe = /((?:^\|.*\|\s*$[\r\n]*)+)/gm;
  let html = '';
  const parts = text.split(tableRe);
  for (const part of parts) {
    if (part && part.trim().includes('|') && part.trim().split('\n').every((l) => l.trim().startsWith('|') && l.trim().endsWith('|'))) {
      html += renderTable(part);
    } else {
      html += renderLinesCore(part);
    }
  }
  return html;
}

function renderTable(block: string): string {
  const rows = block.split('\n').filter((l) => l.trim().startsWith('|'));
  const row1IsSep = rows.length > 1 && rows[1].split('|').slice(1, -1).every((c) => /^:?-{2,}:?$/.test(c.trim()));
  let t = '<table class="mdtable"><tbody>';
  rows.forEach((row, idx) => {
    const cells = row.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) return;
    const cellTag = idx === 0 && row1IsSep ? 'th' : 'td';
    t += '<tr>' + cells.map((c) => `<${cellTag}>${inline(c)}</${cellTag}>`).join('') + '</tr>';
  });
  return t + '</tbody></table>';
}

function renderLinesCore(text: string): string {
  const lines = text.split('\n');
  let html = '';
  let inList = false;
  let listTag = '';
  let plain: string[] = [];
  const closeList = () => { if (inList) { html += '</' + listTag + '>'; inList = false; } };
  const flushPlain = () => { if (plain.length) { html += '<div class="pseg">' + plain.map(inline).join('\n') + '</div>'; plain = []; } };
  for (const raw of lines) {
    const line = raw.trim();
    const headM = line.match(/^(#{1,4})\s+(.*)/);
    const listM = line.match(/^[-*•]\s+(.*)/);
    const numM = line.match(/^\d+[.)]\s+(.*)/);
    const quoteM = line.match(/^>\s?(.*)/);
    if (headM) { flushPlain(); closeList(); html += '<div class="mdh">' + inline(headM[2]) + '</div>'; continue; }
    if (listM || numM) {
      flushPlain();
      const tag = listM ? 'ul' : 'ol';
      if (!inList || listTag !== tag) { closeList(); inList = true; listTag = tag; html += '<' + tag + '>'; }
      html += '<li>' + inline((listM || numM)[1]) + '</li>';
      continue;
    }
    if (quoteM) { flushPlain(); closeList(); html += '<div class="mdquote">' + inline(quoteM[1]) + '</div>'; continue; }
    closeList();
    plain.push(raw);
  }
  flushPlain(); closeList();
  return html;
}

export function AiChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState<string>('');
  const [thinking, setThinking] = useState<string>('');
  const [thinkOpen, setThinkOpen] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [liveSources, setLiveSources] = useState<{ title: string; url: string }[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const mainRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<{ role: string; content: string }[]>([]);
  const pendingSourcesRef = useRef<{ title: string; url: string }[]>([]);
  const busyRef = useRef(false);
  const lastQuestionRef = useRef('');
  const lastAnswerRef = useRef('');

  // 初始化：恢复历史
  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') || [];
      historyRef.current = h.slice(-24);
      const msgs: Msg[] = [];
      for (const m of h.slice(-12)) {
        msgs.push({ role: m.role === 'user' ? 'user' : 'ai', text: m.content });
      }
      setMessages(msgs);
    } catch { /* ignore */ }
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: mainRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming, thinking, steps, liveSources, suggestions]);

  const saveHistory = useCallback(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(historyRef.current.slice(-24))); } catch { /* ignore */ }
  }, []);

  const scrollBottom = useCallback(() => {
    mainRef.current?.scrollTo({ top: mainRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

  const sendQuestion = useCallback(async (q?: string) => {
    const question = (q ?? input).trim();
    if (!question || busyRef.current) return;
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    busyRef.current = true;
    setBusy(true);

    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    historyRef.current.push({ role: 'user', content: question });

    setStreaming('');
    setThinking('');
    setThinkOpen(true);
    setSteps([]);
    setLiveSources([]);
    setSuggestions([]);
    pendingSourcesRef.current = [];
    lastQuestionRef.current = question;
    lastAnswerRef.current = '';

    let accumulated = '';
    let thinkingBuf = '';

    try {
      const res = await fetch(`${API_BASE}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history: historyRef.current.slice(-12) }),
      });
      if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const lines = block.split('\n');
          let event = 'delta', data = '';
          for (const ln of lines) {
            if (ln.startsWith('event:')) event = ln.slice(6).trim();
            else if (ln.startsWith('data:')) data += ln.slice(5).trim();
          }
          if (!data) continue;

          if (event === 'thinking') {
            let d: string;
            try { d = JSON.parse(data); } catch { d = data; }
            thinkingBuf += d;
            setThinking(thinkingBuf);
            scrollBottom();
          } else if (event === 'delta') {
            let d: string;
            try { d = JSON.parse(data); } catch { d = data; }
            if (thinkingBuf) { setThinking(''); thinkingBuf = ''; setThinkOpen(false); }
            accumulated += d;
            lastAnswerRef.current = accumulated;
            setStreaming(accumulated);
            scrollBottom();
          } else if (event === 'tool') {
            try {
              const t = JSON.parse(data);
              setSteps((prev) => [...prev, {
                kind: 'tool',
                html: t.name === 'fetch_web' ? `🔍 抓取网站 ${esc(t.url || '')}` : t.name === 'add_friend' ? `📝 添加友链 ${esc((t.friendName || '') + (t.url ? ' · ' + t.url : ''))}` : '📖 读取文章',
              }]);
              scrollBottom();
            } catch { /* ignore */ }
          } else if (event === 'tool_result') {
            try {
              const m = JSON.parse(data);
              if (m.kind === 'fetch') {
                const parts = ['✅ 网站抓取成功'];
                if (m.title) parts.push(`<span>${esc(m.title)}</span>`);
                if (m.error) setSteps((prev) => [...prev, { kind: 'result', html: `❌ ${esc(m.error)}` }]);
                else setSteps((prev) => [...prev, { kind: 'result', html: parts.join(' ') }]);
              } else if (m.kind === 'add_friend') {
                const ok = m.ok;
                let html = (ok ? '✅ ' : '❌ ') + esc(m.message || '');
                if (ok && m.commit_id) html += ` <span class="commit-id">Commit: <code>${esc(m.commit_id)}</code></span>`;
                setSteps((prev) => [...prev, { kind: 'result', html }]);
              } else {
                const tags = (m.titles || []).map((t: string) => `<span>${esc(t)}</span>`).join('');
                setSteps((prev) => [...prev, { kind: 'result', html: `✅ 已读取 ${m.count || 0} 篇 ${tags}` }]);
              }
              scrollBottom();
            } catch { /* ignore */ }
          } else if (event === 'tool_done') {
            try {
              const m = JSON.parse(data);
              if (m.sources && m.sources.length) {
                pendingSourcesRef.current = m.sources;
                setLiveSources(m.sources);
              }
              scrollBottom();
            } catch { /* ignore */ }
          } else if (event === 'done') {
            const finalText = accumulated;
            setStreaming('');
            const srcs = pendingSourcesRef.current;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'ai') return prev;
              return [...prev, { role: 'ai', text: finalText, sources: srcs }];
            });
            historyRef.current.push({ role: 'assistant', content: finalText });
            saveHistory();
            try {
              const sr = await fetch(`${API_BASE}/api/suggest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: lastQuestionRef.current, answer: finalText }),
              });
              if (sr.ok) {
                const sd = await sr.json();
                const list = Array.isArray(sd) ? sd : sd.suggestions;
                if (Array.isArray(list) && list.length) setSuggestions(list);
              }
            } catch { /* ignore */ }
            scrollBottom();
          }
        }
      }
    } catch (err) {
      setStreaming('');
      setMessages((prev) => [...prev, { role: 'ai', text: '请求失败：' + String((err as Error).message) }]);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [input, saveHistory, scrollBottom]);

  const clearChat = useCallback(() => {
    historyRef.current = [];
    setMessages([]);
    setStreaming('');
    setThinking('');
    setSteps([]);
    setSuggestions([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  }, []);

  const autoGrow = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  const chips = ['你知道 upxuu 是谁吗', 'upxuu 做过哪些项目', '最新文章速查'];

  return (
    <>
    <style>{`
      @keyframes upxuu-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      @keyframes upxuu-fade-in-up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      .animate-float { animation: upxuu-float 3s ease-in-out infinite; }
      .animate-fade-in-up { animation: upxuu-fade-in-up .3s ease-out both; }
    `}</style>
    <div className="flex flex-col bg-white/70 backdrop-blur border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgba(2,132,199,0.08)] overflow-hidden" style={{ height: 'calc(100vh - 190px)', minHeight: 520 }}>
      {/* 头部 */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-white/80 backdrop-blur shrink-0">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center text-white text-base font-bold shadow-[0_2px_8px_rgba(14,165,233,0.4)]">✦</div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full"></span>
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-[15px] text-slate-800 leading-tight">UpXuu AI</div>
          <div className="text-[11.5px] text-slate-400">基于博客文章的问答助手</div>
        </div>
        <button
          onClick={clearChat}
          title="清空对话"
          className="ml-auto w-8 h-8 rounded-full text-slate-300 hover:text-[#0ea5e9] hover:bg-slate-100 flex items-center justify-center shrink-0 text-lg cursor-pointer transition-colors"
        >↺</button>
      </div>

      {/* 消息区 */}
      <div ref={mainRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-5 bg-gradient-to-b from-[#f8fafc]/60 to-transparent">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center text-white text-3xl font-black shadow-[0_8px_24px_rgba(99,102,241,0.3)] animate-float">✦</div>
            <div className="text-2xl font-bold text-slate-700 mt-2">你好，我是 UpXuu AI</div>
            <div className="text-sm text-slate-400">可以回答关于 upxuu 博客文章的任何问题</div>
            <div className="flex flex-wrap gap-2 justify-center mt-4 max-w-md">
              {chips.map((c) => (
                <button key={c} onClick={() => sendQuestion(c)} disabled={busy}
                  className="px-4 py-2 rounded-full bg-white border border-slate-200 text-[13px] text-slate-600 cursor-pointer hover:border-[#0ea5e9] hover:text-[#0ea5e9] hover:shadow-[0_2px_10px_rgba(14,165,233,0.15)] transition-all disabled:opacity-50">
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
            <div className={`max-w-[85%] px-4 py-3 text-[14.5px] leading-relaxed break-words ${
              m.role === 'user'
                ? 'bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] text-white rounded-2xl rounded-br-md shadow-[0_4px_16px_rgba(99,102,241,0.25)]'
                : 'bg-white border border-slate-200/80 rounded-2xl rounded-bl-md shadow-[0_2px_12px_rgba(2,132,199,0.06)]'
            }`}>
              {m.role === 'user' ? (
                <div className="whitespace-pre-wrap">{m.text}</div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
              )}
              {m.role === 'ai' && m.sources && m.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {m.sources.slice(0, 3).map((s, j) => (
                    <a key={j} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-[11.5px] text-[#0ea5e9] bg-sky-50 px-2 py-1 rounded-lg hover:bg-sky-100 transition-colors no-underline max-w-[220px] truncate">
                      {s.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 流式中的 AI 回复 */}
        {(streaming || thinking || steps.length > 0) && (
          <div className="flex justify-start animate-fade-in-up">
            <div className="max-w-[95%] bg-white border border-slate-200/80 rounded-2xl rounded-bl-md px-4 py-3 shadow-[0_2px_12px_rgba(2,132,199,0.06)] w-full">
              {thinking && (
                <div className="mb-2">
                  <button onClick={() => setThinkOpen(!thinkOpen)}
                    className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer flex items-center gap-1.5">
                    {thinkOpen ? '🤔 思考中…' : '🧠 已思考（点击展开）'}
                  </button>
                  {thinkOpen && (
                    <div className="mt-1.5 text-[12.5px] text-slate-500 leading-relaxed whitespace-pre-wrap break-words bg-slate-50 rounded-xl px-3 py-2.5">
                      {thinking}
                    </div>
                  )}
                </div>
              )}
              {steps.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-2">
                  {steps.map((s, j) => (
                    <div key={j} className={`text-[12.5px] px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 w-fit ${
                      s.kind === 'tool' ? 'bg-amber-50 text-amber-600' : 'bg-sky-50 text-sky-600'
                    }`} dangerouslySetInnerHTML={{ __html: s.html }} />
                  ))}
                </div>
              )}
              {streaming && (
                <div className="text-[14.5px] leading-relaxed break-words text-slate-700" dangerouslySetInnerHTML={{ __html: renderMarkdown(streaming) }}>
                </div>
              )}
              {streaming && <span className="inline-block w-2 h-4 bg-[#0ea5e9] rounded-sm animate-pulse ml-0.5 align-text-bottom"></span>}
              {busy && !streaming && (
                <div className="flex gap-1.5 items-center py-2">
                  <span className="w-2 h-2 bg-[#0ea5e9] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-[#0ea5e9] rounded-full animate-bounce" style={{ animationDelay: '120ms' }}></span>
                  <span className="w-2 h-2 bg-[#0ea5e9] rounded-full animate-bounce" style={{ animationDelay: '240ms' }}></span>
                </div>
              )}
              {liveSources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {liveSources.slice(0, 3).map((s, j) => (
                    <a key={j} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-[11.5px] text-[#0ea5e9] bg-sky-50 px-2 py-1 rounded-lg hover:bg-sky-100 transition-colors no-underline max-w-[220px] truncate">
                      {s.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 建议问题 */}
      {suggestions.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-100 bg-white/80 backdrop-blur shrink-0">
          <div className="text-[11.5px] text-slate-400 mb-1.5">💡 你可以继续问：</div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 4).map((s, j) => (
              <button key={j} onClick={() => sendQuestion(s)} disabled={busy}
                className="text-left px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[12.5px] text-slate-600 cursor-pointer hover:border-[#0ea5e9] hover:text-[#0ea5e9] transition-colors disabled:opacity-50 max-w-[300px] truncate">
                {s.length > 26 ? s.slice(0, 26) + '…' : s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入区 */}
      <div className="px-5 py-3.5 border-t border-slate-100 bg-white/80 backdrop-blur shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoGrow(e); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuestion(); } }}
            rows={1}
            placeholder="问我关于 upxuu 文章的问题…"
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-[14.5px] text-slate-700 placeholder-slate-300 outline-none transition-all focus:border-[#0ea5e9] focus:bg-white focus:shadow-[0_0_0_3px_rgba(14,165,233,0.12)] font-sans"
          />
          <button onClick={() => sendQuestion()} disabled={busy}
            className="shrink-0 rounded-xl bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] text-white text-[14.5px] font-medium px-5 py-2.5 cursor-pointer shadow-[0_4px_14px_rgba(99,102,241,0.3)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
            发送
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
