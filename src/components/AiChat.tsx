import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Cpu, ChevronDown, Loader2, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { contentConfig } from "../config/site";

const CHAT_MODELS = contentConfig.aiChatModels;

export function AiChat({ url, toc = [] }: { url: string, toc?: { id: string; text: string }[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [modelIdx, setModelIdx] = useState(0);
  const [inputVal, setInputVal] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const chatKey = `xuai-chat-${url}`;

  useEffect(() => {
    try {
      const savedM = localStorage.getItem('xuai-chat-model');
      if (savedM && CHAT_MODELS[parseInt(savedM)]) setModelIdx(parseInt(savedM));
      
      const savedChat = localStorage.getItem(chatKey);
      if (savedChat) {
        setChatHistory(JSON.parse(savedChat));
      }
    } catch {}

    // Global function to open chat and ask question
    (window as any).openAiChatWithQuestion = (q: string) => {
      setIsOpen(true);
      setInputVal(q);
      setTimeout(() => {
        const sendBtn = document.getElementById("ai-chat-send-btn");
        if (sendBtn) sendBtn.click();
      }, 300);
    };
  }, [url, chatKey]);

  useEffect(() => {
    if (!chatAreaRef.current || !messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen]);

  useEffect(() => {
    if (!messagesEndRef.current || !chatAreaRef.current) return;
    const el = chatAreaRef.current;
    const threshold = 100;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    if (isNearBottom) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isStreaming]);

  const saveHistory = (history: any[]) => {
    try { localStorage.setItem(chatKey, JSON.stringify(history)); } catch {}
  };

  const handleSendWithInput = async (textToSend: string) => {
    if (!textToSend.trim() || isStreaming) return;
    
    setInputVal("");
    
    const newHistory = [...chatHistory, { role: 'user', content: textToSend }];
    setChatHistory([...newHistory, { role: 'assistant', content: "", isThinking: true, thinking: "" }]);
    setIsStreaming(true);

    let resp: Response | null = null;
    let usedIdx = -1;
    let startTime = Date.now();

    try {
      for (let i = modelIdx; i < CHAT_MODELS.length; i++) {
        resp = await fetch(CHAT_MODELS[i].url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleUrl: url, messages: newHistory }),
        }).catch(() => null);
        if (resp && resp.ok) { usedIdx = i; break; }
      }
      if (!resp || !resp.ok) {
        for (let i = 0; i < modelIdx; i++) {
          resp = await fetch(CHAT_MODELS[i].url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ articleUrl: url, messages: newHistory }),
          }).catch(() => null);
          if (resp && resp.ok) { usedIdx = i; break; }
        }
      }

      if (!resp || !resp.ok) {
        throw new Error("Rate limit");
      }

      if (usedIdx !== modelIdx) {
        setModelIdx(usedIdx);
        localStorage.setItem('xuai-chat-model', String(usedIdx));
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buf = "";
      let fullReply = "";
      let fullThinking = "";
      let completionTokens = 0;
      let usedModelName = CHAT_MODELS[usedIdx].name;

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
            if (parsed.model) usedModelName = parsed.model;
            if (parsed.usage && parsed.usage.completion_tokens) completionTokens = parsed.usage.completion_tokens;
            
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.reasoning_content) {
              fullThinking += delta.reasoning_content;
              setChatHistory(curr => {
                const updated = [...curr];
                updated[updated.length - 1].thinking = fullThinking;
                return updated;
              });
            }
            if (delta?.content) {
              fullReply += delta.content;
              setChatHistory(curr => {
                const updated = [...curr];
                updated[updated.length - 1].isThinking = false;
                updated[updated.length - 1].content = fullReply;
                return updated;
              });
            }
          } catch (e) {}
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const finalMsg = {
        role: 'assistant',
        content: fullReply,
        tokens: completionTokens || Math.round(fullReply.length / 3),
        elapsed,
        model: usedModelName.split('/').pop() || usedModelName
      };

      const finalHistory = [...newHistory, finalMsg];
      setChatHistory(finalHistory);
      saveHistory(finalHistory);
      
    } catch (e) {
      setChatHistory([...newHistory, { role: 'assistant', content: "⚠ XUUAI正在发呆，请稍后重试。" }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSend = async () => {
    await handleSendWithInput(inputVal.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const sendBtn = document.getElementById("ai-chat-send-btn");
      if (sendBtn) sendBtn.click();
    }
  };

  const clearChat = () => {
    setChatHistory([]);
    localStorage.removeItem(chatKey);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed z-40 bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-[#0ea5e9] text-white rounded-full shadow-[0px_8px_16px_rgba(2,132,199,0.3)] flex items-center justify-center transform transition-transform hover:scale-105 active:scale-95 border-2 border-white dark:border-slate-800"
      >
        <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-black/20 dark:bg-black/40 pointer-events-auto" onClick={() => setIsOpen(false)}></div>
          
          <div className="absolute bottom-0 left-0 sm:bottom-24 sm:left-auto sm:right-6 w-full sm:w-[480px] md:w-[560px] h-[60dvh] sm:h-[600px] md:h-[680px] bg-[#faf8f5] dark:bg-slate-800 shadow-2xl sm:rounded-md flex flex-col pointer-events-auto border-t-4 sm:border-4 border-[#0284c7] overflow-hidden">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 border-b-2 border-[#0284c7] flex justify-between items-center shrink-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#e0f2fe] border-2 border-[#0ea5e9] flex items-center justify-center text-[#0ea5e9] shrink-0">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-[#0284c7] text-xs sm:text-sm leading-tight truncate">XUUAI</h3>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono tracking-wider truncate">智能阅读助手</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="relative">
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-sm transition-colors border border-slate-200 dark:border-slate-600"
                  >
                    <Cpu className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0ea5e9]" />
                    <span className="font-bold text-[10px] sm:text-xs hidden xs:inline">{CHAT_MODELS[modelIdx].name.split(' ')[0]}</span>
                    <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                  
                  {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-32 sm:w-36 bg-white dark:bg-slate-700 border-2 border-[#0284c7] shadow-[4px_4px_0px_0px_#0284c7] z-20 rounded-sm overflow-hidden flex flex-col">
                      {CHAT_MODELS.map((m, idx) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setIsMenuOpen(false);
                            setModelIdx(idx);
                            localStorage.setItem('xuai-chat-model', String(idx));
                          }}
                          className={`px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-left transition-colors ${idx === modelIdx ? "bg-[#0ea5e9] text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"}`}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={clearChat}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-sm transition-colors text-[10px] sm:text-xs font-bold border border-slate-200 dark:border-slate-600"
                  title="Clear Chat"
                >
                  <span className="text-[9px] sm:text-xs">CLS</span>
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-sm transition-colors border border-slate-200 dark:border-slate-600"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div ref={chatAreaRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-3 sm:space-y-4 bg-[#faf8f5] dark:bg-slate-900">
              <div className="text-center text-[10px] sm:text-xs text-slate-400 font-mono mb-3 sm:mb-4">
                你可以询问有关文章的问题
              </div>

              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-[#0ea5e9] text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-l-xl rounded-tr-xl max-w-[90%] sm:max-w-[85%] text-xs sm:text-sm shadow-sm break-words">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 w-full max-w-[95%] sm:max-w-[90%]">
                      <div className="bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 px-3 sm:px-4 py-2 sm:py-3 rounded-r-xl rounded-tl-xl text-xs sm:text-sm shadow-sm overflow-hidden text-slate-700 dark:text-slate-200 font-sans leading-relaxed break-words">
                        {msg.thinking && (
                          <div className="mb-2 bg-slate-50 dark:bg-slate-800 border-l-2 border-slate-300 dark:border-slate-500 p-1.5 sm:p-2 text-[10px] sm:text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-pre-wrap rounded break-all max-h-24 sm:max-h-32 overflow-y-auto">
                            <span className="text-[#0284c7] font-bold block mb-0.5 sm:mb-1">Thinking...</span>
                            {msg.thinking}
                          </div>
                        )}
                        {msg.isThinking && !msg.content ? (
                          <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] sm:text-xs">
                            <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin text-[#0ea5e9]" /> AI 思考中...
                          </div>
                        ) : (
                          <div className="space-y-3 sm:space-y-4">
                            {(() => {
                              try {
                                const parsed = JSON.parse(msg.content);
                                if (Array.isArray(parsed)) {
                                  return parsed.map((item: any, i: number) => {
                                    if (item.q) {
                                      return (
                                        <div key={i} className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-dashed border-slate-200">
                                          <div className="text-[10px] sm:text-xs font-bold text-[#0284c7] mb-1.5 sm:mb-2">点击词条继续问AI</div>
                                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                            {item.q.map((qText: string, qIdx: number) => (
                                              <button key={qIdx} onClick={() => { setInputVal(qText); handleSendWithInput(qText); }} className="text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 sm:py-1 bg-slate-100 hover:bg-[#e0f2fe] text-slate-600 hover:text-[#0284c7] transition-colors rounded border border-slate-200 hover:border-[#0284c7]">
                                                {qText} <span className="text-[8px] sm:text-[9px] font-black opacity-60 text-amber-500">AI</span>
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div key={i} className="flex flex-col gap-1">
                                        <ReactMarkdown>{item.p || ""}</ReactMarkdown>
                                        {item.r && item.r.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {item.r.map((refIdx: number, rI: number) => {
                                              const heading = toc[refIdx - 1];
                                              return heading ? (
                                                <a key={rI} href={`#${heading.id}`} onClick={() => setIsOpen(false)} className="text-[9px] sm:text-[10px] text-[#0284c7] hover:bg-[#0ea5e9] hover:text-white transition-colors bg-[#e0f2fe] px-1 sm:px-1.5 py-0.5 rounded-sm font-mono border border-[#bae6fd]">
                                                  {heading.text} ↗
                                                </a>
                                              ) : null;
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  });
                                }
                              } catch {}
                              return <ReactMarkdown>{msg.content}</ReactMarkdown>;
                            })()}
                          </div>
                        )}
                      </div>
                      {(msg.tokens || msg.elapsed) && (
                        <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono pl-1 sm:pl-2 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span>{msg.model}</span>
                          <span>{msg.tokens} tkns</span>
                          <span>{msg.elapsed}s</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white dark:bg-slate-800 p-2 sm:p-3 border-t-2 border-[#0284c7] shrink-0">
              <div className="flex gap-1.5 sm:gap-2">
                <textarea
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="向 XUUAI 提问..."
                  className="flex-1 min-h-[38px] sm:min-h-[44px] max-h-[90px] sm:max-h-[120px] resize-none bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 focus:border-[#0ea5e9] focus:bg-white dark:focus:bg-slate-700 focus:outline-none rounded-sm px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 transition-colors"
                  rows={1}
                />
                <button
                  id="ai-chat-send-btn"
                  onClick={handleSend}
                  disabled={!inputVal.trim() || isStreaming}
                  className="w-10 sm:w-12 shrink-0 bg-[#0ea5e9] text-white flex items-center justify-center rounded-sm transition-all hover:bg-[#0284c7] disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] active:shadow-none active:translate-y-[2px] active:translate-x-[2px]"
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
