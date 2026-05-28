/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  UserPlus,
  Send,
  CheckCircle,
  Clock,
  FileText,
  Mail,
  XCircle,
  ThumbsUp,
  Plus,
  Edit2,
  Trash2,
  Bug,
  LogOut,
  Search,
  MapPin,
  Phone,
  User as UserIcon,
  Globe,
  Users,
  LayoutDashboard,
  X,
  ScanEye,
  Check,
  Zap,
  Calendar,
  Paperclip,
  Upload,
  MessageSquare,
  Globe2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { Business, BusinessCategory, PlatformUser, Client } from "../types";

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
import {
  BUSINESS_CATEGORIES,
  COUNTRIES,
  COUNTRY_FLAGS,
  LOCATION_DATA,
} from "../constants";
import ScrapingModal from "./ScrapingModal";
import { supabase } from "../lib/supabase";
import { Pagination } from "./Pagination";
import { TableLoader } from "./TableLoader";
import { googleSignIn, getAccessToken } from '../lib/firebase';

const TIMESLOTS = [
  { value: "08:00", label: "08:00 AM" },
  { value: "08:30", label: "08:30 AM" },
  { value: "09:00", label: "09:00 AM" },
  { value: "09:30", label: "09:30 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "10:30", label: "10:30 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "11:30", label: "11:30 AM" },
  { value: "14:00", label: "02:00 PM" },
  { value: "14:30", label: "02:30 PM" },
  { value: "15:00", label: "03:00 PM" },
  { value: "15:30", label: "03:30 PM" },
  { value: "16:00", label: "04:00 PM" },
  { value: "16:30", label: "04:30 PM" },
  { value: "17:00", label: "05:00 PM" },
  { value: "17:30", label: "05:30 PM" }
];

const COUNTRY_PREFIXES: Record<string, string> = {
  'Colombia': '+57',
  'México': '+52',
  'España': '+34',
  'Estados Unidos': '+1',
  'Perú': '+51',
  'Argentina': '+54',
  'Venezuela': '+58'
};

interface DashboardProps {
  onLogout: () => void;
  onBack: () => void;
}

