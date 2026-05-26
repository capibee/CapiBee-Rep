import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  X,
  FileText,
  Briefcase,
  Eye,
  ChevronLeft,
  Trash2,
  Edit,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Asunto, Propuesta, Business, Client } from "../types";
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

  const isSuperAdmin = useMemo(() => {
    if (!currentUser) return false;
    const roleId = String(currentUser.roleId || "").toUpperCase();
    const roleName = String(currentUser.roleName || "").toUpperCase();
    return roleId === 'ADMIN_MAESTRO' || 
           roleId === 'SUPERADMIN' || 
           roleName === 'SUPERADMIN' || 
           roleName === 'SUPER ADMINISTRADOR' ||
           roleName.includes('ADMIN') ||
           roleId.includes('ADMIN');
  }, [currentUser]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingPropuesta, setEditingPropuesta] = useState<Propuesta | null>(null);
  const [isCreatingForAsunto, setIsCreatingForAsunto] = useState(false);
  const [modalPdfUrl, setModalPdfUrl] = useState<string>("");
  const [modalPdfName, setModalPdfName] = useState<string>("");
  const [statusChangeConfirm, setStatusChangeConfirm] = useState<{
    id: string;
    isAsunto: boolean;
    newStatus: string;
    asuntoId: string;
  } | null>(null);
  const [clientCreationPrompt, setClientCreationPrompt] = useState<{
    id: string;
    isAsunto: boolean;
    newStatus: string;
    asuntoId: string;
  } | null>(null);
  const [pdfUploadConfirm, setPdfUploadConfirm] = useState<{
    propuestaId: string;
    file: File;
  } | null>(null);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPropuesta(null);
    setIsCreatingForAsunto(false);
    setFormData({ asuntoId: "", propuestaTexto: "", honorarios: "", gastos: "" });
    setModalPdfUrl("");
    setModalPdfName("");
  };

  const handleEditClick = (p: Propuesta) => {
    setEditingPropuesta(p);
    setFormData({
      asuntoId: p.asuntoId,
    });
    setModalPdfUrl(p.pdfUrl || "");
    setModalPdfName(p.pdfName || "");
    setIsModalOpen(true);
  };

  const handleDeletePropuesta = async (id: string) => {
    try {
      const { error } = await supabase.from('propuestas').delete().eq('id', id);
      if (error) {
        console.error("Error deleting proposal from Supabase:", error);
      }
    } catch (err) {
      console.error("Error deleting proposal:", err);
    }

    const updated = propuestas.filter(p => p.id !== id);
    setPropuestas(updated);
    localStorage.setItem("capibee_propuestas", JSON.stringify(updated));
    setDeleteConfirmId(null);
    setIsViewModalOpen(false);
  };

  const handlePdfUploadClick = (propuestaId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // reset value so that the onChange fires even if the same file is chosen
    event.target.value = '';

    setPdfUploadConfirm({
      propuestaId,
      file
    });
  };

  const executePdfUpload = async () => {
    if (!pdfUploadConfirm) return;
    const { propuestaId, file } = pdfUploadConfirm;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const pdfBase64 = reader.result as string;
      const pdfName = file.name;

      const updated = propuestas.map(pr => {
        if (pr.id === propuestaId) {
          return { ...pr, pdfUrl: pdfBase64, pdfName: pdfName, status: 'Enviada' };
        }
        return pr;
      });
      setPropuestas(updated);
      try {
        localStorage.setItem("capibee_propuestas", JSON.stringify(updated));
      } catch (err) {
        console.warn("localstorage quota exceeded", err);
      }

      try {
        const { error } = await supabase
          .from('propuestas')
          .update({ 
            pdf_url: pdfBase64, 
            pdf_name: pdfName,
            status: 'Enviada'
          })
          .eq('id', propuestaId);
        if (error) console.error("Error updating PDF in db:", error);
      } catch (err) {
        console.warn("Failed to sync pdf_url to database:", err);
      }
    };
    reader.readAsDataURL(file);
    setPdfUploadConfirm(null);
  };

  const handleRemovePdf = async (propuestaId: string) => {
    const updated = propuestas.map(pr => {
      if (pr.id === propuestaId) {
        return { ...pr, pdfUrl: "", pdfName: "" };
      }
      return pr;
    });
    setPropuestas(updated);
    try {
      localStorage.setItem("capibee_propuestas", JSON.stringify(updated));
    } catch(e) {}

    try {
      const { error } = await supabase
        .from('propuestas')
        .update({ 
          pdf_url: null, 
          pdf_name: null 
        })
        .eq('id', propuestaId);
    } catch (err) {
      console.warn("Failed to delete pdf_url in database:", err);
    }
  };

  const [formData, setFormData] = useState({
    asuntoId: "",
  });
  const [isTableLoading, setIsTableLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("capibee_propuestas");
      if (saved) setPropuestas(JSON.parse(saved));
    } catch(e) {}
    
    try {
      const savedA = localStorage.getItem("capibee_asuntos");
      if (savedA) setAsuntos(JSON.parse(savedA));
    } catch(e) {}
    
    try {
      const savedB = localStorage.getItem("capibee_businesses");
      if (savedB) setBusinesses(JSON.parse(savedB));
    } catch(e) {}

    try {
      const savedUsers = localStorage.getItem("capibee_platform_users");
      if (savedUsers) setPlatformUsers(JSON.parse(savedUsers));
    } catch (_) {}

    fetchFreshData();

    const timer = setTimeout(() => setIsTableLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const fetchFreshData = async () => {
    try {
      const localPropuestas = localStorage.getItem("capibee_propuestas");
      const parsedLocal = localPropuestas ? JSON.parse(localPropuestas) : [];

      const { data: dbPropuestas, error: dbError } = await supabase.from('propuestas').select('*');
      if (dbError && dbError.code === '42P01') {
          // Table does not exist, use local only
          setPropuestas(parsedLocal);
          return;
      }
      
      if (dbPropuestas) {
          const mapped = dbPropuestas.map((p: any) => {
              const localProp = parsedLocal.find((lp: any) => lp.id === p.id);
              return {
                  id: p.id,
                  asuntoId: p.asunto_id || localProp?.asuntoId || "",
                  propuestaTexto: p.propuesta_texto || localProp?.propuestaTexto || "",
                  honorarios: p.honorarios || localProp?.honorarios || 0,
                  gastos: p.gastos || localProp?.gastos || 0,
                  userId: p.user_id || localProp?.userId || "",
                  createdAt: p.created_at ? (isNaN(Number(p.created_at)) ? new Date(p.created_at).getTime() : Number(p.created_at)) : (localProp?.createdAt || Date.now()),
                  status: p.status || localProp?.status || 'Enviada',
                  pdfUrl: p.pdf_url || localProp?.pdfUrl || "",
                  pdfName: p.pdf_name || localProp?.pdfName || ""
              };
          });
          
          // Retain local proposals that might have failed to save to the remote DB 
          const localOnly = parsedLocal.filter((lp: any) => !dbPropuestas.some((dp: any) => dp.id === lp.id));
          const combined = [...mapped, ...localOnly];

          setPropuestas(combined);
          localStorage.setItem("capibee_propuestas", JSON.stringify(combined));
      } else {
          setPropuestas(parsedLocal);
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

  const handleAutoCreateClient = async (asuntoId: string) => {
    try {
      console.log("Iniciando creación automática de cliente para asuntoId:", asuntoId);
      
      // Intentar encontrar el asunto en memoria, con fallback en base de datos remota si no está disponible
      let relatedAsunto = asuntos.find((a: Asunto) => a.id === asuntoId);
      if (!relatedAsunto) {
         console.warn("Asunto no encontrado en el estado local, buscando en Supabase...");
         try {
           const { data, error } = await supabase.from('asuntos').select('*').eq('id', asuntoId).maybeSingle();
           if (!error && data) {
             relatedAsunto = {
               id: data.id,
               nombreAsunto: data.nombre_asunto,
               businessId: data.business_id,
               fecha: data.fecha || '',
               userId: data.user_id || '',
               datosAsunto: '',
               createdAt: Number(data.created_at) || 0,
               contactName: data.contact_name || '',
               contactPhone: data.contact_phone || ''
             };
           }
         } catch(err) {
           console.warn("Error al buscar asunto en BD:", err);
         }
      }

      console.log("Asunto obtenido:", relatedAsunto);

      // Intentar encontrar los datos de la empresa (business) en memoria, con fallback en la base de datos
      let businessData: any = null;
      if (relatedAsunto?.businessId) {
        // Fallback local primero
        const localBus = businesses.find((b: any) => b.id === relatedAsunto.businessId);
        if (localBus) {
          businessData = {
            id: localBus.id,
            name: localBus.name,
            contact_name: localBus.contactName,
            email: localBus.email || "",
            country: localBus.country || "",
            address: localBus.address || "",
            category: localBus.category || "",
            phone: localBus.phone || localBus.contactPhone || "",
            user_id: localBus.userId || null
          };
        }

        try {
          const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', relatedAsunto.businessId)
            .maybeSingle();
          if (!error && data) {
            businessData = { ...businessData, ...data };
          }
        } catch (err) {
          console.warn("No se pudo obtener datos remotos de business, se usará local si existe:", err);
        }
      }

      console.log("Datos de empresa obtenidos:", businessData);

      // Obtener el nombre para el cliente
      const nameToCompare = businessData?.name || relatedAsunto?.nombreAsunto || "";
      if (!nameToCompare) {
        console.warn("No se pudo determinar el nombre del cliente.");
        alert("⚠️ No se puede registrar el cliente porque el asunto o nombre de la empresa están vacíos.");
        return;
      }

      let existingClients: Client[] = [];
      try {
        const saved = localStorage.getItem("capibee_clientes");
        if (saved) existingClients = JSON.parse(saved);
      } catch (_) {}

      // Verificación inteligente de duplicados para evitar falsos positivos
      const nameLower = nameToCompare.trim().toLowerCase();
      const alreadyExists = existingClients.some((c: Client) => {
        const cCompany = (c.companyName || "").trim().toLowerCase();
        const nCompany = nameLower;
        const cContact = (c.contactName || "").trim().toLowerCase();
        const nContact = (businessData?.contact_name || relatedAsunto?.contactName || "").trim().toLowerCase();

        // Si coinciden los nombres de la empresa exactamente
        if (cCompany && nCompany && cCompany === nCompany) {
          return true;
        }

        // Si coinciden los nombres de contacto pero sólo si NO son valores por defecto genéricos
        const isDefault = (name: string) => !name || name === "" || name === "contacto pendiente" || name === "—" || name === "desconocido" || name === "pendiente";
        if (!isDefault(cContact) && !isDefault(nContact) && cContact === nContact) {
          return true;
        }

        return false;
      });

      if (alreadyExists) {
        console.log("El cliente ya existe, se omite creación automática.");
        alert("ℹ️ El cliente \"" + nameToCompare + "\" ya se encuentra registrado en el módulo de clientes.");
        return;
      }

      // Validar integridad del userId para evitar violaciones de clave foránea en la base de datos
      const potentialUserId = relatedAsunto?.userId || businessData?.user_id || currentUser?.id || null;
      const userExistsInDb = potentialUserId && platformUsers.some((u: any) => u.id === potentialUserId);
      const safeUserId = userExistsInDb ? potentialUserId : null;

      // Generar el objeto de tipo Cliente
      const newClient: Client = {
        id: crypto.randomUUID(),
        type: 'Empresa',
        companyName: nameToCompare,
        contactName: businessData?.contact_name || relatedAsunto?.contactName || businessData?.responsible_name || "Contacto Pendiente",
        email: businessData?.email || "",
        language: 'Español',
        currency: 'USD',
        country: businessData?.country || "",
        address: businessData?.address || "",
        sector: businessData?.category || "",
        phone: businessData?.phone || businessData?.contact_phone || relatedAsunto?.contactPhone || "",
        createdAt: Date.now(),
        userId: safeUserId
      };

      console.log("Guardando cliente creado:", newClient);

      // 1. Guardar en Supabase
      const { error } = await supabase.from('clients').insert({
        id: newClient.id,
        type: newClient.type,
        company_name: newClient.companyName,
        contact_name: newClient.contactName,
        email: newClient.email,
        language: newClient.language,
        currency: newClient.currency,
        country: newClient.country,
        address: newClient.address,
        sector: newClient.sector,
        phone: newClient.phone,
        created_at: newClient.createdAt,
        user_id: newClient.userId
      });

      if (error) {
        if (error.code === '42P01') {
          console.error("La tabla 'clients' no existe en Supabase:", error);
          alert("⚠️ El cliente \"" + newClient.companyName + "\" se guardó LOCALMENTE en la memoria de tu navegador, pero no se pudo sincronizar en la nube porque falta crear la tabla 'clients' en tu base de datos de Supabase.\n\nPor favor, ejecuta el script SQL que te proporcionará el asistente en la consola de Supabase.");
          
          // Guardar localmente
          const updatedClients = [newClient, ...existingClients];
          localStorage.setItem("capibee_clientes", JSON.stringify(updatedClients));
        } else {
          console.error("Error al crear cliente en Supabase:", error);
          alert("Error al guardar cliente en Supabase: " + error.message);
          
          // Fallback guardar localmente de todas formas para no perder el dato
          const updatedClients = [newClient, ...existingClients];
          localStorage.setItem("capibee_clientes", JSON.stringify(updatedClients));
        }
      } else {
        // 2. Guardar en LocalStorage si no hubo errores en Supabase
        const updatedClients = [newClient, ...existingClients];
        localStorage.setItem("capibee_clientes", JSON.stringify(updatedClients));
        console.log("Cliente creado automáticamente de forma exitosa:", newClient);
        alert("🎉 ¡Cliente registrado exitosamente!\nSe ha creado el cliente \"" + newClient.companyName + "\" en el módulo de clientes.");
      }
    } catch (e: any) {
      console.error("Error inesperado en handleAutoCreateClient:", e);
      alert("Error inesperado al intentar crear el cliente automáticamente: " + (e.message || e));
    }
  };

  const executeStatusChange = async (shouldCreateClient: boolean = false, customConfirm: any = null) => {
    const activeConfirm = customConfirm || statusChangeConfirm;
    if (!activeConfirm) return;
    const { id, isAsunto, newStatus, asuntoId } = activeConfirm;

    if (isAsunto) {
      if (newStatus === "Pendiente" || newStatus === "Pendiente Envío") {
        if (!customConfirm) setStatusChangeConfirm(null);
        return;
      }
      
      const newPropuesta: Propuesta = {
        id: crypto.randomUUID(),
        asuntoId: asuntoId,
        propuestaTexto: '',
        honorarios: 0,
        gastos: 0,
        createdAt: Date.now(),
        status: newStatus as any,
        userId: currentUser?.id || ""
      };
      
      const updated = [newPropuesta, ...propuestas];
      setPropuestas(updated);
      try { localStorage.setItem("capibee_propuestas", JSON.stringify(updated)); } catch(e){}

      try {
        const { error } = await supabase.from('propuestas').insert({
          id: newPropuesta.id,
          asunto_id: newPropuesta.asuntoId,
          propuesta_texto: newPropuesta.propuestaTexto,
          honorarios: newPropuesta.honorarios,
          gastos: newPropuesta.gastos,
          user_id: newPropuesta.userId,
          created_at: new Date(newPropuesta.createdAt).toISOString(),
          status: newPropuesta.status
        });
        if (error && error.code !== '42P01') {
          console.error("Error inserting proposal to Supabase:", error);
          alert("Error al guardar propuesta en base de datos: " + error.message);
        } else {
          if (newStatus === 'Aceptada' && shouldCreateClient) {
            await handleAutoCreateClient(asuntoId);
          }
        }
      } catch(e: any) { 
        console.error(e);
        alert("Fallo de conexión al guardar propuesta: " + (e.message || "Error desconocido"));
      }

    } else {
      const updated = propuestas.map(item => item.id === id ? { ...item, status: newStatus as any } : item);
      setPropuestas(updated);
      try { localStorage.setItem("capibee_propuestas", JSON.stringify(updated)); } catch(e){}
      try {
        const { error } = await supabase.from('propuestas').update({ status: newStatus }).eq('id', id);
        if (error && error.code !== '42P01') {
          console.error("Error updating status in Supabase:", error);
          alert("Error al actualizar estado en base de datos: " + error.message);
        } else {
          if (newStatus === 'Aceptada' && shouldCreateClient) {
            await handleAutoCreateClient(asuntoId);
          }
        }
      } catch (err: any) {
        console.error(err);
        alert("Fallo de conexión al actualizar estado: " + (err.message || "Error desconocido"));
      }
    }

    if (!customConfirm) {
      setStatusChangeConfirm(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asuntoId) {
        alert("Por favor completa el campo obligatorio (Asunto)");
        return;
    }
    
    if (editingPropuesta) {
      // Edit Mode
      const updatedPropuesta: Propuesta = {
        ...editingPropuesta,
        asuntoId: formData.asuntoId,
        propuestaTexto: "PDF",
        honorarios: Number(formData.honorarios) || 0,
        gastos: Number(formData.gastos) || 0,
        pdfUrl: modalPdfUrl,
        pdfName: modalPdfName
      };

      try {
        const { error } = await supabase.from('propuestas').update({
            asunto_id: updatedPropuesta.asuntoId,
            propuesta_texto: updatedPropuesta.propuestaTexto,
            honorarios: updatedPropuesta.honorarios,
            gastos: updatedPropuesta.gastos,
            pdf_url: updatedPropuesta.pdfUrl,
            pdf_name: updatedPropuesta.pdfName,
        }).eq('id', updatedPropuesta.id);

        if (error && error.code !== '42P01') { 
            console.error("Error updating Propuesta:", error);
        }
      } catch (err) {
        console.error(err);
      }

      const updated = propuestas.map(p => p.id === editingPropuesta.id ? updatedPropuesta : p);
      setPropuestas(updated);
      try {
        localStorage.setItem("capibee_propuestas", JSON.stringify(updated));
      } catch(e) { console.warn("Quota exceeded localStorage"); }
      setIsModalOpen(false);
      setEditingPropuesta(null);
      setFormData({ asuntoId: "", propuestaTexto: "", honorarios: "", gastos: "" });
      setModalPdfUrl("");
      setModalPdfName("");
    } else {
      // Create Mode
      const newPropuesta: Propuesta = {
        id: crypto.randomUUID(),
        asuntoId: formData.asuntoId,
        propuestaTexto: "PDF",
        honorarios: Number(formData.honorarios) || 0,
        gastos: Number(formData.gastos) || 0,
        userId: currentUser.id || "unknown",
        createdAt: Date.now(),
        status: 'Enviada',
        pdfUrl: modalPdfUrl,
        pdfName: modalPdfName
      };

      try {
        const { error } = await supabase.from('propuestas').insert({
            id: newPropuesta.id,
            asunto_id: newPropuesta.asuntoId,
            propuesta_texto: newPropuesta.propuestaTexto,
            honorarios: newPropuesta.honorarios,
            gastos: newPropuesta.gastos,
            user_id: newPropuesta.userId,
            created_at: new Date(newPropuesta.createdAt).toISOString(),
            status: newPropuesta.status,
            pdf_url: newPropuesta.pdfUrl,
            pdf_name: newPropuesta.pdfName
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
      try {
        localStorage.setItem("capibee_propuestas", JSON.stringify(updated));
      } catch(e) { console.warn("Quota exceeded localStorage"); }
      setIsModalOpen(false);
      setFormData({ asuntoId: "", propuestaTexto: "", honorarios: "", gastos: "" });
      setModalPdfUrl("");
      setModalPdfName("");
    }
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
      pdfUrl?: string;
      pdfName?: string;
    }> = [];

    const isAdmin = isSuperAdmin;

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
          userId: p.userId || "",
          pdfUrl: p.pdfUrl,
          pdfName: p.pdfName
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
          userId: p.userId || "",
          pdfUrl: p.pdfUrl,
          pdfName: p.pdfName
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
      <div className="flex justify-end items-center mb-6">
           <button onClick={() => setIsModalOpen(true)} className="bg-yellow-400 hover:bg-yellow-500 text-slate-950 px-5 py-2.5 rounded-xl flex items-center gap-2 font-black transition-all shadow-lg shadow-yellow-500/20">
              <Plus size={20} /> Subir Propuesta
           </button>
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
                    <th className="p-4 font-bold">Propuesta</th>
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
                ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 font-medium bg-slate-900/20">
                        Tabla sin datos
                      </td>
                    </tr>
                ) : (
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
                              <select
                                value={(p.status === "Cancelada" ? "Rechazada" : p.status) || (p.isAsunto ? 'Pendiente' : 'Enviada')}
                                onChange={(e) => {
                                  setStatusChangeConfirm({
                                    id: p.id,
                                    isAsunto: p.isAsunto,
                                    newStatus: e.target.value,
                                    asuntoId: p.asuntoId
                                  });
                                }}
                                className={`text-[11px] font-bold rounded-[6px] px-2 py-1 outline-none border transition-colors bg-slate-950 cursor-pointer w-[120px] ${
                                  (p.status === "Cancelada" ? "Rechazada" : p.status) === 'Aceptada' 
                                    ? 'border-emerald-500/30 text-emerald-400 focus:ring-1 focus:ring-emerald-500/50' 
                                    : (p.status === "Cancelada" ? "Rechazada" : p.status) === 'Rechazada' 
                                    ? 'border-red-500/30 text-red-400 focus:ring-1 focus:ring-red-500/50' 
                                    : (p.status === "Cancelada" ? "Rechazada" : p.status) === 'Pendiente' || p.isAsunto
                                    ? 'border-amber-500/30 text-amber-400 focus:ring-1 focus:ring-amber-500/50 block whitespace-nowrap overflow-hidden text-ellipsis px-0 text-center pl-1'
                                    : 'border-blue-500/30 text-blue-400 focus:ring-1 focus:ring-blue-500/50'
                                }`}
                              >
                                <option value="Pendiente" className="bg-slate-900 text-amber-400">Pendiente Envío</option>
                                <option value="Enviada" className="bg-slate-900 text-blue-400">Enviada</option>
                                <option value="Aceptada" className="bg-slate-900 text-emerald-400">Aceptada</option>
                                <option value="Rechazada" className="bg-slate-900 text-red-400">Rechazada</option>
                              </select>
                            </td>
                            <td className="p-4 text-sm">
                              {p.isAsunto ? (
                                <button 
                                  onClick={() => {
                                    setFormData({...formData, asuntoId: p.asuntoId});
                                    setIsCreatingForAsunto(true);
                                    setIsModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold text-[10px] rounded-lg transition-colors whitespace-nowrap"
                                >
                                  Subir Propuesta
                                </button>
                              ) : (p.pdfUrl && p.pdfUrl !== "") ? (
                                <div className="flex items-center gap-2">
                                   <button
                                     onClick={() => {
                                         const win = window.open();
                                         if (win) {
                                             win.document.write(`<iframe src="${p.pdfUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                         }
                                     }}
                                     className="flex items-center gap-1.5 px-2.5 py-1 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/10 transition-colors text-[10px] font-bold"
                                     title="Ver Propuesta"
                                  >
                                      Ver PDF
                                  </button>
                                  <button 
                                    onClick={() => document.getElementById(`pdf-upload-${p.id}`)?.click()} 
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-[10px] font-bold whitespace-nowrap"
                                  >
                                    <RefreshCw size={12} /> Reemplazar propuesta
                                  </button>
                                  <input type="file" id={`pdf-upload-${p.id}`} className="hidden" accept="application/pdf" onChange={(e) => handlePdfUploadClick(p.id, e)} />
                                  <button onClick={() => handleRemovePdf(p.id)} className="text-red-400 hover:text-red-300 p-1" title="Eliminar PDF"><X size={12}/></button>
                                </div>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => document.getElementById(`pdf-upload-${p.id}`)?.click()} 
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-[10px] font-bold whitespace-nowrap"
                                  >
                                    <FileText size={12} /> Subir Propuesta
                                  </button>
                                  <input type="file" id={`pdf-upload-${p.id}`} className="hidden" accept="application/pdf" onChange={(e) => handlePdfUploadClick(p.id, e)} />
                                </>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              {!p.isAsunto && (
                                <div className="flex items-center justify-end gap-1.5">
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
                                  <button 
                                      onClick={() => {
                                        const relatedPropuesta = propuestas.find(pr => pr.id === p.id);
                                        if (relatedPropuesta) {
                                          handleEditClick(relatedPropuesta);
                                        }
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                      title="Editar Propuesta"
                                  >
                                      <Edit size={16} />
                                  </button>
                                  {isSuperAdmin && (
                                    <button 
                                        onClick={() => {
                                          setDeleteConfirmId(p.id);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Eliminar Propuesta"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                        </tr>
                        )
                    })
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
                        <h2 className="text-xl font-bold text-white">{editingPropuesta ? "Editar Propuesta" : "Nueva Propuesta"}</h2>
                        <button onClick={handleCloseModal} className="text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Archivo PDF de la Propuesta</label>
                            <input type="file" id="propuesta-upload" className="hidden" accept="application/pdf" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    setModalPdfUrl(reader.result as string);
                                    setModalPdfName(file.name);
                                };
                                reader.readAsDataURL(file);
                            }} />
                            <button type="button" onClick={() => document.getElementById('propuesta-upload')?.click()} className="w-full bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl transition-all">
                                {modalPdfName || "Seleccionar archivo PDF"}
                            </button>
                         </div>
                        {!isCreatingForAsunto && (
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
                        )}
                        <button type="submit" className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black p-3 rounded-xl transition-all mt-4">
                          {editingPropuesta ? "Actualizar Propuesta" : "Guardar Propuesta"}
                        </button>
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
                          {selectedPropuesta.pdfUrl && (
                             <button
                               onClick={() => {
                                   const win = window.open();
                                   if (win) {
                                       win.document.write(`<iframe src="${selectedPropuesta.pdfUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                   }
                               }}
                               className="mt-4 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 font-black rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5"
                            >
                                <Eye size={12} /> Ver Propuesta
                            </button>
                          )}
                       </div>

                       {isSuperAdmin && (
                         <div className="pt-4 border-t border-slate-800 flex justify-end">
                           <button
                             type="button"
                             onClick={() => setDeleteConfirmId(selectedPropuesta.id)}
                             className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 font-black rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5"
                           >
                             <Trash2 size={12} /> Eliminar Propuesta
                           </button>
                         </div>
                       )}
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative overflow-hidden text-left"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-600" />
              <div className="text-center">
                <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={24} />
                </div>
                
                <h3 className="text-lg font-bold text-white mb-2">¿Eliminar Propuesta?</h3>
                <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                  Esta acción es irreversible y eliminará permanentemente la propuesta seleccionada tanto de la base de datos de Supabase como de la vista local.
                </p>
                
                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors text-xs uppercase tracking-wider"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePropuesta(deleteConfirmId)}
                    className="flex-1 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-400 transition-colors text-xs uppercase tracking-wider shadow-lg shadow-red-500/20"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {statusChangeConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[90]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative overflow-hidden text-left"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
              <div className="text-center">
                <h3 className="text-lg font-bold text-white mb-2">Confirmar cambio de estado</h3>
                <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                  ¿Estás seguro que deseas cambiar el estado de la propuesta a <span className="font-bold text-amber-500 whitespace-nowrap px-1 py-0.5 bg-amber-500/10 rounded">{statusChangeConfirm.newStatus === 'Pendiente' ? 'Pendiente Envío' : statusChangeConfirm.newStatus}</span>?
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setStatusChangeConfirm(null)}
                    className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors text-xs uppercase tracking-wider"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (statusChangeConfirm.newStatus === 'Aceptada') {
                        setClientCreationPrompt(statusChangeConfirm);
                        setStatusChangeConfirm(null);
                      } else {
                        await executeStatusChange();
                      }
                    }}
                    className="flex-1 py-3 bg-amber-500 text-slate-900 font-black rounded-xl hover:bg-amber-400 transition-colors text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {clientCreationPrompt && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[90]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative overflow-hidden text-left"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
              <div className="text-center">
                <h3 className="text-lg font-bold text-white mb-2">¿Deseas crear el cliente?</h3>
                <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                  ¿Deseas crear al cliente en este momento? Si presionas sobre "Sí" se guardará el registro correspondiente en el módulo de clientes.
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    onClick={async () => {
                      await executeStatusChange(false, clientCreationPrompt);
                      setClientCreationPrompt(null);
                    }}
                    className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors text-xs uppercase tracking-wider"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await executeStatusChange(true, clientCreationPrompt);
                      setClientCreationPrompt(null);
                    }}
                    className="flex-1 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl hover:bg-emerald-400 transition-colors text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20"
                  >
                    Sí, crear
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {pdfUploadConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[90]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative overflow-hidden text-left"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
              <div className="text-center">
                <h3 className="text-lg font-bold text-white mb-2">Confirmar guardar propuesta</h3>
                <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                  ¿Está seguro que desea guardar la propuesta?
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setPdfUploadConfirm(null)}
                    className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors text-xs uppercase tracking-wider"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await executePdfUpload();
                    }}
                    className="flex-1 py-3 bg-amber-500 text-slate-900 font-black rounded-xl hover:bg-amber-400 transition-colors text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20"
                  >
                    Sí, guardar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
