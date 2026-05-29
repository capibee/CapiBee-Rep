import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
}

const MODULE_CHIPS = [
  { label: '📈 Clientes & Leads', key: 'clientes', desc: 'Leads, categorías y estado de empresas' },
  { label: '💼 Contabilidad & Facturas', key: 'contabilidad', desc: 'Facturación, cobros y pendientes' },
  { label: '💰 Comisiones & Ganancias', key: 'ganancias', desc: 'Resumen de liquidaciones del mes' },
  { label: '🗒️ Asuntos & Operaciones', key: 'asuntos', desc: 'Backlog de tareas, soporte y sectores' },
  { label: '👥 Usuarios', key: 'usuarios', desc: 'Roles y personal activo en plataforma' }
];

export default function CapibeeAgentChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1',
    role: 'agent',
    content: '¡Hola! 🐝 Soy tu asistente inteligente **Capibee**.\n\nPuedo extraer y sintetizar información en tiempo real del estado de nuestras operaciones y bases de datos.\n\n**¿Sobre cuál de nuestros módulos te gustaría recibir un informe clave hoy?** Puedes escribir o presionar una de las opciones de abajo.'
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

    // Simulate thinking/calculating state in real-time
    setTimeout(() => {
      // Gather real data from local storage
      const users = JSON.parse(localStorage.getItem('capibee_platform_users') || '[]');
      const invoices = JSON.parse(localStorage.getItem('capibee_invoices') || '[]');
      const earnings = JSON.parse(localStorage.getItem('capibee_agent_earnings') || '[]');
      const clients = JSON.parse(localStorage.getItem('capibee_clients') || '[]');
      const businesses = JSON.parse(localStorage.getItem('capibee_businesses') || '[]');
      const asuntos = JSON.parse(localStorage.getItem('capibee_asuntos') || '[]');

      let reply = '';

      switch (key) {
        case 'clientes': {
          const totalBusinesses = businesses.length;
          const totalClients = clients.length;
          const servicios = businesses.filter((b: any) => b.category === 'Servicios').length;
          const productos = businesses.filter((b: any) => b.category === 'Productos').length;
          const lastBusiness = businesses[0]?.name || 'Ninguna recientemente';
          
          reply = `### 📊 Balance en Tiempo Real de Clientes & Leads\n\n` +
            `He recopilado los siguientes datos de nuestra base de datos comercial:\n\n` +
            `* **Total Empresas Registradas:** \`${totalBusinesses}\` leads comerciales.\n` +
            `* **Clientes Incorporados:** \`${totalClients}\` empresas en operación activa.\n` +
            `* **Desglose de Sectores:**\n` +
            `  - 🛠️ *Servicios:* ${servicios} empresas\n` +
            `  - 📦 *Productos:* ${productos} empresas\n` +
            `* **Última incorporación de Lead:** \`${lastBusiness}\`\n\n` +
            `💡 **Recomendación Operativa:** Los leads con estatus "Prop. Aceptada" o "Reunión programada" están listos para ser contactados hoy mismo para acelerar la firma del contrato.`;
          break;
        }
        case 'contabilidad': {
          const totalInvoices = invoices.length;
          const statusCount = {
            Pagada: invoices.filter((i: any) => i.status?.toLowerCase() === 'pagado' || i.status?.toLowerCase() === 'pagada').length,
            Pendiente: invoices.filter((i: any) => i.status?.toLowerCase() === 'pendiente' || i.status?.toLowerCase() === 'emitida').length,
            Enviada: invoices.filter((i: any) => i.status?.toLowerCase() === 'enviada').length,
            Anulado: invoices.filter((i: any) => i.status?.toLowerCase() === 'anulado' || i.status?.toLowerCase() === 'anulada').length,
          };

          // Safe math for totals
          const totalInvoiced = invoices.reduce((acc: number, inv: any) => {
            const subtotal = inv.items && inv.items.length > 0
              ? inv.items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0)
              : (inv.quantity || 0) * (inv.priceUSD || 0);
            const total = subtotal * (1 + (inv.tax || 0) / 100);
            return acc + total;
          }, 0);

          reply = `### 💼 Resumen Contable & Facturación\n\n` +
            `Procesando facturas emitidas y saldos pendientes en tiempo real:\n\n` +
            `* **Total Facturas:** \`${totalInvoices}\` generadas.\n` +
            `* **Monto Estimado Facturado:** \`$${totalInvoiced.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\` USD.\n` +
            `* **Desglose por Estado de Cobro:**\n` +
            `  - ✅ **Pagadas:** ${statusCount.Pagada}\n` +
            `  - ⏳ **Pendientes/Emitidas:** ${statusCount.Pendiente}\n` +
            `  - 📨 **Enviadas al Cliente:** ${statusCount.Enviada}\n` +
            `  - ❌ **Anuladas:** ${statusCount.Anulado}\n\n` +
            `💡 **Recomendación Operativa:** Verifica en el área de *Contabilidad* aquellas facturas con estado "Enviada" que ya cumplieron el plazo de vencimiento para agilizar la cobranza.`;
          break;
        }
        case 'ganancias': {
          const totalEarnings = earnings.length;
          const statusCount = {
            Pagada: earnings.filter((e: any) => e.status === 'Pagado').length,
            Procesando: earnings.filter((e: any) => e.status === 'En proceso').length
          };
          const totalPaidUSD = earnings
            .filter((e: any) => e.status === 'Pagado')
            .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

          reply = `### 💰 Análisis de Comisiones y Rendimiento Comercial\n\n` +
            `Resultado de la liquidación de comisiones registradas para nuestros ejecutivos:\n\n` +
            `* **Total Movimientos de Comisión:** \`${totalEarnings}\` registrados.\n` +
            `* **Estado de Liquidación:**\n` +
            `  - 💵 **Pagadas/Completadas:** ${statusCount.Pagada} transacciones.\n` +
            `  - ⏳ **En proceso:** ${statusCount.Procesando} comisiones pendientes.\n` +
            `* **Total Transferido a Ejecutivos:** \`$${totalPaidUSD.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\` USD.\n\n` +
            `💡 **Cierre del Periodo:** Te sugiero revisar las comisiones acumuladas del mes para asegurar que todos los ejecutivos comerciales reciban su cobro en las fechas pactadas.`;
          break;
        }
        case 'asuntos': {
          const totalAsuntos = asuntos.length;
          const sectorCount = asuntos.filter((a: any) => a.sector === 'Área de Desarrollo').length;
          const unassigned = asuntos.filter((a: any) => !a.assignedUserId && !a.destinatario).length;
          const activeSectors = Array.from(new Set(asuntos.map((a: any) => a.sector || 'Desconocido'))).slice(0, 3);

          reply = `### 🗒️ Reporte de Asuntos, Soporte y Operatividad\n\n` +
            `Balance general de casos y asignaciones operativas:\n\n` +
            `* **Total Casos Activos:** \`${totalAsuntos}\` asuntos registrados.\n` +
            `* **Casos Críticos / Área de Desarrollo:** \`${sectorCount}\` asuntos asignados a soporte técnico.\n` +
            `* **Asuntos en Cola de Asignación:** \`${unassigned}\` pendientes.\n` +
            `* **Principales Departamentos:** ${activeSectors.join(', ')}.\n\n` +
            `💡 **Recomendación:** Es de alta prioridad asignar responsable a los casos pendientes para cumplir con las fechas acordadas en cada propuesta comercial.`;
          break;
        }
        case 'usuarios': {
          const totalUsers = users.length;
          const adminCount = users.filter((u: any) => u.roleId === 'ADMIN_MAESTRO' || u.roleName?.toUpperCase().includes('ADMIN')).length;
          const agentCount = users.filter((u: any) => u.roleName?.toLowerCase().includes('ejecutivo') || u.roleId?.toLowerCase().includes('ejecutivo')).length;

          reply = `### 👥 Reporte de Personal & Usuarios Registrados\n\n` +
            `Auditoría rápida del personal de la plataforma:\n\n` +
            `* **Usuarios Totales en Sistema:** \`${totalUsers}\` cuentas dadas de alta.\n` +
            `* **Distribución de Roles Principales:**\n` +
            `  - 🔑 **Administradores Maestros:** ${adminCount} con accesos totales.\n` +
            `  - 💼 **Ejecutivos Comerciales:** ${agentCount} con acceso a comisiones y leads.\n\n` +
            `Estas cuentas representan el equipo habilitado para gestionar clientes, emitir facturación y operar asuntos en tiempo real.`;
          break;
        }
        default: {
          reply = `Hola. He analizado tu consulta sobre **"${displayLabel}"**.\n\nPara darte un reporte preciso, selecciona uno de los módulos principales que quieres auditar en tiempo real usando los botones o escribiendo una palabra clave como *clientes*, *facturas*, *ganancias* o *asuntos*.`;
          break;
        }
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'agent', content: reply }]);
      setIsLoading(false);
    }, 600);
  };

  const handleSendText = () => {
    if (!input.trim() || isLoading) return;

    const text = input.trim();
    setInput('');

    // Deduce the module matching the keyword of the input
    const normalized = text.toLowerCase();
    let computedKey = 'general';
    let label = text;

    if (normalized.includes('client') || normalized.includes('lead') || normalized.includes('empresa')) {
      computedKey = 'clientes';
      label = '📈 Diagnóstico de Clientes';
    } else if (normalized.includes('factur') || normalized.includes('contabil') || normalized.includes('ingres') || normalized.includes('cobr')) {
      computedKey = 'contabilidad';
      label = '💼 Diagnóstico de Contabilidad';
    } else if (normalized.includes('gananc') || normalized.includes('comision') || normalized.includes('pago')) {
      computedKey = 'ganancias';
      label = '💰 Reporte de Ganancias';
    } else if (normalized.includes('asunt') || normalized.includes('operac') || normalized.includes('soporte') || normalized.includes('tarea')) {
      computedKey = 'asuntos';
      label = '🗒️ Soporte & Asuntos';
    } else if (normalized.includes('usuari') || normalized.includes('role') || normalized.includes('cuenta')) {
      computedKey = 'usuarios';
      label = '👥 Cuentas de Usuarios';
    }

    handleQuery(computedKey, label);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="pointer-events-auto bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl w-[calc(100vw-32px)] sm:w-[360px] md:w-[400px] h-[500px] max-h-[calc(100vh-100px)] mb-4 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-amber-500/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    Capibee Agent <span className="flex w-2 h-2 rounded-full bg-emerald-500"></span>
                  </h3>
                  <p className="text-[10px] text-amber-500/70 font-mono tracking-wider">COMPUTANDO EN TIEMPO REAL</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900/50 flex flex-col">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${m.role === 'user' ? 'bg-amber-500 text-slate-955 rounded-tr-sm font-semibold' : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700/50'}`}>
                    {m.role === 'agent' ? (
                      <div className="markdown-body prose prose-invert prose-xs text-xs">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="text-xs font-mono">{m.content}</span>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-tl-sm p-3 text-xs flex gap-1 items-center border border-slate-700/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick module selector chips */}
            <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/45 shrink-0">
              <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1.5">Consultas Directas</span>
              <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto custom-scrollbar pr-1">
                {MODULE_CHIPS.map(chip => (
                  <button
                    key={chip.key}
                    onClick={() => handleModuleClick(chip.key, chip.label)}
                    disabled={isLoading}
                    className="px-2 py-1 text-[10px] bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-amber-400 hover:border-amber-500/30 transition-all font-medium disabled:opacity-50 select-none text-left flex items-center justify-between w-full"
                  >
                    <span>{chip.label}</span>
                    <span className="text-[8px] text-slate-500 font-normal truncate max-w-[150px]">{chip.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                  placeholder="Escribe cliente, factura, ganancias..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 text-xs text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-mono"
                />
                <button 
                  onClick={handleSendText}
                  disabled={isLoading || !input.trim()}
                  className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <Send size={16} />
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
        {isOpen ? <X size={24} /> : (
          <div className="relative">
            <Bot size={24} />
            <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-amber-500 rounded-full animate-ping"></span>
          </div>
        )}
      </button>
    </div>
  );
}
