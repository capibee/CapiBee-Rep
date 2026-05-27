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
  Phone,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { Client, Business } from "../types";

const getCountryName = (phoneNumberString: string) => {
  try {
    const phoneNumber = parsePhoneNumberFromString("+" + phoneNumberString.replace(/[^0-9]/g, ''));
    if (phoneNumber && phoneNumber.country) {
      const displayNames = new Intl.DisplayNames(['es'], { type: 'region' });
      return displayNames.of(phoneNumber.country);
    }
  } catch (e) {
    console.error(e);
  }
  return null;
};
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
  const [callConfirmModal, setCallConfirmModal] = useState<{
    isOpen: boolean;
    businessName: string;
    phoneNumber: string;
    cleanNumber: string;
  } | null>(null);

  const handlePhoneClick = (id: string, name: string, phone: string) => {
    const clean = phone.replace(/[^0-9+]/g, '');
    if (clean) {
       setCallConfirmModal({
         isOpen: true,
         businessName: name,
         phoneNumber: phone,
         cleanNumber: clean
       });
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(id);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const executePhoneCall = () => {
    if (!callConfirmModal) return;
    window.location.href = `tel:${callConfirmModal.cleanNumber}`;
    setCallConfirmModal(null);
  };

  // Form State
  const [formData, setFormData] = useState({
    type: "Empresa" as "Particular" | "Empresa",
    companyName: "",
    phone: "", // Telefono empresa
    sector: "",
    country: "",
    city: "", // ciudad
    contactName: "",
    contactPhone: "", // Telefono contacto
    email: "", // Correo contacto
    language: "Español" as (typeof LANGUAGES)[number],
    currency: "USD" as (typeof CURRENCIES)[number],
    address: "",
  });

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("capibee_user");
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch(e){}

    try {
      const saved = localStorage.getItem("capibee_clientes");
      if (saved) {
        setClientes(JSON.parse(saved));
      }
    } catch(e){}

    try {
      const savedBusinesses = localStorage.getItem("capibee_businesses");
      if (savedBusinesses) {
        setBusinesses(JSON.parse(savedBusinesses));
      }
    } catch(e) {}
    
    const timer = setTimeout(() => setIsTableLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Autofill form when navigated with a pending client prefill
  useEffect(() => {
    try {
      const prefillRaw = localStorage.getItem("capibee_pending_new_client_prefill");
      if (prefillRaw) {
        const prefill = JSON.parse(prefillRaw);
        console.log("Detectado prefill de cliente pendiente para el formulario:", prefill);
        setFormData((prev) => ({
          ...prev,
          type: (prefill.type === "Persona" ? "Particular" : prefill.type) || "Empresa",
          companyName: prefill.companyName || "",
          phone: prefill.phone || "",
          sector: prefill.sector || "",
          country: prefill.country || "",
          city: prefill.city || "",
          contactName: prefill.contactName || "",
          contactPhone: prefill.contactPhone || prefill.phone || "",
          email: prefill.email || "",
          address: prefill.address || "",
        }));
        setIsModalOpen(true);
        localStorage.removeItem("capibee_pending_new_client_prefill");
      }
    } catch (e) {
      console.error("Error al procesar pre-completado de campos de cliente:", e);
    }
  }, []);

  // Connect to Supabase for dynamic data and real-time subscription
  useEffect(() => {
    const fetchFreshData = async () => {
      try {
        // Fetch clients
        const { data: dbClients, error: clientsErr } = await supabase.from('Clientes').select('*').order('created_at', { ascending: false });
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
            userId: c.user_id || null,
            city: c.city || c.address || '',
            contactPhone: c.contact_phone || c.phone || '',
          })).sort((a: any, b: any) => b.createdAt - a.createdAt);
          setClientes(mappedC);
          localStorage.setItem("capibee_clientes", JSON.stringify(mappedC));
        }

        // Fetch businesses
        const { data: dbBusinesses, error: busErr } = await supabase.from('Directorio').select('*').order('created_at', { ascending: false });
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Clientes' }, () => {
        fetchFreshData();
      })
      .subscribe();

    const businessesChannel = supabase.channel('businesses-realtime-clientes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Directorio' }, () => {
        fetchFreshData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(businessesChannel);
    };
  }, []);

  const saveClientes = async (newClientes: Client[], clientToPersist?: Client) => {
    setClientes(newClientes);
    localStorage.setItem("capibee_clientes", JSON.stringify(newClientes));

    if (!clientToPersist) return;

    // Define different payload variations depending on database constraints
    const fullPayload = {
      id: clientToPersist.id,
      type: clientToPersist.type || 'Particular',
      company_name: clientToPersist.companyName || '',
      contact_name: clientToPersist.contactName,
      email: clientToPersist.email && clientToPersist.email.trim() !== '' ? clientToPersist.email.trim() : null,
      language: clientToPersist.language || 'Español',
      currency: clientToPersist.currency || 'USD',
      country: clientToPersist.country || '',
      address: clientToPersist.address || '',
      city: clientToPersist.city || '',
      contact_phone: clientToPersist.contactPhone || '',
      sector: clientToPersist.sector || '',
      phone: clientToPersist.phone || '',
      created_at: Number(clientToPersist.createdAt) || Date.now(),
      user_id: clientToPersist.userId || null
    };

    const fallbackNoColsPayload = {
      id: clientToPersist.id,
      type: clientToPersist.type || 'Particular',
      company_name: clientToPersist.companyName || '',
      contact_name: clientToPersist.contactName,
      email: clientToPersist.email && clientToPersist.email.trim() !== '' ? clientToPersist.email.trim() : null,
      language: clientToPersist.language || 'Español',
      currency: clientToPersist.currency || 'USD',
      country: clientToPersist.country || '',
      address: clientToPersist.address || '',
      sector: clientToPersist.sector || '',
      phone: clientToPersist.phone || '',
      created_at: Number(clientToPersist.createdAt) || Date.now(),
      user_id: clientToPersist.userId || null
    };

    console.log("Iniciando guardado de cliente en Supabase:", clientToPersist.id);
    
    // First attempt: try with everything (full columns and assigned user_id)
    const { error: err1 } = await supabase.from('Clientes').upsert(fullPayload, { onConflict: 'id' });

    if (err1) {
      console.warn("Intento principal de guardado falló, código:", err1.code, "mensaje:", err1.message);
      
      const isMissingColumns = err1.code === '42703' || err1.message?.toLowerCase().includes('column') || err1.message?.toLowerCase().includes('no existe la columna');
      const isForeignKeyViolation = err1.code === '23503' || err1.message?.toLowerCase().includes('foreign key') || err1.message?.toLowerCase().includes('llave foránea') || err1.message?.toLowerCase().includes('user_id');

      if (isMissingColumns && isForeignKeyViolation) {
        console.log("Doble incompatibilidad (columnas y ID de usuario). Guardando sin columnas nuevas y sin user_id...");
        const { error: errFinal } = await supabase.from('Clientes').upsert({ ...fallbackNoColsPayload, user_id: null }, { onConflict: 'id' });
        if (errFinal) console.error("🔴 Error crítico final al guardar cliente:", errFinal);
        else console.log("💚 Guardado con éxito sin columnas adicionales y sin user_id!");
      } 
      else if (isMissingColumns) {
        console.log("Faltan las columnas de ciudad o teléfono de contacto en Supabase, reintentando sin ellas...");
        const { error: errColRetry } = await supabase.from('Clientes').upsert(fallbackNoColsPayload, { onConflict: 'id' });
        
        if (errColRetry) {
          console.warn("Intento sin columnas adicionales también falló:", errColRetry);
          const isFkRetry = errColRetry.code === '23503' || errColRetry.message?.toLowerCase().includes('foreign key') || errColRetry.message?.toLowerCase().includes('user_id');
          if (isFkRetry) {
            console.log("Posible violación de llave foránea en user_id. Guardando sin columnas y sin user_id...");
            const { error: errFk } = await supabase.from('Clientes').upsert({ ...fallbackNoColsPayload, user_id: null }, { onConflict: 'id' });
            if (errFk) console.error("🔴 No se pudo guardar ni con reintento absoluto:", errFk);
            else console.log("💚 Guardado con éxito sin columnas y sin user_id!");
          }
        } else {
          console.log("💚 Guardado con éxito sin las columnas de ciudad y teléfono de contacto!");
        }
      } 
      else if (isForeignKeyViolation) {
        console.log("El usuario asignado no existe en platform_users de Supabase. Guardando asumiendo user_id nulo...");
        const { error: errFkRetry } = await supabase.from('Clientes').upsert({ ...fullPayload, user_id: null }, { onConflict: 'id' });
        
        if (errFkRetry) {
          console.warn("Intento sin user_id también falló:", errFkRetry);
          const isColRetry = errFkRetry.code === '42703' || errFkRetry.message?.toLowerCase().includes('column');
          if (isColRetry) {
            console.log("Reintentando sin columnas nuevas y sin user_id...");
            const { error: errFinal } = await supabase.from('Clientes').upsert({ ...fallbackNoColsPayload, user_id: null }, { onConflict: 'id' });
            if (errFinal) console.error("🔴 Intento final falló:", errFinal);
            else console.log("💚 Guardado con éxito sin columnas y sin user_id!");
          }
        } else {
          console.log("💚 Guardado con éxito con user_id configurado en nulo!");
        }
      }
      else {
        // En caso de cualquier otro problema, guardamos lo mínimo localmente viable para prevenir pérdidas
        console.log("Error desconocido detectado. Intentando guardado con payload mínimo (compatible)...");
        const { error: errUltimate } = await supabase.from('Clientes').upsert({ ...fallbackNoColsPayload, user_id: null }, { onConflict: 'id' });
        if (errUltimate) console.error("🔴 El guardado absoluto falló:", errUltimate);
        else console.log("💚 Guardado con éxito tras restauración mínima compatible!");
      }
    } else {
      console.log("💚 Cliente guardado con éxito en Supabase (con todas las columnas de soporte)!");
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
    
    setEditingClientDetails(null);

    const target = updatedClientes.find(c => c.id === clientId);
    if (target) {
      await saveClientes(updatedClientes, target);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const newClient: Client = {
      id: crypto.randomUUID(),
      type: formData.type,
      companyName: formData.type === "Empresa" ? formData.companyName : "",
      phone: formData.phone,
      sector: formData.sector,
      country: formData.country,
      city: formData.city,
      address: formData.city || formData.address,
      contactName: formData.contactName,
      contactPhone: formData.contactPhone,
      email: formData.email,
      language: formData.language,
      currency: formData.currency,
      createdAt: Date.now(),
      userId: currentUser?.id || null,
    };

    await saveClientes([newClient, ...clientes], newClient);
    setIsModalOpen(false);
    setFormData({
      type: "Empresa",
      companyName: "",
      phone: "",
      sector: "",
      country: "",
      city: "",
      contactName: "",
      contactPhone: "",
      email: "",
      language: "Español",
      currency: "USD",
      address: "",
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Eliminar este cliente?")) {
      const updated = clientes.filter((c) => c.id !== id);
      await saveClientes(updated);

      try {
        await supabase.from('Clientes').delete().eq('id', id);
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
        
        // El ejecutivo comercial puede ver el cliente si:
        // 1. Es el creador/dueño directo del cliente (cliente.userId === currentUser.id)
        // 2. O si el cliente está vinculado a una empresa de la cual el ejecutivo es responsable o asignado
        // 3. O bien, si es un cliente huérfano/público (no tiene userId asignado aún en la BD)
        const isClientOwner = cliente.userId && cliente.userId === currentUser.id;
        const isUnassigned = !cliente.userId;
        const isBusinessResponsible = linkedBusiness && (
          linkedBusiness.responsibleName === currentUser.fullName ||
          linkedBusiness.userId === currentUser.id
        );

        return isClientOwner || isBusinessResponsible || isUnassigned;
      });
    }
    return authClients.sort((a, b) => b.createdAt - a.createdAt);
  }, [clientes, businesses, currentUser]);

  const kpis = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    const currentFortnight = currentDay <= 15 ? 1 : 2;

    const startOfYear = new Date(currentYear, 0, 1).getTime();
    const startOfMonth = new Date(currentYear, currentMonth, 1).getTime();
    
    // Period / Fortnight start logic
    const startOfPeriod = currentFortnight === 1 
      ? new Date(currentYear, currentMonth, 1).getTime() 
      : new Date(currentYear, currentMonth, 16).getTime();

    const startOfDay = new Date(currentYear, currentMonth, currentDay, 0, 0, 0, 0).getTime();

    let totalYtd = 0;
    let totalMes = 0;
    let totalPeriodo = 0;
    let totalHoy = 0;

    authorizedClientes.forEach((c) => {
      const createdAt = c.createdAt || 0;
      if (createdAt >= startOfYear) totalYtd++;
      if (createdAt >= startOfMonth) totalMes++;
      if (createdAt >= startOfPeriod) totalPeriodo++;
      if (createdAt >= startOfDay) totalHoy++;
    });

    const monthName = now.toLocaleString('es-ES', { month: 'long' });
    const periodName = currentFortnight === 1 ? '1ra Quincena' : '2da Quincena';

    return { totalYtd, totalMes, totalPeriodo, totalHoy, monthName, periodName, currentYear };
  }, [authorizedClientes]);

  const filteredClientes = useMemo(() => {
    return authorizedClientes.filter((c) => {
      const matchesSearch =
        (c.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.companyName || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          c.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
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
        const currentDay = now.getDate();
        const currentFortnight = currentDay <= 15 ? 1 : 2;

        const startOfYear = new Date(currentYear, 0, 1).getTime();
        const startOfMonth = new Date(currentYear, currentMonth, 1).getTime();
        const startOfPeriod = currentFortnight === 1 
            ? new Date(currentYear, currentMonth, 1).getTime() 
            : new Date(currentYear, currentMonth, 16).getTime();
        const startOfDay = new Date(currentYear, currentMonth, currentDay, 0, 0, 0, 0).getTime();

        const createdAt = c.createdAt || 0;

        let matchesKpi = false;
        if (selectedKpis.includes("ytd") && createdAt >= startOfYear) matchesKpi = true;
        if (selectedKpis.includes("month") && createdAt >= startOfMonth) matchesKpi = true;
        if (selectedKpis.includes("period") && createdAt >= startOfPeriod) matchesKpi = true;
        if (selectedKpis.includes("today") && createdAt >= startOfDay) matchesKpi = true;

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
          <div className="mb-2 grid grid-cols-2 md:grid-cols-5 gap-2">
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
                Clientes YDT
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
                Clientes Mes
              </div>
              <div className="text-xl font-display font-black text-white">
                {kpis.totalMes}
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => toggleKpiFilter("period")}
              className={`cursor-pointer p-2 rounded-lg border shadow-sm transition-all duration-300 ${
                selectedKpis.includes("period")
                  ? "bg-emerald-500/10 border-emerald-500/50"
                  : "bg-slate-900/60 border-slate-800"
              }`}
            >
              <div
                className={`text-[8px] font-bold uppercase tracking-widest mb-0.5 ${selectedKpis.includes("period") ? "text-emerald-400" : "text-emerald-500"}`}
              >
                Clientes Periodo 16 al 30 de Mayo
              </div>
              <div className="text-xl font-display font-black text-white">
                {kpis.totalPeriodo}
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => toggleKpiFilter("today")}
              className={`cursor-pointer p-2 rounded-lg border shadow-sm transition-all duration-300 ${
                selectedKpis.includes("today")
                  ? "bg-amber-500/10 border-amber-500/50"
                  : "bg-slate-900/60 border-slate-800"
              }`}
            >
              <div
                className={`text-[8px] font-bold uppercase tracking-widest mb-0.5 ${selectedKpis.includes("today") ? "text-amber-400" : "text-amber-500"}`}
              >
                Clientes Hoy
              </div>
              <div className="text-xl font-display font-black text-white">
                {kpis.totalHoy}
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
                disabled={!permissions.create}
                onClick={() => setIsModalOpen(true)}
                className={`w-full sm:w-auto px-3 py-1 font-bold uppercase tracking-widest rounded-md transition-all text-[9px] flex items-center justify-center gap-1 group ${
                  permissions.create
                    ? "bg-amber-400 text-slate-950 hover:bg-amber-500 active:scale-95 cursor-pointer shadow-md shadow-amber-400/10"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                }`}
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
                      ID
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
                      key={`${cli.id}-${index}`}
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
                        CL{String((currentPage - 1) * itemsPerPage + index).padStart(3, '0')}-{new Date(cli.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('')}
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
                        {cli.city && (
                          <div className="text-[9px] text-slate-500 leading-tight mt-0.5">
                            {cli.city}
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-[10px] text-slate-400">
                        <div className="space-y-1">
                          {cli.phone && (
                            <div
                              onClick={() => handlePhoneClick(cli.id, cli.companyName || cli.contactName, cli.phone || "")}
                              className="flex items-center gap-1 cursor-pointer hover:text-amber-400 transition-colors"
                              title="Llamar teléfono empresa"
                            >
                              <Phone size={10} className="text-slate-500" />
                              <span className="text-[10px]">{cli.phone}</span>
                            </div>
                          )}
                          {cli.contactPhone && cli.contactPhone !== cli.phone && (
                            <div
                              onClick={() => handlePhoneClick(cli.id, cli.contactName, cli.contactPhone || "")}
                              className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors"
                              title="Llamar teléfono contacto"
                            >
                              <Phone size={10} className="text-blue-400/70" />
                              <span className="text-[9px] text-slate-400">{cli.contactPhone}</span>
                            </div>
                          )}
                          {!cli.phone && !cli.contactPhone && <span>-</span>}
                        </div>
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

              <form onSubmit={handleCreate} className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  {/* Tipo de Cliente (Persona, Empresa) */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Tipo
                    </label>
                    <div className="flex gap-4">
                      {[
                        { label: "Persona", value: "Particular" },
                        { label: "Empresa", value: "Empresa" }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              type: opt.value as "Particular" | "Empresa",
                            })
                          }
                          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                            formData.type === opt.value
                              ? "bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20"
                              : "bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Directorio de Empresas (Asistente de auto-completado) */}
                  {formData.type === "Empresa" && (
                    <div className="space-y-2 pb-1">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                        <Building size={10} /> Auto-completar desde leads registrados
                      </label>
                      <div className="relative">
                        <Contact
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                          size={14}
                        />
                        <select
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer"
                          onChange={(e) => {
                            const b = businesses.find(
                              (item) => item.id === e.target.value,
                            );
                            if (b) {
                              const autoCurrency = (
                                b.country?.toLowerCase().includes("españa") ||
                                b.country?.toLowerCase().includes("portugal") ||
                                b.country?.toLowerCase().includes("francia")
                              ) ? "EURO" : "USD";

                              setFormData({
                                ...formData,
                                companyName: b.name,
                                phone: b.phone || "",
                                sector: b.category || "",
                                country: b.country || "",
                                city: b.city || "",
                                contactName: b.contactName || b.responsibleName || "",
                                contactPhone: b.contactPhone || b.responsiblePhone || "",
                                email: b.email || "",
                                currency: autoCurrency,
                              });
                            }
                          }}
                        >
                          <option value="">Seleccionar empresa registrada...</option>
                          {businesses.map((b, idx) => (
                            <option key={`${b.id}-${idx}`} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Nombre Empresa */}
                  {formData.type === "Empresa" && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Nombre Empresa
                      </label>
                      <div className="relative">
                        <Briefcase
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                          size={14}
                        />
                        <input
                          type="text"
                          required={formData.type === "Empresa"}
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
                  )}

                  {/* Teléfono Empresa & Sector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Teléfono Empresa
                      </label>
                      <div className="relative">
                        <Phone
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                          size={14}
                        />
                        <input
                          type="tel"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              phone: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Sector
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
                  </div>

                  {/* País & Ciudad */}
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
                          placeholder="Ej: España"
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
                        Ciudad
                      </label>
                      <div className="relative">
                        <Globe2
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                          size={14}
                        />
                        <input
                          type="text"
                          placeholder="Ej: Madrid"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none"
                          value={formData.city}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              city: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Separador e Información de Contacto */}
                  <div className="py-2 flex items-center justify-center gap-3">
                    <div className="h-[1px] bg-slate-800 flex-1" />
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                      Información de contacto
                    </span>
                    <div className="h-[1px] bg-slate-800 flex-1" />
                  </div>

                  {/* Nombre Contacto */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Nombre Contacto
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

                  {/* Teléfono Contacto & Correo Contacto */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Teléfono Contacto
                      </label>
                      <div className="relative">
                        <Contact
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                          size={14}
                        />
                        <input
                          type="tel"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none"
                          value={formData.contactPhone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              contactPhone: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Correo Contacto
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
                            setFormData({
                              ...formData,
                              email: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Idioma & Divisa */}
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
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer"
                          value={formData.language}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              language: e.target.value as (typeof LANGUAGES)[number],
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
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer"
                          value={formData.currency}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              currency: e.target.value as (typeof CURRENCIES)[number],
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
                  Actualizando detalles para: <strong className="text-slate-200">{editingClientDetails.type === "Empresa" ? (editingClientDetails.companyName || "—") : (editingClientDetails.contactName || "—")}</strong>
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

      {/* Call Confirmation Modal */}
      <AnimatePresence>
        {callConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-500 space-x-1 flex" />
              
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-amber-400/10 flex items-center justify-center mb-4">
                  <Phone className="text-amber-400 w-8 h-8" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">Realizar Llamada</h3>
                <p className="text-slate-400 text-sm mb-4">
                  ¿Está seguro que desea llamar a <strong className="text-white">{callConfirmModal.businessName}</strong>?
                </p>
                <div className="bg-slate-800/50 rounded-lg p-3 w-full mb-4 font-mono text-amber-400 font-bold tracking-wider text-xl">
                    {callConfirmModal.phoneNumber}
                </div>
                {getCountryName(callConfirmModal.cleanNumber) && (
                  <div className="flex items-center gap-2 mb-8 text-slate-300 text-sm bg-slate-800/30 px-3 py-1.5 rounded-full">
                    <Globe2 size={14} className="text-amber-400" />
                    País: <strong className="text-white">{getCountryName(callConfirmModal.cleanNumber)}</strong>
                  </div>
                )}
                
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setCallConfirmModal(null)}
                    className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors text-xs uppercase tracking-wider"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={executePhoneCall}
                    className="flex-1 py-3 bg-amber-400 text-slate-950 font-bold rounded-xl hover:bg-amber-500 transition-colors text-xs uppercase tracking-wider shadow-lg shadow-amber-400/20"
                  >
                    Llamar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Email */}
      {/* Email modal removed */}
    </div>
  );
}
