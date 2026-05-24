import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  X,
  FileText,
  Briefcase,
  Eye,
  ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Asunto, Propuesta, Business } from "../types";
import { supabase } from "../lib/supabase";
import { Pagination } from "./Pagination";
import { TableLoader } from "./TableLoader";

const MONTHS = [
  { value: "all", label: "Todos los meses" },
  { value: "0", label: "Enero" },
  { value: "1", label: "Febrero" },
  { value: "2", label: "Marzo" },
  { value: "3", label: "Abril" },
  { value: "4", label: "Mayo" },
  { value: "5", label: "Junio" },
  { value: "6", label: "Julio" },
  { value: "7", label: "Agosto" },
  { value: "8", label: "Septiembre" },
  { value: "9", label: "Octubre" },
  { value: "10", label: "Noviembre" },
  { value: "11", label: "Diciembre" }
];

const YEARS = [
  { value: "all", label: "Todos los años" },
  { value: "2024", label: "2024" },
  { value: "2025", label: "2025" },
  { value: "2026", label: "2026" },
  { value: "2027", label: "2027" }
];

interface PropuestasProps {
  onBack: () => void;
}

export default function Propuestas({ onBack }: PropuestasProps) {
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [asuntos, setAsuntos] = useState<Asunto[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [platformUsers, setPlatformUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPropuesta, setSelectedPropuesta] = useState<Propuesta | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("2026");

  const [selectedKpis, setSelectedKpis] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const toggleKpi = (kpi: string) => {
    setSelectedKpis(prev => {
      if (prev.includes(kpi)) return prev.filter(k => k !== kpi);
      return [...prev, kpi];
    });
    setCurrentPage(1);
  };

  const currentUser = useMemo(() => {
    return JSON.parse(localStorage.getItem("capibee_user") || "{}");
  }, []);

  const [formData, setFormData] = useState({
    asuntoId: "",
    propuestaTexto: "",
    honorarios: "",
    gastos: "",
  });
  const [isTableLoading, setIsTableLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("capibee_propuestas");
    if (saved) setPropuestas(JSON.parse(saved));
    
    const savedA = localStorage.getItem("capibee_asuntos");
    if (savedA) setAsuntos(JSON.parse(savedA));
    
    const savedB = localStorage.getItem("capibee_businesses");
    if (savedB) setBusinesses(JSON.parse(savedB));

    try {
      const savedUsers = localStorage.getItem("capibee_platform_users");
      if (savedUsers) setPlatformUsers(JSON.parse(savedUsers));
    } catch (_) {}

    fetchFreshData();
  }, []);

  const fetchFreshData = async () => {
    try {
      const { data: dbPropuestas } = await supabase.from('propuestas').select('*');
      if (dbPropuestas) {
          const mapped = dbPropuestas.map((p: any) => ({
              id: p.id,
              asuntoId: p.asunto_id,
              propuestaTexto: p.propuesta_texto,
              honorarios: p.honorarios,
              gastos: p.gastos,
              userId: p.user_id,
              createdAt: Number(p.created_at),
              status: p.status || 'Enviada'
          }));
          setPropuestas(mapped);
          localStorage.setItem("capibee_propuestas", JSON.stringify(mapped));
      }
      
      const { data: dbAsuntos } = await supabase.from('asuntos').select('id, nombre_asunto, business_id, fecha, created_at, user_id, contact_name, contact_phone');
      if (dbAsuntos) {
          const mappedA = dbAsuntos.map((a: any) => ({
              id: a.id,
              nombreAsunto: a.nombre_asunto,
              businessId: a.business_id,
              fecha: a.fecha || '',
              userId: a.user_id || '',
              datosAsunto: '',
              createdAt: Number(a.created_at) || 0,
              contactName: a.contact_name || '',
              contactPhone: a.contact_phone || ''
          }));
          setAsuntos(mappedA);
          localStorage.setItem("capibee_asuntos", JSON.stringify(mappedA));
      }

      const { data: dbBusinesses } = await supabase.from('businesses').select('id, name, contact_name');
      if (dbBusinesses) {
         const mappedB = dbBusinesses.map((b: any) => ({
             id: b.id,
             name: b.name,
             contactName: b.contact_name || ''
         }));
         setBusinesses(mappedB);
         localStorage.setItem("capibee_businesses", JSON.stringify(mappedB));
      }

      const { data: dbUsers } = await supabase.from('platform_users').select('id, full_name, email, role_name');
      if (dbUsers) {
        const seen = new Set();
        const uniqueUsers = dbUsers.filter((u: any) => {
          if (!u || !u.id) return false;
          if (seen.has(u.id)) return false;
          seen.add(u.id);
          return true;
        });
        setPlatformUsers(uniqueUsers);
        localStorage.setItem("capibee_platform_users", JSON.stringify(uniqueUsers));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTableLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asuntoId || !formData.propuestaTexto || !formData.honorarios) {
        alert("Por favor completa los campos principales (Asunto, Propuesta, Honorarios)");
        return;
    }
    
    const newPropuesta: Propuesta = {
      id: crypto.randomUUID(),
      asuntoId: formData.asuntoId,
      propuestaTexto: formData.propuestaTexto,
      honorarios: Number(formData.honorarios) || 0,
      gastos: Number(formData.gastos) || 0,
      userId: currentUser.id || "unknown",
      createdAt: Date.now(),
      status: 'Enviada',
    };

    try {
      const { error } = await supabase.from('propuestas').insert({
          id: newPropuesta.id,
          asunto_id: newPropuesta.asuntoId,
          propuesta_texto: newPropuesta.propuestaTexto,
          honorarios: newPropuesta.honorarios,
          gastos: newPropuesta.gastos,
          user_id: newPropuesta.userId,
          created_at: newPropuesta.createdAt,
          status: newPropuesta.status
      });

      if (error && error.code !== '42P01') { 
          // Ignore table not found if it's purely local mode for now
          console.error("Error creating Propuesta:", error);
      }
    } catch (err) {
      console.error(err);
    }

    const updated = [newPropuesta, ...propuestas];
    setPropuestas(updated);
    localStorage.setItem("capibee_propuestas", JSON.stringify(updated));
    setIsModalOpen(false);
    setFormData({ asuntoId: "", propuestaTexto: "", honorarios: "", gastos: "" });
  };

  const { kpis, filteredItems } = useMemo(() => {
    let pendientesEnvio = 0;
    let enviadas = 0;
    let aceptadas = 0;
    let rechazadas = 0;

    const items: Array<{
      id: string;
      isAsunto: boolean;
      asuntoId: string;
      createdAt: number;
      honorarios: number;
      gastos: number;
      status: string;
      userId: string;
    }> = [];

    const isAdmin = currentUser?.roleId === 'ADMIN_MAESTRO' || currentUser?.roleName?.toUpperCase() === 'SUPERADMIN' || currentUser?.roleId?.toUpperCase() === 'SUPERADMIN';

    // Filter asuntos (checking for missing propuestas to mark as pending)
    asuntos.forEach((a) => {
      if (!isAdmin && a.userId !== currentUser?.id) return;
      const d = a.fecha ? new Date(a.fecha) : (a.createdAt ? new Date(a.createdAt) : null);
      if (!d || isNaN(d.getTime())) return;
      
      const matchYear = selectedYear === "all" || String(d.getFullYear()) === selectedYear;
      const matchMonth = selectedMonth === "all" || String(d.getMonth()) === selectedMonth;

      const hasPropuesta = propuestas.some(p => p.asuntoId === a.id);

      if (matchYear && matchMonth) {
        if (!hasPropuesta) {
          pendientesEnvio++;
          items.push({
            id: a.id,
            isAsunto: true,
            asuntoId: a.id,
            createdAt: d.getTime(),
            honorarios: 0,
            gastos: 0,
            status: "Pendiente",
            userId: a.userId || ""
          });
        }
      }
    });

    // Filter propuestas based on month/year selected
    propuestas.forEach((p) => {
      if (!isAdmin && p.userId !== currentUser?.id) return;
      const d = new Date(p.createdAt);
      if (isNaN(d.getTime())) return;

      const matchYear = selectedYear === "all" || String(d.getFullYear()) === selectedYear;
      const matchMonth = selectedMonth === "all" || String(d.getMonth()) === selectedMonth;

      if (matchYear && matchMonth) {
        const status = p.status || "Enviada";
        if (status === "Enviada") {
          enviadas++;
        } else if (status === "Aceptada") {
          aceptadas++;
        } else if (status === "Cancelada" || status === "Rechazada") {
          rechazadas++;
        }
        
        items.push({
          id: p.id,
          isAsunto: false,
          asuntoId: p.asuntoId,
          createdAt: p.createdAt,
          honorarios: p.honorarios,
          gastos: p.gastos,
          status: status === "Cancelada" ? "Rechazada" : status,
          userId: p.userId || ""
        });
      } else if (selectedYear === "all" && selectedMonth === "all") {
        // If no filter matching date, just push it
        const status = p.status || "Enviada";
        items.push({
          id: p.id,
          isAsunto: false,
          asuntoId: p.asuntoId,
          createdAt: p.createdAt,
          honorarios: p.honorarios,
          gastos: p.gastos,
          status: status === "Cancelada" ? "Rechazada" : status,
          userId: p.userId || ""
        });
      }
    });

    const filtered = items.filter((item) => {
      const asunto = asuntos.find(a => a.id === item.asuntoId);
      const asuntoName = asunto ? asunto.nombreAsunto : "";
      const matchesSearch = asuntoName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const statusMatchKpi = item.status === "Pendiente" ? "pendientesEnvio" 
                           : item.status === "Enviada" ? "enviadas"
                           : item.status === "Aceptada" ? "aceptadas"
                           : "rechazadas";
                           
      const matchesKpi = selectedKpis.length === 0 || selectedKpis.includes(statusMatchKpi);

      return matchesSearch && matchesKpi;
    });

    return {
      kpis: { pendientesEnvio, enviadas, aceptadas, rechazadas },
      filteredItems: filtered
    };
  }, [asuntos, propuestas, selectedMonth, selectedYear, searchTerm, selectedKpis]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const currentItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="h-full bg-slate-950 p-6 flex flex-col overflow-hidden">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all">
          <ChevronLeft size={20} />
        </button>
        <div>
           <h1 className="text-3xl font-bold text-white tracking-tight">Propuestas Comerciales</h1>
           <p className="text-slate-400 mt-1">Crea y gestiona las propuestas para tus asuntos</p>
        </div>
        <div className="ml-auto">
           <button onClick={() => setIsModalOpen(true)} className="bg-yellow-400 hover:bg-yellow-500 text-slate-950 px-5 py-2.5 rounded-xl flex items-center gap-2 font-black transition-all shadow-lg shadow-yellow-500/20">
              <Plus size={20} /> Crear Propuesta
           </button>
        </div>
      </div>

      {/* Panel de KPIs Mensuales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div 
          onClick={() => toggleKpi("pendientesEnvio")}
          className={`p-4 rounded-xl transition-all flex flex-col justify-between relative overflow-hidden group cursor-pointer border ${selectedKpis.includes("pendientesEnvio") ? "bg-amber-500/10 border-amber-500/50" : "bg-slate-900/30 border-slate-900 hover:border-amber-500/20"}`}
        >
          <div className={`absolute top-0 left-0 right-0 h-0.5 transition-colors ${selectedKpis.includes("pendientesEnvio") ? "bg-amber-500" : "bg-amber-500/20 group-hover:bg-amber-500/50"}`} />
          <span className={`text-[10px] uppercase tracking-widest font-black leading-none ${selectedKpis.includes("pendientesEnvio") ? "text-amber-400" : "text-slate-500"}`}>Pendientes de Envío</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl text-amber-400 font-extrabold">{kpis.pendientesEnvio}</span>
            <span className="text-[10px] text-slate-500 font-medium font-mono">Asuntos</span>
          </div>
        </div>

        <div 
          onClick={() => toggleKpi("enviadas")}
          className={`p-4 rounded-xl transition-all flex flex-col justify-between relative overflow-hidden group cursor-pointer border ${selectedKpis.includes("enviadas") ? "bg-blue-500/10 border-blue-500/50" : "bg-slate-900/30 border-slate-900 hover:border-blue-500/20"}`}
        >
          <div className={`absolute top-0 left-0 right-0 h-0.5 transition-colors ${selectedKpis.includes("enviadas") ? "bg-blue-500" : "bg-blue-500/20 group-hover:bg-blue-500/50"}`} />
          <span className={`text-[10px] uppercase tracking-widest font-black leading-none ${selectedKpis.includes("enviadas") ? "text-blue-400" : "text-slate-500"}`}>Propuestas Enviadas</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl text-blue-400 font-extrabold">{kpis.enviadas}</span>
            <span className="text-[10px] text-slate-500 font-medium font-mono">Enviadas</span>
          </div>
        </div>

        <div 
          onClick={() => toggleKpi("aceptadas")}
          className={`p-4 rounded-xl transition-all flex flex-col justify-between relative overflow-hidden group cursor-pointer border ${selectedKpis.includes("aceptadas") ? "bg-emerald-500/10 border-emerald-500/50" : "bg-slate-900/30 border-slate-900 hover:border-emerald-500/20"}`}
        >
          <div className={`absolute top-0 left-0 right-0 h-0.5 transition-colors ${selectedKpis.includes("aceptadas") ? "bg-emerald-500" : "bg-emerald-500/20 group-hover:bg-emerald-500/50"}`} />
          <span className={`text-[10px] uppercase tracking-widest font-black leading-none ${selectedKpis.includes("aceptadas") ? "text-emerald-400" : "text-slate-500"}`}>Propuestas Aceptadas</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl text-emerald-400 font-extrabold">{kpis.aceptadas}</span>
            <span className="text-[10px] text-slate-500 font-medium font-mono">Aceptadas</span>
          </div>
        </div>

        <div 
          onClick={() => toggleKpi("rechazadas")}
          className={`p-4 rounded-xl transition-all flex flex-col justify-between relative overflow-hidden group cursor-pointer border ${selectedKpis.includes("rechazadas") ? "bg-rose-500/10 border-rose-500/50" : "bg-slate-900/30 border-slate-900 hover:border-rose-500/20"}`}
        >
          <div className={`absolute top-0 left-0 right-0 h-0.5 transition-colors ${selectedKpis.includes("rechazadas") ? "bg-rose-500" : "bg-rose-500/20 group-hover:bg-rose-500/50"}`} />
          <span className={`text-[10px] uppercase tracking-widest font-black leading-none ${selectedKpis.includes("rechazadas") ? "text-rose-400" : "text-slate-500"}`}>Propuestas Rechazadas</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl text-rose-400 font-extrabold">{kpis.rechazadas}</span>
            <span className="text-[10px] text-slate-500 font-medium font-mono">Rechazadas</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
        <div className="relative flex-grow w-full md:w-auto">
            <Search className="absolute left-3 top-3 text-slate-600" size={16}/>
            <input type="text" placeholder="Buscar por asunto..." className="bg-slate-900/30 border border-slate-800 rounded-xl p-3 pl-[38px] text-white w-full focus:ring-1 focus:ring-yellow-500/50 outline-none transition-all placeholder:text-slate-600 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
        </div>
        
        {/* Filtros de Mes y Año */}
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            className="bg-slate-900/10 hover:bg-slate-900/30 border border-slate-800 rounded-xl p-3 text-slate-300 outline-none focus:ring-1 focus:ring-yellow-500/50 text-sm cursor-pointer min-w-[150px] transition-all"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {MONTHS.map(m => (
              <option key={m.value} value={m.value} className="bg-slate-950 text-slate-300">{m.label}</option>
            ))}
          </select>

          <select 
            className="bg-slate-900/10 hover:bg-slate-900/30 border border-slate-800 rounded-xl p-3 text-slate-300 outline-none focus:ring-1 focus:ring-yellow-500/50 text-sm cursor-pointer min-w-[120px] transition-all"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {YEARS.map(y => (
              <option key={y.value} value={y.value} className="bg-slate-950 text-slate-300">{y.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar bg-slate-900/30 border border-slate-800 rounded-2xl relative">
          <table className="w-full text-left">
            <thead className="text-slate-500 text-[10px] uppercase tracking-widest sticky top-0 bg-slate-950 z-10">
                <tr>
                    <th className="p-4 font-bold text-center w-10">#</th>
                    <th className="p-4 font-bold">Fecha</th>
                    <th className="p-4 font-bold">Asunto</th>
                    <th className="p-4 font-bold">Asignado a</th>
                    <th className="p-4 font-bold">Nombre del contacto</th>
                    <th className="p-4 font-bold">Estado</th>
                    <th className="p-4 font-bold text-right">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
                {isTableLoading ? (
                    <tr>
                      <td colSpan={10} className="py-8">
                        <TableLoader />
                      </td>
                    </tr>
                ) : currentItems.length > 0 ? (
                    currentItems.map((p, index) => {
                        const asunto = asuntos.find(a => a.id === p.asuntoId);
                        const asignadoId = asunto ? asunto.userId : p.userId;
                        const asignadoName = platformUsers.find(u => u.id === asignadoId)?.full_name || asignadoId || "Desconocido";
                        const contactName = asunto ? (asunto.contactName || businesses.find(b => b.id === asunto.businessId)?.contactName || "—") : "—";
                        return (
                        <tr key={p.id} className="hover:bg-slate-900/20 transition-colors">
                            <td className="p-4 text-center font-mono text-[10px] text-slate-500 select-none w-10">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                            <td className="p-4 text-sm text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                            <td className="p-4 text-sm font-medium text-white">{asunto?.nombreAsunto || "Asunto Desconocido"}</td>
                            <td className="p-4 text-sm text-slate-300">{asignadoName}</td>
                            <td className="p-4 text-sm text-slate-300">{contactName}</td>
                            <td className="p-4 text-sm">
                              {p.isAsunto ? (
                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                                  Pendiente Envío
                                </span>
                              ) : (
                                <select
                                  value={p.status || 'Enviada'}
                                  onChange={async (e) => {
                                    const newStatus = e.target.value as 'Enviada' | 'Aceptada' | 'Cancelada';
                                    const updated = propuestas.map(item => item.id === p.id ? { ...item, status: newStatus } : item);
                                    setPropuestas(updated);
                                    localStorage.setItem("capibee_propuestas", JSON.stringify(updated));
                                    try {
                                      await supabase.from('propuestas').update({ status: newStatus }).eq('id', p.id);
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className={`text-[11px] font-bold rounded-lg px-2 py-1 outline-none border transition-colors bg-slate-950 cursor-pointer ${
                                    (p.status || 'Enviada') === 'Aceptada' 
                                      ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' 
                                      : ((p.status || 'Enviada') === 'Cancelada' || (p.status || 'Enviada') === 'Rechazada')
                                        ? 'border-rose-500/30 text-rose-400 bg-rose-500/10'
                                        : 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                                  }`}
                                >
                                  <option value="Enviada" className="bg-slate-900 text-blue-400 font-bold">Enviada</option>
                                  <option value="Aceptada" className="bg-slate-900 text-emerald-400 font-bold">Aceptada</option>
                                  <option value="Cancelada" className="bg-slate-900 text-rose-400 font-bold">Cancelada</option>
                                </select>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2 text-right">
                                {p.isAsunto ? (
                                  <button 
                                    onClick={() => {
                                      setFormData({...formData, asuntoId: p.asuntoId});
                                      setIsModalOpen(true);
                                    }}
                                    className="px-2.5 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold text-xs rounded-lg transition-colors whitespace-nowrap"
                                  >
                                    Crear Propuesta
                                  </button>
                                ) : (
                                  <button 
                                      onClick={() => {
                                        const relatedPropuesta = propuestas.find(pr => pr.id === p.id);
                                        if (relatedPropuesta) {
                                          setSelectedPropuesta(relatedPropuesta);
                                          setIsViewModalOpen(true);
                                        }
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                                      title="Ver detalle"
                                  >
                                      <Eye size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                        </tr>
                        )
                    })
                ) : (
                    <tr>
                         <td colSpan={7} className="p-10 text-center text-slate-500">No se encontraron propuestas.</td>
                    </tr>
                )}
            </tbody>
          </table>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      <AnimatePresence>
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900 p-6 rounded-2xl w-full max-w-lg border border-slate-800 shadow-2xl"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">Nueva Propuesta</h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                           <label className="block text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Seleccione el Asunto</label>
                           <select 
                             className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:ring-1 focus:ring-yellow-500/50 appearance-none"
                             value={formData.asuntoId}
                             onChange={e => setFormData({...formData, asuntoId: e.target.value})}
                           >
                             <option value="" disabled>Seleccionar asunto...</option>
                             {asuntos.map(a => (
                               <option key={a.id} value={a.id}>{a.nombreAsunto}</option>
                             ))}
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Campo de Propuesta</label>
                           <textarea 
                             className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:ring-1 focus:ring-yellow-500/50 min-h-[120px]" 
                             placeholder="Descripción detallada de la propuesta comercial..." 
                             value={formData.propuestaTexto}
                             onChange={e => setFormData({...formData, propuestaTexto: e.target.value})} 
                           />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Honorarios</label>
                              <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-500">$</span>
                                <input 
                                  type="number" 
                                  className="w-full bg-slate-950 border border-slate-800 p-3 pl-8 rounded-xl text-emerald-400 font-bold outline-none focus:ring-1 focus:ring-yellow-500/50" 
                                  placeholder="0.00"
                                  value={formData.honorarios}
                                  onChange={e => setFormData({...formData, honorarios: e.target.value})}
                                />
                              </div>
                           </div>
                           <div>
                              <label className="block text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Gastos</label>
                              <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-500">$</span>
                                <input 
                                  type="number" 
                                  className="w-full bg-slate-950 border border-slate-800 p-3 pl-8 rounded-xl text-rose-400 font-bold outline-none focus:ring-1 focus:ring-yellow-500/50" 
                                  placeholder="0.00"
                                  value={formData.gastos}
                                  onChange={e => setFormData({...formData, gastos: e.target.value})}
                                />
                              </div>
                           </div>
                        </div>
                        <button type="submit" className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black p-3 rounded-xl transition-all mt-4">Guardar Propuesta</button>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isViewModalOpen && selectedPropuesta && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900 p-6 rounded-2xl w-full max-w-lg border border-slate-800 shadow-2xl"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-display font-black text-white">Detalle de Propuesta</h2>
                        <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
                    </div>
                    
                    <div className="space-y-6">
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Asunto</p>
                              <p className="text-sm text-white font-medium">{asuntos.find(a => a.id === selectedPropuesta.asuntoId)?.nombreAsunto || "Desconocido"}</p>
                           </div>
                           <div>
                              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Fecha</p>
                              <p className="text-sm text-white font-medium">{new Date(selectedPropuesta.createdAt).toLocaleDateString()}</p>
                           </div>
                           <div>
                              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Cliente</p>
                              <p className="text-sm text-slate-300 font-semibold mb-2">
                                {(() => {
                                   const asunto = asuntos.find(a => a.id === selectedPropuesta.asuntoId);
                                   return asunto ? (businesses.find(b => b.id === asunto.businessId)?.name || 'Desconocido') : 'Desconocido';
                                })()}
                              </p>
                              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Contacto</p>
                              <p className="text-sm text-slate-300 font-semibold mb-2">
                                {(() => {
                                   const asunto = asuntos.find(a => a.id === selectedPropuesta.asuntoId);
                                   return asunto ? (asunto.contactName || businesses.find(b => b.id === asunto.businessId)?.contactName || '—') : '—';
                                })()}
                              </p>
                              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Asignado a</p>
                              <p className="text-sm text-slate-300 font-semibold mb-4 pb-2 border-b border-slate-800/40">
                                {(() => {
                                   const asunto = asuntos.find(a => a.id === selectedPropuesta.asuntoId);
                                   const asignadoId = asunto ? asunto.userId : selectedPropuesta.userId;
                                   return platformUsers.find(u => u.id === asignadoId)?.full_name || asignadoId || 'Desconocido';
                                })()}
                              </p>
                              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Honorarios</p>
                              <p className="text-sm text-emerald-400 font-medium">${selectedPropuesta.honorarios.toLocaleString()}</p>
                           </div>
                           <div>
                              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Gastos</p>
                              <p className="text-sm text-rose-400 font-medium">${selectedPropuesta.gastos.toLocaleString()}</p>
                           </div>
                           <div>
                              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Estado</p>
                              <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg ${
                                (selectedPropuesta.status || 'Enviada') === 'Aceptada'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : (selectedPropuesta.status || 'Enviada') === 'Cancelada'
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                                {selectedPropuesta.status || 'Enviada'}
                              </span>
                           </div>
                       </div>

                       <div>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Propuesta</p>
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                             {selectedPropuesta.propuestaTexto || "Sin descripción proporcionada."}
                          </div>
                       </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}
