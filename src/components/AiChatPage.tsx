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
      out += '<div class="mdcode">' + esc(part.replace(/```/g, '')) + '</div>';
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
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(historyRef.current.slice(-24)));
    } catch { /* ignore */ }
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

    // 追加用户消息
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    historyRef.current.push({ role: 'user', content: question });

    // 重置流式状态
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
            setThinking((prev) => { if (prev) setThinkOpen(false); return ''; });
            accumulated += d;
            lastAnswerRef.current = accumulated;
            setStreaming(accumulated);
            scrollBottom();
          } else if (event === 'tool') {
            try {
              const t = JSON.parse(data);
              setSteps((prev) => [...prev, {
                kind: 'tool',
                html: t.name === 'fetch_web' ? `<b>🔍 抓取网站</b> ${esc(t.url || '')}` : t.name === 'add_friend' ? `<b>📝 添加友链</b> ${esc((t.friendName || '') + (t.url ? ' · ' + t.url : ''))}` : '<b>📖 读取文章</b>',
              }]);
              scrollBottom();
            } catch { /* ignore */ }
          } else if (event === 'tool_result') {
            try {
              const m = JSON.parse(data);
              if (m.kind === 'fetch') {
                const parts = ['<b>✅ 网站抓取成功</b>'];
                if (m.title) parts.push(`<span class="tag">${esc(m.title)}</span>`);
                if (m.error) {
                  setSteps((prev) => [...prev, { kind: 'result', html: `<b>❌ ${esc(m.error)}</b>` }]);
                } else {
                  if (m.links && m.links.length) parts.push('<div class="tlinks">' + m.links.map((l: string) => `<a href="${esc(l)}" target="_blank">${esc(l)}</a>`).join('') + '</div>');
                  setSteps((prev) => [...prev, { kind: 'result', html: parts.join(' ') }]);
                }
              } else if (m.kind === 'add_friend') {
                const ok = m.ok;
                let html = '<b>' + (ok ? '✅ ' : '❌ ') + esc(m.message || '') + '</b>';
                if (ok && m.commit_id) html += `<div class="commit-id">Commit: <code>${esc(m.commit_id)}</code></div>`;
                setSteps((prev) => [...prev, { kind: 'result', html }]);
              } else {
                const tags = (m.titles || []).map((t: string) => `<span class="tag">${esc(t)}</span>`).join('');
                setSteps((prev) => [...prev, { kind: 'result', html: `<b>✅ 已读取 ${m.count || 0} 篇</b> ${tags}` }]);
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
            // 完成：追加 AI 消息 + 来源 + 建议
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
            // 拉建议
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
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const chips = ['你知道 upxuu 是谁吗', 'upxuu 做过哪些项目', '最新文章速查'];

  return (
    <div className="flex flex-col bg-[#faf8f5] border-4 border-[#0284c7] shadow-[8px_8px_0px_0px_#0ea5e9] rounded-sm overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: 520 }}>
      {/* 头部 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-[#0284c7] bg-white shrink-0">
        <span className="w-9 h-9 flex items-center justify-center bg-[#0ea5e9] border-2 border-[#0284c7] font-black text-white text-lg shadow-[2px_2px_0px_0px_#0284c7] rounded-sm">🤖</span>
        <div className="min-w-0">
          <div className="font-black text-[#0284c7] text-lg leading-tight">UpXuu AI</div>
          <div className="text-xs text-slate-500">基于博客文章的 AI 问答助手</div>
        </div>
        <button
          onClick={clearChat}
          title="清空对话"
          className="ml-auto w-8 h-8 border-2 border-[#0284c7] bg-white text-slate-400 hover:text-[#f59e0b] hover:border-[#f59e0b] flex items-center justify-center rounded-sm shrink-0 text-base cursor-pointer"
        >↺</button>
      </div>

      {/* 消息区 */}
      <div ref={mainRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#faf8f5]">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-slate-400">
            <div className="text-5xl font-black text-[#0284c7]">Hey 👋</div>
            <div className="text-lg font-bold text-slate-600">我是 UpXuu AI</div>
            <div className="text-sm">可以回答关于 upxuu 博客文章的任何问题</div>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              {chips.map((c) => (
                <button key={c} onClick={() => sendQuestion(c)} disabled={busy}
                  className="border-2 border-[#0284c7] bg-white px-3 py-1.5 text-sm cursor-pointer text-slate-700 shadow-[2px_2px_0px_0px_#0ea5e9] hover:bg-[#e0f2fe] hover:text-[#0284c7] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 rounded-sm font-medium">
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${m.role === 'user' ? 'bg-gradient-to-br from-[#0284c7] to-[#0ea5e9] text-white border-2 border-[#0284c7] shadow-[4px_4px_0px_0px_#f59e0b] rounded-sm' : 'bg-white border-2 border-[#0284c7] shadow-[4px_4px_0px_0px_#0ea5e9] rounded-sm'} px-4 py-3`}>
              {m.role === 'user' ? (
                <div className="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap">{m.text}</div>
              ) : (
                <div className="text-[14.5px] leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
              )}
              {m.role === 'ai' && m.sources && m.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {m.sources.slice(0, 3).map((s, j) => (
                    <a key={j} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-[11.5px] text-[#0284c7] bg-[#e0f2fe] border border-[#bae6fd] px-2 py-0.5 rounded-sm hover:bg-[#fde68a] hover:text-[#92400e] hover:border-[#f59e0b] no-underline max-w-[220px] truncate">
                      {s.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 流式中的 AI 回复 */}
        {(streaming || thinking) && (
          <div className="flex justify-start">
            <div className="max-w-[95%] bg-white border-2 border-[#0284c7] shadow-[4px_4px_0px_0px_#0ea5e9] rounded-sm px-4 py-3 w-full">
              {/* 思考折叠 */}
              {thinking && (
                <div className="mb-2 border border-slate-200 rounded-sm bg-slate-50 overflow-hidden">
                  <button onClick={() => setThinkOpen(!thinkOpen)} className="w-full text-left px-3 py-1.5 flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer hover:bg-[#faf8f5]">
                    <span>{thinkOpen ? '🤔 思考中' : '🧠 已思考（点击展开）'}</span>
                  </button>
                  {thinkOpen && <div className="px-3 pb-2 text-[12.5px] text-slate-500 leading-relaxed whitespace-pre-wrap break-words">{thinking}</div>}
                </div>
              )}
              {/* 工具步骤 */}
              {steps.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-2">
                  {steps.map((s, j) => (
                    <div key={j} className={`inline-flex items-center gap-1.5 flex-wrap text-[12.5px] px-2 py-0.5 rounded-sm ${s.kind === 'tool' ? 'bg-[#fde68a] text-[#92400e]' : 'bg-[#e0f2fe] text-[#0c4a6e]'}`}
                      dangerouslySetInnerHTML={{ __html: s.html }} />
                  ))}
                </div>
              )}
              {/* 流式正文 */}
              {streaming && (
                <div className="text-[14.5px] leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: renderMarkdown(streaming) }}>
                </div>
              )}
              {streaming && <span className="text-[#0284c7] animate-pulse">▋</span>}
              {/* 来源 */}
              {liveSources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {liveSources.slice(0, 3).map((s, j) => (
                    <a key={j} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-[11.5px] text-[#0284c7] bg-[#e0f2fe] border border-[#bae6fd] px-2 py-0.5 rounded-sm hover:bg-[#fde68a] no-underline max-w-[220px] truncate">
                      {s.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {busy && !streaming && !thinking && (
          <div className="flex justify-start"><div className="bg-white border-2 border-[#0284c7] px-4 py-3 rounded-sm text-[#0284c7] animate-pulse">思考中…</div></div>
        )}
      </div>

      {/* 建议问题 */}
      {suggestions.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-200 bg-white shrink-0">
          <div className="text-xs text-slate-400 mb-1.5">💡 你可以继续问：</div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 4).map((s, j) => (
              <button key={j} onClick={() => sendQuestion(s)} disabled={busy}
                className="text-left border-2 border-[#0284c7] bg-white text-slate-700 text-[13px] px-2.5 py-1 cursor-pointer shadow-[2px_2px_0px_0px_#0284c7] hover:bg-[#e0f2fe] hover:text-[#0284c7] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 rounded-sm max-w-[300px] truncate">
                {s.length > 28 ? s.slice(0, 28) + '…' : s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入区 */}
      <div className="px-4 py-3 border-t-2 border-[#0284c7] bg-white shrink-0">
        <div className="flex gap-2.5 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoGrow(e); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuestion(); }
            }}
            rows={1}
            placeholder="问我关于 upxuu 文章的问题…"
            className="flex-1 border-2 border-[#0284c7] rounded-sm px-3 py-2.5 text-[14.5px] outline-none bg-white shadow-[3px_3px_0px_0px_#0ea5e9] focus:shadow-[4px_4px_0px_0px_#f59e0b] resize-none font-sans"
          />
          <button onClick={() => sendQuestion()} disabled={busy}
            className="bg-gradient-to-br from-[#0284c7] to-[#0ea5e9] text-white border-2 border-[#0284c7] rounded-sm px-5 py-2.5 text-[14.5px] font-bold cursor-pointer shadow-[3px_3px_0px_0px_#f59e0b] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#f59e0b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
