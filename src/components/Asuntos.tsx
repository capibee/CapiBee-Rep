/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  X,
  FileText,
  Eye,
  Paperclip,
  Upload,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Asunto, Business } from "../types";
import { supabase } from "../lib/supabase";
import { Pagination } from "./Pagination";
import { TableLoader } from "./TableLoader";

interface AsuntosProps {
  onBack: () => void;
}

export default function Asuntos({ onBack }: AsuntosProps) {
  const [asuntos, setAsuntos] = useState<Asunto[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [executiveFilter, setExecutiveFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [selectedKpis, setSelectedKpis] = useState<string[]>([]);
  const [platformUsers, setPlatformUsers] = useState<any[]>([]);
  const [propuestas, setPropuestas] = useState<any[]>([]);
  const [clientSearchText, setClientSearchText] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedAsunto, setSelectedAsunto] = useState<Asunto | null>(null);
  const [newNote, setNewNote] = useState("");
  const [isTableLoading, setIsTableLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const currentUser = useMemo(() => {
    return JSON.parse(localStorage.getItem("capibee_user") || "{}");
  }, []);
  const isAdmin = currentUser?.roleId === "ADMIN_MAESTRO";
  const isDesarrollo = useMemo(() => {
    const roleIdStr = String(currentUser?.roleId || "").toLowerCase();
    const roleNameStr = String(currentUser?.roleName || "").toLowerCase();
    return (
      roleIdStr.includes("desarrollo") || 
      roleIdStr.includes("developer") || 
      roleIdStr.includes("desa") ||
      roleNameStr.includes("desarrollo") || 
      roleNameStr.includes("developer") ||
      roleNameStr.includes("desa")
    );
  }, [currentUser]);
  const canViewAll = isAdmin || isDesarrollo;

  const propuestasPorEnviarCount = useMemo(() => {
    let count = 0;
    asuntos.forEach((a) => {
      if (!canViewAll && a.userId !== currentUser.id) return;
      
      const hasPropuesta = propuestas.some((p) => p.asuntoId === a.id);
      if (!hasPropuesta) {
        count++;
      }
    });
    return count;
  }, [asuntos, propuestas, canViewAll, currentUser.id]);

  const uniquePlatformUsers = useMemo(() => {
    const seen = new Set<string>();
    return platformUsers.filter((u) => {
      if (!u || !u.id) return false;
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, [platformUsers]);

  const [formData, setFormData] = useState({
    nombreAsunto: "",
    businessId: "",
    datosAsunto: "",
    archivoAdjuntoUrl: "",
    contactName: "",
    contactPhone: ""
  });
  const [asuntoFileName, setAsuntoFileName] = useState("");
  const [isAsuntoDragOver, setIsAsuntoDragOver] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("capibee_asuntos");
    if (saved) setAsuntos(JSON.parse(saved));
    const savedB = localStorage.getItem("capibee_businesses");
    if (savedB) setBusinesses(JSON.parse(savedB));
    const savedPropuestas = localStorage.getItem("capibee_propuestas");
    if (savedPropuestas) setPropuestas(JSON.parse(savedPropuestas));

    fetchFreshData();
  }, []);

  const fetchFreshData = async () => {
    try {
      const { data: dbAsuntos } = await supabase.from('asuntos').select('*');
      if (dbAsuntos) {
          const mapped = dbAsuntos.map((a: any) => ({
              id: a.id,
              fecha: a.fecha,
              nombreAsunto: a.nombre_asunto,
              businessId: a.business_id,
              userId: a.user_id,
              datosAsunto: a.datos_asunto,
              archivoAdjuntoUrl: a.archivo_adjunto_url,
              createdAt: Number(a.created_at),
              contactName: a.contact_name || "",
              contactPhone: a.contact_phone || ""
          }));
          setAsuntos(mapped);
          localStorage.setItem("capibee_asuntos", JSON.stringify(mapped));
      }
      const { data: dbPropuestas } = await supabase.from('propuestas').select('*');
      if (dbPropuestas) {
          const mappedP = dbPropuestas.map((p: any) => ({
              id: p.id,
              asuntoId: p.asunto_id,
              status: p.status || 'Enviada'
          }));
          setPropuestas(mappedP);
          localStorage.setItem("capibee_propuestas", JSON.stringify(mappedP));
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
      }
      
      const { data: dbBusinesses } = await supabase.from('businesses').select('id, name, contact_name, phone, whatsapp, responsible_name, responsible_phone');
      if (dbBusinesses) {
         const mappedB = dbBusinesses.map((b: any) => ({
             id: b.id,
             name: b.name,
             contactName: b.contact_name || '',
             phone: b.phone || b.whatsapp || ''
         }));
         setBusinesses(mappedB);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTableLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("capibee_user") || "{}");
    const newAsunto: Asunto = {
      id: crypto.randomUUID(),
      fecha: new Date().toISOString(),
      ...formData,
      userId: user.id || "unknown",
      createdAt: Date.now(),
    };

    const { error } = await supabase.from('asuntos').insert({
        id: newAsunto.id,
        fecha: newAsunto.fecha,
        nombre_asunto: newAsunto.nombreAsunto,
        business_id: newAsunto.businessId,
        user_id: newAsunto.userId,
        datos_asunto: newAsunto.datosAsunto,
        archivo_adjunto_url: newAsunto.archivoAdjuntoUrl,
        created_at: newAsunto.createdAt,
        contact_name: newAsunto.contactName || "",
        contact_phone: newAsunto.contactPhone || ""
    });

    if (error) {
        console.error("Error creating Asunto:", error);
        alert(`Error al crear asunto: ${error.message}`);
    } else {
        setAsuntos([newAsunto, ...asuntos]);
        localStorage.setItem("capibee_asuntos", JSON.stringify([newAsunto, ...asuntos]));
        setIsModalOpen(false);
        setFormData({ nombreAsunto: "", businessId: "", datosAsunto: "", archivoAdjuntoUrl: "", contactName: "", contactPhone: "" });
        setAsuntoFileName("");
    }
  };

  const handleAddNote = async () => {
    if (!selectedAsunto || !newNote.trim()) return;
    
    const userName = currentUser.fullName || currentUser.full_name || "Desconocido";
    const dateStr = new Date().toLocaleString();
    const updatedDatos = (selectedAsunto.datosAsunto ? selectedAsunto.datosAsunto + "\n\n" : "") + `--- Nota por ${userName} el ${dateStr} ---\n${newNote.trim()}`;
    
    const { error } = await supabase.from('asuntos').update({
        datos_asunto: updatedDatos
    }).eq('id', selectedAsunto.id);

    if (error) {
        alert(`Error al añadir nota: ${error.message}`);
    } else {
        const updatedAsunto = { ...selectedAsunto, datosAsunto: updatedDatos };
        const updatedAsuntos = asuntos.map(a => a.id === selectedAsunto.id ? updatedAsunto : a);
        setAsuntos(updatedAsuntos);
        setSelectedAsunto(updatedAsunto);
        localStorage.setItem("capibee_asuntos", JSON.stringify(updatedAsuntos));
        setNewNote("");
    }
  };

  const dateBounds = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    const currentFortnight = currentDay <= 15 ? 1 : 2;

    const currentDayOfWeek = now.getDay() || 7;
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - currentDayOfWeek + 1);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return {
      currentYear,
      currentMonth,
      currentDay,
      currentFortnight,
      startOfWeek,
      endOfWeek,
    };
  }, []);

  const fortnightRangeStr = useMemo(() => {
    const { currentYear, currentMonth, currentFortnight } = dateBounds;
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    return currentFortnight === 1 ? "1 al 15" : `16 al ${lastDay}`;
  }, [dateBounds]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    asuntos.forEach((a) => {
      if (a.fecha) {
        const y = new Date(a.fecha).getFullYear();
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    // Add current year just in case it's not present
    yearsSet.add(new Date().getFullYear());
    return Array.from(yearsSet).sort((a, b) => b - a); // descending order
  }, [asuntos]);

  const filteredAsuntos = useMemo(() => {
    return asuntos.filter((a) => {
      // Role logic:
      if (!canViewAll && a.userId !== currentUser.id) return false;
      if (canViewAll && executiveFilter !== "" && a.userId !== executiveFilter) return false;

      const businessName = businesses.find(b => b.id === a.businessId)?.name || "";
      const matchesSearch = a.nombreAsunto.toLowerCase().includes(searchTerm.toLowerCase()) || businessName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClient = clientFilter === "" || businessName === clientFilter;
      
      if (!matchesSearch || !matchesClient) return false;

      // Filter by Year
      if (yearFilter !== "") {
        const itemYear = new Date(a.fecha).getFullYear();
        if (itemYear !== Number(yearFilter)) return false;
      }

      // Filter by dynamic selected KPIs (one or several or all)
      if (selectedKpis.length > 0 && !selectedKpis.includes("totalPotenciales")) {
        const itemDate = new Date(a.fecha);
        const matchesAnyKpi = selectedKpis.some(kpiId => {
          if (kpiId === "semanal") {
            return itemDate >= dateBounds.startOfWeek && itemDate <= dateBounds.endOfWeek;
          }
          if (kpiId === "quincena") {
            return (
              itemDate.getFullYear() === dateBounds.currentYear &&
              itemDate.getMonth() === dateBounds.currentMonth &&
              (itemDate.getDate() <= 15 ? 1 : 2) === dateBounds.currentFortnight
            );
          }
          if (kpiId === "mes") {
            return (
              itemDate.getFullYear() === dateBounds.currentYear &&
              itemDate.getMonth() === dateBounds.currentMonth
            );
          }
          if (kpiId === "ytd") {
            const targetYTDYear = yearFilter ? Number(yearFilter) : dateBounds.currentYear;
            return itemDate.getFullYear() === targetYTDYear;
          }
          return false;
        });

        if (!matchesAnyKpi) return false;
      }

      return true;
    });
  }, [asuntos, businesses, searchTerm, clientFilter, executiveFilter, canViewAll, currentUser.id, yearFilter, selectedKpis, dateBounds]);

  const toggleKpi = (kpiId: string) => {
    setCurrentPage(1);
    if (kpiId === "totalPotenciales") {
      setSelectedKpis([]);
      return;
    }
    setSelectedKpis((prev) => {
      const filtered = prev.filter(id => id !== "totalPotenciales");
      if (filtered.includes(kpiId)) {
        return filtered.filter(id => id !== kpiId);
      } else {
        return [...filtered, kpiId];
      }
    });
  };

  const kpis = useMemo(() => {
    const { currentYear, currentMonth, currentFortnight, startOfWeek, endOfWeek } = dateBounds;

    let totalYTD = 0;
    let totalMonth = 0;
    let totalFortnight = 0;
    let totalWeek = 0;

    // Filter asuntos list based on rule (Superadmin/Desarrollo views all or executive, commercial views only their own)
    const listForKpis = asuntos.filter(a => {
      if (!canViewAll && a.userId !== currentUser.id) return false;
      if (canViewAll && executiveFilter !== "" && a.userId !== executiveFilter) return false;
      
      // Filter KPIs by selected year if it's set
      if (yearFilter !== "") {
        const itemYear = new Date(a.fecha).getFullYear();
        if (itemYear !== Number(yearFilter)) return false;
      }
      return true;
    });

    listForKpis.forEach(a => {
      const date = new Date(a.fecha);
      const targetYTDYear = yearFilter ? Number(yearFilter) : currentYear;
      if (date.getFullYear() === targetYTDYear) totalYTD++;
      if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
        totalMonth++;
        const day = date.getDate();
        const fortnight = day <= 15 ? 1 : 2;
        if (fortnight === currentFortnight) totalFortnight++;
      }
      if (date >= startOfWeek && date <= endOfWeek) {
        totalWeek++;
      }
    });

    return { totalYTD, totalMonth, totalFortnight, totalWeek, totalPotenciales: listForKpis.length };
  }, [asuntos, canViewAll, currentUser.id, executiveFilter, yearFilter, dateBounds]);

  const totalPages = Math.ceil(filteredAsuntos.length / itemsPerPage);
  const currentItems = useMemo(() => {
    return filteredAsuntos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredAsuntos, currentPage, itemsPerPage]);

  return (
    <div className="h-full bg-slate-950 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Asuntos Potenciales</h1>
            <p className="text-slate-400 mt-1">Gestiona tus asuntos y oportunidades de negocio.</p>
        </div>
        <button onClick={() => {
            setFormData({ nombreAsunto: "", businessId: "", datosAsunto: "", archivoAdjuntoUrl: "", contactName: "", contactPhone: "" });
            setAsuntoFileName("");
            setIsAsuntoDragOver(false);
            setIsModalOpen(true);
        }} className="bg-yellow-400 hover:bg-yellow-500 text-slate-950 px-5 py-2.5 rounded-xl flex items-center gap-2 font-black transition-all shadow-lg shadow-yellow-500/20">
            <Plus size={20} /> Crear Asunto
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <button 
            type="button"
            onClick={() => toggleKpi("totalPotenciales")}
            className={`p-4 rounded-xl text-left transition-all duration-200 border cursor-pointer select-none relative overflow-hidden group ${
              selectedKpis.length === 0 || selectedKpis.includes("totalPotenciales")
                ? "bg-yellow-400/10 border-yellow-400/60 shadow-lg shadow-yellow-400/5 ring-1 ring-yellow-400/30 scale-[1.02]"
                : "bg-slate-900/30 border-slate-800/80 hover:border-slate-700/80 opacity-70 hover:opacity-100 hover:bg-slate-900/40"
            }`}
          >
              <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-0.5 group-hover:text-slate-400 transition-colors">AP Total</div>
              <div className="text-3xl text-yellow-400 font-black flex items-center justify-between">
                <span>{kpis.totalPotenciales}</span>
                {(selectedKpis.length === 0 || selectedKpis.includes("totalPotenciales")) && (
                  <span className="w-2 h-2 rounded-full bg-yellow-400 block animate-pulse"></span>
                )}
              </div>
          </button>

          <button 
            type="button"
            onClick={() => toggleKpi("ytd")}
            className={`p-4 rounded-xl text-left transition-all duration-200 border cursor-pointer select-none relative overflow-hidden group ${
              selectedKpis.includes("ytd")
                ? "bg-yellow-400/10 border-yellow-400/60 shadow-lg shadow-yellow-400/5 ring-1 ring-yellow-400/30 scale-[1.02]"
                : "bg-slate-900/30 border-slate-800/80 hover:border-slate-700/80 opacity-70 hover:opacity-100 hover:bg-slate-900/40"
            }`}
          >
              <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-0.5 group-hover:text-slate-400 transition-colors">AP YTD "{yearFilter || dateBounds.currentYear}"</div>
              <div className="text-3xl text-yellow-400 font-black flex items-center justify-between">
                <span>{kpis.totalYTD}</span>
                {selectedKpis.includes("ytd") && (
                  <span className="w-2 h-2 rounded-full bg-yellow-400 block animate-pulse"></span>
                )}
              </div>
          </button>

          <button 
            type="button"
            onClick={() => toggleKpi("mes")}
            className={`p-4 rounded-xl text-left transition-all duration-200 border cursor-pointer select-none relative overflow-hidden group ${
              selectedKpis.includes("mes")
                ? "bg-yellow-400/10 border-yellow-400/60 shadow-lg shadow-yellow-400/5 ring-1 ring-yellow-400/30 scale-[1.02]"
                : "bg-slate-900/30 border-slate-800/80 hover:border-slate-700/80 opacity-70 hover:opacity-100 hover:bg-slate-900/40"
            }`}
          >
              <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-0.5 group-hover:text-slate-400 transition-colors">AP mes</div>
              <div className="text-3xl text-yellow-400 font-black flex items-center justify-between">
                <span>{kpis.totalMonth}</span>
                {selectedKpis.includes("mes") && (
                  <span className="w-2 h-2 rounded-full bg-yellow-400 block animate-pulse"></span>
                )}
              </div>
          </button>

          <button 
            type="button"
            onClick={() => toggleKpi("quincena")}
            className={`p-4 rounded-xl text-left transition-all duration-200 border cursor-pointer select-none relative overflow-hidden group ${
              selectedKpis.includes("quincena")
                ? "bg-yellow-400/10 border-yellow-400/60 shadow-lg shadow-yellow-400/5 ring-1 ring-yellow-400/30 scale-[1.02]"
                : "bg-slate-900/30 border-slate-800/80 hover:border-slate-700/80 opacity-70 hover:opacity-100 hover:bg-slate-900/40"
            }`}
          >
              <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-0.5 group-hover:text-slate-400 transition-colors">AP Periodo ({fortnightRangeStr})</div>
              <div className="text-3xl text-yellow-400 font-black flex items-center justify-between">
                <span>{kpis.totalFortnight}</span>
                {selectedKpis.includes("quincena") && (
                  <span className="w-2 h-2 rounded-full bg-yellow-400 block animate-pulse"></span>
                )}
              </div>
          </button>

          <button 
            type="button"
            onClick={() => toggleKpi("semanal")}
            className={`p-4 rounded-xl text-left transition-all duration-200 border cursor-pointer select-none relative overflow-hidden group ${
              selectedKpis.includes("semanal")
                ? "bg-yellow-400/10 border-yellow-400/60 shadow-lg shadow-yellow-400/5 ring-1 ring-yellow-400/30 scale-[1.02]"
                : "bg-slate-900/30 border-slate-800/80 hover:border-slate-700/80 opacity-70 hover:opacity-100 hover:bg-slate-900/40"
            }`}
          >
              <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-0.5 group-hover:text-slate-400 transition-colors">AP Semana</div>
              <div className="text-3xl text-yellow-400 font-black flex items-center justify-between">
                <span>{kpis.totalWeek}</span>
                {selectedKpis.includes("semanal") && (
                  <span className="w-2 h-2 rounded-full bg-yellow-400 block animate-pulse"></span>
                )}
              </div>
          </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 p-2">
        <div className="relative flex-grow">
            <Search className="absolute left-3 top-3 text-slate-600" size={16}/>
            <input type="text" placeholder="Buscar por nombre..." className="bg-slate-900/30 border border-slate-800 rounded-xl p-3 pl-9 text-white w-full focus:ring-1 focus:ring-yellow-500/50 outline-none transition-all placeholder:text-slate-600" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
        </div>
        <select className="bg-slate-900/30 border border-slate-800 rounded-xl p-3 text-slate-300 outline-none focus:ring-1 focus:ring-yellow-500/50" value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
            <option value="">Todos los contactos</option>
            {businesses.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
        <select className="bg-slate-900/30 border border-slate-800 rounded-xl p-3 text-slate-300 outline-none focus:ring-1 focus:ring-yellow-500/50 min-w-[124px]" value={yearFilter} onChange={e => { setYearFilter(e.target.value); setCurrentPage(1); }}>
            <option value="">Todos los años</option>
            {availableYears.map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        {canViewAll && (
            <select className="bg-slate-900/30 border border-slate-800 rounded-xl p-3 text-slate-300 outline-none focus:ring-1 focus:ring-yellow-500/50" value={executiveFilter} onChange={e => setExecutiveFilter(e.target.value)}>
                <option value="">Todos los Ejecutivos</option>
                {uniquePlatformUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
            </select>
        )}
      </div>      <div className="rounded-2xl overflow-hidden">
          <table className="w-full text-left text-slate-300">
            <thead className="text-slate-500 text-[10px] uppercase tracking-widest">
                <tr>
                    <th className="p-4 font-bold text-center w-10">#</th>
                    <th className="p-4 font-bold">Fecha</th>
                    <th className="p-4 font-bold">Nombre asunto</th>
                    <th className="p-4 font-bold">Nombre Contacto</th>
                    <th className="p-4 font-bold">Creado por</th>
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
                    currentItems.map((a, index) => (
                        <tr key={a.id} className="hover:bg-slate-900/20 transition-colors">
                            <td className="p-4 text-center font-mono text-[10px] text-slate-500 select-none w-10">
                                {(currentPage - 1) * itemsPerPage + index + 1}
                            </td>
                            <td className="p-4 text-sm text-slate-500">{new Date(a.fecha).toLocaleDateString()}</td>
                            <td className="p-4 text-sm font-medium text-white">{a.nombreAsunto}</td>
                            <td className="p-4 text-sm text-slate-300">{a.contactName || businesses.find(b => b.id === a.businessId)?.contactName || "—"}</td>
                            <td className="p-4 text-sm text-slate-500">{platformUsers.find(u => u.id === a.userId)?.full_name || a.userId}</td>
                            <td className="p-4 text-right">
                                <button 
                                    onClick={() => {
                                      setSelectedAsunto(a);
                                      setIsViewModalOpen(true);
                                    }}
                                    className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                                    title="Ver detalle"
                                  >
                                    <Eye size={18} />
                                </button>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                         <td colSpan={6} className="p-10 text-center text-slate-500">No se encontraron asuntos.</td>
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
                    className="bg-slate-900 p-5 rounded-xl w-full max-w-md border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]"
                >
                    <div className="flex justify-between items-center mb-3 flex-shrink-0">
                        <h2 className="text-lg font-bold text-white">Nuevo Asunto</h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-950/40 p-1.5 rounded-lg hover:bg-slate-950"><X size={16}/></button>
                    </div>
                    <form onSubmit={handleCreate} className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                        <div className="relative">
                            <div 
                                className={`w-full bg-slate-950 border ${isClientDropdownOpen ? 'border-yellow-500/50 ring-1 ring-yellow-500/50' : 'border-slate-800'} p-2.5 rounded-xl flex items-center justify-between cursor-text transition-all`}
                                onClick={() => setIsClientDropdownOpen(true)}
                            >
                                <input
                                   type="text"
                                   className="bg-transparent border-none outline-none w-full text-white placeholder-slate-400 text-xs"
                                   placeholder={!isClientDropdownOpen && formData.businessId ? businesses.find(b => b.id === formData.businessId)?.name || 'Seleccionar contacto' : 'Seleccionar contacto'}
                                   value={isClientDropdownOpen ? clientSearchText : (formData.businessId ? (businesses.find(b => b.id === formData.businessId)?.name || '') : '')}
                                   onChange={(e) => {
                                     setClientSearchText(e.target.value);
                                     if (!isClientDropdownOpen) setIsClientDropdownOpen(true);
                                   }}
                                   onFocus={() => {
                                      setIsClientDropdownOpen(true);
                                      setClientSearchText("");
                                   }}
                                />
                                <div className="text-slate-500 pointer-events-none">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                </div>
                            </div>
                            
                            {isClientDropdownOpen && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setIsClientDropdownOpen(false)}></div>
                                  <div className="absolute top-full left-0 w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-h-40 overflow-y-auto z-50 py-1.5">
                                      {businesses.filter(b => b.name.toLowerCase().includes(clientSearchText.toLowerCase())).length > 0 ? (
                                        businesses.filter(b => b.name.toLowerCase().includes(clientSearchText.toLowerCase())).map(b => (
                                          <div 
                                            key={b.id} 
                                            className={`px-3 py-2 hover:bg-slate-800 cursor-pointer text-xs transition-colors ${formData.businessId === b.id ? 'bg-slate-800 text-yellow-400 font-medium' : 'text-slate-300'}`}
                                            onClick={() => {
                                                setFormData({
                                                    ...formData,
                                                    businessId: b.id,
                                                    contactName: b.contactName || "",
                                                    contactPhone: b.phone || ""
                                                });
                                                setClientSearchText("");
                                                setIsClientDropdownOpen(false);
                                            }}
                                          >
                                              {b.name}
                                          </div>
                                        ))
                                      ) : (
                                        <div className="px-3 py-2 text-slate-500 text-xs">No se encontraron contactos</div>
                                      )}
                                  </div>
                                </>
                            )}
                        </div>
                        {/* Datos del Contacto Autocompletados y can be edited */}
                        <div className="grid grid-cols-2 gap-3 text-left">
                            <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-sans">Nombre de Contacto</label>
                                <input 
                                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none focus:ring-1 focus:ring-yellow-500/50 text-xs placeholder:text-slate-600" 
                                    placeholder="Ej. Juan Pérez" 
                                    value={formData.contactName || ""} 
                                    onChange={e => setFormData({...formData, contactName: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-sans">Teléfono de Contacto</label>
                                <input 
                                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none focus:ring-1 focus:ring-yellow-500/50 text-xs placeholder:text-slate-600 font-mono" 
                                    placeholder="Ej. +52 1..." 
                                    value={formData.contactPhone || ""} 
                                    onChange={e => setFormData({...formData, contactPhone: e.target.value})} 
                                />
                            </div>
                        </div>

                        <input className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none focus:ring-1 focus:ring-yellow-500/50 text-xs placeholder:text-slate-600" placeholder="Nombre del asunto" value={formData.nombreAsunto} onChange={e => setFormData({...formData, nombreAsunto: e.target.value})} />
                        <textarea className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none focus:ring-1 focus:ring-yellow-500/50 min-h-[70px] text-xs placeholder:text-slate-600 resize-none" placeholder="Detalles o datos adicionales del asunto..." value={formData.datosAsunto} onChange={e => setFormData({...formData, datosAsunto: e.target.value})} />
                        <div className="space-y-1.5">
                            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Adjuntar Archivo:</label>
                            {formData.archivoAdjuntoUrl ? (
                                <div className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-lg shadow-inner">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="p-1.5 bg-yellow-400/10 text-yellow-400 rounded-md border border-yellow-400/20 flex items-center justify-center">
                                            <Paperclip size={12} />
                                        </div>
                                        <div className="truncate text-left">
                                            <p className="text-[11px] font-semibold text-slate-200 truncate">
                                                {asuntoFileName || "Archivo Adjunto"}
                                            </p>
                                            <p className="text-[8px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                                                Listo para guardar
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData({
                                                ...formData,
                                                archivoAdjuntoUrl: "",
                                            });
                                            setAsuntoFileName("");
                                        }}
                                        className="text-slate-500 hover:text-rose-400 p-1 hover:bg-rose-500/10 rounded-md transition-colors border border-transparent hover:border-rose-500/10"
                                        title="Eliminar archivo"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsAsuntoDragOver(true);
                                    }}
                                    onDragLeave={() => setIsAsuntoDragOver(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsAsuntoDragOver(false);
                                        const file = e.dataTransfer.files[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setFormData({
                                                    ...formData,
                                                    archivoAdjuntoUrl: reader.result as string,
                                                });
                                                setAsuntoFileName(file.name);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                    className={`relative border-2 border-dashed rounded-lg p-2.5 flex flex-col items-center justify-center transition-all cursor-pointer ${
                                        isAsuntoDragOver
                                            ? "border-yellow-400 bg-yellow-400/5 text-yellow-400"
                                            : "border-slate-800 bg-slate-950 hover:bg-slate-900/45 hover:border-slate-700 text-slate-400"
                                    }`}
                                >
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setFormData({
                                                        ...formData,
                                                        archivoAdjuntoUrl: reader.result as string,
                                                    });
                                                    setAsuntoFileName(file.name);
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                    <div className="flex items-center gap-2 text-slate-400 hover:text-yellow-400 transition-colors">
                                        <Upload size={12} />
                                        <span className="text-[10px] font-medium text-slate-300">
                                            Suelte su archivo o haga clic para buscar
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button type="submit" className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black p-3 rounded-xl transition-all mt-2">Guardar Asunto</button>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isViewModalOpen && selectedAsunto && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900 p-6 rounded-2xl w-full max-w-lg border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]"
                >
                    <div className="flex justify-between items-center mb-6 flex-shrink-0">
                        <h2 className="text-2xl font-display font-black text-white">Detalle del Asunto</h2>
                        <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
                    </div>
                    
                    <div className="space-y-6 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Nombre</p>
                              <p className="text-sm text-white font-medium">{selectedAsunto.nombreAsunto}</p>
                           </div>
                           <div>
                              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Fecha</p>
                              <p className="text-sm text-white font-medium">{new Date(selectedAsunto.fecha).toLocaleDateString()}</p>
                           </div>
                           <div>
                              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Contacto</p>
                              <p className="text-sm text-slate-300">{businesses.find(b => b.id === selectedAsunto.businessId)?.name || "Desconocido"}</p>
                           </div>
                           <div>
                              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Creado por</p>
                              <p className="text-sm text-slate-300">{platformUsers.find(u => u.id === selectedAsunto.userId)?.full_name || "Desconocido"}</p>
                              <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{platformUsers.find(u => u.id === selectedAsunto.userId)?.role_name || "Rol Desconocido"}</p>
                           </div>
                           <div>
                              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Nombre de Contacto</p>
                              <p className="text-sm text-slate-300 font-medium">{selectedAsunto.contactName || "—"}</p>
                           </div>
                           <div>
                              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Número de Contacto</p>
                              <p className="text-sm text-slate-300 font-mono text-xs">{selectedAsunto.contactPhone || "—"}</p>
                           </div>
                       </div>

                       <div>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Descripción y Notas (Conversación)</p>
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-64 overflow-y-auto custom-scrollbar mb-3 space-y-3 flex flex-col">
                             {(() => {
                               const chatMessages = (() => {
                                 const text = selectedAsunto.datosAsunto || "";
                                 const segments = text.split("--- Nota por ");
                                 const list: { author: string; date: string; text: string; role?: string; isDescription?: boolean }[] = [];
                                 
                                 // First segment is the original description
                                 if (segments[0] && segments[0].trim()) {
                                   const creator = platformUsers.find(u => u.id === selectedAsunto.userId);
                                   const creatorName = creator?.full_name || "Desconocido";
                                   const formattedDate = new Date(selectedAsunto.fecha).toLocaleString();
                                   list.push({
                                     author: creatorName,
                                     date: formattedDate,
                                     text: segments[0].trim(),
                                     isDescription: true
                                   });
                                 }
                                 
                                 for (let i = 1; i < segments.length; i++) {
                                   const segment = segments[i];
                                   const parts = segment.split("---");
                                   if (parts.length >= 2) {
                                     const header = parts[0].trim();
                                     const noteBody = parts.slice(1).join("---").trim();
                                     
                                     const elIndex = header.lastIndexOf(" el ");
                                     let name = header;
                                     let dateTime = "";
                                     if (elIndex !== -1) {
                                        name = header.substring(0, elIndex).trim();
                                        dateTime = header.substring(elIndex + 4).trim();
                                     }
                                     
                                     list.push({
                                       author: name,
                                       date: dateTime,
                                       text: noteBody
                                     });
                                   } else {
                                     list.push({
                                       author: "Nota",
                                       date: "",
                                       text: segment.trim()
                                     });
                                   }
                                 }
                                 return list;
                               })();

                               if (chatMessages.length === 0) {
                                 return <div className="text-center py-6 text-slate-500 text-sm">No hay notas registradas.</div>;
                               }

                               return chatMessages.map((msg, index) => {
                                 const firstName = msg.author.split(" ")[0] || "Desconocido";
                                 const isMe = msg.author.toLowerCase() === (currentUser.fullName || currentUser.full_name || "").toLowerCase();

                                 return (
                                   <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full`}>
                                      {(() => {
                                        let rawRole = msg.role;
                                        if (!rawRole) {
                                          const matchedUser = platformUsers.find(u => 
                                            u.full_name?.toLowerCase().trim() === msg.author.toLowerCase().trim() ||
                                            u.full_name?.split(" ")[0]?.toLowerCase().trim() === msg.author.toLowerCase().trim()
                                          );
                                          rawRole = matchedUser?.role_name || "";
                                        }
                                        if (!rawRole && isMe) {
                                          rawRole = currentUser.roleName || currentUser.roleId || "";
                                        }
                                        let roleLabel = "";
                                        if (rawRole) {
                                          if (rawRole === "ADMIN_MAESTRO") {
                                            roleLabel = "ADMIN MAESTRO";
                                          } else if (rawRole === "EJECUTIVO_COMERCIAL") {
                                            roleLabel = "EJECUTIVO";
                                          } else {
                                            roleLabel = rawRole.replace(/_/g, " ").toUpperCase();
                                          }
                                        }
                                        return (
                                          <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500 mb-0.5 font-mono tracking-tight px-1">
                                             <span>({firstName}</span>
                                             {roleLabel && (
                                               <>
                                                 <span className="text-slate-700 select-none">•</span>
                                                 <span className="text-amber-400 font-bold uppercase text-[8px] tracking-wider">{roleLabel}</span>
                                               </>
                                             )}
                                             {msg.date && (
                                               <>
                                                 <span className="text-slate-700 select-none">•</span>
                                                 <span>{msg.date}</span>
                                               </>
                                             )}
                                             <span>)</span>
                                          </div>
                                        );
                                      })()}
                                      
                                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed shadow-sm block ${
                                         msg.isDescription
                                            ? 'bg-blue-500/10 text-blue-200 border border-blue-500/20 rounded-tl-none'
                                            : isMe 
                                               ? 'bg-yellow-400 text-slate-950 font-medium rounded-tr-none'
                                               : 'bg-slate-900 text-slate-100 rounded-tl-none border border-slate-800'
                                      }`}>
                                         {msg.text}
                                      </div>
                                   </div>
                                 );
                               });
                             })()}
                          </div>
                          <div className="flex gap-2 relative">
                              <input 
                                 type="text"
                                 placeholder="Añadir nueva nota..."
                                 value={newNote}
                                 onChange={e => setNewNote(e.target.value)}
                                 onKeyDown={e => {
                                   if (e.key === 'Enter') handleAddNote();
                                 }}
                                 className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500/50"
                              />
                              <button 
                                 onClick={handleAddNote}
                                 disabled={!newNote.trim()}
                                 className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:hover:bg-yellow-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
                              >
                                 Añadir Nota
                              </button>
                          </div>
                       </div>

                       {selectedAsunto.archivoAdjuntoUrl ? (
                         <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Archivo Compartido</p>
                            <a 
                               href={selectedAsunto.archivoAdjuntoUrl}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-yellow-400 border border-slate-800 p-3 flex-1 w-full rounded-xl transition-colors font-medium text-sm"
                            >
                               <FileText size={18} />
                               Ver Archivo Adjunto
                            </a>
                         </div>
                       ) : (
                         <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Archivo Compartido</p>
                            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 text-slate-500 text-sm italic">
                               No hay archivos adjuntos.
                            </div>
                         </div>
                       )}
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}
