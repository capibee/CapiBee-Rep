import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User, MessageCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
}

export default function CapibeeAgentChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1',
    role: 'agent',
    content: '¡Hola! Soy CapiBee Agent. Pregúntame sobre los datos de la plataforma, comisiones, o usuarios registrados.'
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Gather platform data from local storage
      const platformData = {
        users: JSON.parse(localStorage.getItem('capibee_platform_users') || '[]'),
        invoices: JSON.parse(localStorage.getItem('capibee_invoices') || '[]'),
        earnings: JSON.parse(localStorage.getItem('capibee_agent_earnings') || '[]'),
        clients: JSON.parse(localStorage.getItem('capibee_clients') || '[]'),
        businesses: JSON.parse(localStorage.getItem('capibee_businesses') || '[]'),
        asuntos: JSON.parse(localStorage.getItem('capibee_asuntos') || '[]'),
      };
      
      const currentUser = JSON.parse(localStorage.getItem('capibee_user') || '{}');

      const res = await fetch('/api/capibee/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content, platformData, currentUser })
      });

      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'agent', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'agent', content: `Error: ${data.error || 'No se pudo contactar al agente.'}` }]);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'agent', content: `Hubo un error de conexión con CapiBee Agent. Detalles: ${e.message || 'Desconocido'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="pointer-events-auto bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl w-[360px] md:w-[400px] h-[500px] mb-4 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-amber-500/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    CapiBee Agent <span className="flex w-2 h-2 rounded-full bg-emerald-500"></span>
                  </h3>
                  <p className="text-[10px] text-amber-500/70 font-mono tracking-wider">REALTIME ANALYTICS</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900/50">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${m.role === 'user' ? 'bg-amber-500 text-slate-950 rounded-tr-sm font-medium' : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700/50'}`}>
                    {m.role === 'agent' ? (
                      <div className="markdown-body prose prose-invert prose-sm">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span>{m.content}</span>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-tl-sm p-3 text-sm flex gap-1 items-center border border-slate-700/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Pregunta sobre agentes, clientes, comisiones..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 text-xs text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-mono"
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <Send size={16} className="ml-1" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(250,204,21,0.3)] flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        {isOpen ? <X size={24} /> : <Bot size={24} />}
      </button>
    </div>
  );
}
