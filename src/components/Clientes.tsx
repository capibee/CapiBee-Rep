/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Plus,
  Trash2,
  Search,
  Globe,
  Mail,
  Briefcase,
  User,
  X,
  Building,
  Globe2,
  DollarSign,
  Contact,
  Target,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Client, Business } from "../types";
import { usePermissions } from "../hooks/usePermissions";
import { supabase } from "../lib/supabase";
import { Pagination } from "./Pagination";
import { TableLoader } from "./TableLoader";

interface ClientesProps {
  onLogout: () => void;
  onBack: () => void;
}

const LANGUAGES = ["Español", "Inglés", "Portugués", "Francés"] as const;
const CURRENCIES = ["USD", "EURO"] as const;

export default function Clientes({ onLogout, onBack }: ClientesProps) {
  const permissions = usePermissions("clientes");
  const [clientes, setClientes] = useState<Client[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClientDetails, setEditingClientDetails] = useState<Client | null>(null);
  const [editClientFormData, setEditClientFormData] = useState({ contactName: "", email: "" });
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");
  const [selectedKpis, setSelectedKpis] = useState<string[]>([]);

  const toggleKpiFilter = (id: string) => {
    setSelectedKpis((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id],
    );
  };

  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(id);
    setTimeout(() => setCopyStatus(null), 2000);

    const clean = text.replace(/[^0-9+]/g, '');
    if (clean) {
      window.location.href = `tel:${clean}`;
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    type: "Particular" as "Particular" | "Empresa",
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    language: "Español" as (typeof LANGUAGES)[number],
    currency: "USD" as (typeof CURRENCIES)[number],
    country: "",
    address: "",
    sector: "",
  });

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("capibee_user");
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    const saved = localStorage.getItem("capibee_clientes");
    if (saved) {
      setClientes(JSON.parse(saved));
    }

    const savedBusinesses = localStorage.getItem("capibee_businesses");
    if (savedBusinesses) {
      setBusinesses(JSON.parse(savedBusinesses));
    }
  }, []);

  // Connect to Supabase for dynamic data and real-time subscription
  useEffect(() => {
    const fetchFreshData = async () => {
      try {
        // Fetch clients
        const { data: dbClients, error: clientsErr } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
        if (!clientsErr && dbClients) {
          const mappedC = dbClients.map((c: any) => ({
            id: c.id,
            type: c.type || 'Particular',
            companyName: c.company_name || '',
            contactName: c.contact_name,
            email: c.email || '',
            language: c.language || 'Español',
            currency: c.currency || 'USD',
            country: c.country || '',
            address: c.address || '',
            sector: c.sector || '',
            phone: c.phone || '',
            createdAt: Number(c.created_at) || Date.now(),
            userId: c.user_id || null
          })).sort((a: any, b: any) => b.createdAt - a.createdAt);
          setClientes(mappedC);
          localStorage.setItem("capibee_clientes", JSON.stringify(mappedC));
        }

        // Fetch businesses
        const { data: dbBusinesses, error: busErr } = await supabase.from('businesses').select('*').order('created_at', { ascending: false });
        if (!busErr && dbBusinesses) {
          const mappedB = dbBusinesses.map((b: any) => ({
            id: b.id,
            name: b.name,
            category: b.category,
            address: b.address || '',
            phone: b.phone || '',
            whatsapp: b.whatsapp || '',
            contactName: b.contact_name || '',
            userId: b.user_id || '',
            status: b.status || 'Nuevo',
            prefix: b.prefix || '',
            responsibleName: b.responsible_name || '',
            responsiblePhone: b.responsible_phone || '',
            email: b.email || '',
            website: b.website || '',
            rating: Number(b.rating) || 5,
            city: b.city || '',
            country: b.country || '',
            branchName: b.branch_name || '',
            imageUrl: b.image_url || '',
            meetingDate: b.meeting_date || '',
            description: b.description || '',
            isEstablishment: b.is_establishment || false,
            agents: b.agents || [],
            notes: b.notes || [],
            memoryFiles: b.memory_files || [],
            createdAt: Number(b.created_at) || b.created_at || Date.now()
          }));
          setBusinesses(mappedB);
          localStorage.setItem("capibee_businesses", JSON.stringify(mappedB));
        }
      } catch (err) {
        console.warn("Could not sync data from Supabase in Clientes:", err);
      } finally {
        setIsTableLoading(false);
      }
    };

    fetchFreshData();

    const clientsChannel = supabase.channel('clients-realtime-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        fetchFreshData();
      })
      .subscribe();

    const businessesChannel = supabase.channel('businesses-realtime-clientes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, () => {
        fetchFreshData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(businessesChannel);
    };
  }, []);

  const saveClientes = async (newClientes: Client[]) => {
    setClientes(newClientes);
    localStorage.setItem("capibee_clientes", JSON.stringify(newClientes));

    // Persist each to Supabase live
    for (const c of newClientes) {
      const { error: upsertErr } = await supabase.from('clients').upsert({
        id: c.id,
        type: c.type || 'Particular',
        company_name: c.companyName || '',
        contact_name: c.contactName,
        email: c.email || '',
        language: c.language || 'Español',
        currency: c.currency || 'USD',
        country: c.country || '',
        address: c.address || '',
        sector: c.sector || '',
        phone: c.phone || '',
        created_at: Number(c.createdAt) || Date.now(),
        user_id: c.userId || null
      }, { onConflict: 'id' });

      if (upsertErr) {
        console.error("🔴 Supabase client upsert error:", upsertErr);
      } else {
        console.log("💚 Supabase client upsert successful:", c.id);
      }
    }
  };

  const handleUpdateContactDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClientDetails) return;

    const clientId = editingClientDetails.id;
    const { contactName: newContactName, email: newEmail } = editClientFormData;

    const updatedClientes = clientes.map(c => 
      c.id === clientId ? { ...c, contactName: newContactName, email: newEmail } : c
    );
    
    // Update local state and storage
    setClientes(updatedClientes);
    localStorage.setItem("capibee_clientes", JSON.stringify(updatedClientes));
    setEditingClientDetails(null);

    // Update single client in Supabase
    const target = updatedClientes.find(c => c.id === clientId);
    if (target) {
       await supabase.from('clients').upsert({
        id: target.id,
        type: target.type || 'Particular',
        company_name: target.companyName || '',
        contact_name: target.contactName,
        email: target.email || '',
        language: target.language || 'Español',
        currency: target.currency || 'USD',
        country: target.country || '',
        address: target.address || '',
        sector: target.sector || '',
        phone: target.phone || '',
        created_at: Number(target.createdAt) || Date.now(),
        user_id: target.userId || null
       }, { onConflict: 'id' });
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    const newClient: Client = {
      id: crypto.randomUUID(),
      ...formData,
      createdAt: Date.now(),
    };

    saveClientes([newClient, ...clientes]);
    setIsModalOpen(false);
    setFormData({
      type: "Particular",
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      language: "Español",
      currency: "USD",
      country: "",
      address: "",
      sector: "",
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Eliminar este cliente?")) {
      const updated = clientes.filter((c) => c.id !== id);
      await saveClientes(updated);

      try {
        await supabase.from('clients').delete().eq('id', id);
      } catch (err) {
        console.error("Supabase client deletion error:", err);
      }
    }
  };

  // ... (some code omitted for brevity)

  const [currentPage, setCurrentPage] = useState(1);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const itemsPerPage = 50;

  const toggleClientSelection = (id: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const authorizedClientes = useMemo(() => {
    if (!currentUser) return [];
    const isSuperAdmin =
      currentUser?.roleName?.toLowerCase() === "superadmin" ||
      currentUser?.roleId === "ADMIN_MAESTRO";

    let authClients: Client[] = [];
    if (isSuperAdmin) {
      authClients = [...clientes];
    } else {
      authClients = clientes.filter((cliente) => {
        const linkedBusiness = businesses.find((b) => b.id === cliente.id);
        return (
          linkedBusiness &&
          linkedBusiness.responsibleName === currentUser.fullName
        );
      });
    }
    return authClients.sort((a, b) => b.createdAt - a.createdAt);
  }, [clientes, businesses, currentUser]);

  const kpis = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const startOfYear = new Date(currentYear, 0, 1).getTime();
    const startOfMonth = new Date(currentYear, currentMonth, 1).getTime();

    const startOfWeekDate = new Date(now);
    const day = startOfWeekDate.getDay();
    const diff = startOfWeekDate.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeekDate.setDate(diff);
    startOfWeekDate.setHours(0, 0, 0, 0);
    const startOfWeek = startOfWeekDate.getTime();

    let totalYtd = 0;
    let totalMes = 0;
    let totalSemana = 0;

    authorizedClientes.forEach((c) => {
      const createdAt = c.createdAt || 0;
      if (createdAt >= startOfYear) totalYtd++;
      if (createdAt >= startOfMonth) totalMes++;
      if (createdAt >= startOfWeek) totalSemana++;
    });

    const monthName = now.toLocaleString('es-ES', { month: 'long' });
    const endOfWeekDate = new Date(startOfWeekDate);
    endOfWeekDate.setDate(startOfWeekDate.getDate() + 6);
    const weekRange = `${startOfWeekDate.getDate()} al ${endOfWeekDate.getDate()}`;

    return { totalYtd, totalMes, totalSemana, monthName, weekRange, currentYear };
  }, [authorizedClientes]);

  const filteredClientes = useMemo(() => {
    return authorizedClientes.filter((c) => {
      const matchesSearch =
        (c.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.companyName || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) &&
        (countryFilter === "" ||
          (c.country || "")
            .toLowerCase()
            .includes(countryFilter.toLowerCase()));

      let matchesSeller = true;
      if (sellerFilter !== "") {
        const linkedBusiness = businesses.find((b) => b.id === c.id);
        const sellerName = linkedBusiness?.responsibleName || "Sin Asignar";
        matchesSeller = sellerName === sellerFilter;
      }

      if (!matchesSearch || !matchesSeller) return false;

      if (selectedKpis.length > 0 && !selectedKpis.includes("all")) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const startOfYear = new Date(currentYear, 0, 1).getTime();
        const startOfMonth = new Date(currentYear, currentMonth, 1).getTime();
        const startOfWeekDate = new Date(now);
        const day = startOfWeekDate.getDay();
        const diff = startOfWeekDate.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeekDate.setDate(diff);
        startOfWeekDate.setHours(0, 0, 0, 0);
        const startOfWeek = startOfWeekDate.getTime();

        const createdAt = c.createdAt || 0;

        let matchesKpi = false;
        if (selectedKpis.includes("ytd") && createdAt >= startOfYear) matchesKpi = true;
        if (selectedKpis.includes("month") && createdAt >= startOfMonth) matchesKpi = true;
        if (selectedKpis.includes("week") && createdAt >= startOfWeek) matchesKpi = true;

        if (!matchesKpi) return false;
      }

      return true;
    });
  }, [authorizedClientes, businesses, searchTerm, countryFilter, sellerFilter, selectedKpis]);

  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const currentItems = useMemo(() => {
	  return filteredClientes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredClientes, currentPage, itemsPerPage]);

  return (
    <div className="h-full bg-transparent flex flex-col font-sans overflow-hidden text-slate-200">
      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto relative custom-scrollbar min-h-0">
        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="mb-2 grid grid-cols-2 md:grid-cols-4 gap-2">
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => toggleKpiFilter("all")}
              className={`cursor-pointer p-2 rounded-lg border shadow-sm transition-all duration-300 ${
                selectedKpis.includes("all")
                  ? "bg-slate-800 border-slate-600 ring-1 ring-slate-500/20"
                  : "bg-slate-900/60 border-slate-800"
              }`}
            >
              <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                Total Clientes
              </div>
              <div className="text-xl font-display font-black text-white">
                {authorizedClientes.length}
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => toggleKpiFilter("ytd")}
              className={`cursor-pointer p-2 rounded-lg border shadow-sm transition-all duration-300 ${
                selectedKpis.includes("ytd")
                  ? "bg-blue-500/10 border-blue-500/50"
                  : "bg-slate-900/60 border-slate-800"
              }`}
            >
              <div
                className={`text-[8px] font-bold uppercase tracking-widest mb-0.5 ${selectedKpis.includes("ytd") ? "text-blue-400" : "text-blue-500"}`}
              >
                Total clientes {kpis.currentYear}
              </div>
              <div className="text-xl font-display font-black text-white">
                {kpis.totalYtd}
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => toggleKpiFilter("month")}
              className={`cursor-pointer p-2 rounded-lg border shadow-sm transition-all duration-300 ${
                selectedKpis.includes("month")
                  ? "bg-indigo-500/10 border-indigo-500/50"
                  : "bg-slate-900/60 border-slate-800"
              }`}
            >
              <div
                className={`text-[8px] font-bold uppercase tracking-widest mb-0.5 ${selectedKpis.includes("month") ? "text-indigo-400" : "text-indigo-500"}`}
              >
                Clientes {kpis.monthName}
              </div>
              <div className="text-xl font-display font-black text-white">
                {kpis.totalMes}
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => toggleKpiFilter("week")}
              className={`cursor-pointer p-2 rounded-lg border shadow-sm transition-all duration-300 ${
                selectedKpis.includes("week")
                  ? "bg-emerald-500/10 border-emerald-500/50"
                  : "bg-slate-900/60 border-slate-800"
              }`}
            >
              <div
                className={`text-[8px] font-bold uppercase tracking-widest mb-0.5 ${selectedKpis.includes("week") ? "text-emerald-400" : "text-emerald-500"}`}
              >
                Clientes Semana ({kpis.weekRange})
              </div>
              <div className="text-xl font-display font-black text-white">
                {kpis.totalSemana}
              </div>
            </motion.div>
          </div>

          <div className="mb-2 flex flex-col lg:flex-row lg:items-center justify-between gap-1 shrink-0">
            <div className="flex flex-col sm:flex-row gap-1 items-center w-full lg:w-auto">
              <div className="relative w-full sm:w-48">
                <Search
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500"
                  size={10}
                />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full pl-7 pr-2 py-1 bg-slate-950/80 border border-slate-800 rounded-md text-[9px] focus:outline-none focus:border-amber-500/50 transition-all shadow-inner"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="relative w-full sm:w-36">
                <Globe2
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500"
                  size={10}
                />
                <select
                  className="w-full pl-7 pr-2 py-1 bg-slate-950/80 border border-slate-800 rounded-md text-[9px] focus:outline-none focus:border-amber-500/50 transition-all shadow-inner appearance-none text-slate-300"
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                >
                  <option value="">País...</option>
                  {Array.from(new Set(clientes.map((c) => c.country || "")))
                    .filter((c) => c)
                    .sort()
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
              </div>

              {currentUser && (currentUser?.roleName?.toLowerCase() === 'superadmin' || currentUser?.roleId === 'ADMIN_MAESTRO') && (
                <div className="relative w-full sm:w-36">
                  <User
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500"
                    size={10}
                  />
                  <select
                    className="w-full pl-7 pr-2 py-1 bg-slate-950/80 border border-slate-800 rounded-md text-[9px] focus:outline-none focus:border-amber-500/50 transition-all shadow-inner appearance-none text-slate-300"
                    value={sellerFilter}
                    onChange={(e) => setSellerFilter(e.target.value)}
                  >
                    <option value="">Vendedor...</option>
                    {Array.from(new Set(authorizedClientes.map(c => businesses.find(b => b.id === c.id)?.responsibleName || "Sin Asignar")))
                      .filter(name => name)
                      .sort()
                      .map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              <button
                disabled={true}
                className="w-full sm:w-auto px-3 py-1 font-bold uppercase tracking-widest rounded-md transition-all text-[9px] flex items-center justify-center gap-1 group bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
              >
                <Plus size={10} strokeWidth={3} /> Nuevo Cliente
              </button>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-lg">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse border-spacing-0">
                <thead>
                  <tr className="bg-slate-950/50 border-b border-slate-800">
                    <th className="p-2 w-8">
                      <input
                        type="checkbox"
                        checked={selectedClientIds.length === filteredClientes.length && filteredClientes.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClientIds(filteredClientes.map(c => c.id));
                          } else {
                            setSelectedClientIds([]);
                          }
                        }}
                        className="accent-blue-500"
                      />
                    </th>
                    <th className="p-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest text-center w-10">
                      #
                    </th>
                    <th className="p-2 text-[8px] font-bold text-blue-500 uppercase tracking-widest">
                      Tipo
                    </th>
                    <th className="p-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                      Empresa
                    </th>
                    <th className="p-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                      Contacto
                    </th>
                    <th className="p-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                      País
                    </th>
                    <th className="p-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                      Teléfono
                    </th>
                    <th className="p-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                      Correo
                    </th>
                    <th className="p-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                      Asignado a
                    </th>
                    <th className="p-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center">
                      Idioma
                    </th>
                    <th className="p-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center">
                      Divisa
                    </th>
                    <th className="p-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {isTableLoading ? (
                    <tr>
                      <td colSpan={10} className="py-8">
                        <TableLoader />
                      </td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 font-medium bg-slate-900/20">
                        No hay clientes registrados en esta vista.
                      </td>
                    </tr>
                  ) : currentItems.map((cli, index) => (
                    <motion.tr
                      key={cli.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedClientIds.includes(cli.id)}
                          onChange={() => toggleClientSelection(cli.id)}
                          className="accent-blue-500"
                        />
                      </td>
                      <td className="p-2 text-center font-mono text-[10px] text-slate-500 select-none">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="p-2">
                        <span
                          className={`text-[8px] font-bold uppercase tracking-widest px-1 py-0.5 rounded border ${
                            cli.type === "Empresa"
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          {cli.type}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="font-bold text-slate-100 text-[10px] leading-tight">
                          {cli.companyName || "-"}
                        </div>
                        {cli.sector && (
                          <div className="text-[8px] text-blue-500/60 font-bold uppercase tracking-widest mt-0">
                            {cli.sector}
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-[10px] text-slate-300 font-medium">
                        <button 
                          onClick={() => {
                            setEditingClientDetails(cli);
                            setEditClientFormData({ contactName: cli.contactName, email: cli.email || "" });
                          }}
                          className="text-left w-full hover:text-blue-400 transition-colors py-1 truncate"
                        >
                          {cli.contactName || "-"}
                        </button>
                      </td>
                      <td className="p-2 text-[10px] text-slate-400">
                        <div className="flex items-center gap-1 uppercase font-bold text-[8px] tracking-widest text-slate-400">
                          <Globe size={9} className="text-blue-500" />{" "}
                          {cli.country || "-"}
                        </div>
                      </td>
                      <td className="p-2 text-[10px] text-slate-400">
                        {cli.phone ? (
                          <div
                            onClick={() => handleCopy(cli.id, cli.phone)}
                            className="flex items-center gap-1 cursor-pointer hover:text-amber-400 transition-colors"
                            title="Copiar número"
                          >
                            <Phone size={10} />
                            <span>{copyStatus === cli.id ? "Copiado!" : cli.phone}</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-2 text-[10px] text-slate-400">
                        <button 
                          onClick={() => {
                            setEditingClientDetails(cli);
                            setEditClientFormData({ contactName: cli.contactName, email: cli.email || "" });
                          }}
                          className={`text-left w-full hover:text-blue-400 transition-colors py-1 truncate ${!cli.email ? 'text-slate-500 italic' : ''}`}
                        >
                          {cli.email || "Sin correo"}
                        </button>
                      </td>
                      <td className="p-2 text-[10px] text-slate-400">
                        {businesses.find(b => b.id === cli.id)?.responsibleName || "-"}
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-800/50 px-1 py-0.5 rounded">
                          {cli.language}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-[9px] font-bold text-emerald-400 tabular-nums">
                          {cli.currency}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() =>
                            permissions.delete && handleDelete(cli.id)
                          }
                          disabled={!permissions.delete}
                          className={`p-1 rounded transition-all ${!permissions.delete ? "text-slate-700 cursor-not-allowed" : "text-slate-500 hover:text-red-400 hover:bg-red-500/10 active:scale-90"}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                  {currentItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={11}
                        className="p-12 text-center text-slate-500 italic text-sm"
                      >
                        No hay clientes registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </div>
        </div>
      </main>

      {/* Modal Cliente */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-blue-500/20 shadow-2xl rounded-3xl w-full max-w-xl overflow-hidden"
            >
              <div className="p-6 border-b border-blue-500/10 flex justify-between items-center bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-inner">
                    <Users size={20} />
                  </div>
                  <h2 className="text-xl font-display font-black text-white uppercase tracking-widest">
                    Nuevo Cliente
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-500 hover:text-white rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 sm:p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Tipo de Cliente
                    </label>
                    <div className="flex gap-4">
                      {["Particular", "Empresa"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              type: t as "Particular" | "Empresa",
                            })
                          }
                          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                            formData.type === t
                              ? "bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20"
                              : "bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.type === "Empresa" && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Seleccionar de Directorio de Empresas
                        </label>
                        <div className="relative">
                          <Contact
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                            size={14}
                          />
                          <select
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none appearance-none"
                            onChange={(e) => {
                              const b = businesses.find(
                                (item) => item.id === e.target.value,
                              );
                              if (b) {
                                // Map country to currency
                                let autoCurrency: "USD" | "EURO" = "USD";
                                if (
                                  b.country?.toLowerCase().includes("españa") ||
                                  b.country?.toLowerCase().includes("portugal") ||
                                  b.country?.toLowerCase().includes("francia")
                                )
                                  autoCurrency = "EURO";

                                setFormData({
                                  ...formData,
                                  companyName: b.name,
                                  contactName: b.contactName || "",
                                  country: b.country || "",
                                  address: b.address || "",
                                  currency: autoCurrency,
                                  sector: b.category || "",
                                  email: b.email || "",
                                });
                              }
                            }}
                          >
                            <option value="">Seleccionar contacto...</option>
                            {businesses.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Nombre de la Empresa
                        </label>
                        <div className="relative">
                          <Briefcase
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                            size={14}
                          />
                          <input
                            type="text"
                            required
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none"
                            value={formData.companyName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                companyName: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Sector / Razón Social
                        </label>
                        <div className="relative">
                          <Target
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                            size={14}
                          />
                          <input
                            type="text"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none"
                            value={formData.sector}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                sector: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Nombre del Contacto
                    </label>
                    <div className="relative">
                      <User
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                        size={14}
                      />
                      <input
                        type="text"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none"
                        value={formData.contactName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contactName: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        País
                      </label>
                      <div className="relative">
                        <Globe2
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                          size={14}
                        />
                        <input
                          type="text"
                          placeholder="Ej: Colombia"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none"
                          value={formData.country}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              country: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Dirección
                      </label>
                      <div className="relative">
                        <Globe2
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                          size={14}
                        />
                        <input
                          type="text"
                          placeholder="Calle, Número..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none"
                          value={formData.address}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              address: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Teléfono
                      </label>
                      <div className="relative">
                        <Contact
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                          size={14}
                        />
                        <input
                          type="tel"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Correo Electrónico
                      </label>
                      <div className="relative">
                        <Mail
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                          size={14}
                        />
                        <input
                          type="email"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Idioma
                      </label>
                      <div className="relative">
                        <Globe
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                          size={14}
                        />
                        <select
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none appearance-none"
                          value={formData.language}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              language: e.target
                                .value as (typeof LANGUAGES)[number],
                            })
                          }
                        >
                          {LANGUAGES.map((lang) => (
                            <option key={lang} value={lang}>
                              {lang}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Divisa
                      </label>
                      <div className="relative">
                        <DollarSign
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                          size={14}
                        />
                        <select
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none appearance-none"
                          value={formData.currency}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              currency: e.target
                                .value as (typeof CURRENCIES)[number],
                            })
                          }
                        >
                          {CURRENCIES.map((curr) => (
                            <option key={curr} value={curr}>
                              {curr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-slate-800 text-slate-400 font-black uppercase tracking-widest rounded-2xl hover:text-white transition-all text-xs"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all text-xs"
                  >
                    Guardar Cliente
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
        {editingClientDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
            >
              <button
                onClick={() => setEditingClientDetails(null)}
                className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
                type="button"
              >
                <X size={20} />
              </button>

              <div className="mb-8">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <User className="text-blue-500" size={24} />
                </div>
                <h3 className="text-2xl font-medium tracking-tight text-white mb-1">
                  Editar Contacto
                </h3>
                <p className="text-sm text-slate-400">
                  Actualizando detalles para: <strong className="text-slate-200">{editingClientDetails.companyName || editingClientDetails.contactName}</strong>
                </p>
              </div>

              <form onSubmit={handleUpdateContactDetails} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Nombre del Contacto
                    </label>
                    <div className="relative">
                      <User
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                        size={14}
                      />
                      <input
                        type="text"
                        required
                        autoFocus
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none"
                        value={editClientFormData.contactName}
                        onChange={(e) =>
                          setEditClientFormData({
                            ...editClientFormData,
                            contactName: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                        size={14}
                      />
                      <input
                        type="email"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none"
                        value={editClientFormData.email}
                        onChange={(e) =>
                          setEditClientFormData({
                            ...editClientFormData,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setEditingClientDetails(null)}
                    className="flex-1 py-4 bg-slate-800 text-slate-400 font-black uppercase tracking-widest rounded-2xl hover:text-white transition-all text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all text-xs"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Email */}
      {/* Email modal removed */}
    </div>
  );
}
