/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { LogOut, Plus, MapPin, User as UserIcon, X, Bug, Bot, Activity, Zap, Target, Store, ChevronLeft, Search, FileText, Globe, Phone, FileDigit, Trash2, Pause, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Business, BusinessCategory, Agent, Client } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import { BUSINESS_CATEGORIES, COUNTRIES, LOCATION_DATA } from '../constants';
import { supabase } from '../lib/supabase';

interface MyBusinessesProps {
  onLogout: () => void;
  onBack: () => void;
}

export default function MyBusinesses({ onLogout, onBack }: MyBusinessesProps) {
  const permissions = usePermissions('mis_negocios');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);
  const [isAgentFormOpen, setIsAgentFormOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [newAgentData, setNewAgentData] = useState({
    name: '',
    role: 'Atención al Cliente',
    channel: 'WhatsApp' as 'WhatsApp' | 'Telegram',
    contactInfo: '',
    type: 'Servicios' as 'Servicios' | 'Productos',
    prompt: '',
  });
  const [newAgentFile, setNewAgentFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [kpiFilter, setKpiFilter] = useState('Total');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, countryFilter, cityFilter, yearFilter, monthFilter, kpiFilter]);

  useEffect(() => {
    setCityFilter('');
  }, [countryFilter]);

  const filteredByDate = useMemo(() => {
    return businesses.filter(b => {
      if (!b.isEstablishment) return false;
      const d = new Date(b.createdAt);
      const yearMatch = d.getFullYear().toString() === yearFilter;
      const monthMatch = monthFilter === 'all' || d.getMonth() === parseInt(monthFilter);
      return yearMatch && monthMatch;
    });
  }, [businesses, yearFilter, monthFilter]);

  const kpiData = useMemo(() => {
    return {
      total: filteredByDate.length,
      agentesActivos: filteredByDate.reduce((acc, b) => 
        acc + (b.agents?.filter(a => a.status === 'Activo').length || 0), 0)
    };
  }, [filteredByDate]);

  const filteredBusinesses = useMemo(() => {
    return filteredByDate.filter(b => {
      // KPI Filter
      if (kpiFilter === 'Agentes Activos' && (b.agents?.filter(a => a.status === 'Activo').length || 0) === 0) return false;

      const searchMatch = 
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.branchName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.responsibleName || '').toLowerCase().includes(searchTerm.toLowerCase());

      const countryMatch = countryFilter === '' || b.country === countryFilter;
      const cityMatch = cityFilter === '' || b.city === cityFilter;

      return searchMatch && countryMatch && cityMatch;
    });
  }, [filteredByDate, searchTerm, countryFilter, cityFilter, kpiFilter]);

  const totalPages = Math.ceil(filteredBusinesses.length / itemsPerPage);
  const currentBusinesses = filteredBusinesses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const [formData, setFormData] = useState({
    name: '',
    category: BusinessCategory.RETAIL,
    address: '',
    city: '',
    country: '',
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800&h=400'
  });
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [memoryFiles, setMemoryFiles] = useState<{ name: string; url: string; size: number; date: number }[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMemoryDragOver, setIsMemoryDragOver] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('capibee_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    
    const stored = localStorage.getItem('capibee_businesses');
    if (stored) {
      setBusinesses(JSON.parse(stored));
    }
  }, []);

  // Sync / Real-time with Supabase for businesses
  useEffect(() => {
    if (!currentUser) return;

    const fetchBusinesses = async () => {
      try {
        let query = supabase.from('businesses').select('*');
        
        const isSuperAdmin = currentUser?.roleName?.toLowerCase().includes('admin') || currentUser?.roleId === 'ADMIN_MAESTRO';
        if (!isSuperAdmin) {
          query = query.eq('responsible_name', currentUser.fullName);
        }

        const { data, error } = await query;
        if (!error && data) {
          const mapped = data.map((b: any) => ({
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
          setBusinesses(mapped);
          localStorage.setItem('capibee_businesses', JSON.stringify(mapped));
        }
      } catch (err) {
        console.warn("Could not fetch businesses from Supabase:", err);
      }
    };

    fetchBusinesses();

    // Subscribe to real-time changes
    const channel = supabase.channel('mybusinesses-realtime-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, () => {
        fetchBusinesses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const syncClients = async (newBusinesses: Business[]) => {
    try {
      const savedClientsRaw = localStorage.getItem("capibee_clientes");
      const currentClients: Client[] = savedClientsRaw ? JSON.parse(savedClientsRaw) : [];

      let clientsUpdated = false;
      const clientsToUpsert: Client[] = [];
      const clientsToDelete: string[] = [];

      newBusinesses.forEach((b) => {
        if (b.status === "Prop. Aceptada") {
          const existingClientIndex = currentClients.findIndex((c: any) => c.id === b.id);
          
          const mappedClient: Client = {
            id: b.id,
            type: "Empresa",
            companyName: b.name,
            contactName: b.contactName || "",
            email: b.email || "",
            phone: b.phone || "",
            language: "Español",
            currency: b.country === 'España' ? 'EURO' : 'USD',
            country: b.country || "",
            sector: b.category || "",
            address: b.address || "",
            createdAt: existingClientIndex !== -1 ? (currentClients[existingClientIndex].createdAt || Date.now()) : Date.now(),
            userId: b.userId || currentUser?.id || null
          };

          if (existingClientIndex === -1) {
            // New client
            clientsUpdated = true;
            currentClients.push(mappedClient);
            clientsToUpsert.push(mappedClient);
          } else {
            // Check if any fields changed to avoid redundant upserts
            const existing = currentClients[existingClientIndex];
            const hasChanged = 
              existing.companyName !== mappedClient.companyName ||
              existing.contactName !== mappedClient.contactName ||
              existing.email !== mappedClient.email ||
              existing.phone !== mappedClient.phone ||
              existing.country !== mappedClient.country ||
              existing.sector !== mappedClient.sector ||
              existing.address !== mappedClient.address ||
              existing.userId !== mappedClient.userId;
            
            if (hasChanged) {
              currentClients[existingClientIndex] = mappedClient;
              clientsUpdated = true;
              clientsToUpsert.push(mappedClient);
            }
          }
        } else {
          // If status is not "Prop. Aceptada", check if it is in clients and delete it
          const existingClientIndex = currentClients.findIndex((c: any) => c.id === b.id);
          if (existingClientIndex !== -1) {
            currentClients.splice(existingClientIndex, 1);
            clientsUpdated = true;
            clientsToDelete.push(b.id);
          }
        }
      });

      if (clientsUpdated) {
        localStorage.setItem("capibee_clientes", JSON.stringify(currentClients));
      }

      // Sync deletes in Supabase 'clients' table
      for (const id of clientsToDelete) {
        const { error: deleteErr } = await supabase.from('clients').delete().eq('id', id);
        if (deleteErr) {
          console.error("🔴 Supabase clients delete error:", deleteErr);
        } else {
          console.log("💚 Supabase client deleted successfully:", id);
        }
      }

      // Upsert to Supabase table 'clients'
      for (const c of clientsToUpsert) {
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
          console.error("🔴 Supabase clients sync error:", upsertErr);
        } else {
          console.log("💚 Supabase client synced successfully:", c.id);
        }
      }
    } catch (e) {
      console.error("🔴 General syncClients error:", e);
    }
  };

  const saveBusinesses = async (data: Business[]) => {
    // 1. Determine which businesses actually changed or are new
    const oldMap = new Map<string, Business>(businesses.map((b) => [b.id, b]));
    const toUpsert: Business[] = [];

    for (const b of data) {
      const old = oldMap.get(b.id);
      if (!old) {
        toUpsert.push(b);
      } else {
        const hasChanged =
          old.name !== b.name ||
          old.category !== b.category ||
          old.address !== b.address ||
          old.phone !== b.phone ||
          old.whatsapp !== b.whatsapp ||
          old.contactName !== b.contactName ||
          old.userId !== b.userId ||
          old.status !== b.status ||
          old.prefix !== b.prefix ||
          old.responsibleName !== b.responsibleName ||
          old.responsiblePhone !== b.responsiblePhone ||
          old.email !== b.email ||
          old.website !== b.website ||
          old.rating !== b.rating ||
          old.city !== b.city ||
          old.country !== b.country ||
          old.branchName !== b.branchName ||
          old.imageUrl !== b.imageUrl ||
          old.meetingDate !== b.meetingDate ||
          old.description !== b.description ||
          old.isEstablishment !== b.isEstablishment ||
          JSON.stringify(old.agents) !== JSON.stringify(b.agents) ||
          JSON.stringify(old.notes) !== JSON.stringify(b.notes) ||
          JSON.stringify(old.memoryFiles) !== JSON.stringify(b.memoryFiles);

        if (hasChanged) {
          toUpsert.push(b);
        }
      }
    }

    if (toUpsert.length === 0) {
      setBusinesses(data);
      localStorage.setItem('capibee_businesses', JSON.stringify(data));
      return;
    }

    // A. Persist ONLY changed rows to Supabase FIRST so the database has the new state immediately
    let anyError = false;
    for (const b of toUpsert) {
      const { error: upsertErr } = await supabase.from('businesses').upsert({
        id: b.id,
        name: b.name,
        category: b.category,
        address: b.address || '',
        phone: b.phone || '',
        whatsapp: b.whatsapp || '',
        contact_name: b.contactName || '',
        user_id: b.userId || (b.responsibleName === currentUser?.fullName ? currentUser?.id : null) || null,
        status: b.status || 'Nuevo',
        prefix: b.prefix || '',
        responsible_name: b.responsibleName || '',
        responsible_phone: b.responsiblePhone || '',
        email: b.email || '',
        website: b.website || '',
        rating: b.rating || 5,
        city: b.city || '',
        country: b.country || '',
        branch_name: b.branchName || '',
        image_url: b.imageUrl || '',
        meeting_date: b.meetingDate || '',
        description: b.description || '',
        is_establishment: b.isEstablishment || false,
        agents: b.agents || [],
        notes: b.notes || [],
        memory_files: b.memoryFiles || [],
        created_at: Number(b.createdAt) || Date.now()
      }, { onConflict: 'id' });

      if (upsertErr) {
        console.error("🔴 Supabase businesses upsert error in MyBusinesses:", upsertErr);
        anyError = true;
      } else {
        console.log("💚 Supabase business updated successfully in MyBusinesses:", b.id);
      }
    }

    // B. If no database update errors, sync clients, update React state and local storage
    if (!anyError) {
      await syncClients(toUpsert);
      setBusinesses(data);
      localStorage.setItem('capibee_businesses', JSON.stringify(data));
    } else {
      console.error("🔴 Failed to save businesses to Supabase, not updating local state.");
      alert("Error: No se pudo actualizar el estado en el servidor. Inténtalo de nuevo.");
    }
  };

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingBusinessId(null);
    setMemoryFiles([]);
    setSelectedLeadId('');
    setFormData({
      name: '',
      category: BusinessCategory.RETAIL,
      address: '',
      city: '',
      country: '',
      description: '',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800&h=400'
    });
  };

  const handleLeadSelect = (id: string) => {
    setSelectedLeadId(id);
    const lead = businesses.find(b => b.id === id);
    if (lead) {
      setFormData({
        ...formData,
        name: lead.name,
        address: lead.address || '',
        city: lead.city || '',
        country: lead.country || '',
        category: lead.category,
      });
    }
  };

  const handleEdit = (business: Business, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening agents view
    if (!permissions.edit) return;
    setEditingBusinessId(business.id);
    setMemoryFiles(business.memoryFiles || []);
    setFormData({
      name: business.name,
      category: business.category,
      address: business.address || '',
      city: business.city || '',
      country: business.country || '',
      description: business.description || '',
      imageUrl: business.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800&h=400'
    });
    setIsFormOpen(true);
  };

  const handleSubmitBusiness = (e: React.FormEvent) => {
    e.preventDefault();

    const businessData = {
      ...formData,
      memoryFiles,
      isEstablishment: true,
    };

    if (editingBusinessId) {
      const updatedBusinesses = businesses.map(b => 
        b.id === editingBusinessId ? { ...b, ...businessData } : b
      );
      saveBusinesses(updatedBusinesses);
    } else if (selectedLeadId) {
      // Update existing lead to establishment
      const updatedBusinesses = businesses.map(b => 
        b.id === selectedLeadId ? { ...b, ...businessData, notes: b.notes || [] } : b
      );
      saveBusinesses(updatedBusinesses);
    } else {
      const newBusiness: Business = {
        id: crypto.randomUUID(),
        ...businessData,
        agents: [],
        createdAt: Date.now()
      };
      saveBusinesses([newBusiness, ...businesses]);
    }
    resetForm();
  };

  const handleDeleteBusiness = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("¿Estás seguro de que quieres eliminar este establecimiento?")) {
      const updatedBusinesses = businesses.filter(b => b.id !== id);
      await saveBusinesses(updatedBusinesses);

      // Clean in Supabase live
      try {
        await supabase.from('businesses').delete().eq('id', id);
      } catch (err) {
        console.error("Supabase delete business error:", err);
      }
    }
  };

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness) return;

    const newAgent: Agent = {
      id: crypto.randomUUID(),
      ...newAgentData,
      role: `CapiBee - ${newAgentData.type}`,
      tasks: 0,
      efficiency: 100,
      status: 'Requerido'
    };

    const updatedBusiness = {
      ...selectedBusiness,
      agents: [...(selectedBusiness.agents || []), newAgent],
    };

    setSelectedBusiness(updatedBusiness);

    const newBusinessesList = businesses.map(b => b.id === updatedBusiness.id ? updatedBusiness : b);
    saveBusinesses(newBusinessesList);
    
    setNewAgentData({ 
      name: '', 
      role: 'Atención al Cliente',
      channel: 'WhatsApp',
      contactInfo: '',
      type: 'Servicios',
      prompt: ''
    });
    setNewAgentFile(null);
    setIsAgentFormOpen(false);
  };

  return (
    <div className="h-full bg-transparent flex flex-col font-sans overflow-hidden text-yellow-50">
      {/* Main Content */}
      <main className="flex-1 pt-2 sm:pt-4 lg:pt-6 p-4 sm:p-6 lg:p-10 overflow-y-auto relative custom-scrollbar min-h-0">
        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shrink-0">
            <div className="flex flex-col sm:flex-row gap-3 items-center w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Buscar por ID o Empresa..." 
                  className="w-full pl-9 pr-3 py-2.5 sm:py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-amber-500/50 text-slate-200 transition-all shadow-inner"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-48">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 sm:py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500/50 transition-all shadow-inner appearance-none cursor-pointer"
                  >
                    <option value="">Todos los Países</option>
                    {COUNTRIES.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  <Plus size={10} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-45 text-slate-600 pointer-events-none" />
                </div>
                <div className="relative w-full sm:w-48">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    disabled={!countryFilter}
                    className="w-full pl-9 pr-8 py-2.5 sm:py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500/50 transition-all shadow-inner appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Todas las Ciudades</option>
                    {countryFilter && LOCATION_DATA[countryFilter as keyof typeof LOCATION_DATA]?.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  <Plus size={10} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-45 text-slate-600 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsFormOpen(true)}
                disabled={!permissions.create}
                    className={`w-full sm:w-auto px-8 py-3 font-black uppercase tracking-widest rounded-xl transition-all text-xs flex items-center justify-center gap-2 group ${!permissions.create ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-slate-950 shadow-xl shadow-yellow-500/20 active:scale-95'}`}
              >
                <Plus size={16} strokeWidth={3} className={permissions.create ? "group-hover:rotate-90 transition-transform" : ""} /> Nuevo Establecimiento
              </button>
            </div>
          </div>


          {/* KPI Panel */}
          <div className="mb-8 px-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setKpiFilter(kpiFilter === 'Total' ? '' : 'Total')}
              className={`cursor-pointer p-5 rounded-2xl border shadow-lg transition-all duration-300 ${
                kpiFilter === 'Total' 
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`text-[10px] font-black uppercase tracking-widest ${kpiFilter === 'Total' ? 'text-yellow-400' : 'text-slate-500'}`}>Total Establecimientos</div>
                <Zap size={16} className={kpiFilter === 'Total' ? 'text-yellow-400' : 'text-slate-600'} />
              </div>
              <div className="text-4xl font-display font-black text-white">{kpiData.total}</div>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setKpiFilter(kpiFilter === 'Agentes Activos' ? '' : 'Agentes Activos')}
              className={`cursor-pointer p-5 rounded-2xl border shadow-lg transition-all duration-300 ${
                kpiFilter === 'Agentes Activos' 
                  ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`text-[10px] font-black uppercase tracking-widest ${kpiFilter === 'Agentes Activos' ? 'text-emerald-400' : 'text-slate-500'}`}>Agentes Activos</div>
                <Activity size={16} className={kpiFilter === 'Agentes Activos' ? 'text-emerald-400' : 'text-slate-600'} />
              </div>
              <div className="text-4xl font-display font-black text-white">{kpiData.agentesActivos}</div>
            </motion.div>
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20 sm:pb-0">
            {currentBusinesses.map((business, index) => (
              <motion.div
                key={business.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, type: "tween" }}
                className="group relative cursor-pointer"
                onClick={() => setSelectedBusiness(business)}
              >
                {/* Business Card */}
                <div 
                  className="relative bg-slate-900 border border-amber-500/10 shadow-lg hover:shadow-2xl overflow-hidden transition-all duration-300 group-hover:border-amber-500/30 group-hover:-translate-y-1 rounded-2xl flex flex-col"
                  style={{ height: '240px' }}
                >
                  <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-slate-950 via-slate-950/60 to-transparent pointer-events-none z-10" />
                  <img src={business.imageUrl} alt={business.name} className="absolute inset-0 w-full h-20 object-cover opacity-60 group-hover:opacity-90 transition-opacity duration-300" />
                  
                  <div className="p-4 pt-12 h-full flex flex-col relative z-20">
                    <div className="absolute top-3 right-3 z-30">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${((business.agents?.length || 0) > 0) ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                        {((business.agents?.length || 0) > 0) ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="mb-auto mt-2">
                      <div className="text-[8px] font-bold text-amber-950 bg-amber-400 inline-block px-1.5 py-0.5 rounded uppercase tracking-wider mb-2">
                        {business.category.split(' ')[0]}
                      </div>
                      <h3 className="text-base font-display font-bold text-white leading-tight mb-2 truncate group-hover:text-amber-400 transition-colors">
                        {business.name}
                      </h3>
                      
                      <div className="flex flex-col gap-2.5 mt-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                            <MapPin size={10} className="text-slate-500 shrink-0" />
                            <span className="truncate">{(business.city || business.country) ? `${business.city || ''}${business.city && business.country ? ', ' : ''}${business.country || ''}` : 'Sin ubicación'}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2 bg-slate-950/50 p-1.5 rounded-lg border border-slate-800">
                            <Bug size={12} className="text-yellow-500" />
                            <div className="flex flex-col leading-none">
                              <span className="text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">CapiBees</span>
                              <span className="text-xs font-bold text-slate-200">{business.agents?.length || 0}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-950/50 p-1.5 rounded-lg border border-slate-800">
                            <Target size={12} className="text-amber-500" />
                            <div className="flex flex-col leading-none">
                              <span className="text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">Tareas</span>
                              <span className="text-xs font-bold text-slate-200">{business.agents?.reduce((s, a) => s + a.tasks, 0) || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center opacity-70 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                        {business.responsibleName && (
                          <>
                            <UserIcon size={10} className="text-slate-500" />
                            <span className="truncate max-w-[120px]">{business.responsibleName}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => permissions.edit && handleEdit(business, e)}
                          disabled={!permissions.edit}
                          className={`p-1.5 rounded transition-colors ${!permissions.edit ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'}`}
                          title="Editar Establecimiento"
                        >
                          <Zap size={14} />
                        </button>
                        <button
                          onClick={(e) => permissions.delete && handleDeleteBusiness(business.id, e)}
                          disabled={!permissions.delete}
                          className={`p-1.5 rounded transition-colors ${!permissions.delete ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'}`}
                          title="Eliminar Establecimiento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {totalPages > 1 && (
              <div className="col-span-full py-4 flex justify-center gap-2 items-center">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1 bg-slate-900 border border-amber-900 text-amber-100 rounded text-xs disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-amber-500 text-xs">Página {currentPage} de {totalPages}</span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1 bg-slate-900 border border-amber-900 text-amber-100 rounded text-xs disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            )}

            {filteredBusinesses.length === 0 && (
              <div className="col-span-full py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-amber-900/50 rounded-3xl bg-slate-900/50 backdrop-blur-sm">
                 <div className="w-16 h-16 mb-4 text-amber-800 animate-pulse">
                   <Store size={64} fill="currentColor" fillOpacity={0.1} />
                 </div>
                 <p className="text-amber-500 font-bold text-lg">
                   {businesses.length === 0 ? "No hay establecimientos registrados" : "No se encontraron resultados"}
                 </p>
                 <p className="text-slate-500 text-sm mt-1">
                   {businesses.length === 0 ? 'Usa el botón "Nuevo Establecimiento" para comenzar' : 'Prueba con otros términos de búsqueda'}
                 </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Form */}
      <AnimatePresence>
        {selectedBusiness && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-slate-900 border-x-0 sm:border-2 border-amber-500/50 rounded-none sm:rounded-2xl w-full max-w-4xl min-h-full sm:min-h-0 overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)] relative"
            >
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[size:100%_4px] pointer-events-none z-50 opacity-20" />
              
              <div className="border-b border-amber-900/50 p-4 sm:p-6 flex items-center justify-between bg-slate-950 relative z-10 gap-4">
                <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                  {selectedAgent && (
                    <button 
                      onClick={() => setSelectedAgent(null)}
                      className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-slate-900 border border-amber-800 flex items-center justify-center text-amber-400 hover:bg-amber-900 hover:text-amber-100 transition-colors"
                    >
                      <ChevronLeft size={16} className="sm:w-[20px] sm:h-[20px]" />
                    </button>
                  )}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-amber-950 rounded-xl border border-amber-500/30 flex items-center justify-center shadow-inner">
                    <Bug className="text-yellow-400 w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="text-lg sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 uppercase tracking-widest leading-none truncate">
                      {selectedAgent ? selectedAgent.name : selectedBusiness.name}
                    </h3>
                    <p className="text-amber-500/60 text-[9px] sm:text-xs font-bold uppercase tracking-[0.2em] mt-1 truncate">
                      {selectedAgent ? `CapiBee - ${selectedAgent.role}` : `${selectedBusiness.city || ''} ${selectedBusiness.country ? `• ${selectedBusiness.country}` : ''}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  {!selectedAgent && (
                    <div className="hidden sm:flex bg-slate-900 border border-amber-900/50 rounded-lg p-1">
                      <button className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950 rounded-md">Agentes</button>
                    </div>
                  )}
                  <button 
                    onClick={() => { setSelectedBusiness(null); setSelectedAgent(null); }}
                    className="p-2 text-amber-600 hover:text-red-500 transition-colors"
                  >
                    <X size={20} className="sm:w-[24px] sm:h-[24px]" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 md:p-8 relative z-10 max-h-[calc(100vh-120px)] sm:max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-900 space-y-6 sm:space-y-8">
                <style>{`
                  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                  .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
                  .custom-scrollbar::-webkit-scrollbar-thumb { background: #064e3b; border-radius: 3px; }
                  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #047857; }
                `}</style>

                {!selectedAgent && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {/* Left Column: Description */}
                    <div className="md:col-span-2 space-y-4">
                       <h4 className="text-[10px] sm:text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 border-b border-amber-900/50 pb-2">
                         <FileText size={14} /> Descripción del Negocio
                       </h4>
                       <div className="bg-slate-950 p-4 rounded-xl border border-amber-900/20 min-h-[80px]">
                         <p className="text-sm text-slate-300 italic font-medium">
                           {selectedBusiness.description || 'No hay una descripción registrada para este establecimiento.'}
                         </p>
                       </div>
                    </div>
                    {/* Right Column: Memoria */}
                    <div className="space-y-4">
                       <h4 className="text-[10px] sm:text-xs font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2 border-b border-amber-900/50 pb-2">
                         <Activity size={14} /> Memoria Técnica
                       </h4>
                       <div className="grid grid-cols-1 gap-2">
                          {(selectedBusiness.memoryFiles || []).map((file, i) => (
                             <a 
                                key={i} 
                                href={file.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-3 bg-slate-950 border border-amber-900/30 p-2.5 rounded-lg hover:border-amber-500/50 transition-all group/file"
                             >
                                <div className="p-2 bg-amber-500/10 rounded group-hover/file:bg-amber-500/20 transition-colors border border-amber-500/10">
                                   <FileDigit size={16} className="text-amber-400" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                   <span className="text-[11px] font-bold text-amber-100 truncate">{file.name}</span>
                                   <span className="text-[9px] text-slate-500 uppercase tracking-tighter mt-0.5">{(file.size / 1024).toFixed(1)} KB</span>
                                </div>
                             </a>
                          ))}
                          {(!selectedBusiness.memoryFiles || selectedBusiness.memoryFiles.length === 0) && (
                             <p className="text-[10px] text-slate-500 italic text-center py-4 bg-slate-950/30 rounded border border-dashed border-slate-800">No hay documentos cargados.</p>
                          )}
                       </div>
                    </div>
                  </div>
                )}

                {selectedAgent ? (
                   // AGENT VIEW
                   <div className="w-full overflow-x-auto custom-scrollbar pt-2">
                     <div className="min-w-[800px] border border-slate-800 rounded-xl bg-slate-900 shadow-xl overflow-hidden">
                       <div className="grid grid-cols-[2fr_2fr_1.5fr_1.5fr_1.5fr_1fr_1fr] gap-4 p-4 items-center uppercase tracking-widest text-[9px] font-bold text-slate-400 border-b border-slate-800 bg-slate-950">
                         <div className="pl-2">Agente</div>
                         <div>Razón Social</div>
                         <div>País</div>
                         <div>Estado</div>
                         <div>Canal</div>
                         <div>Tareas</div>
                         <div className="text-right pr-2">Acciones</div>
                       </div>
                       <div className="grid grid-cols-[2fr_2fr_1.5fr_1.5fr_1.5fr_1fr_1fr] gap-4 p-4 items-center hover:bg-slate-800/30 transition-colors">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#0a192f] border border-blue-900/50 flex items-center justify-center shrink-0 shadow-inner">
                               <Bot className="text-blue-500 w-5 h-5" />
                            </div>
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-white text-[15px] leading-tight mb-0.5 truncate">{selectedAgent.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{selectedAgent.role || 'Asistente IA'}</p>
                            </div>
                         </div>
                         <div className="font-bold text-slate-200 text-sm uppercase leading-snug truncate pr-2">
                            {selectedBusiness.name}
                         </div>
                         <div className="text-slate-400 text-sm truncate">
                            {selectedBusiness.country || 'Sin país'}
                         </div>
                         <div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${
                              selectedAgent.status === 'Activo' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 
                              selectedAgent.status === 'Pruebas' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                              (selectedAgent.status === 'En Desarrollo' || selectedAgent.status === 'Requerido') ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                              'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              <span className="flex h-2 w-2 relative">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                  selectedAgent.status === 'Activo' ? 'bg-emerald-400' :
                                  selectedAgent.status === 'Pruebas' ? 'bg-blue-400' :
                                  (selectedAgent.status === 'En Desarrollo' || selectedAgent.status === 'Requerido') ? 'bg-amber-400' :
                                  'bg-slate-400'
                                }`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                  selectedAgent.status === 'Activo' ? 'bg-emerald-500' :
                                  selectedAgent.status === 'Pruebas' ? 'bg-blue-500' :
                                  (selectedAgent.status === 'En Desarrollo' || selectedAgent.status === 'Requerido') ? 'bg-amber-500' :
                                  'bg-slate-500'
                                }`}></span>
                              </span>
                              {selectedAgent.status || 'Requerido'}
                            </span>
                         </div>
                         <div className="text-slate-300 text-sm truncate">
                           {selectedAgent.channel || 'WhatsApp'}
                         </div>
                         <div>
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-[#2a1a08] text-[#eab308] border border-transparent font-mono font-bold text-xs">
                              {selectedAgent.tasks || 0}
                            </span>
                         </div>
                         <div className="flex justify-end gap-2 text-right pr-2">
                            {/* Acciones */}
                         </div>
                       </div>
                     </div>
                   </div>
                ) : (
                   // LIST AND CREATE
                   <div className="flex flex-col md:flex-row gap-6 md:gap-8 pt-4">
                      {/* Left Side: Existing CapiBees */}
                      <div className="flex-1 md:col-span-2 space-y-4">
                         <h4 className="text-[10px] sm:text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 border-b border-amber-900/50 pb-2">
                           <Target size={14} /> Agentes CapiBee
                         </h4>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {(selectedBusiness.agents || []).map(agent => (
                              <div 
                                 key={agent.id} 
                                 className="bg-slate-950 border border-amber-900/30 p-4 rounded-xl group hover:border-yellow-400/50 transition-all shadow-[0_4px_10px_rgba(0,0,0,0.3)] flex flex-col justify-between"
                              >
                                 <div className="flex items-center justify-between gap-3 mb-6">
                                   <div className="flex items-center gap-3 cursor-pointer w-full" onClick={() => setSelectedAgent(agent)}>
                                     <div className="w-10 h-10 rounded-lg bg-amber-900/20 border border-amber-800 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 group-hover:border-amber-500/40 transition-colors shrink-0">
                                       <Bug size={18} />
                                     </div>
                                     <div className="min-w-0 flex-1">
                                       <p className="font-bold text-base text-white truncate leading-tight mb-1">{agent.name}</p>
                                       <p className="text-[9px] font-bold text-amber-500 uppercase tracking-[0.1em] truncate">Asistente IA</p>
                                     </div>
                                   </div>
                                 </div>
                                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider px-1">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border shrink-0 ${
                                       agent.status === 'Activo' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' :
                                       agent.status === 'Pruebas' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                       (agent.status === 'En Desarrollo' || agent.status === 'Requerido') ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                                       'bg-slate-800 text-slate-400 border-slate-700'
                                    }`}>
                                      <span className="flex h-1.5 w-1.5 relative">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                          agent.status === 'Activo' ? 'bg-emerald-400' :
                                          agent.status === 'Pruebas' ? 'bg-blue-400' :
                                          (agent.status === 'En Desarrollo' || agent.status === 'Requerido') ? 'bg-amber-400' :
                                          'bg-slate-400'
                                        }`}></span>
                                        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                                          agent.status === 'Activo' ? 'bg-emerald-500' :
                                          agent.status === 'Pruebas' ? 'bg-blue-500' :
                                          (agent.status === 'En Desarrollo' || agent.status === 'Requerido') ? 'bg-amber-500' :
                                          'bg-slate-500'
                                        }`}></span>
                                      </span>
                                      {agent.status || 'Requerido'}
                                    </span>
                                    <span className="text-amber-400">{agent.tasks} Tareas</span>
                                 </div>
                              </div>
                           ))}
                           {(!selectedBusiness.agents || selectedBusiness.agents.length === 0) && (
                              <div className="col-span-full py-8 text-center text-[11px] text-amber-700 italic border border-dashed border-amber-900/30 rounded-xl bg-slate-950/50 uppercase tracking-widest">
                                Aún no has creado ningún CapiBee
                              </div>
                           )}
                         </div>
                      </div>

                      {/* Right Side: Create New */}
                      <div className="w-full md:w-64 lg:w-72 shrink-0 space-y-4">
                         <h4 className="text-[10px] sm:text-xs font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2 border-b border-amber-900/50 pb-2">
                           <Plus size={14} /> Crear Nuevo CapiBee
                         </h4>
                         
                         <button 
                            onClick={() => setIsAgentFormOpen(true)}
                            disabled={!permissions.edit}
                            className={`w-full h-[120px] sm:h-[136px] bg-slate-950 border transition-all flex flex-col items-center justify-center gap-3 rounded-xl group ${!permissions.edit ? 'border-slate-800 text-slate-600 cursor-not-allowed' : 'border-amber-800 hover:border-amber-500 hover:bg-amber-500/5'}`}
                         >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${!permissions.edit ? 'bg-slate-900 text-slate-700' : 'bg-amber-900/20 text-amber-500 group-hover:text-amber-400'}`}>
                              <Plus size={24} strokeWidth={2.5} />
                            </div>
                            <span className={`${!permissions.edit ? 'text-slate-600' : 'text-amber-500 group-hover:text-amber-400'} font-bold transition-colors text-[13px] tracking-wide`}>Crear CapiBee</span>
                         </button>
                      </div>
                   </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Agent Creation Modal */}
      <AnimatePresence>
        {isAgentFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-slate-900 border-x-0 sm:border-2 border-amber-500/50 rounded-none sm:rounded-2xl w-full max-w-lg min-h-full sm:min-h-0 overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)] relative"
            >
              <div className="border-b border-amber-900/50 p-4 sm:p-6 flex items-center justify-between bg-slate-950 relative z-10 sticky top-0">
                <h3 className="text-lg sm:text-xl font-bold text-white uppercase tracking-widest">
                  Nuevo CapiBee
                </h3>
                <button 
                  onClick={() => setIsAgentFormOpen(false)}
                  className="p-2 text-amber-600 hover:text-red-500 transition-colors"
                >
                  <X size={20} className="sm:w-[24px] sm:h-[24px]" />
                </button>
              </div>

              <form onSubmit={handleCreateAgent} className="p-4 sm:p-6 md:p-8 space-y-4 max-h-[calc(100vh-80px)] sm:max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest">Nombre del Agente</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ej. Soporte-01"
                      className="w-full px-3 py-2 bg-slate-900 border border-amber-900 rounded-lg text-sm text-amber-100 focus:outline-none focus:border-yellow-400 font-mono"
                      value={newAgentData.name}
                      onChange={e => setNewAgentData({ ...newAgentData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest">Canal</label>
                    <select 
                      required
                      className="w-full px-3 py-2 bg-slate-900 border border-amber-900 rounded-lg text-sm text-amber-100 focus:outline-none focus:border-yellow-400 font-mono"
                      value={newAgentData.channel}
                      onChange={e => setNewAgentData({ ...newAgentData, channel: e.target.value as 'WhatsApp' | 'Telegram' })}
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Telegram">Telegram</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest">Teléfono o Usuario Telegram</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ej. +54911..."
                      className="w-full px-3 py-2 bg-slate-900 border border-amber-900 rounded-lg text-sm text-amber-100 focus:outline-none focus:border-yellow-400 font-mono"
                      value={newAgentData.contactInfo}
                      onChange={e => setNewAgentData({ ...newAgentData, contactInfo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest">Tipo</label>
                    <select 
                      required
                      className="w-full px-3 py-2 bg-slate-900 border border-amber-900 rounded-lg text-sm text-amber-100 focus:outline-none focus:border-yellow-400 font-mono"
                      value={newAgentData.type}
                      onChange={e => setNewAgentData({ ...newAgentData, type: e.target.value as 'Servicios' | 'Productos' })}
                    >
                      <option value="Servicios">Servicios</option>
                      <option value="Productos">Productos</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest">Prompt</label>
                    <textarea 
                      required
                      placeholder="Instrucciones para el agente..."
                      className="w-full px-3 py-2 bg-slate-900 border border-amber-900 rounded-lg text-sm text-amber-100 focus:outline-none focus:border-yellow-400 font-mono h-20 resize-none"
                      value={newAgentData.prompt}
                      onChange={e => setNewAgentData({ ...newAgentData, prompt: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest">Subir Datos</label>
                    <input 
                      type="file"
                      accept=".pdf,.txt,.xlsx"
                      className="w-full px-3 py-2 bg-slate-900 border border-amber-900 rounded-lg text-sm text-amber-100 focus:outline-none focus:border-yellow-400 font-mono"
                      onChange={e => setNewAgentFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full mt-4 py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={14} strokeWidth={3} /> Desplegar Agente
                  </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-slate-900 border-x-0 sm:border-2 border-amber-900 rounded-none sm:rounded-2xl w-full max-w-2xl min-h-full sm:min-h-0 overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)] relative flex flex-col"
            >
              {/* Scanline overlay */}
               <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[size:100%_4px] pointer-events-none z-50 opacity-20" />

              <div className="border-b border-amber-900 p-4 sm:p-6 flex items-center justify-between bg-slate-950 relative z-20 sticky top-0 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-5 sm:w-2 sm:h-6 bg-yellow-400 rounded-sm shadow-[0_0_8px_rgba(250,204,21,0.6)] animate-pulse" />
                  <h3 className="text-lg sm:text-xl font-bold text-white uppercase tracking-widest">
                    {editingBusinessId ? 'Editar Establecimiento' : 'Nuevo Establecimiento'}
                  </h3>
                </div>
                <button 
                  onClick={resetForm}
                  className="p-2 text-amber-600 hover:text-red-500 transition-colors"
                >
                  <X size={20} className="sm:w-[24px] sm:h-[24px]" />
                </button>
              </div>

              <form onSubmit={handleSubmitBusiness} className="p-4 sm:p-6 sm:p-8 space-y-6 relative z-10 max-h-[calc(100vh-140px)] sm:max-h-[70vh] overflow-y-auto overflow-x-hidden custom-scrollbar flex-1">
                <style>{`
                  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                  .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
                  .custom-scrollbar::-webkit-scrollbar-thumb { background: #064e3b; border-radius: 3px; }
                  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #047857; }
                `}</style>
                
                <div className="flex flex-col gap-5 sm:gap-6">
                  {/* Status Badge */}
                  <div className="flex justify-end mb-[-10px]">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      editingBusinessId 
                      ? ((businesses.find(b => b.id === editingBusinessId)?.agents?.length || 0) > 0 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700')
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {editingBusinessId 
                        ? (((businesses.find(b => b.id === editingBusinessId)?.agents?.length || 0) > 0) ? 'Estado: Activo' : 'Estado: Inactivo')
                        : 'Estado: Inactivo'
                      }
                    </span>
                  </div>

                  {/* Image Preview Section */}
                  <div className="relative h-32 sm:h-40 bg-slate-950 rounded-xl overflow-hidden border border-amber-900/50 group/preview shrink-0">
                    <img 
                      src={formData.imageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover opacity-60 group-hover/preview:opacity-80 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent flex flex-col justify-end p-3 sm:p-4">
                      <span className="text-[8px] sm:text-[10px] font-bold text-yellow-400 uppercase tracking-[0.2em] mb-1">Vista Previa de Tarjeta</span>
                      <h4 className="text-lg sm:text-xl font-black text-white uppercase truncate">{formData.name || 'Nombre del Establecimiento'}</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest">Imagen de Portada</label>
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragOver(false);
                          const file = e.dataTransfer.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const newImage = reader.result as string;
                              setFormData({ ...formData, imageUrl: newImage });
                              if (editingBusinessId) {
                                const updatedBusinesses = businesses.map(b => 
                                  b.id === editingBusinessId ? { ...b, imageUrl: newImage } : b
                                );
                                saveBusinesses(updatedBusinesses);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className={`relative h-24 sm:h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all ${isDragOver ? 'border-yellow-400 bg-amber-500/10' : 'border-amber-900 bg-slate-950'}`}
                      >
                        <input 
                          type="file" 
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const newImage = reader.result as string;
                                setFormData({ ...formData, imageUrl: newImage });
                                if (editingBusinessId) {
                                  const updatedBusinesses = businesses.map(b => 
                                    b.id === editingBusinessId ? { ...b, imageUrl: newImage } : b
                                  );
                                  saveBusinesses(updatedBusinesses);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <Plus className={`mb-1.5 ${isDragOver ? 'text-yellow-400' : 'text-amber-700'} sm:w-[24px] sm:h-[24px]`} size={20} />
                        <span className="text-[9px] sm:text-[10px] font-bold text-amber-600 uppercase tracking-widest px-4 text-center">Click o Arrastra para subir</span>
                      </div>
                    </div>

                    {!editingBusinessId && (
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest">Vincular con Cliente (Lead)</label>
                        <select 
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-950 border border-amber-900 rounded-lg text-sm text-amber-100 focus:outline-none focus:border-yellow-400 focus:shadow-[0_0_10px_rgba(250,204,21,0.2)] transition-all font-mono cursor-pointer"
                          value={selectedLeadId}
                          onChange={e => handleLeadSelect(e.target.value)}
                        >
                          <option value="">-- Seleccionar un Cliente --</option>
                          {businesses.filter(b => {
                              const isSuperAdmin = currentUser?.roleName?.toLowerCase() === "superadmin" || currentUser?.roleId === "ADMIN_MAESTRO";
                              return !b.isEstablishment && b.status === 'Prop. Aceptada' && (isSuperAdmin || b.responsibleName === currentUser?.fullName);
                          }).map(lead => (
                            <option key={lead.id} value={lead.id}>{lead.name} ({lead.city || 'Sin ciudad'})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest">Nombre del Establecimiento</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-950 border border-amber-900 rounded-lg text-sm text-amber-100 focus:outline-none focus:border-yellow-400 focus:shadow-[0_0_10px_rgba(250,204,21,0.2)] transition-all font-mono"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest">País</label>
                      <input 
                        type="text" 
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-950 border border-amber-900 rounded-lg text-sm text-amber-100 focus:outline-none focus:border-yellow-400 transition-all font-mono"
                        value={formData.country}
                        onChange={e => setFormData({ ...formData, country: e.target.value })}
                        placeholder="Ej. Argentina"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest">Ciudad</label>
                      <input 
                        type="text" 
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-950 border border-amber-900 rounded-lg text-sm text-amber-100 focus:outline-none focus:border-yellow-400 transition-all font-mono"
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Ej. Buenos Aires"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest">Sector / Categoría</label>
                    <select 
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-950 border border-amber-900 rounded-lg text-sm text-amber-100 focus:outline-none focus:border-yellow-400 focus:shadow-[0_0_10px_rgba(250,204,21,0.2)] transition-all font-mono cursor-pointer"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value as BusinessCategory })}
                    >
                      {BUSINESS_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest">Dirección Exacta</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Calle, Número, Local..."
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-950 border border-amber-900 rounded-lg text-sm text-amber-100 focus:outline-none focus:border-yellow-400 transition-all font-mono"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest">Descripción del Negocio</label>
                    <textarea 
                      placeholder="Breve descripción del negocio y su core..."
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-950 border border-amber-900 rounded-lg text-sm text-amber-100 focus:outline-none focus:border-yellow-400 transition-all font-mono h-24 resize-none"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest">Memoria (Documentos)</label>
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setIsMemoryDragOver(true); }}
                      onDragLeave={() => setIsMemoryDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsMemoryDragOver(false);
                        const files = Array.from(e.dataTransfer.files) as File[];
                        files.forEach(file => {
                          const newFile = {
                            name: file.name,
                            url: URL.createObjectURL(file),
                            size: file.size,
                            date: Date.now()
                          };
                          setMemoryFiles(prev => [...prev, newFile]);
                        });
                      }}
                      className={`relative min-h-[100px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all p-4 ${isMemoryDragOver ? 'border-yellow-400 bg-amber-500/10' : 'border-amber-900 bg-slate-950'}`}
                    >
                      <input 
                        type="file" 
                        multiple
                        accept=".pdf,.txt,.xlsx,.csv,.doc,.docx"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []) as File[];
                          files.forEach(file => {
                            const newFile = {
                              name: file.name,
                              url: URL.createObjectURL(file),
                              size: file.size,
                              date: Date.now()
                            };
                            setMemoryFiles(prev => [...prev, newFile]);
                          });
                        }}
                      />
                      <FileText className={`mb-1.5 ${isMemoryDragOver ? 'text-yellow-400' : 'text-amber-700'} sm:w-[24px] sm:h-[24px]`} size={20} />
                      <span className="text-[9px] sm:text-[10px] font-bold text-amber-600 uppercase tracking-widest text-center px-4">Añadir documentos a la memoria</span>
                      <span className="text-[7px] sm:text-[8px] text-slate-500 mt-1 uppercase text-center">Entrenamiento del agente IA</span>
                    </div>

                    {memoryFiles.length > 0 && (
                      <div className="mt-4 space-y-2 pb-4">
                        {memoryFiles.map((file, i) => (
                          <div key={i} className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-amber-900/30">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileDigit size={14} className="text-amber-500 shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-bold text-amber-100 truncate">{file.name}</span>
                                <span className="text-[8px] text-slate-500 lowercase">{(file.size / 1024).toFixed(1)} KB</span>
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setMemoryFiles(prev => prev.filter((_, idx) => idx !== i))}
                              className="p-1 text-red-900 hover:text-red-500 transition-colors shrink-0"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  </div>
                </div>

                <div className="pt-6 pb-6 sm:pb-0 flex justify-end gap-3 sticky bottom-0 bg-slate-900 mt-auto sm:static shrink-0 px-4 sm:px-0">
                  <button 
                    type="button"
                    onClick={resetForm}
                    className="flex-1 sm:flex-none px-4 py-3 sm:px-6 text-xs font-bold text-amber-500 hover:text-amber-400 uppercase tracking-widest transition-colors font-mono"
                  >
                    Abortar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 sm:flex-none px-6 py-3 bg-yellow-400 text-slate-900 text-xs font-black uppercase tracking-widest rounded-sm hover:bg-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.4)] active:scale-95 transition-all font-mono flex items-center justify-center gap-2"
                  >
                    {editingBusinessId ? <Target size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
                    <span className="sm:inline">{editingBusinessId ? 'Guardar' : 'Desplegar'}</span>
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
