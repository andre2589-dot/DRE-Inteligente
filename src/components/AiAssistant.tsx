import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Send, Sparkles, RefreshCw, Cpu, MessageSquare, Paperclip, FileText, X } from 'lucide-react';
import { safeFetchJson } from '../utils/safeFetch';
import * as XLSX from 'xlsx';

interface AiAssistantProps {
  dreContext: any; // calculated figures for contextual injection
  companyId: string;
  userId: string;
  pendingQuery?: string | null;
  onClearPendingQuery?: () => void;
}

export default function AiAssistant({ 
  dreContext, 
  companyId, 
  userId,
  pendingQuery,
  onClearPendingQuery
}: AiAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachedContext, setAttachedContext] = useState<string | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load chat history from SQLite db proxy on mount or company change
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`/api/conversations?company_id=${companyId}&user_id=${userId}`);
        if (res.ok) {
          const data = await safeFetchJson<any[]>(res);
          if (Array.isArray(data) && data.length > 0) {
            // Map db records to ChatMessage
            const mapped: ChatMessage[] = [];
            data.forEach(item => {
              const dateVal = new Date(item.created_at);
              const fmtTime = isNaN(dateVal.getTime()) 
                ? '00:00' 
                : dateVal.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

              mapped.push({
                role: 'user',
                content: item.question,
                timestamp: fmtTime
              });
              mapped.push({
                role: 'assistant',
                content: item.answer,
                timestamp: fmtTime
              });
            });
            setMessages(mapped);
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching conversations:", err);
      }
      
      // Default initial welcome message if no history exists yet
      setMessages([
        { 
          role: 'assistant', 
          content: 'Olá! Sou seu CFO Virtual Executivo. Analisei a estrutura de transações e plano de contas do seu negócio. Faça-me perguntas como "Por que o lucro caiu em maio?" ou "Quais despesas mais cresceram?", e me peça análises e simulações com números reais!', 
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
        }
      ]);
    }
    loadHistory();
  }, [companyId, userId]);

  const quickPrompts = [
    "Por que o lucro caiu em maio?",
    "Quais despesas mais cresceram?",
    "Qual impacto de contratar 2 funcionários de R$ 5.000?",
    "Como atingir lucro líquido de R$ 50.000?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  useEffect(() => {
    if (pendingQuery) {
      handleSend(pendingQuery);
      if (onClearPendingQuery) {
        onClearPendingQuery();
      }
    }
  }, [pendingQuery]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachedFileName(file.name);
    
    try {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
          
          // Convert first 50 rows to string context
          const textContext = data.slice(0, 50).map(row => (row as any[]).join(' | ')).join('\n');
          setAttachedContext(`[CONHECIMENTO ADICIONAL DO ARQUIVO ${file.name}]:\n${textContext}`);
        };
        reader.readAsBinaryString(file);
      } else {
        // Assume text/json/pdf-ish text
        const text = await file.text();
        setAttachedContext(`[CONHECIMENTO ADICIONAL DO ARQUIVO ${file.name}]:\n${text.slice(0, 5000)}`);
      }
    } catch (err) {
      console.error("Error reading file for AI:", err);
      setAttachedContext("Erro ao ler arquivo.");
    }
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() && !attachedContext) return;
    if (isSending) return;

    const fullPrompt = attachedContext 
      ? `${textToSend}\n\nNota: Considere também estas informações que anexei do arquivo ${attachedFileName}:\n${attachedContext}`
      : textToSend;

    const userMsg: ChatMessage = {
      role: 'user',
      content: textToSend + (attachedFileName ? ` (Anexo: ${attachedFileName})` : ''),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          dreContext: dreContext,
          history: messages.slice(-6),
          attachedContext: attachedContext
        })
      });
      
      // Clear attachment after sending
      setAttachedFileName(null);
      setAttachedContext(null);

      if (!response.ok) {
        let errorText = 'Ocorreu um erro ao consultar o assistente de IA. Certifique-se de que o servidor local está em execução.';
        try {
          const errData = await safeFetchJson(response);
          if (errData && errData.error) {
            errorText = `Erro no Servidor: ${errData.error}`;
          }
        } catch (e: any) {
          errorText = e.message || `Falha na resposta do servidor (${response.status} ${response.statusText}).`;
        }
        throw new Error(errorText);
      }

      const data = await safeFetchJson(response);
      const botAnswer = data.text || 'Desculpe, não consegui processar sua solicitação no momento.';
      
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: botAnswer,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Persistent saving to Database back-end (Problema 1)
      fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          user_id: userId,
          question: textToSend,
          answer: botAnswer
        })
      }).catch(err => console.error("Failed to persist conversation row:", err));
    } catch (err: any) {
      console.error(err);
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: err.message?.startsWith('Erro') || err.message?.startsWith('Falha')
          ? `⚠️ ${err.message}`
          : '⚠️ Ocorreu um erro ao consultar o assistente de IA. Certifique-se de que o servidor local está em execução.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div id="ai-assistant" className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-full overflow-hidden">
      {/* Dynamic Context Panel */}
      <div className="lg:col-span-1 bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="h-5 w-5 text-indigo-600 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-800">Contexto Injetado</h3>
          </div>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Sua conversa atual está sincronizada com o estado financeiro ativo e simulações do painel. Toda resposta considera:
          </p>
          <div className="space-y-2 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Meses Consolidados</span>
              <span className="text-slate-800 font-semibold">{dreContext.months?.join(', ') || 'Sem dados'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Receita Líquida Acumulada</span>
              <span className="text-emerald-700 font-bold">
                R$ {dreContext.totalNetRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">EBITDA Acumulado</span>
              <span className="text-slate-800 font-bold">
                R$ {dreContext.totalEbitda?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Sugestões Rápidas de Análise</span>
          <div className="flex flex-col gap-1.5">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                disabled={isSending}
                onClick={() => handleSend(q)}
                className="text-left py-1 text-slate-600 hover:text-indigo-600 text-xs font-medium cursor-pointer transition-colors leading-snug hover:underline"
              >
                ✦ "{q}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Conversation Area */}
      <div className="lg:col-span-3 flex flex-col h-[480px] bg-slate-50/50 rounded-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-900 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-700 p-1.5 rounded-lg">
              <Sparkles className="h-4 w-4 text-amber-300" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-50 uppercase tracking-widest">CFO Virtual AI</h4>
              <p className="text-[10px] text-indigo-200">Powered by Google Gemini 3.5-flash</p>
            </div>
          </div>
          <button 
            onClick={() => setMessages([messages[0]])}
            title="Limpar conversa"
            className="text-indigo-200 hover:text-white transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Message logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col max-w-[85%] ${
                m.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {m.role === 'assistant' ? (
                  <Sparkles className="h-3 w-3 text-indigo-500" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                )}
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {m.role === 'assistant' ? 'CFO C-Level AI' : 'Você'}
                </span>
                <span className="text-[9px] text-slate-300">{m.timestamp}</span>
              </div>
              <div
                className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200/80 rounded-tl-none shadow-xs'
                }`}
              >
                <p className="whitespace-pre-line">{m.content}</p>
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex flex-col items-start max-w-[85%]">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3 w-3 text-indigo-600 animate-spin" />
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Analisando DRE...</span>
              </div>
              <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-xs">
                <div className="flex gap-1 items-center py-2 px-1">
                  <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-3 border-t border-slate-200/60 bg-white space-y-2">
          {attachedFileName && (
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-[10px] font-bold text-indigo-700 truncate max-w-[200px]">{attachedFileName}</span>
              </div>
              <button 
                onClick={() => { setAttachedFileName(null); setAttachedContext(null); }}
                className="text-indigo-400 hover:text-rose-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex items-center gap-2"
          >
            <input 
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv,.pdf,.txt"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 transition-all"
              title="Anexar arquivo (Excel/PDF)"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte-me ou anexe um arquivo para análise..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800"
            />
            <button
              type="submit"
              disabled={(!input.trim() && !attachedContext) || isSending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
