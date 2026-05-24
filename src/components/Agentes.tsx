import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Plus, X, Search, Building2, UserCircle, Phone, Trash2, Check, Eye, Zap, Clock, Bug, Activity, FileCode2, Pencil } from 'lucide-react';
import { Business, Agent } from '../types';
import { COUNTRIES } from '../constants';
import { usePermissions } from '../hooks/usePermissions';
import { TableLoader } from './TableLoader';

interface AgentesProps {
  onLogout: () => void;
  onBack: () => void;
}

function ElapsedTimer({ createdAt }: { createdAt: number }) {
  const [elapsedString, setElapsedString] = useState('');

  useEffect(() => {
    const update = () => {
      const elapsed = Date.now() - (createdAt || Date.now());
      const days = Math.floor(elapsed / 86400000);
      const hours = Math.floor((elapsed % 86400000) / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      // Minimalist: 00d 00h 00m
      setElapsedString(`${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return <>{elapsedString}</>;
}

export default function Agentes({ onLogout, onBack }: AgentesProps) {
  const permissions = usePermissions('agentes');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<{businessId: string, agentId: string} | null>(null);
  const [agentToView, setAgentToView] = useState<Agent & { businessName: string; businessId: string; country: string } | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{businessId: string, agentId: string, newStatus: string} | null>(null);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>('');
  const [noteModalData, setNoteModalData] = useState<{ businessId: string, agentId: string } | null>(null);
  const [newNote, setNewNote] = useState('');
  const [noteToDelete, setNoteToDelete] = useState<{ businessId: string, agentId: string, noteDate: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState('all');
  const [isTableLoading, setIsTableLoading] = useState(true);

  const agentStatuses = ['Requerido', 'En Desarrollo', 'Pruebas', 'Activo'];
  const agentStatusesLabels: Record<string, string> = {
      'Requerido': 'Requerido',
      'En Desarrollo': 'En Desarrollo',
      'Pruebas': 'En Pruebas',
      'Activo': 'Activo'
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, countryFilter]);

  // Form State
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [agentForm, setAgentForm] = useState({
    name: 'CapiBee IA',
    role: '',
    channel: 'WhatsApp' as 'WhatsApp' | 'Telegram',
    type: 'Servicios' as 'Servicios' | 'Productos',
    prompt: '',
    notes: '',
    contactInfo: '',
  });

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('capibee_businesses');
    if (stored) {
      setBusinesses(JSON.parse(stored));
    }
    const timer = setTimeout(() => setIsTableLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const saveBusinesses = (data: Business[]) => {
    setBusinesses(data);
    localStorage.setItem('capibee_businesses', JSON.stringify(data));
  };

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId);

  // Computed flat list of agents for display
  const allAgents = businesses.filter(b => {
      const d = new Date(b.createdAt);
      const yearMatch = d.getFullYear().toString() === yearFilter;
      const monthMatch = monthFilter === 'all' || d.getMonth() === parseInt(monthFilter);
      return yearMatch && monthMatch;
  }).flatMap(b => 
    (b.agents || []).map(a => ({ ...a, businessName: b.name, businessId: b.id, country: b.country || 'No especificado', responsibleName: b.responsibleName || '', responsiblePhone: b.responsiblePhone || '' }))
  );

  const agentKpiData = agentStatuses.reduce((acc, status) => {
    acc[status] = allAgents.filter(a => a.status === status).length;
    return acc;
  }, {} as Record<string, number>);

  const filteredAgents = allAgents.filter(a => {
    const searchMatch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.businessName.toLowerCase().includes(searchTerm.toLowerCase());
    const countryMatch = countryFilter === '' || a.country === countryFilter;
    const statusMatch = statusFilter === '' || a.status === statusFilter;
    return searchMatch && countryMatch && statusMatch;
  });

  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);
  const currentAgents = filteredAgents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSaveAgentStatus = (businessId: string, agentId: string, newStatus: string) => {
    if (!permissions.edit) return;
    const updatedBusinesses = businesses.map(b => {
      if (b.id === businessId) {
        return {
          ...b,
          agents: (b.agents || []).map(a => 
            a.id === agentId ? { ...a, status: newStatus as any } : a
          )
        };
      }
      return b;
    });
    saveBusinesses(updatedBusinesses);
    setEditingAgentId(null);
  };

  const handleOpenDeleteConfirm = (businessId: string, agentId: string) => {
    setAgentToDelete({ businessId, agentId });
  };

  const handleOpenDetails = (businessId: string, agentId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (!business) return;
    const agent = business.agents?.find(a => a.id === agentId);
    if (!agent) return;
    setAgentToView({ ...agent, businessName: business.name, businessId: business.id, country: business.country || 'No especificado' });
  };

  const confirmStatusChange = () => {
    if (!pendingStatusChange) return;
    handleSaveAgentStatus(pendingStatusChange.businessId, pendingStatusChange.agentId, pendingStatusChange.newStatus);
    setPendingStatusChange(null);
  };

  const confirmDeleteAgent = () => {
    if (!agentToDelete || !permissions.delete) return;
    const { businessId, agentId } = agentToDelete;
    
    const updatedBusinesses = businesses.map(b => {
      if (b.id === businessId) {
        return {
          ...b,
          agents: (b.agents || []).filter(a => a.id !== agentId)
        };
      }
      return b;
    });
    
    saveBusinesses(updatedBusinesses);
    setAgentToDelete(null);
  };

  const handleSaveNote = () => {
    if (!noteModalData || !newNote.trim() || !permissions.edit) return;
    
    const currentUser = localStorage.getItem('capibee_user') ? JSON.parse(localStorage.getItem('capibee_user') as string) : null;
    const authorName = currentUser?.fullName || 'Usuario Desconocido';

    const updatedBusinesses = businesses.map(b => {
      if (b.id === noteModalData.businessId) {
        return {
          ...b,
          agents: (b.agents || []).map(a => {
            if (a.id === noteModalData.agentId) {
              return {
                ...a,
                notes: [{ date: Date.now(), text: newNote, authorName }, ...(a.notes || [])]
              };
            }
            return a;
          })
        };
      }
      return b;
    });

    saveBusinesses(updatedBusinesses);
    setNoteModalData(null);
    setNewNote('');
  };

  const handleDeleteNote = (businessId: string, agentId: string, noteDate: number) => {
    if (!permissions.delete) return;
    const updatedBusinesses = businesses.map(b => {
      if (b.id === businessId) {
        return {
          ...b,
          agents: (b.agents || []).map(a => {
            if (a.id === agentId) {
              return {
                ...a,
                notes: (a.notes || []).filter(note => note.date !== noteDate)
              };
            }
            return a;
          })
        };
      }
      return b;
    });

    saveBusinesses(updatedBusinesses);
  };

  const handleDeleteAgent = (businessId: string, agentId: string) => {
    // legacy support if needed
    handleOpenDeleteConfirm(businessId, agentId);
  };

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId || !permissions.create) return;

    const newAgent: Agent = {
      id: crypto.randomUUID(),
      name: agentForm.name,
      role: agentForm.role || 'Asistente IA',
      tasks: 0,
      efficiency: 100,
      status: 'Requerido',
      channel: agentForm.channel,
      contactInfo: selectedBusiness?.phone || '+0000000000',
      type: agentForm.type,
      prompt: agentForm.prompt,
      notes: agentForm.notes ? [{ date: Date.now(), text: agentForm.notes, authorName: localStorage.getItem('capibee_user') ? JSON.parse(localStorage.getItem('capibee_user')!).fullName : 'Sistema' }] : [],
      createdAt: Date.now(),
    };

    const updatedBusinesses = businesses.map(b => {
      if (b.id === selectedBusinessId) {
        return {
          ...b,
          agents: [...(b.agents || []), newAgent]
        };
      }
      return b;
    });

    saveBusinesses(updatedBusinesses);
    setIsModalOpen(false);
    
    // Reset form
    setSelectedBusinessId('');
    setAgentForm({
      name: 'CapiBee IA',
      role: '',
      channel: 'WhatsApp',
      type: 'Servicios',
      prompt: '',
      notes: '',
      contactInfo: '',
    });
  };

  return (
    <div className="h-full bg-transparent flex flex-col font-sans overflow-hidden relative">
      <main className="flex-1 overflow-y-auto pt-2 sm:pt-4 p-4 sm:p-8 custom-scrollbar">
        <section className="max-w-[1400px] mx-auto h-full flex flex-col">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/80 backdrop-blur-2xl border border-yellow-500/20 shadow-[0_8px_32px_rgba(250,204,21,0.05)] rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col flex-1"
          >
            {/* Header */}
            <div className="px-5 sm:px-8 py-6 border-b border-yellow-500/10 flex flex-col lg:flex-row lg:items-center justify-end gap-6 shrink-0 bg-slate-900/50">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 cursor-pointer transition-all font-medium"
                >
                  <option value="">Todos los estados</option>
                  {agentStatuses.map(status => (
                    <option key={status} value={status}>{agentStatusesLabels[status] || status}</option>
                  ))}
                </select>
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 cursor-pointer transition-all font-medium"
                >
                  <option value="">Todos los países</option>
                  {COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                <div className="relative w-full sm:w-64 xl:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Buscar por agente o empresa..." 
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 placeholder-slate-600 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  disabled={!permissions.create}
                  className={`w-full sm:w-auto px-5 py-2.5 font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all text-xs active:scale-[0.98] flex gap-2 items-center justify-center shrink-0 ${!permissions.create ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                >
                  <Plus size={16} strokeWidth={2.5} />
                  Nuevo Agente
                </button>
              </div>
            </div>

            {/* KPI Section */}
            <div className="px-5 sm:px-8 py-4 border-b border-slate-800/50 bg-slate-900/20">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Indicadores</h2>
                  <div className="flex items-center gap-2">
                    <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="bg-slate-900/80 text-slate-400 px-2 py-1 rounded-md text-[10px] sm:text-xs border border-slate-800/50 outline-none focus:border-amber-500/50 transition-colors">
                        {['2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="bg-slate-900/80 text-slate-400 px-2 py-1 rounded-md text-[10px] sm:text-xs border border-slate-800/50 outline-none focus:border-amber-500/50 transition-colors">
                        <option value="all">Año</option>
                        {[0,1,2,3,4,5,6,7,8,9,10,11].map(m => <option key={m} value={m}>{new Date(0, m).toLocaleString('es-ES', { month: 'short' })}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-2">
                    {['Total', ...agentStatuses].map(status => {
                      const count = status === 'Total' ? allAgents.length : (agentKpiData[status] || 0);
                      const isActive = status === 'Total' ? statusFilter === '' : statusFilter === status;
                      const needsAttention = count >= 1 && status !== 'Total';

                      const getIcon = (s: string) => {
                        switch(s) {
                          case 'Total': return <Zap size={12} className="text-yellow-400" />;
                          case 'Requerido': return <Clock size={12} className="text-yellow-400" />;
                          case 'En Desarrollo': return <FileCode2 size={12} className="text-yellow-400" />;
                          case 'Pruebas': return <Bug size={12} className="text-yellow-400" />;
                          case 'Activo': return <Activity size={12} className="text-emerald-400" />;
                          default: return <Bot size={12} className="text-slate-400" />;
                        }
                      };

                      const ledColors: Record<string, {ping: string, base: string}> = {
                        'Requerido': { ping: 'bg-yellow-400', base: 'bg-yellow-500' },
                        'En Desarrollo': { ping: 'bg-yellow-400', base: 'bg-yellow-500' },
                        'Pruebas': { ping: 'bg-blue-400', base: 'bg-blue-500' },
                        'Activo': { ping: 'bg-emerald-400', base: 'bg-emerald-500' },
                        'Total': { ping: 'bg-slate-400', base: 'bg-slate-500' }
                      };
                      const colors = ledColors[status];

                      return (
                        <div
                          key={status}
                          onClick={() => setStatusFilter(status === "Total" ? "" : status)}
                          className={`flex flex-col gap-1 justify-center p-2 rounded-lg border bg-slate-950/30 shadow-sm hover:bg-slate-900/60 transition-colors group relative overflow-hidden cursor-pointer ${
                            isActive ? 'border-yellow-500/50 ring-1 ring-yellow-500/20 bg-slate-900/50' : 'border-slate-800/50'
                          }`}
                        >
                          {needsAttention && (
                            <div className="absolute inset-0 z-0 pointer-events-none mix-blend-overlay">
                              <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                            </div>
                          )}
                          {needsAttention ? (
                            <span className="absolute top-2 right-2 flex h-1.5 w-1.5 z-10">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors.ping} opacity-75`}></span>
                              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${colors.base}`}></span>
                            </span>
                          ) : (
                            <span className="absolute top-2 right-2 flex h-1.5 w-1.5 z-10">
                              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${count === 0 ? 'bg-slate-600' : 'bg-slate-500'}`}></span>
                            </span>
                          )}
                          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity w-full pr-3 relative z-10">
                            {getIcon(status)}
                            <span className="text-[8px] text-slate-400 font-medium uppercase tracking-widest truncate" title={status}>
                              {agentStatusesLabels[status] || status}
                            </span>
                          </div>
                          <span className="text-lg font-medium text-slate-100 relative z-10">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto relative min-h-0 custom-scrollbar">
              {/* Desktop Table View */}
              <table className="w-full text-left hidden md:table">
                <thead className="bg-slate-950/80 sticky top-0 z-20 backdrop-blur-md">
                  <tr>
                    <th className="px-2 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center w-10">#</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Agente</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Razón Social</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">País</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Responsable</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Tel. Responsable</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Estado</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">WhatsApp</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Notas</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Horas Transcurridas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {isTableLoading ? (
                    <tr>
                      <td colSpan={10} className="py-8">
                        <TableLoader />
                      </td>
                    </tr>
                  ) : currentAgents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 text-sm font-medium">
                        No hay agentes CapiBee registrados.
                      </td>
                    </tr>
                  ) : (
                    currentAgents.map((ag, index) => (
                      <tr key={ag.id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-2 py-4 text-center font-mono text-[10px] text-slate-500 select-none w-10">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                              <Bot size={16} className="text-blue-400" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-200 text-sm">{ag.name}</p>
                              <p className="text-[11px] text-slate-500">{ag.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-300 text-sm">{ag.businessName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-400 text-sm">
                            {ag.country}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300 text-sm">
                          {ag.responsibleName || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {ag.responsiblePhone || '-'}
                        </td>
                        <td className="px-6 py-4 relative">
                          {editingAgentId === ag.id ? (
                            <div className="flex items-center gap-1">
                              <select 
                                value={editingStatus}
                                onChange={(e) => setEditingStatus(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') setPendingStatusChange({businessId: ag.businessId, agentId: ag.id, newStatus: editingStatus}); }}
                                className="px-1 py-0.5 bg-slate-800 rounded text-slate-100 text-[10px] w-28 focus:outline-none"
                              >
                                <option value="Requerido">Requerido</option>
                                <option value="En Desarrollo">En Desarrollo</option>
                                <option value="Pruebas">Pruebas</option>
                                <option value="Activo">Activo</option>
                              </select>
                              <button onClick={(e) => { e.preventDefault(); setPendingStatusChange({businessId: ag.businessId, agentId: ag.id, newStatus: editingStatus}); }}><Check size={12} className="text-amber-400"/></button>
                              <button onClick={(e) => { e.preventDefault(); setEditingAgentId(null); }}><X size={12} className="text-red-400"/></button>
                            </div>
                          ) : (
                            <span 
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${permissions.edit ? 'cursor-pointer hover:bg-slate-800' : 'cursor-default'} ${
                                ag.status === 'Activo' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                ag.status === 'Pruebas' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                ag.status === 'En Desarrollo' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                'bg-slate-500/10 text-slate-400 border-slate-500/20'
                              }`}
                              onClick={() => { if (permissions.edit) { setEditingAgentId(ag.id); setEditingStatus(ag.status); } }}
                            >
                              {ag.status === 'Activo' && (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                              )}
                              {ag.status === 'Pruebas' && (
                                 <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                              )}
                              {ag.status === 'En Desarrollo' && (
                                 <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                              )}
                              {ag.status === 'Requerido' && (
                                 <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                              )}
                              {ag.status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm font-mono">
                          {ag.contactInfo}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] text-slate-400 truncate max-w-[120px]" title={ag.notes?.[0]?.text}>
                              {ag.notes?.[0]?.text || '-'}
                            </p>
                            <button 
                              onClick={() => { if (permissions.edit) { setNoteModalData({ businessId: ag.businessId, agentId: ag.id }); setNewNote(''); } }}
                              disabled={!permissions.edit}
                              className={`p-1 flex items-center gap-1.5 rounded transition-colors ${!permissions.edit ? 'text-slate-600 cursor-not-allowed' : 'hover:bg-slate-700 text-blue-400'}`}
                            >
                              <Pencil size={12} />
                              {ag.notes && ag.notes.length > 0 && (
                                <span className="text-[9px] font-black opacity-80">{ag.notes.length}</span>
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-mono text-slate-500 text-xs font-semibold">
                             <ElapsedTimer createdAt={ag.createdAt || Date.now()} />
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden p-4 space-y-4">
                {isTableLoading ? (
                  <TableLoader />
                ) : currentAgents.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm font-medium bg-slate-950/20 rounded-xl border border-dashed border-slate-800">
                    No hay agentes CapiBee registrados.
                  </div>
                ) : (
                  currentAgents.map(ag => (
                    <div key={ag.id} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-4 relative overflow-hidden">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                            <Bot size={18} className="text-blue-400" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-200 text-sm">{ag.name}</p>
                            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{ag.role}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                              onClick={() => handleOpenDetails(ag.businessId, ag.id)}
                              className="p-2 text-slate-500 hover:text-blue-400 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
                          >
                              <Eye size={16}/>
                          </button>
                          <button 
                            onClick={() => { if (permissions.delete) handleOpenDeleteConfirm(ag.businessId, ag.id); }}
                            disabled={!permissions.delete}
                            className={`p-2 rounded-lg transition-colors border ${!permissions.delete ? 'bg-slate-900 border-slate-800 text-slate-700 cursor-not-allowed' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-red-400'}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/50">
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Empresa</p>
                          <p className="text-xs text-slate-300 font-medium truncate">{ag.businessName}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ubicación</p>
                          <p className="text-xs text-slate-300 font-medium truncate">{ag.country}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Estado</p>
                          {editingAgentId === ag.id ? (
                            <div className="flex items-center gap-1">
                              <select 
                                value={editingStatus}
                                onChange={(e) => setEditingStatus(e.target.value)}
                                className="px-1 py-0.5 bg-slate-800 rounded text-slate-100 text-[10px] w-24 focus:outline-none"
                              >
                                <option value="Requerido">Requerido</option>
                                <option value="En Desarrollo">En Desarrollo</option>
                                <option value="Pruebas">Pruebas</option>
                                <option value="Activo">Activo</option>
                              </select>
                              <button onClick={(e) => { e.preventDefault(); setPendingStatusChange({businessId: ag.businessId, agentId: ag.id, newStatus: editingStatus}); }}><Check size={12} className="text-amber-400"/></button>
                              <button onClick={(e) => { e.preventDefault(); setEditingAgentId(null); }}><X size={12} className="text-red-400"/></button>
                            </div>
                          ) : (
                            <span 
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-transparent transition-colors text-[10px] font-black uppercase tracking-wider ${permissions.edit ? 'cursor-pointer hover:border-slate-700' : 'cursor-default'} ${
                                ag.status === 'Activo' ? 'text-emerald-400 border-emerald-900/30 bg-emerald-950/20' :
                                ag.status === 'Pruebas' ? 'text-blue-400 border-blue-900/30 bg-blue-950/20' :
                                (ag.status === 'En Desarrollo' || ag.status === 'Requerido') ? 'text-amber-400 border-amber-900/30 bg-amber-950/20' :
                                'text-slate-500 border-slate-800 bg-slate-900/30'
                              }`}
                              onClick={() => { if (permissions.edit) { setEditingAgentId(ag.id); setEditingStatus(ag.status); } }}
                            >
                              <span className="flex h-1.5 w-1.5 relative">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                  ag.status === 'Activo' ? 'bg-emerald-400' :
                                  ag.status === 'Pruebas' ? 'bg-blue-400' :
                                  (ag.status === 'En Desarrollo' || ag.status === 'Requerido') ? 'bg-amber-400' :
                                  'bg-slate-400'
                                }`}></span>
                                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                                  ag.status === 'Activo' ? 'bg-emerald-500' :
                                  ag.status === 'Pruebas' ? 'bg-blue-500' :
                                  (ag.status === 'En Desarrollo' || ag.status === 'Requerido') ? 'bg-amber-500' :
                                  'bg-slate-500'
                                }`}></span>
                              </span>
                              {ag.status}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Horas Transcurridas</p>
                          <p className="text-xs text-slate-500 font-medium truncate font-mono">
                             <ElapsedTimer createdAt={ag.createdAt || Date.now()} />
                          </p>
                        </div>
                        <div className="col-span-2 pt-2">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Notas</p>
                          <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                            <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                              {ag.notes?.[0]?.text || 'Sin notas'}
                            </p>
                            <button 
                              onClick={() => { if (permissions.edit) { setNoteModalData({ businessId: ag.businessId, agentId: ag.id }); setNewNote(''); } }}
                              disabled={!permissions.edit}
                              className={`p-1.5 flex items-center gap-1.5 rounded transition-colors ${!permissions.edit ? 'text-slate-600 cursor-not-allowed' : 'text-blue-400 hover:bg-slate-800'}`}
                            >
                              <Pencil size={12} />
                              {ag.notes && ag.notes.length > 0 && (
                                <span className="text-[9px] font-black opacity-80">{ag.notes.length}</span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/20">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">WhatsApp: {ag.contactInfo}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-amber-500/10 flex justify-center gap-2 items-center">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-slate-400 text-xs">Página {currentPage} de {totalPages}</span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            )}
          </motion.div>
        </section>
      </main>

      {/* modal creation */}
      <AnimatePresence>
        {isModalOpen && mounted && (
          <motion.div
            key="agent-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border-x-0 sm:border-2 border-blue-500/20 shadow-2xl rounded-none sm:rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col min-h-full sm:min-h-0 sm:max-h-[85vh] relative"
            >
              <div className="px-6 py-5 border-b border-blue-500/10 flex justify-between items-center bg-slate-950/80 shrink-0 sticky top-0 z-10">
                <h2 className="text-lg font-display font-black text-white flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-500/20 flex items-center justify-center rounded-xl shadow-inner border border-blue-500/30">
                    <Bot size={18} className="text-blue-400 sm:w-[20px] sm:h-[20px]" />
                  </div>
                  <span className="truncate">Crear Agente CapiBee</span>
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-900">
                <form id="agentForm" onSubmit={handleCreateAgent} className="space-y-6 pb-20 sm:pb-0">
                  {/* Select Establecimiento */}
                  <div className="grid grid-cols-1 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Building2 size={14} className="text-amber-500" />
                        Establecimiento
                      </label>
                      <select
                        required
                        value={selectedBusinessId}
                        onChange={(e) => setSelectedBusinessId(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 appearance-none font-medium text-sm"
                      >
                        <option value="" disabled>Seleccionar establecimiento...</option>
                        {businesses.filter(b => b.isEstablishment).map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Auto-filled details */}
                  {selectedBusiness && (
                    <div className="grid grid-cols-1 gap-4 bg-slate-950/40 p-4 rounded-xl border border-amber-500/10">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                            <UserCircle size={16} className="text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Responsable</p>
                            <p className="text-slate-200 font-medium text-sm">{selectedBusiness.responsibleName || ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                            <Phone size={14} className="text-amber-500" />
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Contacto</p>
                            <p className="text-amber-400 font-medium text-sm">{selectedBusiness.phone || selectedBusiness.whatsapp || 'Sin número'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Agent Config */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-400">Nombre del Agente</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                        value={agentForm.name}
                        onChange={e => setAgentForm({...agentForm, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-400">WhatsApp del Agente</label>
                      <input 
                        required
                        type="tel" 
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                        placeholder="+57..."
                        value={agentForm.contactInfo}
                        onChange={e => setAgentForm({...agentForm, contactInfo: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400">Canal</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                      value={agentForm.channel}
                      onChange={e => setAgentForm({...agentForm, channel: e.target.value as 'WhatsApp' | 'Telegram'})}
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Telegram">Telegram</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400">Tipo de Agente</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                      value={agentForm.type}
                      onChange={e => setAgentForm({...agentForm, type: e.target.value})}
                    >
                      <option value="Ventas">Ventas</option>
                      <option value="Servicio al cliente">Servicio al cliente</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Personalizado">Personalizado</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400">Instrucciones / Personalidad AI</label>
                    <textarea 
                      required
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm min-h-[120px] resize-none"
                      placeholder="Describe cómo debe actuar el agente..."
                      value={agentForm.prompt}
                      onChange={e => setAgentForm({...agentForm, prompt: e.target.value})}
                    ></textarea>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400">Reglas</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm min-h-[80px] resize-none"
                      placeholder="Define reglas de comportamiento..."
                    ></textarea>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400">Idioma</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                    >
                      <option value="Todos">Todos</option>
                      <option value="es">Español</option>
                      <option value="en">Inglés</option>
                      <option value="fr">Francés</option>
                      <option value="pt">Portugués</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400">Entrenamiento</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm min-h-[80px] resize-none"
                      placeholder="Describe entrenamiento..."
                    ></textarea>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 font-display">Notas Internas</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm min-h-[80px] resize-none"
                      placeholder="Notas sobre el agente..."
                      value={agentForm.notes}
                      onChange={e => setAgentForm({...agentForm, notes: e.target.value})}
                    ></textarea>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400">Memoria Multimedia</label>
                    <div className="flex gap-2">
                        <input 
                          type="text" 
                          className="flex-1 px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                          placeholder="URL..."
                        />
                        <input type="file" id="fileUpload" className="hidden" />
                        <button 
                          type="button" 
                          onClick={() => document.getElementById('fileUpload')?.click()}
                          className="px-4 py-3 bg-slate-800 text-white rounded-xl text-sm font-bold"
                        >
                          Adjuntar
                        </button>
                    </div>
                  </div>
                </form>
              </div>

              <div className="px-6 py-4 bg-slate-900 border-t border-blue-500/10 flex flex-col sm:flex-row justify-end gap-3 shrink-0 sticky bottom-0 sm:static">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider order-2 sm:order-1"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  form="agentForm"
                  className="w-full sm:w-auto px-8 py-3 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all active:scale-95 shadow-lg shadow-blue-500/20 uppercase tracking-wider order-1 sm:order-2"
                >
                  Inicializar Agente
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        
        {agentToView && (
          <motion.div
            key="details-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg font-bold text-white">Detalles del Agente</h3>
                 <button onClick={() => setAgentToView(null)}><X size={20} className="text-slate-400 hover:text-white" /></button>
              </div>
              <div className="space-y-4">
                  <p><span className="text-slate-500 font-bold uppercase text-[10px] block">Nombre</span> <span className="text-white font-medium">{agentToView.name}</span></p>
                  <p><span className="text-slate-500 font-bold uppercase text-[10px] block">Rol</span> <span className="text-white font-medium">{agentToView.role}</span></p>
                  <p><span className="text-slate-500 font-bold uppercase text-[10px] block">Empresa</span> <span className="text-white font-medium">{agentToView.businessName}</span></p>
                  <p><span className="text-slate-500 font-bold uppercase text-[10px] block">País</span> <span className="text-white font-medium">{agentToView.country}</span></p>
                  <p><span className="text-slate-500 font-bold uppercase text-[10px] block">Canal</span> <span className="text-white font-medium">{agentToView.channel}</span></p>
                  <p><span className="text-slate-500 font-bold uppercase text-[10px] block">Entrenamiento</span> <div className="bg-slate-950 p-3 rounded-lg text-slate-300 text-sm mt-1">{agentToView.training || 'No definido'}</div></p>
                  <p><span className="text-slate-500 font-bold uppercase text-[10px] block">Memoria Multimedia</span> <div className="bg-slate-950 p-3 rounded-lg text-slate-300 text-sm mt-1">{(agentToView.memoryFiles || []).map(f => <div key={f.url}>{f.name}</div>)}</div></p>
                  <p><span className="text-slate-500 font-bold uppercase text-[10px] block">Reglas</span> <div className="bg-slate-950 p-3 rounded-lg text-slate-300 text-sm mt-1">{agentToView.rules || 'No definido'}</div></p>
                  <p><span className="text-slate-500 font-bold uppercase text-[10px] block">Idioma</span> <span className="text-white font-medium">{agentToView.language || 'Todos'}</span></p>
                  <p><span className="text-slate-500 font-bold uppercase text-[10px] block font-display">Notas Internas</span> 
                    <div className="bg-slate-950 p-3 rounded-lg text-slate-300 text-sm mt-1 max-h-[200px] overflow-y-auto space-y-3 custom-scrollbar">
                      {agentToView.notes && agentToView.notes.length > 0 ? (
                        agentToView.notes.map((note, idx) => (
                          <div key={idx} className="border-b border-slate-800 last:border-0 pb-2 last:pb-0 relative group">
                            <div className="flex flex-col gap-0.5 mb-1">
                              <p className="text-[10px] text-slate-500 font-mono">
                                {new Date(note.date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {note.authorName && (
                                <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                  <UserCircle size={10} className="opacity-70" />
                                  {note.authorName}
                                </p>
                              )}
                            </div>
                            <p className="text-xs leading-relaxed text-slate-200">{note.text}</p>
                          </div>
                        ))
                      ) : (
                        'Sin notas'
                      )}
                    </div>
                  </p>
                  <p><span className="text-slate-500 font-bold uppercase text-[10px] block">Prompt Inicial</span> <div className="bg-slate-950 p-3 rounded-lg text-slate-300 text-sm mt-1">{agentToView.prompt}</div></p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {noteModalData && (
          <motion.div
            key="note-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-full max-w-md p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Pencil size={18} className="text-blue-400" />
                  Añadir Nota
                </h3>
                <button onClick={() => setNoteModalData(null)}><X size={20} className="text-slate-400 hover:text-white" /></button>
              </div>

              <div className="space-y-4">
                {noteModalData && (
                  <div className="max-h-[120px] overflow-y-auto space-y-2 mb-2 custom-scrollbar pr-1">
                    {businesses.find(b => b.id === noteModalData.businessId)
                      ?.agents.find(a => a.id === noteModalData.agentId)
                      ?.notes?.map((note, idx) => (
                        <div key={idx} className="bg-slate-950/50 p-2 rounded-lg border border-slate-800 flex justify-between items-start group">
                          <div>
                            <div className="flex flex-col gap-0.5 mb-0.5">
                              <p className="text-[9px] text-slate-500 font-mono">
                                {new Date(note.date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {note.authorName && (
                                <p className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                                  <UserCircle size={8} className="opacity-70" />
                                  {note.authorName}
                                </p>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">{note.text}</p>
                          </div>
                          <button 
                            className={`p-1 transition-all ${permissions.delete ? 'text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100' : 'text-slate-700 opacity-50 cursor-not-allowed'}`}
                            onClick={() => { if (permissions.delete) setNoteToDelete({ businessId: noteModalData.businessId, agentId: noteModalData.agentId, noteDate: note.date }); }}
                            disabled={!permissions.delete}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                    ))}
                  </div>
                )}

                <textarea
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm min-h-[120px] resize-none"
                  placeholder="Escribe la nota aquí... (Enter para guardar, Shift+Enter para nueva línea)"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveNote();
                    }
                  }}
                ></textarea>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setNoteModalData(null)}
                    className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                  >
                    Guardar Nota
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        
        {noteToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-xs w-full text-center shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-white font-bold mb-2">¿Eliminar nota?</h3>
              <p className="text-slate-400 text-xs mb-6 leading-relaxed">Esta acción borrará permanentemente la nota del historial.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setNoteToDelete(null)}
                  className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (noteToDelete) {
                      handleDeleteNote(noteToDelete.businessId, noteToDelete.agentId, noteToDelete.noteDate);
                      setNoteToDelete(null);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500 shadow-lg shadow-red-500/20 transition-all"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {pendingStatusChange && (
          <motion.div
            key="status-confirm-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-full max-w-sm p-6"
            >
              <h3 className="text-lg font-bold text-white mb-2">Cambiar Estado</h3>
              <p className="text-slate-400 text-sm mb-6">¿Estás seguro de que deseas cambiar el estado a <span className="text-amber-400 font-bold">{pendingStatusChange.newStatus}</span>?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingStatusChange(null)}
                  className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmStatusChange}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-amber-500"
                >
                  Cambiar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {agentToDelete && (
          <motion.div
            key="delete-confirm-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-full max-w-sm p-6"
            >
              <h3 className="text-lg font-bold text-white mb-2">Eliminar Agente</h3>
              <p className="text-slate-400 text-sm mb-6">¿Estás seguro de que deseas eliminar este agente? Esta acción es irreversible.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setAgentToDelete(null)}
                  className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteAgent}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-500"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
