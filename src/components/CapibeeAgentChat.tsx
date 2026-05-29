import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, ChevronRight, BarChart3, FileText, BadgeDollarSign, BookOpenText, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
}

const MODULE_DATA = [
  { label: 'Resumen Comercial', key: 'clientes', desc: 'Leads y estado de empresas', icon: BarChart3 },
  { label: 'Facturación', key: 'contabilidad', desc: 'Cobros y facturas', icon: FileText },
  { label: 'Comisiones', key: 'ganancias', desc: 'Liquidación del mes', icon: BadgeDollarSign },
  { label: 'Operaciones', key: 'asuntos', desc: 'Asuntos y soporte', icon: BookOpenText },
  { label: 'Equipo', key: 'usuarios', desc: 'Personal habilitado', icon: Users }
];

export default function CapibeeAgentChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1',
    role: 'agent',
    content: 'Bienvenido a su terminal ejecutiva, **Capibee**. \n\nSoy su asistente de inteligencia analítica. Estoy conectado a su plataforma para procesar informes de gestión en tiempo real. \n\n**¿Qué área de negocios desea auditar en este momento?**'
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isLoading]);

  const handleModuleClick = (key: string, label: string) => {
    handleQuery(key, label);
  };

  const handleQuery = (key: string, displayLabel: string) => {
    if (isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: displayLabel };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('capibee_platform_users') || '[]');
      const invoices = JSON.parse(localStorage.getItem('capibee_invoices') || '[]');
      const earnings = JSON.parse(localStorage.getItem('capibee_agent_earnings') || '[]');
      const clients = JSON.parse(localStorage.getItem('capibee_clients') || '[]');
      const businesses = JSON.parse(localStorage.getItem('capibee_businesses') || '[]');

      let reply = '';
      switch (key) {
        case 'clientes': {
          const totalBusinesses = businesses.length;
          const totalClients = clients.length;
          reply = `### Análisis Comercial\n\n` +
            `* **Leads totales:** \`${totalBusinesses}\` \n` +
            `* **Clientes en cartera:** \`${totalClients}\`\n\n` +
            `Estamos operando con una base sólida. Se recomienda seguir de cerca los leads con contratos pendientes.`;
          break;
        }
        case 'contabilidad': {
           const invoicesCount = invoices.length;
           const totalInvoiced = invoices.reduce((acc: number, inv: any) => acc + (inv.total || 0), 0);
           reply = `### Informe de Facturación\n\n` +
            `* **Facturas emitidas:** \`${invoicesCount}\` \n` +
            `* **Volumen facturado:** \`USD ${totalInvoiced.toLocaleString()}\`\n\n` +
            `El flujo de cuenta por cobrar se mantiene dentro de los parámetros esperados.`;
           break;
        }
        case 'ganancias': {
           const totalPaidUSD = earnings.filter((e: any) => e.status === 'Pagado').reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
           reply = `### Informe de Rendimiento (Comisiones)\n\n` +
            `* **Liquidaciones completadas:** \`USD ${totalPaidUSD.toLocaleString()}\`\n\n` +
            `Gestión de comisiones al día. Ninguna liquidación excede los plazos pactados.`;
           break;
        }
        default:
          reply = `Información analizada. Solicite un desglose específico para profundizar en los datos.`;
      }
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'agent', content: reply }]);
      setIsLoading(false);
    }, 800);
  };

  const handleSendText = () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    handleQuery('general', text);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="absolute bottom-16 right-0 bg-white border border-slate-200 shadow-2xl rounded-2xl w-[380px] h-[550px] flex flex-col overflow-hidden"
          >
            <div className="px-5 py-4 bg-slate-950 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                   <Bot size={18} strokeWidth={2} />
                 </div>
                 <h3 className="text-sm font-bold text-white tracking-wide">Capibee Agent</h3>
               </div>
               <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                 <X size={16} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-amber-500 text-white font-medium' : 'bg-white border border-slate-200 text-slate-800'}`}>
                    {m.role === 'agent' ? (
                       <div className="prose prose-xs max-w-none text-slate-700">
                         <ReactMarkdown>{m.content}</ReactMarkdown>
                       </div>
                    ) : (
                      <span>{m.content}</span>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                 <div className="flex justify-start text-xs text-slate-400 p-2">Analizando datos...</div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3 border-t border-slate-100 bg-white gap-2 flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Consultas rápidas</span>
              <div className="grid grid-cols-2 gap-2">
                {MODULE_DATA.map(module => (
                  <button key={module.key} onClick={() => handleModuleClick(module.key, module.label)} className="text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:border-amber-400 hover:text-slate-900 transition flex items-center justify-between group">
                    <span>{module.label}</span>
                    <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-white shrink-0">
              <div className="relative">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                  placeholder="Solicitar informe..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
                <button onClick={handleSendText} className="absolute right-2 top-2 p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50">
                  <Send size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-slate-950 text-amber-500 shadow-xl flex items-center justify-center hover:scale-105 transition-all outline-none"
      >
         {isOpen ? <X size={24} /> : <Bot size={24} strokeWidth={2} />}
      </button>
    </div>
  );
}