export default function Dashboard({ onLogout, onBack }: DashboardProps) {
  const permissions = usePermissions('registro_negocios');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [dbHasStateColumn, setDbHasStateColumn] = useState(false);
  const [dbHasContactPhoneColumn, setDbHasContactPhoneColumn] = useState(false);
  const [businessWithAsuntos, setBusinessWithAsuntos] = useState<Set<string>>(new Set());
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [filterAssignedUser, setFilterAssignedUser] = useState<string>('all');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const isExecutive = currentUser?.roleName?.toLowerCase().includes('ejecutivo') || currentUser?.roleId?.includes('6940');
  const canCreateAsunto = permissions.create || isExecutive;
  const canCreateContact = permissions.create || isExecutive;
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: string;
    value: string;
  } | null>(null);
  const [noteModal, setNoteModal] = useState<{
    id: string;
    notes: { date: number; text: string; authorName?: string; authorRole?: string }[];
  } | null>(null);
  const [deleteNoteConfirm, setDeleteNoteConfirm] = useState<{
    noteIndex: number;
    businessId: string;
  } | null>(null);
  const [newNote, setNewNote] = useState("");
  const [contactNameEdit, setContactNameEdit] = useState("");
  const [addressEdit, setAddressEdit] = useState("");
  const [cityEdit, setCityEdit] = useState("");
  const [stateEdit, setStateEdit] = useState("");
  const [companyNameEdit, setCompanyNameEdit] = useState("");
  const [countryEdit, setCountryEdit] = useState("");
  const [phoneEdit, setPhoneEdit] = useState("");
  const [emailEdit, setEmailEdit] = useState("");
  const [isContactSaved, setIsContactSaved] = useState(false);

  useEffect(() => {
    if (noteModal) {
      const b = businesses.find((x) => x.id === noteModal.id);
      setContactNameEdit(b?.contactName || "");
      setAddressEdit(b?.address || "");
      setCityEdit(b?.city || "");
      setStateEdit(b?.state || "");
      setCompanyNameEdit(b?.name || "");
      setCountryEdit(b?.country || "");
      setPhoneEdit(b?.contactPhone || "");
      setEmailEdit(b?.email || "");
    } else {
      setContactNameEdit("");
      setAddressEdit("");
      setCityEdit("");
      setStateEdit("");
      setCompanyNameEdit("");
      setCountryEdit("");
      setPhoneEdit("");
      setEmailEdit("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteModal?.id]);
  const [copyStatus, setCopyStatus] = useState<{
    id: string;
    type: "phone" | "whatsapp" | "responsiblePhone";
  } | null>(null);
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<number | null>(
    null,
  );
  const [statusToConfirm, setStatusToConfirm] = useState<{ businessId: string, newStatus: string } | null>(null);
  const [meetingDateToConfirm, setMeetingDateToConfirm] = useState<string>('');
  const [callConfirmModal, setCallConfirmModal] = useState<{
    isOpen: boolean;
    businessId?: string;
    businessName: string;
    phoneNumber: string;
    cleanNumber: string;
  } | null>(null);

  const [autoDialQueue, setAutoDialQueue] = useState<Business[]>([]);
  const [isAutoDialing, setIsAutoDialing] = useState(false);

  const callNextInQueue = (queue: Business[]) => {
    if (queue.length === 0) {
      setIsAutoDialing(false);
      setAutoDialQueue([]);
      alert("La automarcación ha finalizado.");
      return;
    }
    const nextContact = queue[0];
    setAutoDialQueue(queue.slice(1));
    
    const rawNumber = nextContact.phone || nextContact.contactPhone || nextContact.responsiblePhone || "";
    const prefix = nextContact.prefix || "";
    const clean = `${prefix}${rawNumber}`.replace(/[^0-9+]/g, '');
    const phoneNumber = `${prefix} ${rawNumber}`.trim();

    setCallConfirmModal({
      isOpen: true,
      businessId: nextContact.id,
      businessName: nextContact.contactName || nextContact.name || 'Contacto',
      phoneNumber: phoneNumber,
      cleanNumber: clean
    });
  };

  const STATUSES = {
    Contactabilidad: [
      "Nuevo",
      "Intento 2",
      "Intento 3",
      "Volver a llamar",
      "Buzón de voz",
      "Núm Equivocado",
      "No Llamar",
      "Núm. Erroneo",
    ],
    Gestión: ["Presentación enviada", "Recordatorio Present.", "Reunión programada"],
    Cierre: [
      "Enviar Propuesta",
      "Prop. enviada",
      "Prop. Rechazada",
      "Prop. Aceptada",
    ],
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScrapingModalOpen, setIsScrapingModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [pendingAssignmentSeller, setPendingAssignmentSeller] = useState<PlatformUser | null>(null);
  const [leadsPendingAssignment, setLeadsPendingAssignment] = useState<Business[]>([]);

  // Asunto states
  const [isAsuntoModalOpen, setIsAsuntoModalOpen] = useState(false);
  const [asuntoFormData, setAsuntoFormData] = useState({
    nombreAsunto: "",
    businessId: "",
    datosAsunto: "",
    archivoAdjuntoUrl: "",
    clientEmail: "",
    meetingDate: "",
    contactName: "",
    contactPhone: "",
    sector: "",
    destinatario: ""
  });
  const [asuntoFileName, setAsuntoFileName] = useState("");
  const [isAsuntoDragOver, setIsAsuntoDragOver] = useState(false);
  const [asuntoClientSearch, setAsuntoClientSearch] = useState("");
  const [isAsuntoClientDropdownOpen, setIsAsuntoClientDropdownOpen] = useState(false);
  const [yearFilter, setYearFilter] = useState(
    new Date().getFullYear().toString(),
  );
  const [monthFilter, setMonthFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [businessToDelete, setBusinessToDelete] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const itemsPerPage = 50;
  const [mounted, setMounted] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    category: BusinessCategory.RETAIL,
    country: "",
    city: "",
    prefix: "",
    contactName: "",
    phone: "",
    whatsapp: "",
    status: "Nuevo" as Business["status"],
    responsibleName: "",
    responsiblePhone: "",
  });

  useEffect(() => {
    setMounted(true);

    try {
      const savedBusinesses = localStorage.getItem('capibee_businesses');
      if (savedBusinesses) setBusinesses(JSON.parse(savedBusinesses));
      
      const savedUsers = localStorage.getItem('capibee_platform_users');
      if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        const uniqueUsers = Array.from(new Map(parsed.map((u: any) => [u.id, u])).values());
        setPlatformUsers(uniqueUsers as PlatformUser[]);
      }

      const savedUser = localStorage.getItem('capibee_user');
      if (savedUser) setCurrentUser(JSON.parse(savedUser));
    } catch(e) {}
    
    const timer = setTimeout(() => setIsTableLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const isSuperAdmin = currentUser?.roleName?.toLowerCase().includes('admin') || currentUser?.roleId === 'ADMIN_MAESTRO';
    if (currentUser && !isSuperAdmin) {
      setFilterAssignedUser(currentUser.fullName);
    }
  }, [currentUser]);

  // Sync / Real-time with Supabase for businesses
  useEffect(() => {
    if (!currentUser) return;

    const fetchBusinesses = async () => {
      try {
        const { data: dbAsuntos } = await supabase.from('Asuntos').select('business_id');
        if (dbAsuntos) {
            setBusinessWithAsuntos(new Set(dbAsuntos.map((a: any) => a.business_id).filter(Boolean)));
        }
      } catch (err) {
        console.warn("Could not fetch asuntos:", err);
      }
      try {
        let query = supabase.from('Directorio').select('*').order('created_at', { ascending: false });
        
        const isSuperAdmin = currentUser?.roleName?.toLowerCase().includes('admin') || currentUser?.roleId === 'ADMIN_MAESTRO';
        if (!isSuperAdmin) {
          query = query.eq('responsible_name', currentUser.fullName);
        }

        const { data, error } = await query;
        if (!error && data) {
          const hasState = data.length > 0 && ('state' in data[0]);
          const hasContactPhone = data.length > 0 && ('contact_phone' in data[0]);
          setDbHasStateColumn(hasState);
          setDbHasContactPhoneColumn(hasContactPhone);

          const mapped = data.map((b: any) => ({
            id: b.id,
            name: b.name,
            category: b.category,
            address: b.address || '',
            phone: b.phone || '',
            whatsapp: b.whatsapp || '',
            contactName: b.contact_name || '',
            contactPhone: hasContactPhone ? (b.contact_phone || '') : (b.contactPhone || ''),
            userId: b.user_id || '',
            status: b.status || 'Nuevo',
            prefix: b.prefix || '',
            responsibleName: b.responsible_name || '',
            responsiblePhone: b.responsible_phone || '',
            email: b.email || '',
            website: b.website || '',
            rating: Number(b.rating) || 5,
            city: b.city || '',
            state: hasState ? (b.state || '') : (b.state || ''),
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
      } finally {
        setIsTableLoading(false);
      }
    };

    fetchBusinesses();

    // Subscribe to real-time changes
    const channel = supabase.channel('businesses-realtime-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Directorio' }, () => {
        fetchBusinesses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!deleteNoteConfirm) return;
      if (e.key === "Enter") {
        e.preventDefault();
        handleExecuteNoteDelete();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setDeleteNoteConfirm(null);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, { capture: true });
    };
  }, [deleteNoteConfirm, noteModal]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, countryFilter, cityFilter, statusFilter]);

  useEffect(() => {
    setCityFilter("");
  }, [countryFilter]);

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

      // Sync deletes in Supabase 'Clientes' table
      for (const id of clientsToDelete) {
        const { error: deleteErr } = await supabase.from('Clientes').delete().eq('id', id);
        if (deleteErr) {
          console.error("🔴 Supabase clients delete error:", deleteErr);
        } else {
          console.log("💚 Supabase client deleted successfully:", id);
        }
      }

      // Upsert to Supabase table 'Clientes'
      for (const c of clientsToUpsert) {
        const { error: upsertErr } = await supabase.from('Clientes').upsert({
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
          old.contactPhone !== b.contactPhone ||
          old.userId !== b.userId ||
          old.status !== b.status ||
          old.prefix !== b.prefix ||
          old.responsibleName !== b.responsibleName ||
          old.responsiblePhone !== b.responsiblePhone ||
          old.email !== b.email ||
          old.website !== b.website ||
          old.rating !== b.rating ||
          old.city !== b.city ||
          old.state !== b.state ||
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
      localStorage.setItem("capibee_businesses", JSON.stringify(data));
      return;
    }

    // A. Persist ONLY changed rows to Supabase FIRST so the database has the new state immediately
    let anyError = false;
    for (const b of toUpsert) {
      const payload: any = {
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
      };

      if (dbHasStateColumn) {
        payload.state = b.state || '';
      }
      if (dbHasContactPhoneColumn) {
        payload.contact_phone = b.contactPhone || '';
      }

      const { error: upsertErr } = await supabase.from('Directorio').upsert(payload, { onConflict: 'id' });

      if (upsertErr) {
        console.error("🔴 Supabase businesses upsert error:", upsertErr);
        anyError = true;
      } else {
        console.log("💚 Supabase business updated successfully:", b.id);
      }
    }

    // B. If no database update errors, sync clients, update React state and local storage
    if (!anyError) {
      await syncClients(toUpsert);
      setBusinesses(data);
      localStorage.setItem("capibee_businesses", JSON.stringify(data));
    } else {
      console.error("🔴 Failed to save businesses to Supabase, not updating local state.");
      alert("Error: No se pudo actualizar el estado en el servidor. Inténtalo de nuevo.");
    }
  };

  const kpiStatuses = [
    "Total",
    "Nuevo",
    "Reintentar",
    "Volver a llamar",
    "Presentación enviada",
    "Recordatorio Present.",
    "Reunión programada",
    "Enviar Propuesta",
    "Prop. enviada",
    "Prop. Rechazada",
    "Prop. Aceptada",
  ];

  const filteredBusinessesByDate = businesses.filter((b) => {
    // Check Date
    const d = new Date(b.createdAt);
    const yearMatch = d.getFullYear().toString() === yearFilter;
    const monthMatch =
      monthFilter === "all" || d.getMonth() === parseInt(monthFilter);
    
    // Strict visibility: SuperAdmin sees all for these dates, others only their assignments
    const isSuperAdmin = currentUser?.roleName?.toLowerCase().includes("admin") || currentUser?.roleId === "ADMIN_MAESTRO";
    let userMatch = true;
    if (isSuperAdmin) {
      userMatch = filterAssignedUser === 'all' 
        ? true 
        : filterAssignedUser === 'unassigned' 
          ? (!b.responsibleName || b.responsibleName === "")
          : filterAssignedUser === 'any_assigned'
            ? (b.responsibleName && b.responsibleName !== "")
            : b.responsibleName === filterAssignedUser;
    } else {
      userMatch = b.responsibleName === currentUser?.fullName;
    }

    return yearMatch && monthMatch && userMatch;
  });

  const kpiData = kpiStatuses.reduce(
    (acc, status) => {
      if (status === "Total") {
        acc[status] = filteredBusinessesByDate.length;
      } else if (status === "Reintentar") {
        acc[status] = filteredBusinessesByDate.filter(
          (b) => b.status === "Intento 2" || b.status === "Intento 3",
        ).length;
      } else {
        acc[status] = filteredBusinessesByDate.filter(
          (b) => b.status === status,
        ).length;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  const getIconForStatus = (status: string) => {
    switch (status) {
      case "Total":
        return <Zap size={14} className="text-yellow-400" />;
      case "Nuevo":
        return <UserPlus size={14} className="text-blue-400" />;
      case "Reintentar":
        return <Clock size={14} className="text-blue-400" />;
      case "Volver a llamar":
        return <Phone size={14} className="text-amber-400" />;
      case "Buzón de voz":
        return <XCircle size={14} className="text-orange-400" />;
      case "Núm Equivocado":
        return <XCircle size={14} className="text-red-400" />;
      case "No Llamar":
        return <XCircle size={14} className="text-red-400" />;
      case "Núm. Erroneo":
        return <XCircle size={14} className="text-red-400" />;
      case "Presentación enviada":
        return <Send size={14} className="text-yellow-400" />;
      case "Recordatorio Present.":
        return <Clock size={14} className="text-yellow-400" />;
      case "Reunión programada":
        return <Calendar size={14} className="text-purple-400" />;
      case "Enviar Propuesta":
        return <FileText size={14} className="text-yellow-400" />;
      case "Prop. enviada":
        return <Send size={14} className="text-yellow-400" />;
      case "Prop. Rechazada":
        return <XCircle size={14} className="text-red-400" />;
      case "Prop. Aceptada":
        return <CheckCircle size={14} className="text-emerald-400" />;
      default:
        return <Clock size={14} className="text-slate-500" />;
    }
  };

  const handleCreateNew = () => {
    if (!canCreateContact) return;
    setEditingBusiness(null);
    setFormData({
      name: "",
      category: BusinessCategory.RETAIL,
      country: "",
      city: "",
      prefix: "",
      contactName: "",
      phone: "",
      whatsapp: "",
      status: "Nuevo",
      responsibleName: "",
    });
    setIsModalOpen(true);
  };

  const handleSendInstantNote = () => {
    if (!noteModal || !newNote.trim()) return;
    const currentUser = localStorage.getItem('capibee_user') ? JSON.parse(localStorage.getItem('capibee_user') as string) : null;
    const authorName = currentUser?.fullName || 'Usuario Desconocido';
    const authorRole = currentUser?.roleName || 'Usuario';
    const noteObj = { date: Date.now(), text: newNote.trim(), authorName, authorRole };

    const updated = businesses.map((b) => {
      if (b.id === noteModal.id) {
        return {
          ...b,
          notes: [...(b.notes || []), noteObj]
        };
      }
      return b;
    });
    saveBusinesses(updated);

    setNoteModal({
      ...noteModal,
      notes: [...noteModal.notes, noteObj]
    });
    setNewNote("");
  };

  const handleAddNote = () => {
    if (!noteModal) return;
    const currentUser = localStorage.getItem('capibee_user') ? JSON.parse(localStorage.getItem('capibee_user') as string) : null;
    const authorName = currentUser?.fullName || 'Usuario Desconocido';
    const authorRole = currentUser?.roleName || 'Usuario';
    
    const hasComment = newNote.trim().length > 0;

    const updated = businesses.map((b) => {
      if (b.id === noteModal.id) {
        const currentNotes = b.notes || [];
        const nextNotes = hasComment
          ? [...currentNotes, { date: Date.now(), text: newNote.trim(), authorName, authorRole }]
          : currentNotes;
        
        return {
          ...b,
          contactName: contactNameEdit.trim(),
          contactPhone: phoneEdit.trim(),
          notes: nextNotes,
        };
      }
      return b;
    });

    saveBusinesses(updated);
    setNewNote("");
    setNoteModal(null);
  };

  const handleCopy = (
    id: string,
    text: string,
    type: "phone" | "whatsapp" | "responsiblePhone",
    businessName?: string
  ) => {
    if (type === "phone" || type === "responsiblePhone") {
      const clean = text.replace(/[^0-9+]/g, '');
      if (clean) {
         setCallConfirmModal({
           isOpen: true,
           businessId: id,
           businessName: businessName || 'Contacto',
           phoneNumber: text,
           cleanNumber: clean
         });
      }
      return;
    }

    navigator.clipboard.writeText(text);
    setCopyStatus({ id, type });
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const executePhoneCall = () => {
    if (!callConfirmModal) return;
    
    // Attempt to invoke Zadarma web phone if available
    window.location.href = `tel:${callConfirmModal.cleanNumber}`;

    if (callConfirmModal.businessId) {
      const business = businesses.find((b) => b.id === callConfirmModal.businessId);
      if (business) {
        setNoteModal({
          id: business.id,
          notes: business.notes || [],
        });
      }
    }
    
    setCallConfirmModal(null);
  };

  const handleDeleteNote = (noteIndex: number) => {
    if (!noteModal) return;
    setDeleteNoteConfirm({
      noteIndex,
      businessId: noteModal.id
    });
  };

  const handleExecuteNoteDelete = () => {
    if (!deleteNoteConfirm || !noteModal) return;
    const { noteIndex, businessId } = deleteNoteConfirm;

    const updatedNotes = noteModal.notes.filter((_, i) => i !== noteIndex);
    const updatedBusinesses = businesses.map((b) =>
      b.id === businessId ? { ...b, notes: updatedNotes } : b,
    );
    saveBusinesses(updatedBusinesses);
    setNoteModal({ ...noteModal, notes: updatedNotes });
    setDeleteNoteConfirm(null);
  };

  const handleEdit = (business: Business) => {
    if (!permissions.edit) return;
    setEditingBusiness(business);
    setFormData({
      name: business.name,
      category: business.category,
      country: business.country || "",
      city: business.city || "",
      prefix: business.prefix || "",
      contactName: business.contactName || "",
      phone: business.phone || "",
      whatsapp: business.whatsapp || "",
      status: business.status || "Nuevo",
      responsibleName: business.responsibleName || "",
      responsiblePhone: business.responsiblePhone || "",
    });
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setEditingBusiness(null);
    setIsModalOpen(false);
    setFormData({
      name: "",
      category: BusinessCategory.RETAIL,
      country: "",
      city: "",
      prefix: "",
      contactName: "",
      phone: "",
      whatsapp: "",
      status: "Nuevo",
      responsibleName: "",
      responsiblePhone: "",
    });
  };

  const handleSaveInline = (id: string, field: string, value: string, skipConfirm = false) => {
    if (!permissions.edit) return;
    if (field === 'status' && !skipConfirm) {
      setStatusToConfirm({ businessId: id, newStatus: value });
      return;
    }
    const updated = businesses.map((b) =>
      b.id === id ? { ...b, [field]: value } : b,
    );
    saveBusinesses(updated);
    setEditingCell(null);
  };

  const handleSaveContactField = (field: string, value: string) => {
    if (!noteModal) return;
    const updated = businesses.map((b) =>
      b.id === noteModal.id
        ? {
            ...b,
            [field]: value.trim(),
            ...(field === "contactPhone" ? { whatsapp: value.trim() } : {}),
            ...(field === "whatsapp" ? { contactPhone: value.trim() } : {}),
          }
        : b
    );
    saveBusinesses(updated);
  };

  const handleSaveAllContactDetails = () => {
    if (!noteModal) return;
    const updated = businesses.map((b) =>
      b.id === noteModal.id
        ? {
            ...b,
            contactName: contactNameEdit.trim(),
            contactPhone: phoneEdit.trim(),
            whatsapp: phoneEdit.trim(),
            email: emailEdit.trim(),
          }
        : b
    );
    saveBusinesses(updated);
    setIsContactSaved(true);
    setTimeout(() => {
      setIsContactSaved(false);
    }, 2000);
  };

  const handleCall = async (phone: string, cleanPhone?: string) => {
    try {
      const response = await fetch('/api/zadarma/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: cleanPhone || phone })
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Error al iniciar la llamada');
        throw new Error('Call failed');
      }
      alert(data.message || 'Llamada iniciada. Conteste su extensión IP/Softphone.');
    } catch (e) {
      console.error(e);
    }
  };

  const closeAssignmentModal = () => {
    setIsAssignmentModalOpen(false);
    setPendingAssignmentSeller(null);
    setLeadsPendingAssignment([]);
  };

  const handleAddScrapedLeads = (leads: Partial<Business>[]) => {
    if (!canCreateContact) return;
    // Collect existing cleaned phones

    const existingPhones = new Set(
      businesses.map((b) => (b.phone || "").replace(/\D/g, "")),
    );

    // Filter and map only new leads
    const newBusinesses: Business[] = leads
      .filter((lead) => {
        const cleanPhone = (lead.phone || "").replace(/\D/g, "");
        return cleanPhone && !existingPhones.has(cleanPhone);
      })
      .map((lead) => ({
        name: lead.name || "Desconocido",
        category: lead.category || BusinessCategory.RETAIL,
        country: lead.country || "",
        city: lead.city || "",
        state: lead.state || "",
        prefix: lead.prefix || "",
        phone: lead.phone || "",
        whatsapp: lead.whatsapp || "",
        contactName: (lead as any).contactName || "",
        status: lead.status || "Nuevo",
        responsibleName: lead.responsibleName || "",
        address: lead.address || "",
        branchName: lead.branchName || "",
        website: lead.website || "",
        rating: lead.rating,
        placeId: lead.placeId || "",
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        notes: [],
        isEstablishment: false,
      }));

    if (newBusinesses.length === 0 && leads.length > 0) {
      alert("Todos los leads seleccionados ya existen en su base de datos.");
      return;
    }

    setLeadsPendingAssignment(newBusinesses);
    setIsScrapingModalOpen(false);
    setIsAssignmentModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!permissions.delete) return;
    setBusinessToDelete(id);
  };

  const confirmDelete = async () => {
    if (!businessToDelete) return;
    const updated = businesses.filter((b) => b.id !== businessToDelete);
    await saveBusinesses(updated);

    // Delete in Supabase table to keep it clean
    try {
      await supabase.from('Directorio').delete().eq('id', businessToDelete);
    } catch (err) {
      console.error("Supabase deletion error for business:", err);
    }

    if (editingBusiness?.id === businessToDelete) handleCancel();
    setBusinessToDelete(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBusiness && !permissions.edit) return;
    if (!editingBusiness && !canCreateContact) return;

    // Final validation for country
    if (!formData.country) {
      alert("Por favor selecciona un país");
      return;
    }

    if (!formData.phone) {
      alert("Por favor introduce un número de teléfono");
      return;
    }

    if (formData.status === "Enviar Propuesta" && (!formData.email || !formData.email.trim())) {
      alert("El campo correo debe estar completo, realicelo antes de cambiar el estado");
      return;
    }

    if (editingBusiness) {
      const hasStatusChanged = editingBusiness.status !== formData.status;
      const hasResponsibleChanged =
        editingBusiness.responsibleName !== formData.responsibleName;

      if (hasStatusChanged || hasResponsibleChanged) {
        if (
          !window.confirm(
            "¿Estás seguro de que deseas guardar los cambios en el estado y/o responsable?",
          )
        ) {
          return;
        }
      }

      const updated = businesses.map((b) =>
        b.id === editingBusiness.id ? { ...b, ...formData } : b,
      );
      saveBusinesses(updated);
    } else {
      const newBusiness: Business = {
        ...formData,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      saveBusinesses([newBusiness, ...businesses]);
    }
    handleCancel();
  };

  const isValidBusinessHour = (dateString: string) => {
    if (!dateString) return true;
    const d = new Date(dateString);
    const day = d.getDay();
    if (day === 0 || day === 6) {
      alert("Las reuniones solo pueden ser programadas de Lunes a Viernes.");
      return false;
    }
    const hours = d.getHours();
    const isMorning = hours >= 8 && hours < 12;
    const isAfternoon = hours >= 14 && hours < 18;
    if (!isMorning && !isAfternoon) {
      alert("Las reuniones deben estar dentro del horario de disponibilidad: 8:00 AM - 12:00 PM o 2:00 PM - 6:00 PM.");
      return false;
    }
    return true;
  };

  const handleCreateAsunto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asuntoFormData.nombreAsunto) {
      alert("Por favor ingrese el nombre del asunto");
      return;
    }
    if (!asuntoFormData.businessId) {
      alert("Por favor seleccione un cliente o establecimiento");
      return;
    }

    let emailToUse = asuntoFormData.clientEmail;
    
    if (asuntoFormData.meetingDate && !emailToUse) {
      alert("Por favor ingrese el correo electrónico del cliente para enviar la invitación de Google Meet.");
      return;
    }

    if (asuntoFormData.meetingDate && !isValidBusinessHour(asuntoFormData.meetingDate)) {
      return;
    }

    let meetingLink = "";

    if (asuntoFormData.meetingDate) {
      try {
        let token = await getAccessToken();
        if (!token) {
          const authResult = await googleSignIn();
          if (authResult) {
            token = authResult.accessToken;
          }
        }
        
        if (token) {
          const startDateTime = new Date(asuntoFormData.meetingDate);
          const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
          
          const eventBody = {
            summary: asuntoFormData.nombreAsunto,
            description: asuntoFormData.datosAsunto || "Reunión programada desde Plataforma",
            start: { dateTime: startDateTime.toISOString() },
            end: { dateTime: endDateTime.toISOString() },
            attendees: [{ email: emailToUse }],
            conferenceData: {
              createRequest: {
                requestId: crypto.randomUUID(),
                conferenceSolutionKey: { type: "hangoutsMeet" }
              }
            }
          };

          const eventRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventBody)
          });
          
          if (eventRes.ok) {
            const eventData = await eventRes.json();
            meetingLink = eventData.hangoutLink || "";
            alert("✅ Cita programada en Google Meet: " + meetingLink);
          } else {
            console.error("Error al crear evento:", await eventRes.text());
            alert("No se pudo agendar la cita en Google Calendar. Revise los permisos.");
          }
        }
      } catch (err) {
        console.error("Auth o Calendar error:", err);
        alert("Ocurrió un error al intentar autenticar con Google.");
      }
    }

    const user = JSON.parse(localStorage.getItem("capibee_user") || "{}");
    const extraDatos = meetingLink ? `\n\n=== REUNIÓN GOOGLE MEET ===\nEnlace: ${meetingLink}\nFecha Programada: ${new Date(asuntoFormData.meetingDate).toLocaleString()}` : "";
    const newAsunto = {
      id: crypto.randomUUID(),
      fecha: new Date().toISOString(),
      nombreAsunto: asuntoFormData.nombreAsunto,
      businessId: asuntoFormData.businessId,
      datosAsunto: asuntoFormData.datosAsunto,
      archivoAdjuntoUrl: "",
      userId: user.id || user.email || user.uid || "Desconocido",
      createdAt: Date.now(),
      contactName: asuntoFormData.contactName || "",
      contactPhone: asuntoFormData.contactPhone || "",
      sector: businesses.find((b: any) => b.id === asuntoFormData.businessId)?.category || "",
      assignedUserId: asuntoFormData.destinatario || "Área de Desarrollo",
    };

    const { error } = await supabase.from('Asuntos').insert({
        id: newAsunto.id,
        fecha: newAsunto.fecha,
        nombre_asunto: newAsunto.nombreAsunto,
        business_id: newAsunto.businessId,
        user_id: newAsunto.userId,
        datos_asunto: newAsunto.datosAsunto,
        archivo_adjunto_url: newAsunto.archivoAdjuntoUrl,
        created_at: newAsunto.createdAt,
        contact_name: newAsunto.contactName,
        contact_phone: newAsunto.contactPhone,
        sector: newAsunto.sector,
        assigned_user_id: newAsunto.assignedUserId === "Área de Desarrollo" ? null : newAsunto.assignedUserId,
    });

    if (error) {
        console.error("Error creating Asunto from Dashboard:", error);
        alert(`Error al crear asunto: ${error.message}`);
    } else {
        const businessToUpdate = businesses.find((b: any) => b.id === asuntoFormData.businessId);
        if (businessToUpdate) {
            const updates: any = {};
            let hasUpdates = false;

            if (emailToUse && !businessToUpdate.email) {
                updates.email = emailToUse;
                hasUpdates = true;
            }
            if (asuntoFormData.contactName && !businessToUpdate.contactName) {
                updates.contact_name = asuntoFormData.contactName;
                hasUpdates = true;
            }
            if (asuntoFormData.contactPhone && !businessToUpdate.responsiblePhone) {
                updates.responsible_phone = asuntoFormData.contactPhone;
                hasUpdates = true;
            }

            if (hasUpdates) {
                try {
                    await supabase.from('Directorio').update(updates).eq('id', asuntoFormData.businessId);
                    setBusinesses(prev => prev.map(b => b.id === asuntoFormData.businessId ? {
                        ...b,
                        ...(updates.email ? { email: updates.email } : {}),
                        ...(updates.contact_name ? { contactName: updates.contact_name } : {}),
                        ...(updates.responsible_phone ? { responsiblePhone: updates.responsible_phone } : {}),
                    } : b));
                } catch (updateErr) {
                    console.warn("Could not auto-save business contact details update:", updateErr);
                }
            }
        }

        const saved = localStorage.getItem("capibee_asuntos");
        const parsed = saved ? JSON.parse(saved) : [];
        const updated = [newAsunto, ...parsed];
        localStorage.setItem("capibee_asuntos", JSON.stringify(updated));
        
        setBusinessWithAsuntos(prev => {
          const newSet = new Set(prev);
          newSet.add(newAsunto.businessId);
          return newSet;
        });

        setIsAsuntoModalOpen(false);
        setAsuntoFormData({
          nombreAsunto: "",
          businessId: "",
          datosAsunto: "",
          archivoAdjuntoUrl: "",
          clientEmail: "",
          meetingDate: "",
          contactName: "",
          contactPhone: ""
        });
        setAsuntoFileName("");
        alert("Asunto creado exitosamente: " + newAsunto.nombreAsunto);
    }
  };

  const filteredBusinesses = businesses.filter((b) => {
    const searchMatch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.country?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (b.city?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      b.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.status?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    const countryMatch = countryFilter === "" || b.country === countryFilter;
    const cityMatch = cityFilter === "" || b.city === cityFilter;
    const statusMatch = statusFilter === "" || b.status === statusFilter || (statusFilter === "Reintentar" && (b.status === "Intento 2" || b.status === "Intento 3"));
    
    // Visibilidad estricta: SuperAdmin ve todo, otros solo lo asignado a ellos
    const isSuperAdmin = currentUser?.roleName?.toLowerCase() === "superadmin" || currentUser?.roleId === "ADMIN_MAESTRO";
    
    let userMatch = true;
    if (isSuperAdmin) {
      userMatch = filterAssignedUser === 'all' 
        ? true 
        : filterAssignedUser === 'unassigned' 
          ? (!b.responsibleName || b.responsibleName === "")
          : filterAssignedUser === 'any_assigned'
            ? (b.responsibleName && b.responsibleName !== "")
            : b.responsibleName === filterAssignedUser;
    } else {
      // Los vendedores solo ven sus propios leads
      userMatch = b.responsibleName === currentUser?.fullName;
    }

    return searchMatch && countryMatch && cityMatch && statusMatch && userMatch;
  });

  const handleStartAutoDial = () => {
    // Determine the list of filtered visible contacts that actually have a phone number or WhatsApp.
    const toDial = filteredBusinesses.filter(
      b => b.phone || b.contactPhone || b.responsiblePhone || b.whatsapp
    );
    if (toDial.length === 0) {
      alert("No hay contactos visibles en la lista filtrada actual que tengan número de teléfono o WhatsApp.");
      return;
    }
    setIsAutoDialing(true);
    callNextInQueue(toDial);
  };

  const totalPages = Math.ceil(filteredBusinesses.length / itemsPerPage);
  const currentItems = filteredBusinesses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleDateSelect = (val: string, setter: (val: string) => void, currentDateTime: string) => {
    if (!val) {
      setter("");
      return;
    }
    const d = new Date(val + "T12:00:00");
    const day = d.getDay();
    if (day === 0 || day === 6) {
      alert("Las reuniones solo están disponibles de Lunes a Viernes (horario laboral). Por favor, seleccione un día de semana.");
      setter("");
      return;
    }
    
    let timePart = "08:00";
    if (currentDateTime && currentDateTime.includes("T")) {
      timePart = currentDateTime.split("T")[1].substring(0, 5);
    }
    setter(`${val}T${timePart}`);
  };

  const asuntoParts = (() => {
    if (!asuntoFormData.meetingDate) return { date: "", time: "08:00" };
    const parts = asuntoFormData.meetingDate.split("T");
    return {
      date: parts[0] || "",
      time: parts[1] ? parts[1].substring(0, 5) : "08:00"
    };
  })();

  const confirmParts = (() => {
    if (!meetingDateToConfirm) return { date: "", time: "08:00" };
    const parts = meetingDateToConfirm.split("T");
    return {
      date: parts[0] || "",
      time: parts[1] ? parts[1].substring(0, 5) : "08:00"
    };
  })();

  return (
    <div className="h-full bg-transparent flex flex-col font-sans overflow-hidden relative">
      {/* Main Content Grid */}
      <main className="flex-1 p-2 flex flex-col overflow-y-auto min-h-0 relative max-w-[1400px] mx-auto w-full">
        {/* KPI Panel */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">
              Indicadores
            </h4>
            <div className="flex items-center gap-1">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="bg-slate-900/50 text-slate-400 px-1 py-0.5 rounded-md text-[9px] border border-slate-800/50 outline-none focus:border-yellow-400/50 transition-colors"
                style={{ colorScheme: 'dark' }}
              >
                {["2025", "2026"].map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-slate-300">
                    {y}
                  </option>
                ))}
              </select>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="bg-slate-900/50 text-slate-400 px-1 py-0.5 rounded-md text-[9px] border border-slate-800/50 outline-none focus:border-yellow-400/50 transition-colors"
                style={{ colorScheme: 'dark' }}
              >
                <option value="all" className="bg-slate-900 text-slate-300">Año</option>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-slate-300">
                    {new Date(0, m).toLocaleString("es-ES", { month: "short" })}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex overflow-x-auto custom-scrollbar gap-2 mb-2 pb-1 snap-x">
            {kpiStatuses.map((status) => {
              const count = kpiData[status] || 0;
              const needsAttention = count >= 1 && status !== 'Total';
              
              let ledPingColor = "bg-yellow-400";
              let ledColor = "bg-yellow-500";
              
              if (status === 'Nuevo') {
                ledPingColor = "bg-blue-400";
                ledColor = "bg-blue-500";
              } else if (status === 'Volver a llamar') {
                ledPingColor = "bg-amber-400";
                ledColor = "bg-amber-500";
              } else if (status === 'Prop. Aceptada') {
                ledPingColor = "bg-emerald-400";
                ledColor = "bg-emerald-500";
              } else if (status === 'Prop. Rechazada') {
                ledPingColor = "bg-red-400";
                ledColor = "bg-red-500";
              }

              const isActive = status === 'Total' ? statusFilter === '' : statusFilter === status;

              return (
              <div
                key={status}
                onClick={() => setStatusFilter(status === "Total" ? "" : status)}
                className={`snap-start flex-none w-[140px] md:flex-1 md:min-w-[110px] flex flex-col justify-between gap-1 p-2.5 px-3 rounded-xl border bg-slate-950/30 shadow-sm hover:bg-slate-900/60 transition-colors group relative overflow-hidden cursor-pointer ${
                  isActive ? 'border-amber-500/50 ring-1 ring-amber-500/20 bg-slate-900/50' : 'border-slate-800/50'
                }`}
              >
                {needsAttention && (
                  <div className="absolute inset-0 z-0 pointer-events-none mix-blend-overlay">
                    <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                  </div>
                )}
                {needsAttention ? (
                  <span className="absolute top-2 right-2 flex h-1.5 w-1.5 z-10">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${ledPingColor} opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${ledColor}`}></span>
                  </span>
                ) : (
                  <span className="absolute top-2 right-2 flex h-1.5 w-1.5 z-10">
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${count === 0 ? 'bg-slate-600' : 'bg-slate-500'}`}></span>
                  </span>
                )}
                
                <div className="flex items-center gap-2 mb-0.5 relative z-10">
                  <span className="text-xl leading-none font-bold text-slate-100">
                    {count}
                  </span>
                  <div className="opacity-70 group-hover:opacity-100 transition-opacity">
                    {getIconForStatus(status)}
                  </div>
                </div>
                
                <span
                  className="text-[8px] text-slate-400 font-bold uppercase tracking-widest truncate relative z-10 block"
                  title={status}
                >
                  {status}
                </span>
              </div>
            )})}
          </div>
        </div>

        {/* Right Section: Business Table */}
        <section className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10 w-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/80 backdrop-blur-2xl shadow-[0_4px_16px_rgba(245,158,11,0.05)] rounded-xl border border-yellow-400/20 flex flex-col h-full"
          >
            <div className="p-2 border-b border-yellow-400/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-amber-500/10 rounded-lg border border-amber-500/20 shadow-inner">
                  <Users className="text-amber-400" size={14} />
                </div>
                <div>
                  <h3 className="font-display font-black text-white text-xs leading-none uppercase tracking-widest">
                    Directorio
                  </h3>
                  <p className="text-[8px] text-slate-500 font-bold mt-0.5 uppercase tracking-tighter">
                    Panel Centralizado
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1 w-full sm:w-auto">
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1 flex-1">
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="w-full sm:w-auto px-1 py-1 bg-slate-950/80 border border-slate-800 rounded-md text-[9px] text-slate-200"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" className="bg-slate-950 text-slate-300">País...</option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country} className="bg-slate-950 text-slate-300">
                        {COUNTRY_FLAGS[country]} {country}
                      </option>
                    ))}
                  </select>
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    disabled={!countryFilter}
                    className="w-full sm:w-auto px-1 py-1 bg-slate-950/80 border border-slate-800 rounded-md text-[9px] text-slate-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 cursor-pointer shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" className="bg-slate-950 text-slate-300">Ciudad...</option>
                    {countryFilter &&
                      LOCATION_DATA[countryFilter]?.map((city) => (
                        <option key={city} value={city} className="bg-slate-950 text-slate-300">
                          {city}
                        </option>
                      ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="col-span-2 sm:col-auto px-1 py-1 bg-slate-950/80 border border-slate-800 rounded-md text-[9px] text-slate-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 cursor-pointer shadow-inner"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" className="bg-slate-950 text-slate-300">Todos los estados</option>
                    {[
                      ...STATUSES["Contactabilidad"],
                      ...STATUSES["Gestión"],
                      ...STATUSES["Cierre"],
                    ].map((status) => (
                      <option key={status} value={status} className="bg-slate-950 text-slate-300">
                        {status}
                      </option>
                    ))}
                  </select>
                  {(currentUser?.roleName?.toLowerCase() === "superadmin" || currentUser?.roleId === "ADMIN_MAESTRO" || currentUser?.roleName?.toLowerCase().includes('ejecutivo') || currentUser?.roleId?.includes('6940')) && (
                    <select
                      value={filterAssignedUser}
                      onChange={(e) => setFilterAssignedUser(e.target.value)}
                      className="col-span-2 sm:col-auto px-1 py-1 bg-slate-950/80 border border-slate-800 rounded-md text-[9px] text-slate-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 cursor-pointer shadow-inner"
                    >
                      <option value="all">Asignación: Todos</option>
                      {platformUsers
                        .filter(u => 
                          u.roleName?.toLowerCase().includes('vendedor') || 
                          u.roleName?.toLowerCase().includes('ventas') ||
                          u.roleName?.toLowerCase().includes('ejecutivo') || 
                          u.roleName?.toLowerCase().includes('comercial') || 
                          u.roleId?.includes('6940')
                        )
                        .map(u => (
                          <option key={u.id} value={u.fullName}>{u.fullName}</option>
                        ))}
                    </select>
                  )}
                </div>
                <div className="relative w-full sm:w-36 lg:w-48">
                  <Search
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500"
                    size={10}
                  />
                  <input
                    type="text"
                    placeholder="Búsqueda..."
                    className="w-full pl-7 pr-2 py-1 bg-slate-950/80 border border-slate-800 rounded-md text-[9px] focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 text-slate-200 placeholder:text-slate-600 shadow-inner transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-1 w-full sm:w-auto mt-1 sm:mt-0">
                  <button
                    onClick={handleStartAutoDial}
                    className="flex-1 sm:flex-none px-3 py-1 uppercase tracking-widest rounded-md shadow-[0_1px_4px_rgba(0,0,0,0.2)] transition-all text-[9px] flex gap-1 items-center justify-center border bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold border-amber-500/20 hover:border-amber-500/40 active:scale-[0.98]"
                  >
                    <Phone size={10} strokeWidth={2.5} />
                    Automarcación
                  </button>
                  {(currentUser?.roleName?.toLowerCase() === "superadmin" || currentUser?.roleId === "ADMIN_MAESTRO" || currentUser?.roleName?.toLowerCase().includes('admin') || currentUser?.roleName?.toLowerCase().includes('ejecutivo') || currentUser?.roleId?.includes('6940')) && (
                    <button
                      onClick={() => setIsScrapingModalOpen(true)}
                      disabled={!canCreateContact}
                      className={`flex-1 sm:flex-none px-3 py-1 uppercase tracking-widest rounded-md shadow-[0_1px_4px_rgba(0,0,0,0.2)] transition-all text-[9px] flex gap-1 items-center justify-center border ${!canCreateContact ? 'bg-slate-900/50 text-slate-600 border-slate-800 cursor-not-allowed' : 'bg-slate-900/80 hover:bg-slate-800 text-amber-500 hover:text-amber-400 font-bold border-amber-500/20 hover:border-amber-500/40 active:scale-[0.98]'}`}
                    >
                      <ScanEye size={10} strokeWidth={2.5} />
                      Scraping
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setAsuntoFormData({
                        nombreAsunto: "",
                        businessId: "",
                        datosAsunto: "",
                        archivoAdjuntoUrl: "",
                        clientEmail: "",
                        meetingDate: "",
                        contactName: "",
                        contactPhone: ""
                      });
                      setAsuntoFileName("");
                      setIsAsuntoDragOver(false);
                      setAsuntoClientSearch("");
                      setIsAsuntoClientDropdownOpen(false);
                      setIsAsuntoModalOpen(true);
                    }}
                    disabled={!canCreateAsunto}
                    className={`flex-1 sm:flex-none px-3 py-1 uppercase tracking-widest rounded-md shadow-[0_1px_4px_rgba(0,0,0,0.2)] transition-all text-[9px] flex gap-1 items-center justify-center border ${!canCreateAsunto ? 'bg-slate-900/50 text-slate-600 border-slate-800 cursor-not-allowed' : 'bg-slate-900/80 hover:bg-slate-800 text-blue-400 hover:text-blue-300 font-bold border-blue-500/20 hover:border-blue-500/40 active:scale-[0.98]'}`}
                  >
                    <Plus size={10} strokeWidth={2.5} />
                    Crear Asunto
                  </button>
                  <button
                    onClick={handleCreateNew}
                    disabled={!canCreateContact}
                    className={`flex-1 sm:flex-none px-3 py-1 uppercase tracking-widest rounded-md transition-all text-[9px] flex gap-1 items-center justify-center border-t ${!canCreateContact ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed' : 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-slate-950 hover:from-yellow-300 hover:to-yellow-400 font-black shadow-[0_1px_6px_rgba(250,204,21,0.3)] hover:shadow-[0_2px_10px_rgba(250,204,21,0.4)] active:scale-[0.98] border-yellow-200/50'}`}
                  >
                    <Plus size={10} strokeWidth={2.5} />
                    Crear contacto
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-1 sm:p-2 mt-1 lg:mt-2">
              {/* Desktop Table View */}
              <div className="hidden lg:block min-w-[1000px] pb-2">
                <table className="w-full text-left border-separate border-spacing-y-0.5">
                  <thead>
                    <tr className="text-slate-400 sticky top-0 bg-slate-900/95 backdrop-blur-xl z-20 shadow-sm">
                      <th className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-500 text-center w-10">
                        ID
                      </th>
                      <th className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        Nombre empresa
                      </th>
                      <th className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        País
                      </th>
                      <th className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        Teléfono Empresa
                      </th>
                      <th className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        Estado
                      </th>
                      <th className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-center text-slate-400 w-24">
                        Notas
                      </th>
                      <th className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-center text-slate-400">
                        Asunto
                      </th>
                      <th className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-right pr-4 text-slate-400">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isTableLoading ? (
                      <tr>
                        <td colSpan={10} className="py-8">
                          <TableLoader />
                        </td>
                      </tr>
                    ) : currentItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-500 font-medium bg-slate-900/20">
                          {businesses.length === 0 ? "No hay registros disponibles." : "No se encontraron resultados"}
                        </td>
                      </tr>
                    ) : currentItems.map((business, index) => (
                      <tr key={`${business.id || 'no-id'}-${index}`} className="group transition-all">
                        <td className="px-2 py-1 bg-slate-950/40 rounded-l-lg border-y border-l border-amber-500/5 group-hover:bg-slate-800/40 transition-all font-mono text-[10px] text-slate-500 text-center select-none w-10">
                          EMP{String((currentPage - 1) * itemsPerPage + index).padStart(3, '0')}-{new Date(business.createdAt || Date.now()).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('')}
                        </td>
                        <td className="px-2 py-1.5 bg-slate-950/40 border-y border-amber-500/5 group-hover:bg-slate-800/40 transition-all z-10 relative">
                          <p className="font-bold text-slate-100 text-[11px] group-hover:text-amber-400 transition-colors">
                            {business.name}
                          </p>
                          <p className="text-[9px] text-slate-500 font-medium mt-0">
                            {business.category}
                          </p>
                        </td>
                        <td className="px-2 py-1.5 bg-slate-950/40 border-y border-amber-500/5 group-hover:bg-slate-800/40 transition-all z-10 relative">
                          <span className="text-[11px] text-slate-400">
                            {business.country || "No especificado"}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 bg-slate-950/40 border-y border-amber-500/5 group-hover:bg-slate-800/40 transition-all z-10 relative">
                          <div className="flex flex-col gap-0.5 text-[11px] text-slate-300">
                            {business.phone && (
                              <div
                                onClick={() =>
                                  handleCopy(
                                    business.id,
                                    `${business.prefix || ""} ${business.phone || ""}`.trim(),
                                    "phone",
                                    business.name
                                  )
                                }
                                className="flex items-center gap-1 text-slate-300 cursor-pointer hover:text-amber-400 transition-colors relative"
                                title="Copiar número"
                              >
                                <Phone
                                  size={10}
                                  className="text-amber-500 shrink-0"
                                />
                                <span className="text-[11px] font-mono">
                                  {business.prefix} {business.phone}
                                </span>
                                <AnimatePresence>
                                  {copyStatus?.id === business.id &&
                                    copyStatus?.type === "phone" && (
                                      <motion.span
                                        initial={{ opacity: 0, x: 5 }}
                                        animate={{ opacity: 1, x: 10 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute left-full ml-2 px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[8px] font-bold rounded uppercase tracking-tighter whitespace-nowrap"
                                      >
                                        ¡Copiado!
                                      </motion.span>
                                    )}
                                </AnimatePresence>
                              </div>
                            )}
                            {business.whatsapp && (
                              <div
                                onClick={() =>
                                  handleCopy(
                                    business.id,
                                    business.whatsapp!,
                                    "whatsapp",
                                  )
                                }
                                className="flex items-center gap-1 text-amber-400 cursor-pointer hover:text-amber-300 transition-colors relative"
                              >
                                <svg
                                  className="w-2 h-2 fill-current"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12.031 0C5.385 0 0 5.385 0 12.031C0 14.653 1.253 17.062 2.94 18.969L1.002 24L6.155 22.062C7.94 23.315 10.021 24 12.031 24C18.677 24 24 18.615 24 12.031C24 5.385 18.677 0 12.031 0ZM18.571 16.924C18.28 17.756 16.88 18.455 16.037 18.54C15.424 18.625 14.549 18.784 11.233 17.408C7.26 15.753 4.673 11.722 4.475 11.458C4.276 11.194 2.825 9.263 2.825 7.247C2.825 5.232 3.868 4.254 4.301 3.805C4.65 3.442 5.174 3.27 5.645 3.27C5.798 3.27 5.937 3.277 6.059 3.284C6.442 3.303 6.634 3.33 6.89 3.948C7.21 4.721 7.989 6.621 8.082 6.81C8.175 6.999 8.268 7.264 8.136 7.528C8.004 7.792 7.859 7.915 7.661 8.142C7.463 8.369 7.252 8.548 7.081 8.794C6.883 9.03 6.659 9.285 6.896 9.692C7.121 10.089 7.888 11.341 9.014 12.355C10.463 13.662 11.644 14.075 12.08 14.275C12.516 14.474 12.966 14.437 13.27 14.116C13.653 13.71 14.129 13.01 14.605 12.311C14.949 11.83 15.385 11.754 15.795 11.905C16.205 12.056 18.396 13.136 18.819 13.344C19.242 13.553 19.533 13.657 19.638 13.846C19.744 14.035 19.744 15.111 19.167 16.924H18.571Z" />
                                </svg>
                                <AnimatePresence>
                                  {copyStatus?.id === business.id &&
                                    copyStatus?.type === "whatsapp" && (
                                      <motion.span
                                        initial={{ opacity: 0, x: 5 }}
                                        animate={{ opacity: 1, x: 10 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute left-full ml-2 px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[8px] font-bold rounded uppercase tracking-tighter whitespace-nowrap"
                                      >
                                        ¡Copiado!
                                      </motion.span>
                                    )}
                                </AnimatePresence>
                              </div>
                            )}
                            {!business.phone && !business.whatsapp && (
                              <span className="text-slate-500 italic">
                                No registrado
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 bg-slate-950/40 border-y border-amber-500/5 group-hover:bg-slate-800/40 transition-all z-10 relative">
                          {editingCell?.id === business.id &&
                          editingCell.field === "status" ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={editingCell.value}
                                onChange={(e) =>
                                  setEditingCell({
                                    ...editingCell,
                                    value: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleSaveInline(
                                      business.id,
                                      "status",
                                      editingCell.value,
                                    );
                                }}
                                className="px-1 py-0.5 bg-slate-800 rounded text-slate-100 text-[10px] w-32 focus:outline-none"
                              >
                                <optgroup label="Contactabilidad">
                                  {STATUSES["Contactabilidad"].map((s) => (
                                    <option key={`contact-${s}`} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Gestión">
                                  {STATUSES["Gestión"].map((s) => (
                                    <option key={`gestion-${s}`} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Cierre">
                                  {STATUSES["Cierre"].map((s) => (
                                    <option key={`cierre-${s}`} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleSaveInline(
                                    business.id,
                                    "status",
                                    editingCell.value,
                                  );
                                }}
                              >
                                <Check size={12} className="text-amber-400" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  setEditingCell(null);
                                }}
                              >
                                <X size={12} className="text-red-400" />
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0 rounded-full text-[9px] font-bold uppercase tracking-wider transition-colors ${permissions.edit ? 'cursor-pointer hover:bg-slate-800' : 'cursor-default'} ${
                                business.status === "Prop. Aceptada"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : business.status === "Prop. Rechazada" ||
                                      business.status?.includes("No Llamar") ||
                                      business.status?.includes("Equivocado") ||
                                      business.status?.includes("Erroneo")
                                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                    : business.status === "Reunión programada"
                                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                      : business.status === "Volver a llamar"
                                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                        : business.status?.includes("Enviar") ||
                                            business.status?.includes("enviada") ||
                                            business.status?.includes("Recordatorio") ||
                                            business.status?.includes("Intento")
                                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                          : business.status?.includes("Nuevo")
                                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                            : business.status?.includes("Buzón")
                                              ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                              : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                              }`}
                              onClick={() => {
                                if (permissions.edit) {
                                  setEditingCell({
                                    id: business.id,
                                    field: "status",
                                    value: business.status || "Nuevo",
                                  })
                                }
                              }
                              }
                            >
                              {business.status || "Nuevo"}
                              {business.status === 'Reunión programada' && business.meetingDate && (
                                <span className="opacity-80 flex items-center" title={business.meetingDate}>
                                  <Calendar size={10} className="mr-0.5"/>
                                  {new Date(business.meetingDate).toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 bg-slate-950/40 border-y border-amber-500/5 group-hover:bg-slate-800/40 transition-all z-10 relative text-center">
                          <button
                            onClick={() => {
                              setNoteModal({
                                id: business.id,
                                notes: business.notes || [],
                              });
                            }}
                            className="inline-flex items-center gap-2 justify-center hover:opacity-100 transition-opacity group/note select-none bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/10 hover:border-amber-500/25 px-2.5 py-1 rounded min-w-[56px]"
                            title={business.notes && business.notes.length > 0 ? `${business.notes.length} notas` : "Agregar nota"}
                          >
                            <MessageSquare size={11} className="text-amber-400 shrink-0" />
                            <span className="text-[10px] font-bold text-amber-400">
                              {business.notes ? business.notes.length : 0}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-2 bg-slate-950/40 border-y border-amber-500/5 group-hover:bg-slate-800/40 transition-all z-10 relative text-center">
                          {businessWithAsuntos.has(business.id) ? (
                            <div className="flex flex-col items-center justify-center text-emerald-400 gap-1" title="Asunto Creado">
                              <Check size={14} className="mx-auto" />
                              <span className="text-[7px] uppercase tracking-widest font-black leading-none bg-emerald-500/10 px-1.5 py-0.5 border border-emerald-500/20 rounded-sm">Creado</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setAsuntoFormData({
                                  nombreAsunto: "",
                                  businessId: business.id,
                                  datosAsunto: "",
                                  archivoAdjuntoUrl: "",
                                  clientEmail: business.email || "",
                                  meetingDate: "",
                                  contactName: business.contactName || "",
                                  contactPhone: ""
                                });
                                setAsuntoFileName("");
                                setIsAsuntoDragOver(false);
                                setAsuntoClientSearch("");
                                setIsAsuntoClientDropdownOpen(false);
                                setIsAsuntoModalOpen(true);
                              }}
                              disabled={!canCreateAsunto}
                              className={`p-1 flex items-center justify-center transition-colors mx-auto rounded ${!canCreateAsunto ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-blue-400 hover:bg-blue-500/10'}`}
                              title={canCreateAsunto ? "Crear Asunto" : "Sin permisos para crear asunto"}
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2 bg-slate-950/40 rounded-r-xl border-y border-r border-amber-500/5 group-hover:bg-slate-800/40 transition-all text-right z-10 relative">
                          <div className="flex justify-end gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => permissions.edit && handleEdit(business)}
                              disabled={!permissions.edit}
                              className={`p-1 rounded-lg transition-colors ${!permissions.edit ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'}`}
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => permissions.delete && handleDelete(business.id)}
                              disabled={!permissions.delete}
                              className={`p-1 rounded-lg transition-colors ${!permissions.delete ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3 pb-8">
                {currentItems.map((business, index) => (
                  <div
                    key={`mob-${business.id || 'no-id'}-${index}`}
                    className="bg-slate-950/40 border border-amber-500/10 rounded-xl p-3 flex flex-col gap-3 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-2 transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform">
                      <span
                        className={`text-[8px] font-black uppercase px-2 py-0.5 flex items-center gap-1 rounded-bl-lg ${
                          business.status?.includes("Prop. Aceptada")
                            ? "bg-emerald-500 text-slate-950"
                            : business.status === "Reunión programada"
                              ? "bg-purple-500 text-slate-950"
                              : business.status === "Volver a llamar"
                                ? "bg-amber-500 text-slate-950"
                                : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {business.status}
                        {business.status === 'Reunión programada' && business.meetingDate && (
                          <span className="opacity-80 flex items-center" title={business.meetingDate}>
                            <Calendar size={10} className="mr-0.5"/>
                            {new Date(business.meetingDate).toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-100 text-sm leading-tight">
                          {business.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {business.category}
                        </p>
                        {business.contactName && (
                          <p className="text-[10px] text-amber-500 font-bold mt-1">
                            <UserIcon size={10} className="inline mr-1" />
                            {business.contactName}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {businessWithAsuntos.has(business.id) ? (
                          <div className="flex items-center justify-center text-emerald-400 gap-1 px-2 border border-emerald-500/20 bg-emerald-500/10 rounded-lg">
                            <Check size={12} />
                            <span className="text-[9px] uppercase tracking-widest font-bold">Creado</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAsuntoFormData({
                                nombreAsunto: "",
                                businessId: business.id,
                                datosAsunto: "",
                                archivoAdjuntoUrl: "",
                                clientEmail: business.email || "",
                                meetingDate: "",
                                contactName: business.contactName || "",
                                contactPhone: "",
                                sector: ""
                              });
                              setAsuntoFileName("");
                              setIsAsuntoDragOver(false);
                              setAsuntoClientSearch("");
                              setIsAsuntoClientDropdownOpen(false);
                              setIsAsuntoModalOpen(true);
                            }}
                            disabled={!canCreateAsunto}
                            className={`p-1.5 flex items-center justify-center rounded-lg ${!canCreateAsunto ? 'bg-slate-900 text-slate-700 cursor-not-allowed' : 'bg-slate-900 text-slate-400 hover:text-blue-400 hover:bg-slate-800'}`}
                          >
                            <FileText size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-500 font-bold uppercase tracking-tighter">
                          Locación
                        </span>
                        <span className="text-slate-300 truncate">
                          {business.city || "Descn."}, {business.country}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-500 font-bold uppercase tracking-tighter">
                          Contacto
                        </span>
                        <div className="flex gap-2">
                          {business.phone && (
                            <button
                              onClick={() =>
                                handleCopy(
                                  business.id,
                                  `${business.prefix || ""} ${business.phone || ""}`.trim(),
                                  "phone",
                                  business.name
                                )
                              }
                              className="text-amber-500 flex items-center gap-1"
                              title="Copiar número"
                            >
                              <Phone size={10} />{" "}
                              <span className="opacity-80">Copiar</span>
                            </button>
                          )}
                          {business.whatsapp && (
                            <button
                              onClick={() =>
                                handleCopy(
                                  business.id,
                                  business.whatsapp!,
                                  "whatsapp",
                                )
                              }
                              className="text-amber-400 flex items-center gap-1"
                            >
                              <Send size={10} />{" "}
                              <span className="opacity-80">WA</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-500/5">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <UserIcon size={10} className="text-slate-500 shrink-0" />
                        <span className="text-[10px] text-slate-400 font-medium truncate max-w-[70px]">
                          {business.responsibleName || ""}
                        </span>
                        <div className="h-3 w-px bg-slate-800 self-center mx-1 shrink-0" />
                        <button
                          onClick={() => {
                            setNoteModal({
                              id: business.id,
                              notes: business.notes || [],
                            });
                          }}
                          className="flex items-center gap-1.5 text-[10px] text-amber-500 hover:text-amber-400 transition-colors select-none"
                        >
                          <MessageSquare size={10} className="shrink-0" />
                          <span>Notas</span>
                          <span className="text-[8px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1 rounded-sm shrink-0">
                            {business.notes ? business.notes.length : 0}
                          </span>
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => permissions.edit && handleEdit(business)}
                          disabled={!permissions.edit}
                          className={`p-1.5 rounded-lg ${!permissions.edit ? 'text-slate-600 bg-slate-900/50 cursor-not-allowed' : 'text-slate-400 bg-slate-800'}`}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => permissions.delete && handleDelete(business.id)}
                          disabled={!permissions.delete}
                          className={`p-1.5 rounded-lg ${!permissions.delete ? 'text-slate-600 bg-slate-900/50 cursor-not-allowed' : 'text-red-400 bg-red-400/5'}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

              {filteredBusinesses.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center mb-5 text-slate-600 shadow-inner">
                    <Search size={24} />
                  </div>
                  <p className="text-slate-300 font-bold text-lg">
                    No se han encontrado resultados
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    Refine los términos de búsqueda o proceda a añadir una nueva
                    cuenta corporativa.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </section>
      </main>

      {/* Modal / Form Overlay */}
      <AnimatePresence>
        {isScrapingModalOpen && (currentUser?.roleName?.toLowerCase() === "superadmin" || currentUser?.roleId === "ADMIN_MAESTRO" || currentUser?.roleName?.toLowerCase().includes('admin') || currentUser?.roleName?.toLowerCase().includes('ejecutivo') || currentUser?.roleId?.includes('6940')) && (
          <ScrapingModal
            onClose={() => setIsScrapingModalOpen(false)}
            onConfirm={handleAddScrapedLeads}
          />
        )}

        {isAssignmentModalOpen && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-amber-500/20 rounded-xl w-full max-w-sm p-5">
              {!pendingAssignmentSeller ? (
                <>
                  <button onClick={closeAssignmentModal} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={18}/></button>
                  <h3 className="font-bold text-white mb-4">Asignar {leadsPendingAssignment.length} contactos</h3>
                  <select
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white mb-4 text-sm"
                    value=""
                    onChange={(e) => {
                      const userId = e.target.value;
                      if (!userId) return;
                      const user = platformUsers.find(u => u.id === userId);
                      if (user) setPendingAssignmentSeller(user);
                    }}
                  >
                    <option value="">Seleccionar vendedor...</option>
                    {platformUsers
                      .filter(u => 
                        u.roleName?.toLowerCase().includes('ejecutivo') || 
                        u.roleName?.toLowerCase().includes('comercial') || 
                        u.roleId?.includes('6940')
                      )
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.fullName} ({u.roleName})</option>
                      ))}
                  </select>
                </>
              ) : (
                <>
                    <h3 className="font-bold text-white mb-4">Confirmar asignación</h3>
                    <p className="text-slate-400 text-sm mb-6">
                        ¿Seguro que quieres asignar {leadsPendingAssignment.length} contactos a <strong>{pendingAssignmentSeller.fullName}</strong>?
                    </p>
                    <div className="flex gap-3">
                        <button 
                          onClick={() => setPendingAssignmentSeller(null)}
                          className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-bold"
                        >
                            Cancelar
                        </button>
                        <button 
                           onClick={async () => {
                              const updatedLeads = leadsPendingAssignment.map(l => ({
                                ...l, 
                                responsibleName: pendingAssignmentSeller.fullName,
                                userId: pendingAssignmentSeller.id
                              }));
                              await saveBusinesses([...updatedLeads, ...businesses]);
                              closeAssignmentModal();
                           }}
                          className="flex-1 px-4 py-2 bg-amber-500 text-slate-950 rounded-lg text-sm font-bold"
                        >
                            Confirmar
                        </button>
                    </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        {statusToConfirm && (
          <motion.div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-amber-500/20 rounded-xl w-full max-w-sm p-5 shadow-2xl">
              <h3 className="font-bold text-white mb-2">Confirmar cambio</h3>
              <p className="text-slate-400 text-xs mb-4">¿Seguro que quieres cambiar el estado a <span className="text-amber-400 font-bold">{statusToConfirm.newStatus}</span>?</p>
              
              {statusToConfirm.newStatus === "Reunión programada" && (
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Fecha de la Reunión</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={confirmParts.date}
                      onChange={(e) => handleDateSelect(e.target.value, setMeetingDateToConfirm, meetingDateToConfirm)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-500/50 [color-scheme:dark] shadow-inner font-medium"
                    />
                  </div>
                  {confirmParts.date && (
                    <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 font-sans text-left">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                        <span>Horarios de Atención (L-V)</span>
                        <span className="text-[8px] text-amber-500 bg-amber-500/10 px-1 border border-amber-500/20 rounded font-black">8-12 / 2-6</span>
                      </label>
                      <div className="max-h-52 overflow-y-auto pr-1 space-y-2">
                        <div>
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest block mb-1">🌅 Mañana</span>
                          <div className="grid grid-cols-4 gap-1">
                            {TIMESLOTS.slice(0, 8).map((slot) => (
                              <button
                                key={slot.value}
                                type="button"
                                onClick={() => setMeetingDateToConfirm(`${confirmParts.date}T${slot.value}`)}
                                className={`py-1 text-[10px] rounded border transition-all font-semibold text-center ${confirmParts.time === slot.value ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/10' : 'bg-slate-950/50 text-slate-300 border-slate-800/80 hover:border-slate-700'}`}
                              >
                                {slot.label.replace(" AM", "")}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest block mb-1">🌇 Tarde</span>
                          <div className="grid grid-cols-4 gap-1">
                            {TIMESLOTS.slice(8).map((slot) => (
                              <button
                                key={slot.value}
                                type="button"
                                onClick={() => setMeetingDateToConfirm(`${confirmParts.date}T${slot.value}`)}
                                className={`py-1 text-[10px] rounded border transition-all font-semibold text-center ${confirmParts.time === slot.value ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/10' : 'bg-slate-950/50 text-slate-300 border-slate-800/80 hover:border-slate-700'}`}
                              >
                                {slot.label.replace(" PM", "")}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStatusToConfirm(null);
                    setMeetingDateToConfirm('');
                  }}
                  className="flex-1 px-3 py-2 bg-slate-800 text-slate-300 rounded text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (statusToConfirm.newStatus === "Presentación enviada") {
                       const business = businesses.find(b => b.id === statusToConfirm.businessId);
                       if (!business?.email) {
                         alert("Para enviar la presentación, el cliente debe tener un correo electrónico.");
                         setStatusToConfirm(null);
                         return;
                       }
                    }
                    if (statusToConfirm.newStatus === "Enviar Propuesta") {
                       const business = businesses.find(b => b.id === statusToConfirm.businessId);
                       if (!business?.email || !business.email.trim()) {
                         alert("El campo correo debe estar completo, realicelo antes de cambiar el estado");
                         setStatusToConfirm(null);
                         return;
                       }
                    }
                    if (statusToConfirm.newStatus === "Reunión programada") {
                      if (!meetingDateToConfirm) {
                        alert("Por favor selecciona la fecha y hora de la reunión.");
                        return;
                      }
                      if (!isValidBusinessHour(meetingDateToConfirm)) {
                        return;
                      }
                      
                      const updated = businesses.map((b) =>
                        b.id === statusToConfirm.businessId ? { ...b, status: statusToConfirm.newStatus, meetingDate: meetingDateToConfirm } : b,
                      );
                      saveBusinesses(updated);
                      setMeetingDateToConfirm('');
                      setStatusToConfirm(null);
                      return;
                    }
                    handleSaveInline(statusToConfirm.businessId, "status", statusToConfirm.newStatus, true);
                    setStatusToConfirm(null);
                  }}
                  className="flex-1 px-3 py-2 bg-amber-500 text-slate-950 font-bold rounded text-xs"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {noteModal && (() => {
          const businessObj = businesses.find((b) => b.id === noteModal.id);
          return (
            <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md">
              <div className="bg-slate-900 border border-amber-500/20 rounded-2xl w-full max-w-4xl p-4 sm:p-6 flex flex-col max-h-[95vh] md:max-h-[85vh] shadow-2xl">
                
                {/* Modern Header with Business Name & Status */}
                <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-amber-500 font-extrabold flex items-center gap-1">
                      <Zap size={10} className="text-amber-500" />
                      Gestión del contacto
                    </span>
                    <h3 className="font-extrabold text-white text-lg tracking-tight leading-snug">
                      {businessObj?.name || "Empresa"}
                    </h3>
                    {businessObj && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Estado:</span>
                        <select
                          value={businessObj.status || "Nuevo"}
                          onChange={(e) => handleSaveInline(businessObj.id, "status", e.target.value)}
                          className="bg-slate-950 text-[10px] text-amber-400 font-bold border border-slate-800 hover:border-amber-500/30 rounded-lg px-3 py-1 outline-none cursor-pointer transition-colors"
                        >
                          <optgroup label="Contactabilidad">
                            {STATUSES.Contactabilidad.map(s => <option key={`contact-${s}`} value={s}>{s}</option>)}
                          </optgroup>
                          <optgroup label="Gestión">
                            {STATUSES.Gestión.map(s => <option key={`gestion-${s}`} value={s}>{s}</option>)}
                          </optgroup>
                          <optgroup label="Cierre">
                            {STATUSES.Cierre.map(s => <option key={`cierre-${s}`} value={s}>{s}</option>)}
                          </optgroup>
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {canCreateAsunto && (
                      <button
                        onClick={() => {
                          if (businessObj) {
                            setAsuntoFormData({
                              nombreAsunto: "",
                              businessId: businessObj.id,
                              datosAsunto: "",
                              archivoAdjuntoUrl: "",
                              clientEmail: businessObj.email || "",
                              meetingDate: "",
                              contactName: businessObj.contactName || "",
                              contactPhone: businessObj.phone || "",
                              sector: ""
                            });
                            setAsuntoFileName("");
                            setIsAsuntoDragOver(false);
                            setAsuntoClientSearch("");
                            setIsAsuntoClientDropdownOpen(false);
                            setIsAsuntoModalOpen(true);
                          }
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg transition-colors text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md"
                        title="Crear Asunto desde este contacto"
                      >
                        <Plus size={12} strokeWidth={3} />
                        Crear Asunto
                      </button>
                    )}
                    {isAutoDialing && (
                      <span className="text-[11px] font-bold text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full animate-pulse border border-amber-500/20 flex items-center whitespace-nowrap shadow-sm">
                        <span className="mr-1">📞 Auto:</span> {autoDialQueue.length + 1} restante(s)
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setNoteModal(null);
                        if (isAutoDialing) {
                          setIsAutoDialing(false);
                          setAutoDialQueue([]);
                        }
                      }}
                      className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                      title={isAutoDialing ? "Detener Automarcación y Cerrar" : "Cerrar"}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* 2-Column Responsive Layout */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4 flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
                  
                  {/* Left Column: Controls & Information */}
                  <div className="col-span-12 md:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1 pb-4 custom-scrollbar">
                    
                    {/* Contact Information Cards (Editable Fields) */}
                    <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/85 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">
                          Datos de Contacto
                        </span>
                        <span className="text-[8px] text-slate-500 font-medium">
                          Auto-guardado al salir del campo
                        </span>
                      </div>
                      
                      <div className="space-y-3.5">
                        {/* Nombre del contacto */}
                        <div className="space-y-1.5">
                          <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                            <UserIcon size={10} className="text-amber-500/80" />
                            Nombre del Contacto
                          </label>
                          <input
                            type="text"
                            value={contactNameEdit}
                            onChange={(e) => setContactNameEdit(e.target.value)}
                            onBlur={() => handleSaveContactField('contactName', contactNameEdit)}
                            placeholder="Ej. Juan Pérez (escribe para guardar)"
                            className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/50 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all shadow-inner focus:ring-1 focus:ring-amber-500/20"
                          />
                        </div>

                        {/* Número del contacto */}
                        <div className="space-y-1.5">
                          <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                            <Phone size={10} className="text-amber-500/80" />
                            Teléfono de Contacto
                          </label>
                          <input
                            type="tel"
                            value={phoneEdit}
                            onChange={(e) => setPhoneEdit(e.target.value)}
                            onBlur={() => handleSaveContactField('contactPhone', phoneEdit)}
                            placeholder="Ej. +57 300 123 4567"
                            className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/50 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all shadow-inner focus:ring-1 focus:ring-amber-500/20 font-mono"
                          />
                        </div>

                        {/* Correo del contacto */}
                        <div className="space-y-1.5">
                          <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                            <Mail size={10} className="text-amber-500/80" />
                            Correo del Contacto
                          </label>
                          <input
                            type="email"
                            value={emailEdit}
                            onChange={(e) => setEmailEdit(e.target.value)}
                            onBlur={() => handleSaveContactField('email', emailEdit)}
                            placeholder="Ej. contacto@empresa.com"
                            className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/50 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all shadow-inner focus:ring-1 focus:ring-amber-500/20"
                          />
                        </div>

                        {/* Botón de Guardar Manual */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleSaveAllContactDetails}
                            className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-extrabold text-xs transition-all tracking-wider uppercase ${
                              isContactSaved
                                ? "bg-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.3)]"
                                : "bg-amber-500 hover:bg-amber-400 text-slate-950 hover:shadow-[0_2px_10px_rgba(245,158,11,0.2)] active:scale-[0.98]"
                            }`}
                          >
                            {isContactSaved ? (
                              <>
                                <Check size={14} className="stroke-[3]" />
                                ¡Datos de Contacto Guardados!
                              </>
                            ) : (
                              <>
                                <Check size={14} className="stroke-[3]" />
                                Guardar Datos de Contacto
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Automarcación banner */}
                    {isAutoDialing && (
                      <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/15 flex flex-col gap-3 shadow-md">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                          </span>
                          <span className="text-[11px] text-amber-500 font-extrabold uppercase tracking-widest">
                            Autollamada en Proceso
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          Marcando automáticamente la lista de leads filtrados. Presiona el botón al finalizar de registrar tu nota para continuar.
                        </p>
                        <button
                          onClick={() => {
                            setNoteModal(null);
                            callNextInQueue(autoDialQueue);
                          }}
                          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-2.5 rounded-lg uppercase tracking-widest transition-all shadow-[0_4px_12px_rgba(245,158,11,0.2)] hover:shadow-[0_6px_16px_rgba(245,158,11,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] text-center"
                        >
                          Siguiente Cliente
                        </button>
                      </div>
                    )}

                    {/* Company Background Context */}
                    <div className="p-4 bg-slate-950/20 rounded-xl border border-slate-850/80 space-y-2.5">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 block">
                        Detalles de la Empresa
                      </span>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">TELEFONO EMPRESA</span>
                          <span className="text-slate-300 font-mono">{businessObj?.prefix} {businessObj?.phone || "No Registrado"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">Categoría / Sector</span>
                          <span className="text-slate-300 truncate block">{businessObj?.category || "No Especificado"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">Ubicación / País</span>
                          <span className="text-slate-300 flex items-center gap-1">
                            <MapPin size={9} className="text-amber-500/50 shrink-0" />
                            {businessObj?.country || "No especificado"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">Asignado a</span>
                          <span className="text-slate-300 truncate block">{businessObj?.responsibleName || "No Asignado"}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Bitácora Notes chat History */}
                  <div className="col-span-12 md:col-span-7 flex flex-col h-full min-h-[30vh] md:min-h-0 md:border-l md:border-slate-800/80 md:pl-6 overflow-hidden">
                    
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-2 block">
                      Historial de notas
                    </span>

                    {/* Scrollable Chat Area */}
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3 pb-3">
                      {noteModal.notes.map((n, i) => {
                        const authorFull = n.authorName || "Usuario";
                        const resolvedUser = platformUsers?.find(u => u?.fullName?.toLowerCase() === authorFull?.toLowerCase());
                        const roleDisplay = n.authorRole || resolvedUser?.roleName || "Colaborador";
                        
                        return (
                          <div
                            key={`${n.date}-${i}`}
                            className="flex flex-col gap-1.5 group relative bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/40 hover:border-slate-800/80 p-3.5 rounded-xl transition-all"
                          >
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="text-amber-400 font-bold text-xs">
                                {authorFull}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                {roleDisplay}
                              </span>
                              <span className="text-[9px] text-slate-500 ml-auto font-medium">
                                {new Date(n.date).toLocaleDateString()} {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            
                            <p className="text-slate-200 text-xs leading-relaxed break-words whitespace-pre-wrap pl-0.5">
                              {n.text}
                            </p>

                            <button
                              onClick={() => handleDeleteNote(i)}
                              className="text-slate-550 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 absolute top-3 right-3"
                              title="Eliminar nota"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        );
                      })}
                      
                      {noteModal.notes.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center py-10 text-center">
                          <MessageSquare size={26} className="text-slate-700 mb-2 opacity-40 animate-pulse" />
                          <p className="text-slate-550 text-[11px] italic">
                            Sin comentarios registrados en esta empresa.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Sleek chat input form at the bottom */}
                    <div className="pt-3 border-t border-slate-800 mt-auto">
                      <div className="flex gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-850 focus-within:border-amber-500/30 transition-all">
                        <textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Escribe una nueva nota de gestión y presiona Enviar..."
                          className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none min-h-[46px] max-h-[90px] resize-none custom-scrollbar"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendInstantNote();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleSendInstantNote}
                          disabled={!newNote.trim()}
                          className="self-end p-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 rounded-lg transition-all scale-95 hover:scale-100 active:scale-95 shadow-md flex items-center justify-center shrink-0"
                          title="Enviar nota"
                        >
                          <Send size={12} className="rotate-45 text-slate-950 font-black" />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </motion.div>
          );
        })()}

        <AnimatePresence>
          {deleteNoteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm"
              onClick={() => setDeleteNoteConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-slate-900 border border-red-500/30 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-white font-bold text-base mb-2">¿Eliminar nota?</h3>
                <p className="text-slate-300 text-xs mb-6 leading-relaxed">
                  Esta acción borrará permanentemente la nota de la bitácora de esta empresa.
                </p>
                <p className="text-amber-500/80 text-[10px] uppercase tracking-wider font-semibold mb-6">
                  Presiona ENTER para Confimar o ESC para Cancelar
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteNoteConfirm(null)}
                    type="button"
                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExecuteNoteDelete}
                    type="button"
                    className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-400 text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-red-500/10 font-bold"
                  >
                    Confirmar (Enter)
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {isModalOpen && mounted && (
          <motion.div
            key="business-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-slate-900 border-x-0 sm:border border-amber-500/20 shadow-2xl rounded-none sm:rounded-3xl w-full max-w-lg overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[90vh]"
            >
              <div className="px-5 py-4 border-b border-amber-500/10 flex justify-between items-center bg-slate-950/80 shrink-0 sticky top-0 z-30">
                <h2 className="text-base font-display font-black text-white flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.8)] animate-pulse" />
                  <span className="uppercase tracking-widest">
                    {editingBusiness ? "Editar Contacto" : "Crear nuevo contacto"}
                  </span>
                </h2>
                <button
                  onClick={handleCancel}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar flex-1 min-h-0 bg-slate-900">
                <form
                  id="business-form"
                  onSubmit={handleSubmit}
                  className="space-y-6 pb-20 sm:pb-0"
                >
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-400">
                        Nombre empresa
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="Ej. Corporación Hive"
                        className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium text-xs shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                        value={formData.name}
                        disabled={!!editingBusiness}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-400">
                          País
                        </label>
                        <select
                          required
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 cursor-pointer text-xs font-medium shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                          value={formData.country}
                          disabled={!!editingBusiness}
                          onChange={(e) => {
                            const selectedCountry = e.target.value;
                            const autoPrefix = COUNTRY_PREFIXES[selectedCountry] || "";
                            setFormData({
                              ...formData,
                              country: selectedCountry,
                              city: "",
                              prefix: autoPrefix,
                            });
                          }}
                        >
                          <option value="" disabled>Seleccionar...</option>
                          {COUNTRIES.map((country) => (
                            <option key={country} value={country}>
                              {COUNTRY_FLAGS[country]} {country}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-400">
                          Ciudad
                        </label>
                        <select
                          required
                          disabled={!formData.country || !!editingBusiness}
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium shadow-inner"
                          value={formData.city || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              city: e.target.value,
                            })
                          }
                        >
                          <option value="" disabled>
                            {formData.country ? "Seleccionar..." : "..."}
                          </option>
                          {formData.country &&
                            LOCATION_DATA[formData.country]?.map((city) => (
                              <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-4 space-y-1">
                        <label className="block text-xs font-bold text-slate-400">
                          Prefijo
                        </label>
                        <select
                          required
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 cursor-pointer font-mono text-[11px] shadow-inner"
                          value={formData.prefix}
                          onChange={(e) =>
                            setFormData({ ...formData, prefix: e.target.value })
                          }
                        >
                          <option value="" disabled>...</option>
                          {Array.from(new Set(Object.values(COUNTRY_PREFIXES))).map((prefix) => (
                            <option key={prefix} value={prefix}>{prefix}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-8 space-y-1">
                        <label className="block text-xs font-bold text-slate-400">
                          Teléfono Empresa
                        </label>
                        <input
                          required
                          type="tel"
                          placeholder="300 000 0000"
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 font-mono text-[11px] shadow-inner"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-400">
                          Nombre contacto
                        </label>
                        <input
                          type="text"
                          placeholder="Nombre de la persona"
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium text-xs shadow-inner"
                          value={formData.contactName || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, contactName: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-400">
                          Teléfono contacto
                        </label>
                        <input
                          type="tel"
                          placeholder="Número del contacto..."
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 font-mono text-[11px] shadow-inner"
                          value={formData.responsiblePhone}
                          onChange={(e) =>
                            setFormData({ ...formData, responsiblePhone: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-400">
                          Estado
                        </label>
                        <select
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 cursor-pointer text-xs font-medium shadow-inner"
                          value={formData.status}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              status: e.target.value as Business["status"],
                            })
                          }
                        >
                          <optgroup label="Contactabilidad">
                            {STATUSES["Contactabilidad"].map((s) => (
                              <option key={`contact-${s}`} value={s}>{s}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Gestión">
                            {STATUSES["Gestión"].map((s) => (
                              <option key={`gestion-${s}`} value={s}>{s}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Cierre">
                            {STATUSES["Cierre"].map((s) => (
                              <option key={`cierre-${s}`} value={s}>{s}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-400">
                          Sector
                        </label>
                        <select
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 cursor-pointer text-xs font-medium shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                          value={formData.category}
                          disabled={!!editingBusiness}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              category: e.target.value as BusinessCategory,
                            })
                          }
                        >
                          {BUSINESS_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-400">
                          Asignado a
                        </label>
                        <select
                          required
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 font-medium text-xs shadow-inner cursor-pointer"
                          value={formData.responsibleName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              responsibleName: e.target.value,
                            })
                          }
                        >
                          <option value="" disabled>Seleccionar ejecutivo...</option>
                          {platformUsers
                            .filter(u => u.roleName === 'Ejecutivo Comercial')
                            .map(u => (
                              <option key={u.id} value={u.fullName}>
                                {u.fullName}
                              </option>
                            ))
                          }
                        </select>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="px-6 py-4 border-t border-amber-500/10 bg-slate-950/80 flex flex-col sm:flex-row gap-3 shrink-0 sticky bottom-0 sm:static">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-900 text-slate-400 font-bold rounded-xl hover:text-white transition-all text-[11px] border border-slate-800 order-2 sm:order-1 uppercase tracking-widest"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  form="business-form"
                  className={`w-full sm:flex-1 py-3 ${editingBusiness ? "bg-amber-500 hover:bg-amber-400 text-slate-950" : "bg-yellow-400 hover:bg-yellow-300 text-slate-950"} font-black uppercase tracking-widest rounded-xl shadow-lg transition-all text-[11px] active:scale-[0.98] order-1 sm:order-2`}
                >
                  {editingBusiness ? "Guardar Cambios" : "Confirmar Registro"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Crear Asunto Modal */}
        {isAsuntoModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-2xl" />
              
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">Crear Nuevo Asunto</h3>
                  <p className="text-slate-400 text-[10px] mt-0.5 font-medium">Asocia un nuevo expediente de oportunidad comercial a un cliente o establecimiento.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAsuntoModalOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors bg-slate-950/40 p-1.5 rounded-lg hover:bg-slate-950"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleCreateAsunto} className="space-y-3">
                {/* Nombre Asunto */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Nombre del Asunto *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. Integración de Agentes, Campaña de WhatsApp, etc."
                    className="w-full px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 font-medium text-xs shadow-inner"
                    value={asuntoFormData.nombreAsunto}
                    onChange={(e) =>
                      setAsuntoFormData({
                        ...asuntoFormData,
                        nombreAsunto: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Cliente / Lead Select Autocomplete */}
                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Contacto del directorio *
                  </label>
                  
                  {asuntoFormData.businessId ? (
                    <div className="w-full bg-slate-950/80 border border-slate-800 p-2 rounded-lg flex flex-col justify-center cursor-not-allowed text-xs transition-all opacity-80">
                      <span className="text-slate-200 font-bold mb-0.5">
                        {businesses.find(b => b.id === asuntoFormData.businessId)?.name || 'Empresa'}
                      </span>
                      <span className="text-slate-500 font-medium text-[9px] uppercase tracking-wider">
                        {businesses.find(b => b.id === asuntoFormData.businessId)?.category || 'SECTOR'}
                      </span>
                    </div>
                  ) : (
                    <div 
                      className={`w-full bg-slate-950/80 border ${isAsuntoClientDropdownOpen ? 'border-blue-500/50 ring-1 ring-blue-500/50' : 'border-slate-800'} p-2 rounded-lg flex items-center justify-between cursor-text transition-all`}
                      onClick={() => setIsAsuntoClientDropdownOpen(true)}
                    >
                      <input
                        type="text"
                        className="bg-transparent border-none outline-none w-full text-slate-200 placeholder-slate-600 text-xs"
                        placeholder="Buscar cliente..."
                        value={isAsuntoClientDropdownOpen ? asuntoClientSearch : ''}
                        onChange={(e) => {
                          setAsuntoClientSearch(e.target.value);
                          if (!isAsuntoClientDropdownOpen) setIsAsuntoClientDropdownOpen(true);
                        }}
                        onFocus={() => {
                          setIsAsuntoClientDropdownOpen(true);
                          setAsuntoClientSearch("");
                        }}
                      />
                      <div className="text-slate-500 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  )}
                  
                  {isAsuntoClientDropdownOpen && !asuntoFormData.businessId && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsAsuntoClientDropdownOpen(false)}></div>
                      <div className="absolute top-full left-0 w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl max-h-36 overflow-y-auto z-50 py-1">
                        {businesses.filter(b => b.name.toLowerCase().includes(asuntoClientSearch.toLowerCase())).length > 0 ? (
                          businesses.filter(b => b.name.toLowerCase().includes(asuntoClientSearch.toLowerCase())).map((b, idx) => (
                            <div 
                              key={`${b.id}-${idx}`} 
                              className={`px-3 py-1.5 hover:bg-slate-900 cursor-pointer text-xs transition-all ${asuntoFormData.businessId === b.id ? 'bg-slate-900 text-blue-400 font-bold' : 'text-slate-300'}`}
                              onClick={() => {
                                setAsuntoFormData({
                                  ...asuntoFormData, 
                                  businessId: b.id, 
                                  clientEmail: b.email || "",
                                  contactName: b.contactName || "",
                                  contactPhone: "",
                                  sector: ""
                                });
                                setAsuntoClientSearch("");
                                setIsAsuntoClientDropdownOpen(false);
                              }}
                            >
                              <div className="font-bold">{b.name}</div>
                              <div className="text-[9px] text-slate-500 uppercase tracking-widest">{b.category}</div>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-slate-500">No se encontraron clientes</div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* A Cargo */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    A Cargo
                  </label>
                  <select
                    disabled
                    required
                    className="w-full px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 font-medium text-xs shadow-inner appearance-none disabled:opacity-70 cursor-not-allowed"
                    value="Área de Desarrollo"
                  >
                    <option value="Área de Desarrollo">Área de Desarrollo</option>
                  </select>
                  <input type="hidden" value="Área de Desarrollo" name="destinatario" />
                </div>

                {/* Datos Asunto / Notas */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Descripción del Asunto
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Detalles sobre la oportunidad comercial o necesidades planteadas..."
                    className="w-full px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 font-medium text-xs shadow-inner resize-none"
                    value={asuntoFormData.datosAsunto}
                    onChange={(e) =>
                      setAsuntoFormData({
                        ...asuntoFormData,
                        datosAsunto: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Botones */}
                <div className="pt-2.5 border-t border-slate-800 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAsuntoModalOpen(false)}
                    className="flex-1 py-1.5 bg-slate-800 text-slate-300 font-bold rounded-lg hover:bg-slate-700 hover:text-white transition-colors text-[10px] uppercase tracking-wider border border-slate-850"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-lg transition-colors text-[10px] uppercase tracking-wider shadow-lg shadow-blue-500/10 active:scale-[0.98]"
                  >
                    Crear Asunto
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Confirmation Modal */}
        {businessToDelete && (
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
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-600 space-x-1 flex" />
              
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                  <X className="text-red-500 w-8 h-8" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">Eliminar Contacto</h3>
                <p className="text-slate-400 text-sm mb-8">
                  ¿Confirma la eliminación de este contacto? Esta acción es irreversible.
                </p>
                
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setBusinessToDelete(null)}
                    className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors text-xs uppercase tracking-wider"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-400 transition-colors text-xs uppercase tracking-wider shadow-lg shadow-red-500/20"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        {/* Call Confirmation Modal */}
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
    </div>
  );
}
