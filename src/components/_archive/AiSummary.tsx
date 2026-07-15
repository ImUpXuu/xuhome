import { useState, useEffect, useRef } from "react";
import { Sparkles, Settings2, Cpu, Loader2, ChevronDown, ChevronRight, MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { contentConfig } from "../../config/site";

const SUMMARY_MODELS = contentConfig.aiSummaryModels;

export function AiSummary({ url, toc = [] }: { url: string, toc?: { id: string; text: string }[] }) {
  const [modelIdx, setModelIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState("");
  const [showThinking, setShowThinking] = useState(true);
  const [result, setResult] = useState<any[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const summaryBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('xuai-summary-model');
    if (saved && SUMMARY_MODELS[parseInt(saved)]) {
      setModelIdx(parseInt(saved));
    }
    const el = summaryBoxRef.current;
    if (!el) { fetchSummary(); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        fetchSummary();
      }
    }, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [url]);

  const fetchSummary = async (forceModelIdx?: number) => {
    const targetIdx = forceModelIdx !== undefined ? forceModelIdx : modelIdx;
    
    setLoading(true);
    setError(false);
    setThinking("");
    setRawText("");
    setResult([]);
    setQuestions([]);
    setHasStarted(false);
    setShowThinking(true);
    setStats("");

    let usedIdx = -1;
    let resp: Response | null = null;
    let startTime = Date.now();

    try {
      // Try models
      for (let i = targetIdx; i < SUMMARY_MODELS.length; i++) {
        resp = await fetch(SUMMARY_MODELS[i].url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleUrl: url }),
        }).catch(() => null);
        if (resp && resp.ok) { usedIdx = i; break; }
      }
      if (!resp || !resp.ok) {
        for (let i = 0; i < targetIdx; i++) {
          resp = await fetch(SUMMARY_MODELS[i].url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ articleUrl: url }),
          }).catch(() => null);
          if (resp && resp.ok) { usedIdx = i; break; }
        }
      }

      if (!resp || !resp.ok) {
        setError(true);
        setLoading(false);
        return;
      }

      if (usedIdx !== modelIdx) {
        setModelIdx(usedIdx);
        localStorage.setItem('xuai-summary-model', String(usedIdx));
      }

      let usedModelName = SUMMARY_MODELS[usedIdx].name;

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buf = "";
      let firstContentTime = 0;
      let fullContent = "";
      let completionTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.usage && parsed.usage.completion_tokens) {
              completionTokens = parsed.usage.completion_tokens;
            }
            if (parsed.model) usedModelName = parsed.model;
            const delta = parsed.choices?.[0]?.delta;
            
            if (delta?.reasoning_content) {
              setThinking(prev => prev + delta.reasoning_content);
            }
            
            if (delta?.content) {
              if (!firstContentTime) {
                firstContentTime = Date.now();
                setHasStarted(true);
                setShowThinking(false);
              }
              fullContent += delta.content;
              setRawText(fullContent);
            }
          } catch (e) {}
        }
      }

      // Try parsing JSON format if it applies
      parseResult(fullContent);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const ttft = firstContentTime ? ((firstContentTime - startTime) / 1000).toFixed(1) + "s" : "-";
      const tks = completionTokens || Math.round(fullContent.length / 3);
      setStats(`${usedModelName.split('/').pop()} · D: ${ttft} · T: ${tks} · ${elapsed}s`);
      
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const parseResult = (text: string) => {
    let clean = text.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim();
    let externalQ: string[] = [];
    
    const afterArray = clean.slice(clean.lastIndexOf(']') + 1);
    const qOuter = afterArray.match(/\{"q":\s*\[/);
    if (qOuter) {
      const qStart = afterArray.indexOf('{');
      try {
        const qObj = JSON.parse(afterArray.slice(qStart));
        if (Array.isArray(qObj.q)) externalQ = qObj.q;
      } catch (e) {}
    }

    const startB = clean.indexOf('[');
    const endB = clean.lastIndexOf(']');
    if (startB !== -1 && endB > startB) clean = clean.slice(startB, endB + 1);

    try {
      const data = JSON.parse(clean);
      if (Array.isArray(data)) {
        setResult(data.filter(d => 'p' in d));
        if (externalQ.length > 0) setQuestions(externalQ);
        else setQuestions(data.find(d => 'q' in d)?.q || []);
        return;
      }
    } catch {}
    
    // If we get here, it couldn't be parsed properly as structured. Let's just set rawText.
  };

  const openQuestion = (q: string) => {
    if ((window as any).openAiChatWithQuestion) {
      (window as any).openAiChatWithQuestion(q);
    }
  };

  return (
    <div className="bg-white border-4 border-[#0284c7] p-4 sm:p-5 shadow-[6px_6px_0px_0px_#0284c7] rounded-sm mb-8" ref={summaryBoxRef}>
      <div className="flex items-center justify-between border-b-2 border-[#0284c7] pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#f59e0b] animate-pulse" />
          <h3 className="font-black text-[#0284c7] uppercase tracking-widest">AI 总结</h3>
          {stats && <span className="ml-2 text-[10px] sm:text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm select-none hidden sm:inline-block">{stats}</span>}
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0284c7] transition-colors bg-slate-100 px-2 py-1 border-2 border-transparent hover:border-[#0284c7] rounded-sm"
          >
            <Cpu className="w-3.5 h-3.5" />
            {SUMMARY_MODELS[modelIdx].name}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white border-2 border-[#0284c7] shadow-[4px_4px_0px_0px_#0284c7] z-20 rounded-sm overflow-hidden flex flex-col">
              {SUMMARY_MODELS.map((m, idx) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setIsMenuOpen(false);
                    setModelIdx(idx);
                    localStorage.setItem('xuai-summary-model', String(idx));
                    fetchSummary(idx);
                  }}
                  className={`px-3 py-2 text-xs font-bold text-left transition-colors whitespace-nowrap ${idx === modelIdx ? "bg-[#0ea5e9] text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="min-h-[60px] text-sm text-slate-700 leading-relaxed font-sans">
        {loading && !thinking && !rawText && (
          <div className="flex items-center gap-2 text-[#0ea5e9] font-bold animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            正在阅读文章...
          </div>
        )}

        {error && (
          <div className="text-red-500 font-bold flex items-center gap-2">
            ⚠️ AI 正在开小差，请稍后刷新重试。
          </div>
        )}

        {thinking && (
          <div className="mb-4 bg-slate-50 border-l-4 border-[#0284c7] p-2 rounded-r-md">
            <button 
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-1 text-[11px] font-mono text-[#0284c7] font-bold uppercase tracking-wider mb-1"
            >
              <Cpu className="w-3 h-3" />
              Thinking Process {showThinking ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            {showThinking && (
              <div className="text-xs font-mono text-slate-400 whitespace-pre-wrap mt-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar break-all">
                {thinking}
              </div>
            )}
          </div>
        )}

        {result.length > 0 ? (
          <div className="space-y-3">
            {result.map((item, idx) => (
              <div key={idx} className="mb-4 last:mb-0">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#fde68a] border border-[#f59e0b] mt-2"></span>
                  <div className="flex-1 min-w-0">
                    <ReactMarkdown>{item.p}</ReactMarkdown>
                  </div>
                </div>
                {item.r && item.r.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1 ml-8 mb-2 opacity-60">
                    <span className="text-[10px] uppercase font-bold text-slate-400">引用:</span>
                    {item.r.map((refIndex: number, rIdx: number) => {
                      const heading = toc[refIndex - 1];
                      return heading ? (
                        <a key={rIdx} href={`#${heading.id}`} className="text-[10px] text-[#0284c7] hover:bg-[#0ea5e9] hover:text-white transition-colors bg-[#e0f2fe] px-1 py-0.5 rounded-sm font-mono border border-[#bae6fd]">
                          {heading.text}
                        </a>
                      ) : (
                        <span key={rIdx} className="text-[10px] text-[#0284c7] bg-[#e0f2fe] px-1 py-0.5 rounded-sm font-mono border border-[#bae6fd]">
                          [{refIndex}]
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : rawText ? (
          <div className="whitespace-pre-wrap"><ReactMarkdown>{rawText}</ReactMarkdown></div>
        ) : null}

        {!loading && (result.length > 0 || rawText) && (
          <div className="mt-5 pt-3 border-t border-dashed border-slate-200">
            <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" />
              继续问 AI
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => openQuestion("详细概括本文内容")} className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-[#e0f2fe] text-slate-600 hover:text-[#0284c7] transition-colors rounded border border-slate-200 hover:border-[#0284c7] shrink-0">
                详细概括本文内容
              </button>
              <button onClick={() => openQuestion("概括文章特点")} className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-[#e0f2fe] text-slate-600 hover:text-[#0284c7] transition-colors rounded border border-slate-200 hover:border-[#0284c7] shrink-0">
                概括文章特点
              </button>
              {questions.map((q, idx) => (
                <button 
                  key={idx} 
                  onClick={() => openQuestion(q)}
                  className="text-xs px-2.5 py-1 bg-[#fffbeb] border border-[#fcd34d] hover:border-[#f59e0b] hover:bg-[#fef3c7] text-[#b45309] font-medium transition-colors rounded shrink-0 flex items-center gap-1"
                >
                  {q}
                  <span className="text-[9px] font-black opacity-60">AI</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
