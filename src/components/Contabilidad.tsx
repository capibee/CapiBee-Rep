/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Trash2, 
  Search, 
  DollarSign, 
  Calendar, 
  User, 
  Hash, 
  CreditCard,
  X,
  Target,
  FileDown,
  Contact,
  Globe2,
  Briefcase,
  Globe,
  Mail,
  Plus as PlusIcon,
  Users,
  Upload,
  File as FileIcon,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Business, Invoice, Client } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import InvoiceForm from './InvoiceForm';
import { supabase } from '../lib/supabase';
import { calculateUserRank } from '../lib/rankUtils';
import { Pagination } from './Pagination';
import { TableLoader } from './TableLoader';

interface ContabilidadProps {
  onLogout: () => void;
  onBack: () => void;
}

export default function Contabilidad({ onLogout, onBack }: ContabilidadProps) {
  const permissions = usePermissions('contabilidad');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [clientes, setClientes] = useState<Client[]>([]);
  const [agentEarnings, setAgentEarnings] = useState<any[]>([]);
  const [platformUsers, setPlatformUsers] = useState<any[]>([]);
  const [asuntos, setAsuntos] = useState<any[]>([]);
  const [propuestas, setPropuestas] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const itemsPerPage = 50;
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [selectedStatementClient, setSelectedStatementClient] = useState('');
  const [kpiFilter, setKpiFilter] = useState({ type: 'all' as 'all' | 'month' | 'year', month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [selectedKpis, setSelectedKpis] = useState<string[]>([]);

  const toggleKpiFilter = (id: string) => {
    setSelectedKpis(prev => 
      prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
    );
  };

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('capibee_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    
    // Load businesses
    const savedBusinesses = localStorage.getItem('capibee_businesses');
    if (savedBusinesses) setBusinesses(JSON.parse(savedBusinesses));

    // Load clients
    const savedClientes = localStorage.getItem('capibee_clientes');
    if (savedClientes) setClientes(JSON.parse(savedClientes));

    // Load agent earnings
    const savedEarnings = localStorage.getItem('capibee_agent_earnings');
    if (savedEarnings) setAgentEarnings(JSON.parse(savedEarnings));
    
    // Load platform users
    const savedUsers = localStorage.getItem('capibee_platform_users');
    if (savedUsers) setPlatformUsers(JSON.parse(savedUsers));

    const savedAsuntos = localStorage.getItem('capibee_asuntos');
    if (savedAsuntos) setAsuntos(JSON.parse(savedAsuntos));

    const savedPropuestas = localStorage.getItem('capibee_propuestas');
    if (savedPropuestas) setPropuestas(JSON.parse(savedPropuestas));

    // Load invoices
    const savedInvoices = localStorage.getItem('capibee_invoices');
    if (savedInvoices) {
      const parsed = JSON.parse(savedInvoices);
      setInvoices(parsed.map((inv: any, idx: number) => {
        const migratedInv = {
          ...inv,
          invoiceNumber: inv.invoiceNumber || `INV-${(idx + 1).toString().padStart(3, '0')}`,
          paidAmount: inv.paidAmount || 0,
          status: inv.status || 'Pendiente'
        };
        if (!migratedInv.items) {
          migratedInv.items = [{
            description: inv.service || '',
            quantity: inv.quantity || 0,
            price: inv.priceUSD || 0
          }];
        }
        return migratedInv;
      }));
    }

    // Connect to Supabase for dynamic data and real-time subscription
    const fetchFreshInvoiceData = async () => {
      try {
        const { data: dbInvs, error: invsErr } = await supabase.from('invoices').select('*');
        if (!invsErr && dbInvs) {
          const mapped = dbInvs.map(i => ({
            id: i.id,
            invoiceNumber: i.invoice_number,
            businessId: i.business_id,
            businessName: i.business_name,
            service: i.service || '',
            quantity: i.quantity || 1,
            priceUSD: Number(i.price_usd) || 0,
            items: i.items || [],
            tax: Number(i.tax) || 0,
            paymentMethod: i.payment_method || 'Efectivo',
            emissionDate: i.emission_date,
            dueDate: i.due_date,
            note: i.note || '',
            payments: i.payments || [],
            paidAmount: Number(i.paid_amount) || 0,
            status: i.status || 'PENDIENTE',
            createdAt: i.created_at
          }));
          setInvoices(mapped);
          localStorage.setItem('capibee_invoices', JSON.stringify(mapped));
        }

        // Also fetch businesses, clients, agent_earnings, platform_users to keep them absolutely fresh!
        const { data: dbClients } = await supabase.from('clients').select('*');
        if (dbClients) {
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
            createdAt: Number(c.created_at) || c.created_at || Date.now(),
            userId: c.user_id
          }));
          setClientes(mappedC);
          localStorage.setItem("capibee_clientes", JSON.stringify(mappedC));
        }

        const { data: dbBusinesses } = await supabase.from('businesses').select('*');
        if (dbBusinesses) {
          const mappedB = dbBusinesses.map((b: any) => ({
            id: b.id,
            name: b.name,
            category: b.category,
            address: b.address || '',
            phone: b.phone || '',
            whatsapp: b.whatsapp || '',
            contactName: b.contact_name || '',
            userId: b.user_id,
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

        const { data: dbEarnings } = await supabase.from('agent_earnings').select('*');
        if (dbEarnings) {
          const mappedE = dbEarnings.map((e: any) => ({
            id: e.id,
            amount: Number(e.amount),
            date: e.date,
            businessId: e.business_id,
            businessName: e.business_name,
            invoiceId: e.invoice_id,
            status: e.status,
            userId: e.user_id
          }));
          setAgentEarnings(mappedE);
          localStorage.setItem('capibee_agent_earnings', JSON.stringify(mappedE));
        }

        const { data: dbUsers } = await supabase.from('platform_users').select('*');
        if (dbUsers) {
          const mappedUsers = dbUsers.map(u => ({
            id: u.id,
            fullName: u.full_name,
            roleId: u.role_id,
            roleName: u.role_name,
            email: u.email,
            password: u.password,
            avatar: u.avatar,
            createdAt: u.created_at
          }));
          setPlatformUsers(mappedUsers);
          localStorage.setItem('capibee_platform_users', JSON.stringify(mappedUsers));
        }

        const { data: dbPropuestas } = await supabase.from('propuestas').select('*');
        if (dbPropuestas) {
            const mappedP = dbPropuestas.map((p: any) => ({
                id: p.id,
                asuntoId: p.asunto_id,
                propuestaTexto: p.propuesta_texto,
                honorarios: p.honorarios,
                gastos: p.gastos,
                userId: p.user_id,
                createdAt: Number(p.created_at),
                status: p.status || 'Enviada'
            }));
            setPropuestas(mappedP);
            localStorage.setItem("capibee_propuestas", JSON.stringify(mappedP));
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

      } catch (err) {
        console.warn("Could not sync data from Supabase in Contabilidad:", err);
      } finally {
        setIsTableLoading(false);
      }
    };

    fetchFreshInvoiceData();

    // Subscribe to real-time additions/edits
    const invoicesChannel = supabase.channel('invoices-realtime-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        fetchFreshInvoiceData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_earnings' }, () => {
        fetchFreshInvoiceData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(invoicesChannel);
    };
  }, []);

  const authorizedClientes = useMemo(() => {
      if (!currentUser) return [];
      const isSuperAdmin =
        currentUser?.roleName?.toLowerCase() === "superadmin" ||
        currentUser?.roleId === "ADMIN_MAESTRO";
  
      if (isSuperAdmin) return clientes;
  
      return clientes.filter((cliente) => {
        const linkedBusiness = businesses.find((b) => b.id === cliente.id);
        return (
          linkedBusiness &&
          linkedBusiness.responsibleName === currentUser.fullName
        );
      });
    }, [clientes, businesses, currentUser]);

  const [formData, setFormData] = useState({
    businessId: '',
    items: [{ description: '', quantity: 1, price: 0 }],
    service: '', // Keep for sync
    quantity: 1, // Keep for sync
    priceUSD: 0, // Keep for sync
    tax: 0,
    paymentMethod: 'Transferencia',
    emissionDate: new Date().toISOString().split('T')[0],
    dueDate: 'Hoy',
    note: ''
  });

  const [clientFormData, setClientFormData] = useState({
    type: 'Particular' as 'Particular' | 'Empresa',
    companyName: '',
    contactName: '',
    email: '',
    language: 'Español' as 'Español' | 'Inglés' | 'Portugués' | 'Francés',
    currency: 'USD' as 'USD' | 'EURO' | 'COP',
    country: '',
    sector: '',
  });

  const totals = useMemo(() => {
    const kpis = {
        count: 0,
        emitidasCount: 0,
        enviadasCount: 0,
        emitted: { USD: 0, EURO: 0 },
        total: { USD: 0, EURO: 0 }, // For "Por Cobrar" (debt)
        paid: { USD: 0, EURO: 0 }
    };

    invoices.forEach(inv => {
        const [invYear, invMonth] = inv.emissionDate.split('-').map(Number);
        
        let shouldInclude = true;
        if (kpiFilter.type === 'month') {
            shouldInclude = invMonth === kpiFilter.month && invYear === kpiFilter.year;
        } else if (kpiFilter.type === 'year') {
            shouldInclude = invYear === kpiFilter.year;
        }
        
        if (!shouldInclude) return;
        if (inv.status === 'Anulado') return;

        const client = clientes.find(c => c.id === inv.businessId);
        const currency = client?.currency || 'USD';
        
        let subtotal = 0;
        if (inv.items && inv.items.length > 0) {
            subtotal = inv.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
        } else {
            subtotal = inv.quantity * inv.priceUSD;
        }
        
        const total = subtotal * (1 + (inv.tax || 0) / 100);
        const debt = total - (inv.paidAmount || 0);
        const paid = inv.paidAmount || 0;
        
        kpis.count += 1;
        
        const todayDate = new Date();
        const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

        let compStatus = 'EMITIDA';
        if (paid >= total && total > 0) compStatus = 'PAGADA';
        else if (inv.dueDate < todayStr && paid < total) compStatus = 'VENCIDA';
        else if (paid > 0 && paid < total) compStatus = 'PAGO PARCIAL';
        else if (inv.status === 'Enviada') compStatus = 'ENVIADA';

        if (compStatus === 'EMITIDA') kpis.emitidasCount += 1;
        if (compStatus === 'ENVIADA') kpis.enviadasCount += 1;

        kpis.emitted[currency as keyof typeof kpis.emitted] += total;
        kpis.total[currency as keyof typeof kpis.total] += debt;
        kpis.paid[currency as keyof typeof kpis.paid] += (inv.paidAmount || 0);
    });
    
    const formSubtotal = formData.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    const taxAmount = formSubtotal * (formData.tax / 100);
    
    return {
      kpis,
      invoiceForm: {
        subtotal: formSubtotal,
        taxAmount,
        total: formSubtotal + taxAmount
      }
    };
  }, [invoices, clientes, formData.items, formData.tax, kpiFilter]);

  const getInvoiceComputedStatus = (inv: Invoice) => {
    if (inv.status === 'Anulado') return { label: 'ANULADA', bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' };
    
    let subtotal = 0;
    if (inv.items && inv.items.length > 0) {
        subtotal = inv.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    } else {
        subtotal = (inv.quantity || 0) * (inv.priceUSD || 0);
    }
    const total = subtotal * (1 + (inv.tax || 0) / 100);
    const paid = inv.paidAmount || 0;
    
    if (paid >= total && total > 0) return { label: 'PAGADA', bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' };
    
    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
    const isExpired = inv.dueDate < todayStr;
    
    if (isExpired && paid < total) return { label: 'VENCIDA', bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20' };
    
    if (paid > 0 && paid < total) return { label: 'PAGO PARCIAL', bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' };
    
    if (inv.status === 'Enviada') return { label: 'ENVIADA', bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' };
    
    return { label: 'EMITIDA', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' };
  };

  const handleUpdateStatus = async (inv: Invoice, newStatus: string) => {
    // Check if current user is admin OR if it's the executive paying (and only changing to 'Pagado')
    const user = JSON.parse(localStorage.getItem('capibee_user') || '{}');
    const isSuperAdmin = user?.roleName?.toLowerCase().includes('admin') || user?.roleId === 'ADMIN_MAESTRO';
    
    if (isSuperAdmin || (newStatus === 'Pagado' && user?.roleName?.toLowerCase().includes('ejecutivo'))) {
      const updatedInvoices = invoices.map(i => i.id === inv.id ? { ...i, status: newStatus } : i);
      await saveInvoices(updatedInvoices);
      syncSingleInvoiceToSupabase(updatedInvoices.find(i => i.id === inv.id)!);
    }
  };

  const safeToLocaleString = (val: number | undefined | null) => (val || 0).toLocaleString();

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: Client = {
      id: crypto.randomUUID(),
      ...clientFormData,
      createdAt: Date.now()
    };

    const updatedClientes = [newClient, ...clientes];
    setClientes(updatedClientes);
    localStorage.setItem('capibee_clientes', JSON.stringify(updatedClientes));
    
    setIsNewClientModalOpen(false);
    // Auto-select the newly created client in the invoice form
    setFormData(prev => ({ ...prev, businessId: newClient.id }));
    
    // Reset client form
    setClientFormData({
      type: 'Particular',
      companyName: '',
      contactName: '',
      email: '',
      language: 'Español',
      currency: 'USD',
      country: '',
      sector: '',
    });
  };

  const handleCreateInvoice = (formData: any) => {
    if (!permissions.create) return;
    
    const selectedBusiness = businesses.find(b => b.id === formData.businessId);
    const selectedClient = clientes.find(c => c.id === formData.businessId);
    
    if (!selectedBusiness && !selectedClient) return;

    const displayName = selectedClient 
      ? (selectedClient.companyName || selectedClient.contactName)
      : selectedBusiness!.name;

    // Calculate due date based on selection
    const emissionDate = new Date(formData.emissionDate);
    const dueDateObj = new Date(emissionDate);
    
    if (formData.dueDate === '1 dia') dueDateObj.setDate(dueDateObj.getDate() + 1);
    else if (formData.dueDate === '7 dias') dueDateObj.setDate(dueDateObj.getDate() + 7);
    else if (formData.dueDate === '15 dias') dueDateObj.setDate(dueDateObj.getDate() + 15);
    else if (formData.dueDate === '30 dias') dueDateObj.setDate(dueDateObj.getDate() + 30);
    // Else 'Hoy' stays as emissionDate

    const getNextInvoiceNumber = () => {
      if (invoices.length === 0) return 'INV-001';
      let max = 0;
      invoices.forEach(inv => {
        const match = inv.invoiceNumber?.match(/INV-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > max) max = num;
        }
      });
      return `INV-${(max + 1).toString().padStart(3, '0')}`;
    };

    const newInvoice: Invoice = {
      id: crypto.randomUUID(),
      invoiceNumber: getNextInvoiceNumber(),
      businessId: formData.businessId,
      businessName: displayName,
      service: formData.items[0]?.description || '', // For compatibility
      quantity: formData.items[0]?.quantity || 1, // For compatibility
      priceUSD: formData.items[0]?.price || 0, // For compatibility
      items: formData.items,
      tax: formData.tax,
      paymentMethod: formData.paymentMethod,
      emissionDate: formData.emissionDate,
      dueDate: dueDateObj.toISOString().split('T')[0],
      note: formData.note,
      payments: [],
      createdAt: Date.now(),
      status: 'PENDIENTE',
      paidAmount: 0
    };

    saveInvoices([newInvoice, ...invoices]);
    syncSingleInvoiceToSupabase(newInvoice);
    setIsModalOpen(false);
  };

  const handleDeleteInvoice = (inv: Invoice) => {
    if (!permissions.delete) return;
    setInvoiceToDelete(inv);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    const updated = invoices.filter(inv => inv.id !== invoiceToDelete.id);
    
    try {
      const { error: deleteErr } = await supabase.from('invoices').delete().eq('id', invoiceToDelete.id);
      if (deleteErr) {
        console.error("🔴 Supabase invoice delete error:", deleteErr);
      } else {
        console.log("💚 Supabase invoice deleted successfully:", invoiceToDelete.id);
      }
    } catch (e) {
      console.error("🔴 Supabase deletion failed:", e);
    }

    await saveInvoices(updated);
    setIsDeleteModalOpen(false);
    setInvoiceToDelete(null);
  };

  const saveInvoices = async (newInvoices: Invoice[]) => {
    setInvoices(newInvoices);
    localStorage.setItem('capibee_invoices', JSON.stringify(newInvoices));
  };

  const syncSingleInvoiceToSupabase = async (inv: Invoice) => {
    try {
      const mapped = {
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        business_id: inv.businessId || null,
        business_name: inv.businessName || 'Cliente No Identificado',
        service: inv.service || '',
        quantity: inv.quantity || 1,
        price_usd: inv.priceUSD || 0,
        items: inv.items || [],
        tax: inv.tax || 0,
        payment_method: inv.paymentMethod || 'Efectivo',
        emission_date: inv.emissionDate,
        due_date: inv.dueDate,
        note: inv.note || '',
        payments: inv.payments || [],
        paid_amount: inv.paidAmount || 0,
        status: inv.status || 'PENDIENTE',
        created_at: inv.createdAt || Date.now()
      };
      const { error } = await supabase.from('invoices').upsert(mapped, { onConflict: 'id' });
      if (error) console.error("🔴 Supabase invoice sync error:", error);
    } catch (e) {
      console.error("🔴 Supabase invoice sync failed:", e);
    }
  };

  const handlePayInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !permissions.edit) return;

    const subtotal = selectedInvoice.items && selectedInvoice.items.length > 0
        ? selectedInvoice.items.reduce((acc, item) => acc + (item.quantity * item.price), 0)
        : (selectedInvoice.quantity || 0) * (selectedInvoice.priceUSD || 0);
    
    const total = subtotal * (1 + (selectedInvoice.tax || 0) / 100);
    const pendingBalance = total - (selectedInvoice.paidAmount || 0);

    if (!paymentProof) {
        alert("El comprobante de pago es obligatorio.");
        return;
    }

    if (paymentAmount > pendingBalance + 0.01) { // Adding a tiny epsilon for floating point
        alert("El monto del abono no puede ser superior al saldo pendiente.");
        return;
    }

    let proofDataUrl = '';
    let proofName = '';
    if (paymentProof) {
        proofName = paymentProof.name;
        try {
            proofDataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(paymentProof);
            });
        } catch (e) {
            console.error("Error reading file", e);
        }
    }

    const newPayment = {
        amount: paymentAmount,
        date: new Date().toLocaleString(),
        proofDataUrl,
        proofName,
        note: paymentNote
    };

    setInvoices(prevInvoices => {
        const updatedInvoices = prevInvoices.map(inv => {
            if (inv.id === selectedInvoice.id) {
                const payments = inv.payments ? [...inv.payments, newPayment] : [newPayment];
                const newPaidAmount = (inv.paidAmount || 0) + paymentAmount;
                
                const currentSubtotal = inv.items && inv.items.length > 0
                    ? inv.items.reduce((acc, item) => acc + (item.quantity * item.price), 0)
                    : (inv.quantity || 0) * (inv.priceUSD || 0);
                const currentTotal = currentSubtotal * (1 + (inv.tax || 0) / 100);
                
                const user = JSON.parse(localStorage.getItem('capibee_user') || '{}');
                
                // Determine commission rate based on rank
                const userRank = calculateUserRank(user.id, user.fullName || '');
                const commissionRate = userRank.commissionRate;
                
                // Add earnings: commissionRate of paymentAmount goes to earnings
                const earnings = (paymentAmount * commissionRate);
                const agentEarnings = JSON.parse(localStorage.getItem('capibee_agent_earnings') || '[]');
                
                const newEarning = {
                    id: crypto.randomUUID(),
                    amount: earnings,
                    date: new Date().toISOString(),
                    businessId: inv.businessId,
                    businessName: inv.businessName,
                    invoiceId: inv.id,
                    status: 'En proceso' as const,
                    userId: user.id
                };
                agentEarnings.push(newEarning);
                localStorage.setItem('capibee_agent_earnings', JSON.stringify(agentEarnings));

                // Save earnings to Supabase as well!
                supabase.from('agent_earnings').upsert({
                    id: newEarning.id,
                    amount: newEarning.amount,
                    date: newEarning.date,
                    business_id: newEarning.businessId,
                    business_name: newEarning.businessName,
                    invoice_id: newEarning.invoiceId,
                    status: newEarning.status,
                    user_id: newEarning.userId
                }).then(({ error }) => {
                    if (error) console.error("🔴 Supabase agent_earnings error:", error);
                });

                return {
                    ...inv,
                    paidAmount: newPaidAmount,
                    payments,
                    status: newPaidAmount >= currentTotal ? 'Pagado' : 'Parcial'
                };
            }
            return inv;
        });
        
        localStorage.setItem('capibee_invoices', JSON.stringify(updatedInvoices));
        
        // Find the updated invoice and sync it
        const changedInvoice = updatedInvoices.find(inv => inv.id === selectedInvoice.id);
        if (changedInvoice) {
            syncSingleInvoiceToSupabase(changedInvoice);
        }

        return updatedInvoices;
    });
    
    setIsPaymentModalOpen(false);
    setSelectedInvoice(null);
    setPaymentAmount(0);
    setPaymentProof(null);
    setPaymentNote('');
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const subtotal = invoice.items && invoice.items.length > 0
        ? invoice.items.reduce((acc, item) => acc + (item.quantity * item.price), 0)
        : (invoice.quantity || 0) * (invoice.priceUSD || 0);
    const tax = subtotal * ((invoice.tax || 0) / 100);
    const total = subtotal + tax;
    const paid = invoice.paidAmount || 0;
    const due = total - paid;

    // Get client / business info
    const client = clientes.find(c => c.id === invoice.businessId);
    const business = businesses.find(b => b.id === invoice.businessId);

    // Vendor Info
    let vendorName = business?.responsibleName || '';
    if (!vendorName && client?.userId) {
      const savedUsers = localStorage.getItem('capibee_platform_users');
      if (savedUsers) {
        const users = JSON.parse(savedUsers);
        const vendor = users.find((u: any) => u.id === client.userId);
        if (vendor) vendorName = vendor.fullName || vendor.email || '';
      }
    }

    // Colores base
    const primaryColor = [30, 41, 59] as [number, number, number];
    const secondaryColor = [100, 116, 139] as [number, number, number];
    const accentColor = [245, 158, 11] as [number, number, number];
    const lightGray = [241, 245, 249] as [number, number, number];

    // ==========================================
    // ENCABEZADO SUPERIOR
    // ==========================================
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text('FACTURA COMERCIAL', 20, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Nº Documento: ${invoice.invoiceNumber || ('CB-2024-' + invoice.id.slice(0, 4).toUpperCase())}`, 140, 20);
    doc.text(`Fecha Emisión: ${invoice.emissionDate}`, 140, 26);
    doc.text(`Vencimiento: ${invoice.dueDate}`, 140, 32);

    // ==========================================
    // INFORMACIÓN EMPRESA Y CLIENTE
    // ==========================================
    doc.setTextColor(...primaryColor);
    
    // Empresa (Izquierda)
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('Hecho con IA S.A.S.', 20, 55);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...secondaryColor);
    doc.text('NIT: 901966807-0', 20, 61);
    doc.text('Floridablanca, Santander, Colombia', 20, 66);
    doc.text('https://www.hechoconia.com', 20, 71);
    doc.text('contacto@hechoconia.com', 20, 76);

    // Cliente (Derecha)
    doc.setTextColor(...primaryColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text('FACTURAR A:', 120, 55);
    
    doc.setFontSize(12);
    // Support long business names over multi-lines conceptually by split text
    const splitName = doc.splitTextToSize(invoice.businessName, 70);
    doc.text(splitName, 120, 61);
    
    const clientLinesHeight = splitName.length * 5;
    let clientY = 61 + clientLinesHeight;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...secondaryColor);
    const address = client?.address || business?.address || client?.country;
    if (address) {
        const splitAddress = doc.splitTextToSize(`Dirección: ${address}`, 70);
        doc.text(splitAddress, 120, clientY);
        clientY += splitAddress.length * 4;
    }
    doc.text(`Forma de Pago: ${invoice.paymentMethod || 'No especificada'}`, 120, clientY + 3);
    const currency = client?.currency || 'USD';
    doc.text(`Moneda: ${currency}`, 120, clientY + 8);

    if (vendorName) {
        doc.text(`Asesor asignado: ${vendorName}`, 120, clientY + 13);
    }

    // ==========================================
    // TABLA DE OBJETOS
    // ==========================================
    let yPos = Math.max(95, clientY + 25);
    
    // Encabezado tabla
    doc.setFillColor(...lightGray);
    doc.rect(20, yPos, 170, 10, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text('DESCRIPCIÓN', 25, yPos + 7);
    doc.text('CANTIDAD', 110, yPos + 7, { align: 'center' });
    doc.text('PRECIO UNIT.', 140, yPos + 7, { align: 'right' });
    doc.text('SUBTOTAL', 185, yPos + 7, { align: 'right' });

    yPos += 15;
    
    // Filas
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);

    if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item, index) => {
            const splitDesc = doc.splitTextToSize(item.description, 80);
            const itemHeight = splitDesc.length * 5;
            
            // Check if we need to add a page
            if (yPos + itemHeight > 220) {
                doc.addPage();
                yPos = 20;
            }

            doc.text(splitDesc, 25, yPos);
            doc.text(item.quantity.toString(), 110, yPos, { align: 'center' });
            doc.text(`$${safeToLocaleString(item.price)}`, 140, yPos, { align: 'right' });
            doc.text(`$${safeToLocaleString(item.quantity * item.price)}`, 185, yPos, { align: 'right' });
            
            yPos += itemHeight + 5;
            
            // Separador
            doc.setDrawColor(240, 240, 240);
            doc.line(20, yPos - 2, 190, yPos - 2);
        });
    } else {
        const splitDesc = doc.splitTextToSize(invoice.service || 'Servicios', 80);
        doc.text(splitDesc, 25, yPos);
        doc.text((invoice.quantity || 1).toString(), 110, yPos, { align: 'center' });
        doc.text(`$${safeToLocaleString(invoice.priceUSD)}`, 140, yPos, { align: 'right' });
        doc.text(`$${safeToLocaleString(subtotal)}`, 185, yPos, { align: 'right' });
        yPos += splitDesc.length * 5 + 5;
    }

    // ==========================================
    // TOTALES
    // ==========================================
    // Find bottom position, make sure totals block fits. Else new page.
    if (yPos + 50 > 250) {
        doc.addPage();
        yPos = 20;
    }

    const startTotalsY = Math.max(yPos + 5, 120);
    
    doc.setFillColor(250, 250, 250);
    doc.rect(110, startTotalsY, 80, 48, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(110, startTotalsY, 80, 48, 'S');

    doc.setFontSize(9);
    doc.setTextColor(...secondaryColor);
    doc.text('Subtotal:', 115, startTotalsY + 8);
    doc.text(`$${safeToLocaleString(subtotal)}`, 185, startTotalsY + 8, { align: 'right' });
    
    doc.text(`Impuestos (${invoice.tax || 0}%):`, 115, startTotalsY + 16);
    doc.text(`$${safeToLocaleString(tax)}`, 185, startTotalsY + 16, { align: 'right' });

    doc.line(115, startTotalsY + 20, 185, startTotalsY + 20);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text('TOTAL:', 115, startTotalsY + 28);
    doc.text(`$${safeToLocaleString(total)} ${currency}`, 185, startTotalsY + 28, { align: 'right' });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...secondaryColor);
    doc.text('Pagado:', 115, startTotalsY + 36);
    doc.text(`-$${safeToLocaleString(paid)}`, 185, startTotalsY + 36, { align: 'right' });

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const emeraldColor: [number, number, number] = [16, 185, 129];
    doc.setTextColor(...(due > 0 ? accentColor : emeraldColor)); // amber or emerald
    doc.text('SALDO PENDIENTE:', 115, startTotalsY + 45);
    doc.text(`$${safeToLocaleString(due)}`, 185, startTotalsY + 45, { align: 'right' });

    // ==========================================
    // DATOS DE PAGO Y NOTAS
    // ==========================================
    let infoYPos = startTotalsY + 5;
    
    if (invoice.note) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text('NOTAS / OBSERVACIONES:', 20, infoYPos);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...secondaryColor);
        const splitNote = doc.splitTextToSize(invoice.note, 80);
        doc.text(splitNote, 20, infoYPos + 6);
        infoYPos += splitNote.length * 4 + 10;
    }

    if (currency === 'EURO' || currency === 'USD') {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text('INSTRUCCIONES DE PAGO:', 20, infoYPos + 6);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...secondaryColor);
        
        if (currency === 'EURO') {
            doc.text('Beneficiario: Hecho con IA S.A.S.', 20, infoYPos + 12);
            doc.text('Banco: Wise Europe SA', 20, infoYPos + 17);
            doc.text('IBAN (EUR): BE52 9055 3433 4409', 20, infoYPos + 22);
            doc.text('Swift/BIC: TRWIBEB1XXX', 20, infoYPos + 27);
        } else {
            doc.text('Beneficiario: Hecho con IA S.A.S.', 20, infoYPos + 12);
            doc.text('Banco: Evolve Bank & Trust', 20, infoYPos + 17);
            doc.text('Ruta (ACH): 084009519', 20, infoYPos + 22);
            doc.text('Cuenta (USD): 455295749419038', 20, infoYPos + 27);
            doc.text('Swift/BIC: TRWIUS35XXX', 20, infoYPos + 32);
        }
    }

    // ==========================================
    // FOOTER
    // ==========================================
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "normal");
        doc.setDrawColor(230, 230, 230);
        doc.line(20, 280, 190, 280);
        doc.text('Documento generado por Software CapiBee - Autorizado por Hecho con IA S.A.S.', 105, 286, { align: 'center' });
        doc.text(`Página ${i} de ${pageCount}`, 190, 286, { align: 'right' });
    }

    doc.save(`Factura_${invoice.invoiceNumber || invoice.id}_${invoice.businessName.replace(/\s+/g, '_')}_${invoice.emissionDate}.pdf`);
  };

  const handleGenerateStatement = async () => {
    try {
      if (!selectedStatementClient) return;
      
      const clientInvoices = invoices.filter(inv => inv.businessId === selectedStatementClient);
      if (clientInvoices.length === 0) {
        alert("Este cliente no tiene facturas.");
        return;
      }

      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const client = clientes.find(c => c.id === selectedStatementClient);
      const clientDisplayName = client ? (client.companyName || client.contactName) : clientInvoices[0].businessName;
      const documentNumber = client?.document || 'No registrado';
      const currency = client ? client.currency : 'USD';
      const country = client?.country || 'No especificado';
      const business = businesses.find(b => b.id === selectedStatementClient);
      const address = client?.address || business?.address;

      const safeToLocaleString = (num: number) => (num || 0).toLocaleString('es-CO');

      // --- 1. ENCABEZADO (Identificación) ---
      doc.setFillColor(251, 191, 36); // Amber 400 top border
      doc.rect(0, 0, 210, 6, "F");

      // Logotipo / Nombre de Empresa
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor(15, 23, 42);
      doc.text('Capi', 14, 25);
      doc.setTextColor(251, 191, 36); // Amber 400 for Bee
      doc.text('Bee', 57, 25);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text('Hecho con IA S.A.S.', 14, 32);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text('NIT: 901966807-0', 14, 37);
      doc.text('País: Colombia', 14, 42);
      doc.text('WhatsApp: +52 1 999 437 3800', 14, 47);
      doc.text('Email: contacto@capibee.com', 14, 52);

      // Document Title & Date (Right Aligned)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text('ESTADO DE CUENTA', 196, 25, { align: "right" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-CO')}`, 196, 32, { align: "right" });
      
      const allDates = clientInvoices.map(i => new Date(i.emissionDate).getTime());
      const minDate = new Date(Math.min(...allDates)).toLocaleDateString('es-CO');
      const maxDate = new Date().toLocaleDateString('es-CO');
      doc.text(`Periodo: ${minDate} al ${maxDate}`, 196, 37, { align: "right" });

      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.line(14, 58, 196, 58);

      // Datos del Cliente
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text('Para:', 14, 68);

      doc.setFontSize(10);
      doc.text(clientDisplayName || 'Cliente', 14, 74);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(`NIT/CC: ${documentNumber}`, 14, 79);
      if (client?.email) doc.text(`Email: ${client.email}`, 14, 84);
      if (address) doc.text(`Dirección: ${address}`, 14, 89);
      doc.text(`País: ${country}`, 110, 79);
      doc.text(`Moneda: ${currency}`, 110, 84);

      let yPos = 95;

      // --- PREPARAR MOVIMIENTOS ---
      interface Movement {
        date: Date;
        dateStr: string;
        concept: string;
        docNumber: string;
        currency: string;
        debit: number;
        credit: number;
      }
      
      let totalCargos = 0;
      let totalAbonos = 0;
      const movements: Movement[] = [];

      clientInvoices.forEach(inv => {
        // Cargo (Factura)
        const subtotal = inv.items && inv.items.length > 0
            ? inv.items.reduce((acc, item) => acc + (item.quantity * item.price), 0)
            : (inv.quantity || 0) * (inv.priceUSD || 0);
        const total = subtotal * (1 + (inv.tax || 0) / 100);
        
        movements.push({
          date: new Date(inv.emissionDate),
          dateStr: inv.emissionDate,
          concept: inv.service || 'Cobro por servicios',
          docNumber: inv.invoiceNumber || '-',
          currency: currency,
          debit: total,
          credit: 0
        });

        // Abonos (Pagos)
        if (inv.payments && inv.payments.length > 0) {
          inv.payments.forEach((p, idx) => {
            // Attempt to parse payment date string, fallback to invoice date if invalid
            let pDate = new Date(p.date.split(',')[0]);
            if (isNaN(pDate.getTime())) pDate = new Date(inv.emissionDate);
            
            movements.push({
              date: pDate,
              dateStr: p.date.split(',')[0],
              concept: `Pago de servicios`,
              docNumber: inv.invoiceNumber || '-',
              currency: currency,
              debit: 0,
              credit: p.amount
            });
          });
        }
      });

      // Sort chronological
      movements.sort((a, b) => a.date.getTime() - b.date.getTime());

      // --- 2. CUERPO DEL DOCUMENTO (Tabla) ---
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(241, 245, 249); // Slate 100
      doc.setTextColor(71, 85, 105);
      doc.roundedRect(14, yPos, 182, 10, 2, 2, "F");
      
      doc.text('FECHA', 16, yPos + 6.5);
      doc.text('CONCEPTO / TIPO', 38, yPos + 6.5);
      doc.text('DOC.', 90, yPos + 6.5);
      doc.text('MONEDA', 112, yPos + 6.5);
      doc.text('CARGOS', 135, yPos + 6.5);
      doc.text('ABONOS', 160, yPos + 6.5);
      doc.text('SALDO', 185, yPos + 6.5);
      
      yPos += 16;
      let runningBalance = 0;

      movements.forEach(mov => {
        totalCargos += mov.debit;
        totalAbonos += mov.credit;
        runningBalance += (mov.debit - mov.credit);

        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setFillColor(241, 245, 249);
          doc.setTextColor(71, 85, 105);
          doc.roundedRect(14, yPos, 182, 10, 2, 2, "F");
          doc.text('FECHA', 16, yPos + 6.5);
          doc.text('CONCEPTO / TIPO', 38, yPos + 6.5);
          doc.text('DOC.', 90, yPos + 6.5);
          doc.text('MONEDA', 112, yPos + 6.5);
          doc.text('CARGOS', 135, yPos + 6.5);
          doc.text('ABONOS', 160, yPos + 6.5);
          doc.text('SALDO', 185, yPos + 6.5);
          yPos += 16;
        }

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42); // Date
        doc.text(mov.dateStr, 16, yPos);
        
        // Concept
        if(mov.debit > 0) doc.setTextColor(15, 23, 42);
        else doc.setTextColor(5, 150, 105); // Green for payments
        
        const conceptTruncated = mov.concept.length > 25 ? mov.concept.substring(0, 25) + '...' : mov.concept;
        doc.text(conceptTruncated, 38, yPos);
        
        doc.setTextColor(71, 85, 105);
        const docTruncated = mov.docNumber.length > 10 ? mov.docNumber.substring(0, 10) + '...' : mov.docNumber;
        doc.text(docTruncated, 90, yPos);

        doc.text(mov.currency, 112, yPos);
        
        // Cargos
        doc.setTextColor(15, 23, 42);
        if (mov.debit > 0) doc.text(safeToLocaleString(mov.debit), 135, yPos);
        
        // Abonos
        doc.setTextColor(5, 150, 105);
        if (mov.credit > 0) doc.text(safeToLocaleString(mov.credit), 160, yPos);
        
        // Saldo
        doc.setFont("helvetica", "bold");
        if (runningBalance > 0) doc.setTextColor(220, 38, 38);
        else if (runningBalance < 0) doc.setTextColor(5, 150, 105);
        else doc.setTextColor(15, 23, 42);
        doc.text(safeToLocaleString(runningBalance), 185, yPos);
        
        yPos += 8;
        
        doc.setDrawColor(241, 245, 249);
        doc.line(14, yPos - 4, 196, yPos - 4);
      });

      yPos += 10;
      if (yPos > 190) { // Keep enough space for summary and instructions
        doc.addPage();
        yPos = 20;
      }

      // --- 3. RESUMEN DE SALDO ---
      const summaryY = yPos;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(120, summaryY, 76, 40, 3, 3, "FD");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Resumen del Periodo', 125, summaryY + 8);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      
      doc.text('Cargos Totales:', 125, summaryY + 18);
      doc.text(`$${safeToLocaleString(totalCargos)}`, 190, summaryY + 18, { align: "right" });
      
      doc.text('Abonos Totales:', 125, summaryY + 25);
      doc.text(`$${safeToLocaleString(totalAbonos)}`, 190, summaryY + 25, { align: "right" });
      
      doc.setDrawColor(226, 232, 240);
      doc.line(125, summaryY + 29, 190, summaryY + 29);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text('Saldo Pendiente:', 125, summaryY + 35);
      
      doc.setFontSize(12);
      if (runningBalance > 0) doc.setTextColor(220, 38, 38);
      else if (runningBalance < 0) doc.setTextColor(5, 150, 105);
      else doc.setTextColor(15, 23, 42);
      doc.text(`$${safeToLocaleString(runningBalance)} ${currency}`, 190, summaryY + 35, { align: "right" });

      // --- 4. INFORMACION DE PAGO ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Instrucciones de Pago', 14, summaryY + 8);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text('Por favor realizar sus pagos a la siguiente cuenta:', 14, summaryY + 14);
      
      doc.setFont("helvetica", "bold");
      doc.text('Banco:', 14, summaryY + 20);
      doc.setFont("helvetica", "normal");
      doc.text('Bancolombia S.A.', 30, summaryY + 20);
      
      doc.setFont("helvetica", "bold");
      doc.text('Cuenta:', 14, summaryY + 25);
      doc.setFont("helvetica", "normal");
      doc.text('Ahorros # 123-456789-00', 30, summaryY + 25);
      
      doc.setFont("helvetica", "bold");
      doc.text('Titular:', 14, summaryY + 30);
      doc.setFont("helvetica", "normal");
      doc.text('Hecho con IA S.A.S. (NIT: 901966807-0)', 30, summaryY + 30);
      
      doc.setTextColor(5, 150, 105); // Emerald 600
      doc.setFont("helvetica", "bold");
      doc.text('Nota:', 14, summaryY + 38);
      doc.setFont("helvetica", "normal");
      doc.text('Enviar comprobante al correo: contacto@capibee.com o vía WhatsApp', 26, summaryY + 38);

      // Footer Message
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text('Este documento es un resumen de la actividad de su cuenta. Agradecemos la puntualidad en sus pagos.', 105, 280, { align: 'center' });
      doc.text('Para cualquier inconsistencia, por favor contactar a soporte.', 105, 285, { align: 'center' });

      doc.save(`Estado_Cuenta_${(clientDisplayName || 'Cliente').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      setIsStatementModalOpen(false);
    } catch (error) {
      console.error(error);
      alert("Hubo un error al generar el PDF: " + (error as any).message);
    }
  };

  const agentTransactionStats = useMemo(() => {
    const isSuperAdmin = currentUser?.roleName?.toUpperCase() === 'SUPERADMIN' || currentUser?.roleId?.toUpperCase() === 'SUPERADMIN' || currentUser?.roleId === 'ADMIN_MAESTRO';
    if (!isSuperAdmin) return [];

    const executives = platformUsers.filter(u => u.roleName === 'Ejecutivo Comercial');
    
    return executives.map(exec => {
      const execEarnings = agentEarnings.filter(e => e.userId === exec.id && e.status === 'En proceso');
      
      let period1 = 0;
      let period2 = 0;
      
      execEarnings.forEach(e => {
        const date = new Date(e.date);
        const day = date.getDate();
        if (day <= 15) period1 += e.amount;
        else period2 += e.amount;
      });

      // Calcular "Pendientes de Envío": Asuntos del ejecutivo sin propuesta asignada
      const execAsuntos = asuntos.filter(a => a.userId === exec.id);
      const pendientes = execAsuntos.filter(a => !propuestas.some(p => p.asuntoId === a.id)).length;
      
      return {
        name: exec.fullName,
        period1,
        period2,
        pendientesEnvio: pendientes
      };
    }).sort((a,b) => (b.period1 + b.period2) - (a.period1 + a.period2));

  }, [agentEarnings, platformUsers, currentUser, asuntos, propuestas]);

  const grandTotalPendientesEnvio = useMemo(() => {
    if (!platformUsers || !asuntos) return 0;
    const executives = platformUsers.filter(u => u.roleName === 'Ejecutivo Comercial');
    let total = 0;
    executives.forEach(exec => {
      const execAsuntos = asuntos.filter(a => a.userId === exec.id);
      const pendientes = execAsuntos.filter(a => !propuestas.some(p => p.asuntoId === a.id)).length;
      total += pendientes;
    });
    return total;
  }, [platformUsers, asuntos, propuestas]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = (inv.businessName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (inv.service || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      // KPI Filtering
      if (selectedKpis.length > 0) {
        const client = clientes.find(c => c.id === inv.businessId);
        const currency = client?.currency || 'USD';
        
        const subtotal = inv.items && inv.items.length > 0
          ? inv.items.reduce((acc, item) => acc + (item.quantity * item.price), 0)
          : (inv.quantity || 0) * (inv.priceUSD || 0);
        const total = subtotal * (1 + (inv.tax || 0) / 100);
        const debe = total - (inv.paidAmount || 0);

        const isDebtFilter = selectedKpis.includes(`${currency}-debt`);
        const isPaidFilter = selectedKpis.includes(`${currency}-paid`);

        // If filtering by this currency's debt
        if (isDebtFilter && debe > 0) return true;
        // If filtering by this currency's paid (fully paid)
        if (isPaidFilter && debe <= 0.01) return true;

        // If we have filters but this invoice doesn't match any selected criteria
        return false;
      }

      return true;
    });
  }, [invoices, searchTerm, selectedKpis, clientes]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const currentInvoices = useMemo(() => {
    return filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredInvoices, currentPage, itemsPerPage]);

  return (
    <div className="h-full bg-transparent flex flex-col font-sans overflow-hidden text-slate-200">
      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto relative custom-scrollbar min-h-0">
        <div className="max-w-[1400px] mx-auto relative z-10">
          
          <div className="mb-4 flex flex-wrap lg:flex-nowrap gap-4 items-center bg-slate-900/60 p-3 rounded-xl border border-slate-800 shadow-lg backdrop-blur-md w-full">
            <div className="flex items-center gap-3">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Filtrar:</span>
              <div className="flex bg-slate-950 p-1 rounded-lg">
                <button onClick={() => setKpiFilter(f => ({...f, type: 'all'}))} className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-colors ${kpiFilter.type === 'all' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Todos</button>
                <button onClick={() => setKpiFilter(f => ({...f, type: 'month'}))} className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-colors ${kpiFilter.type === 'month' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Mes</button>
                <button onClick={() => setKpiFilter(f => ({...f, type: 'year'}))} className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-colors ${kpiFilter.type === 'year' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Año</button>
              </div>
            </div>
            
            {kpiFilter.type !== 'all' && (
                <div className="flex gap-2">
                  {kpiFilter.type === 'month' && (
                    <select value={kpiFilter.month} onChange={e => setKpiFilter(f => ({...f, month: parseInt(e.target.value)}))} className="bg-slate-950 text-[10px] p-1.5 px-2 rounded-lg font-bold text-slate-300 border border-slate-800 outline-none focus:border-emerald-500 shadow-inner" style={{ colorScheme: 'dark' }}>
                      {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m} className="bg-slate-950 text-slate-300">{m}</option>)}
                    </select>
                  )}
                  <select value={kpiFilter.year} onChange={e => setKpiFilter(f => ({...f, year: parseInt(e.target.value)}))} className="bg-slate-950 text-[10px] p-1.5 px-2 rounded-lg font-bold text-slate-300 border border-slate-800 outline-none focus:border-emerald-500 shadow-inner" style={{ colorScheme: 'dark' }}>
                      {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y} className="bg-slate-950 text-slate-300">{y}</option>)}
                  </select>
                </div>
            )}
            
            <div className="ml-auto w-full lg:w-auto grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 md:grid-cols-4">
              {/* Box 1: Emitidas */}
              <div className="p-3 px-4 rounded-xl border border-slate-800 bg-slate-950/80 shadow relative overflow-hidden flex flex-col justify-center min-w-[120px]">
                <div className="text-[8px] uppercase font-bold tracking-widest text-slate-400 mb-1">Emitidas</div>
                <div className="text-xl font-black text-white">{totals.kpis.emitidasCount}</div>
              </div>

              {/* Box 2: Enviadas */}
              <div className="p-3 px-4 rounded-xl border border-blue-500/20 bg-blue-500/10 shadow relative overflow-hidden flex flex-col justify-center min-w-[120px]">
                <div className="text-[8px] uppercase font-bold tracking-widest text-blue-400 mb-1">Enviadas</div>
                <div className="text-xl font-black text-blue-100">{totals.kpis.enviadasCount}</div>
              </div>

              {/* Box 3: Total Cobrado */}
              <div className="p-3 px-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 shadow-inner relative overflow-hidden flex flex-col justify-center min-w-[150px]">
                <div className="text-[8px] uppercase font-bold tracking-widest text-emerald-400 mb-1">Total Cobrado</div>
                <div className="flex flex-col gap-0.5">
                  <div className="text-lg font-black text-emerald-400 leading-none">
                    ${safeToLocaleString(totals.kpis.paid.USD)} <span className="text-[10px]">USD</span>
                  </div>
                  {totals.kpis.paid.EURO > 0 && (
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[8px] text-emerald-500/80 font-bold">€{safeToLocaleString(totals.kpis.paid.EURO)} EUR</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Box 4: Ventas */}
              <div className="p-3 px-4 rounded-xl border border-slate-700 bg-slate-900/80 shadow-inner relative overflow-hidden flex flex-col justify-center min-w-[150px]">
                <div className="text-[8px] uppercase font-bold tracking-widest text-slate-400 mb-1">Venta</div>
                <div className="flex flex-col gap-0.5">
                  <div className="text-lg font-black text-white leading-none">
                    ${safeToLocaleString(totals.kpis.emitted.USD)} <span className="text-[10px] text-slate-400">USD</span>
                  </div>
                  {totals.kpis.emitted.EURO > 0 && (
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[8px] text-slate-400/80 font-bold">€{safeToLocaleString(totals.kpis.emitted.EURO)} EUR</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Instrucciones de KPIs */}
          <div className="mb-6 bg-slate-900/40 border border-slate-800/60 p-3 rounded-xl backdrop-blur-md flex flex-col xl:flex-row gap-4 items-start xl:items-center shadow-lg">
             <div className="flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-full bg-slate-800 shadow-inner flex items-center justify-center">
                  <Info size={14} className="text-slate-400" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white tracking-wide leading-tight">Guía de Indicadores</h3>
                  <p className="text-[8px] uppercase tracking-[0.2em] text-slate-500 font-bold mt-0.5 leading-tight">Métricas Financieras</p>
                </div>
             </div>
             
             <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                <div className="border-l-2 border-slate-700/50 pl-3">
                    <h4 className="text-[9px] font-black tracking-widest uppercase text-slate-400 mb-0.5 leading-none">Emitidas</h4>
                    <p className="text-[10px] text-slate-400/80 font-medium leading-tight">Docs contables generados, pendientes de entrega.</p>
                </div>
                <div className="border-l-2 border-blue-500/30 pl-3">
                    <h4 className="text-[9px] font-black tracking-widest uppercase text-blue-400 mb-0.5 leading-none">Enviadas</h4>
                    <p className="text-[10px] text-slate-400/80 font-medium leading-tight">Facturas notificadas al cliente, en espera de pago.</p>
                </div>
                <div className="border-l-2 border-emerald-500/30 pl-3">
                    <h4 className="text-[9px] font-black tracking-widest uppercase text-emerald-400 mb-0.5 leading-none">Total Cobrado</h4>
                    <p className="text-[10px] text-slate-400/80 font-medium leading-tight">Ingresos validados con comprobante de pago.</p>
                </div>
                <div className="border-l-2 border-slate-600/50 pl-3">
                    <h4 className="text-[9px] font-black tracking-widest uppercase text-slate-300 mb-0.5 leading-none">Venta</h4>
                    <p className="text-[10px] text-slate-400/80 font-medium leading-tight">Valor global de contratos (cobrados + pendientes).</p>
                </div>
             </div>
          </div>

          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-end gap-6 shrink-0">
            <div className="flex flex-col sm:flex-row gap-3 items-center w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar facturas..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner text-white placeholder-slate-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={() => setIsStatementModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 text-slate-300 hover:text-white font-black uppercase tracking-widest rounded-xl transition-all text-xs flex items-center justify-center gap-2 hover:bg-slate-700 active:scale-95"
              >
                <FileText size={16} strokeWidth={2} /> Estado de Cuenta
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                disabled={!permissions.create}
                className={`w-full sm:w-auto px-6 py-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black uppercase tracking-widest rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 ${!permissions.create ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 active:scale-95'}`}
              >
                <PlusIcon size={16} strokeWidth={3} /> Nueva Factura
              </button>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800">
                    <th className="py-3 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center w-10">#</th>
                    <th className="py-3 px-4 text-xs font-bold text-emerald-500 uppercase tracking-widest text-center flex items-center justify-center"><Hash size={14} className="mr-1" /> Factura</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest"><User size={14} className="inline mr-1" /> Cliente</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center"><Calendar size={14} className="inline mr-1" /> Emisión</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center"><Calendar size={14} className="inline mr-1" /> Vencimiento</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Debe</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Estado</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Pagar</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {isTableLoading ? (
                    <tr>
                      <td colSpan={10} className="py-8">
                        <TableLoader />
                      </td>
                    </tr>
                  ) : currentInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 font-medium bg-slate-900/20">
                        No hay registros contabilizados en esta vista.
                      </td>
                    </tr>
                  ) : currentInvoices.map((inv, idx) => {
                    const client = clientes.find(c => c.id === inv.businessId);
                    const currency = client?.currency || 'USD';
                    const subtotal = inv.items && inv.items.length > 0
                        ? inv.items.reduce((acc, item) => acc + (item.quantity * item.price), 0)
                        : (inv.quantity || 0) * (inv.priceUSD || 0);
                    const total = subtotal * (1 + (inv.tax || 0) / 100);
                    const debe = total - (inv.paidAmount || 0);

                    return (
                    <motion.tr 
                      key={inv.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-800/20 transition-colors group border-b border-slate-800/50"
                    >
                      <td className="py-4 px-2 text-[10px] font-mono text-slate-500 text-center select-none w-10">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="py-4 px-4 text-xs font-mono text-slate-500 text-center">{inv.invoiceNumber}</td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-100 text-sm">{inv.businessName}</div>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-400 tabular-nums text-center">{inv.emissionDate}</td>
                      <td className="py-4 px-4 text-xs tabular-nums font-bold text-center">
                        <span className={`px-2 py-1 rounded-md ${getInvoiceComputedStatus(inv).label === 'VENCIDA' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                          {inv.dueDate}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-emerald-400 font-black text-center">${safeToLocaleString(debe)} {currency}</td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex justify-center">
                          <select
                            value={getInvoiceComputedStatus(inv).label}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'ENVIADA') handleUpdateStatus(inv, 'Enviada');
                              else if (val === 'ANULADA') handleUpdateStatus(inv, 'Anulado');
                              else if (val === 'EMITIDA') handleUpdateStatus(inv, 'Pendiente');
                            }}
                            className={`px-2 py-1 rounded-md text-[10px] font-black tracking-widest uppercase border ${getInvoiceComputedStatus(inv).bg} ${getInvoiceComputedStatus(inv).text} ${getInvoiceComputedStatus(inv).border} outline-none cursor-pointer text-center appearance-none`}
                            style={{ colorScheme: 'dark' }}
                          >
                            <option value="EMITIDA" className="bg-slate-900 text-slate-300">EMITIDA</option>
                            <option value="ENVIADA" className="bg-slate-900 text-blue-400">ENVIADA</option>
                            <option value="PAGO PARCIAL" disabled className="bg-slate-900 text-amber-500">PAGO PARCIAL {getInvoiceComputedStatus(inv).label === 'PAGO PARCIAL' ? '' : '(Auto)'}</option>
                            <option value="PAGADA" disabled className="bg-slate-900 text-emerald-500">PAGADA {getInvoiceComputedStatus(inv).label === 'PAGADA' ? '' : '(Auto)'}</option>
                            <option value="VENCIDA" disabled className="bg-slate-900 text-rose-500">VENCIDA {getInvoiceComputedStatus(inv).label === 'VENCIDA' ? '' : '(Auto)'}</option>
                            <option value="ANULADA" className="bg-slate-900 text-red-500">ANULADA</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex justify-center">
                          <button 
                            onClick={() => { setSelectedInvoice(inv); setIsPaymentModalOpen(true); }}
                            disabled={
                              (!permissions.edit && !currentUser?.roleName?.toLowerCase().includes('ejecutivo')) || 
                              inv.status === 'Anulado' || 
                              debe <= 0
                            }
                            className={`text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider rounded-md transition-all ${
                              ((!permissions.edit && !currentUser?.roleName?.toLowerCase().includes('ejecutivo')) || inv.status === 'Anulado' || debe <= 0) 
                              ? 'bg-emerald-600/50 text-white/50 cursor-not-allowed' 
                              : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow hover:shadow-lg active:scale-95'
                            }`}
                          >
                            Pagar
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleDownloadInvoice(inv)}
                            className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-all active:scale-90"
                            title="Descargar"
                          >
                            <FileDown size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteInvoice(inv)}
                            disabled={!permissions.delete}
                            className={`p-1.5 rounded-md transition-all ${!permissions.delete ? 'text-slate-700 cursor-not-allowed border border-transparent' : 'text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 active:scale-90'}`}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )})}
                  {currentInvoices.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-500 italic text-sm">
                        No hay facturas registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </div>

          {agentTransactionStats.length > 0 && (
            <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl mb-6">
              <div className="p-6 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white uppercase tracking-widest">Transacciones Ejecutivos Comerciales</h3>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800">
                      <th className="py-3 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center w-10">#</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Ejecutivo</th>
                      <th className="py-3 px-4 text-xs font-bold text-amber-500 uppercase tracking-widest text-right">Pendientes Envío</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Periodo 1-15</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Periodo 16-31</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {isTableLoading ? (
                      <tr>
                        <td colSpan={10} className="py-8">
                          <TableLoader />
                        </td>
                      </tr>
                    ) : agentTransactionStats.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-500 font-medium">
                          No hay estadísticas
                        </td>
                      </tr>
                    ) : agentTransactionStats.map((stat, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-2 text-[10px] font-mono text-slate-500 text-center select-none w-10">{idx + 1}</td>
                        <td className="py-3 px-4 text-xs text-white font-bold">{stat.name}</td>
                        <td className="py-3 px-4 text-xs text-amber-500 font-extrabold text-right font-mono">{stat.pendientesEnvio}</td>
                        <td className="py-3 px-4 text-xs text-slate-300 text-right">${stat.period1.toFixed(2)}</td>
                        <td className="py-3 px-4 text-xs text-slate-300 text-right">${stat.period2.toFixed(2)}</td>
                        <td className="py-3 px-4 text-xs text-emerald-400 font-bold text-right">${(stat.period1 + stat.period2).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {agentTransactionStats.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-950/70 border-t border-slate-800 font-bold">
                        <td className="py-4 px-2"></td>
                        <td className="py-4 px-4 text-xs text-slate-400 uppercase tracking-widest">TOTAL ACUMULADO (ADMIN)</td>
                        <td className="py-4 px-4 text-sm text-amber-500 font-extrabold text-right font-mono">{grandTotalPendientesEnvio}</td>
                        <td className="py-4 px-4 text-right text-xs text-slate-300 font-mono">
                          ${agentTransactionStats.reduce((sum, s) => sum + s.period1, 0).toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-right text-xs text-slate-300 font-mono">
                          ${agentTransactionStats.reduce((sum, s) => sum + s.period2, 0).toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-right text-xs text-emerald-400 font-mono">
                          ${agentTransactionStats.reduce((sum, s) => sum + (s.period1 + s.period2), 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Modal Factura - New Professional Design */}
      <AnimatePresence>
        {isModalOpen && (
          <InvoiceForm 
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleCreateInvoice}
            clients={authorizedClientes}
            businesses={businesses}
            onNewClient={() => setIsNewClientModalOpen(true)}
            nextInvoiceNumber={
              (() => {
                if (invoices.length === 0) return 'INV-001';
                let max = 0;
                invoices.forEach(inv => {
                  const match = inv.invoiceNumber?.match(/INV-(\d+)/);
                  if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > max) max = num;
                  }
                });
                return `INV-${(max + 1).toString().padStart(3, '0')}`;
              })()
            }
          />
        )}

        {isNewClientModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-emerald-500/20 shadow-2xl rounded-3xl w-full max-w-xl overflow-hidden text-slate-200"
            >
              <div className="p-6 border-b border-emerald-500/10 flex justify-between items-center bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-inner">
                    <Users size={20} />
                  </div>
                  <h2 className="text-xl font-display font-black text-white uppercase tracking-widest">Nuevo Cliente</h2>
                </div>
                <button onClick={() => setIsNewClientModalOpen(false)} className="p-2 text-slate-500 hover:text-white rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateClient} className="p-6 sm:p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo de Cliente</label>
                    <div className="flex gap-4">
                      {['Particular', 'Empresa'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setClientFormData({...clientFormData, type: t as 'Particular' | 'Empresa'})}
                          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                            clientFormData.type === t 
                              ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20' 
                              : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {clientFormData.type === 'Empresa' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vincular Contacto</label>
                        <div className="relative">
                          <Contact className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" size={14} />
                          <select 
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-emerald-500 transition-all outline-none appearance-none text-white"
                            onChange={e => {
                              const b = businesses.find(item => item.id === e.target.value);
                              if (b) {
                                let autoCurrency: 'USD' | 'EURO' | 'COP' = 'USD';
                                if (b.country?.toLowerCase().includes('colombia')) autoCurrency = 'COP';
                                else if (b.country?.toLowerCase().includes('españa') || b.country?.toLowerCase().includes('portugal') || b.country?.toLowerCase().includes('francia')) autoCurrency = 'EURO';

                                setClientFormData({
                                  ...clientFormData,
                                  companyName: b.name,
                                  contactName: b.contactName || '',
                                  country: b.country || '',
                                  currency: autoCurrency,
                                  sector: b.category || ''
                                });
                              }
                            }}
                          >
                            <option value="">Seleccionar de mis contactos...</option>
                            {businesses.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre Empresa</label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" size={14} />
                          <input 
                            type="text" 
                            required
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-emerald-500 transition-all outline-none text-white"
                            value={clientFormData.companyName}
                            onChange={e => setClientFormData({...clientFormData, companyName: e.target.value})}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contacto / Representante</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" size={14} />
                      <input 
                        type="text" 
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-emerald-500 transition-all outline-none text-white"
                        value={clientFormData.contactName}
                        onChange={e => setClientFormData({...clientFormData, contactName: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">País</label>
                      <div className="relative">
                        <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" size={14} />
                        <input 
                          type="text" 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-emerald-500 transition-all outline-none text-white"
                          value={clientFormData.country}
                          onChange={e => setClientFormData({...clientFormData, country: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Correo</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" size={14} />
                        <input 
                          type="email" 
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-emerald-500 transition-all outline-none text-white"
                          value={clientFormData.email}
                          onChange={e => setClientFormData({...clientFormData, email: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Idioma</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" size={14} />
                        <select 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-emerald-500 transition-all outline-none appearance-none text-white"
                          value={clientFormData.language}
                          onChange={e => setClientFormData({...clientFormData, language: e.target.value as any})}
                        >
                          <option value="Español" className="bg-slate-900">Español</option>
                          <option value="Inglés" className="bg-slate-900">Inglés</option>
                          <option value="Portugués" className="bg-slate-900">Portugués</option>
                          <option value="Francés" className="bg-slate-900">Francés</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Divisa</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" size={14} />
                        <select 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-emerald-500 transition-all outline-none appearance-none text-white"
                          value={clientFormData.currency}
                          onChange={e => setClientFormData({...clientFormData, currency: e.target.value as any})}
                        >
                          <option value="USD" className="bg-slate-900">USD</option>
                          <option value="EURO" className="bg-slate-900">EURO</option>
                          <option value="COP" className="bg-slate-900">COP</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsNewClientModalOpen(false)}
                    className="flex-1 py-4 bg-slate-800 text-slate-400 font-black uppercase tracking-widest rounded-2xl hover:text-white transition-all text-[10px]"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all text-[10px]"
                  >
                    Registrar Cliente
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {isPaymentModalOpen && selectedInvoice && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-emerald-500/20 shadow-2xl rounded-3xl w-full max-w-md overflow-hidden text-slate-200"
            >
              <div className="p-6 border-b border-emerald-500/10 flex justify-between items-center bg-slate-950/50">
                  <h2 className="text-xl font-display font-black text-white uppercase tracking-widest">Registrar Pago</h2>
                  <button onClick={() => { setIsPaymentModalOpen(false); setPaymentProof(null); setPaymentAmount(0); setPaymentNote(''); setSelectedInvoice(null); }} className="text-slate-500 hover:text-white"><X size={24} /></button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Items de la Factura</p>
                    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 space-y-2">
                      {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                        selectedInvoice.items.map((item, i) => (
                          <div key={i} className="flex justify-between items-center text-[11px] border-b border-slate-800/50 last:border-0 pb-1 last:pb-0">
                            <span className="text-slate-300 font-bold truncate max-w-[180px]">{item.description}</span>
                            <span className="text-slate-500 tabular-nums">{item.quantity} x ${safeToLocaleString(item.price)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-300 font-bold">{selectedInvoice.service}</span>
                          <span className="text-slate-500 tabular-nums">{selectedInvoice.quantity} x ${safeToLocaleString(selectedInvoice.priceUSD)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                    <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">Por cobrar</p>
                    <p className="text-xl font-display font-black text-emerald-400">
                      ${safeToLocaleString(
                        (() => {
                          const subtotal = selectedInvoice.items && selectedInvoice.items.length > 0
                            ? selectedInvoice.items.reduce((acc, item) => acc + (item.quantity * item.price), 0)
                            : (selectedInvoice.quantity || 0) * (selectedInvoice.priceUSD || 0);
                          return subtotal * (1 + (selectedInvoice.tax || 0) / 100) - (selectedInvoice.paidAmount || 0);
                        })()
                      )}
                    </p>
                  </div>

                  {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Historial de Abonos</p>
                      <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                        {selectedInvoice.payments.map((p, i) => (
                          <div key={i} className="flex justify-between items-center text-[11px] bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 group hover:border-emerald-500/30 transition-colors">
                            <div className="flex flex-col gap-1">
                              <div>
                                <span className="text-slate-300 font-bold">Pago #{i + 1}</span>
                                <span className="text-[10px] text-slate-500 ml-2">{p.date}</span>
                              </div>
                              {p.proofDataUrl && (
                                <a 
                                  href={p.proofDataUrl} 
                                  download={p.proofName || `comprobante_pago_${i+1}`}
                                  onClick={(e) => {
                                    if (p.proofDataUrl?.startsWith('data:image') || p.proofDataUrl?.startsWith('data:application/pdf')) {
                                      e.preventDefault();
                                      const w = window.open();
                                      if (w) {
                                        if (p.proofDataUrl.startsWith('data:application/pdf')) {
                                            w.document.write(`<iframe src="${p.proofDataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                        } else {
                                            w.document.write(`<img src="${p.proofDataUrl}" style="max-width: 100%; height: auto;" />`);
                                        }
                                      }
                                    }
                                  }}
                                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold opacity-80 hover:opacity-100 transition-opacity whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]"
                                  title="Ver comprobante"
                                >
                                  <FileIcon size={12} className="flex-shrink-0" />
                                  <span className="truncate">{p.proofName || 'Ver comprobante'}</span>
                                </a>
                              )}
                            </div>
                            <span className="font-mono text-emerald-400 font-bold text-sm">${safeToLocaleString(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handlePayInvoice} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Nuevo Abono</label>
                      {selectedInvoice && (() => {
                        const subtotal = selectedInvoice.items && selectedInvoice.items.length > 0
                          ? selectedInvoice.items.reduce((acc, item) => acc + (item.quantity * item.price), 0)
                          : (selectedInvoice.quantity || 0) * (selectedInvoice.priceUSD || 0);
                        const total = subtotal * (1 + (selectedInvoice.tax || 0) / 100);
                        const pending = total - (selectedInvoice.paidAmount || 0);
                        return paymentAmount > pending + 0.01 ? (
                          <span className="text-[9px] text-red-400 font-bold animate-pulse">Excede el saldo</span>
                        ) : null;
                      })()}
                    </div>
                    <div className="relative">
                      <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                        (() => {
                           const subtotal = selectedInvoice.items && selectedInvoice.items.length > 0
                             ? selectedInvoice.items.reduce((acc, item) => acc + (item.quantity * item.price), 0)
                             : (selectedInvoice.quantity || 0) * (selectedInvoice.priceUSD || 0);
                           const total = subtotal * (1 + (selectedInvoice.tax || 0) / 100);
                           const pending = total - (selectedInvoice.paidAmount || 0);
                           return paymentAmount > pending + 0.01 ? 'text-red-500' : 'text-emerald-500';
                        })()
                      }`} size={14} />
                      <input 
                        type="number" 
                        step="0.01"
                        className={`w-full bg-slate-950 border rounded-xl pl-10 pr-4 py-3 text-white font-bold transition-all outline-none ${
                          (() => {
                            const subtotal = selectedInvoice.items && selectedInvoice.items.length > 0
                              ? selectedInvoice.items.reduce((acc, item) => acc + (item.quantity * item.price), 0)
                              : (selectedInvoice.quantity || 0) * (selectedInvoice.priceUSD || 0);
                            const total = subtotal * (1 + (selectedInvoice.tax || 0) / 100);
                            const pending = total - (selectedInvoice.paidAmount || 0);
                            return paymentAmount > pending + 0.01 ? 'border-red-500 focus:border-red-500' : 'border-slate-800 focus:border-emerald-500';
                          })()
                        }`} 
                        value={paymentAmount || ''} 
                        onChange={e => setPaymentAmount(e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Nota</label>
                    <textarea 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
                      value={paymentNote}
                      onChange={e => setPaymentNote(e.target.value)}
                      placeholder="Agrega una nota opcional..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Comprobante de Pago *</label>
                    <div className="relative">
                      <input 
                        type="file"
                        id="payment-proof"
                        className="hidden"
                        onChange={(e) => setPaymentProof(e.target.files ? e.target.files[0] : null)}
                        accept="image/*,.pdf"
                        required
                      />
                      <label 
                        htmlFor="payment-proof"
                        className={`w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors text-xs font-bold ${paymentProof ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 hover:border-slate-600 hover:bg-slate-900 text-slate-400'}`}
                      >
                        {paymentProof ? (
                          <>
                            <FileIcon size={16} />
                            {paymentProof.name}
                          </>
                        ) : (
                          <>
                            <Upload size={16} />
                            Subir comprobante (PDF, JPG, PNG)
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={(() => {
                      const subtotal = selectedInvoice.items && selectedInvoice.items.length > 0
                        ? selectedInvoice.items.reduce((acc, item) => acc + (item.quantity * item.price), 0)
                        : (selectedInvoice.quantity || 0) * (selectedInvoice.priceUSD || 0);
                      const total = subtotal * (1 + (selectedInvoice.tax || 0) / 100);
                      const pending = total - (selectedInvoice.paidAmount || 0);
                      return paymentAmount > pending + 0.01 || paymentAmount <= 0 || !paymentProof;
                    })()}
                    className={`w-full py-4 font-black uppercase tracking-widest rounded-xl shadow-lg transition-all text-xs ${
                      (() => {
                        const subtotal = selectedInvoice.items && selectedInvoice.items.length > 0
                          ? selectedInvoice.items.reduce((acc, item) => acc + (item.quantity * item.price), 0)
                          : (selectedInvoice.quantity || 0) * (selectedInvoice.priceUSD || 0);
                        const total = subtotal * (1 + (selectedInvoice.tax || 0) / 100);
                        const pending = total - (selectedInvoice.paidAmount || 0);
                        return paymentAmount > pending + 0.01 || paymentAmount <= 0 || !paymentProof
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed grayscale' 
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-95';
                      })()
                    }`}
                  >
                    Confirmar Pago
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isStatementModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-700 shadow-2xl rounded-3xl w-full max-w-sm overflow-hidden text-slate-200"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                  <h2 className="text-xl font-display font-black text-white uppercase tracking-widest">Estado de Cuenta</h2>
                  <button onClick={() => setIsStatementModalOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Seleccionar Cliente</label>
                  <select 
                    value={selectedStatementClient}
                    onChange={(e) => setSelectedStatementClient(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold transition-all outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 appearance-none shadow-inner"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-500">Seleccione un cliente...</option>
                    {Array.from(new Set(invoices.map(inv => inv.businessId))).map(businessId => {
                      const clientName = invoices.find(inv => inv.businessId === businessId)?.businessName || 'Cliente';
                      return (
                        <option key={businessId} value={businessId} className="bg-slate-900 text-slate-200">
                          {clientName}
                        </option>
                      );
                    })}
                  </select>
                </div>
                
                <button 
                  onClick={handleGenerateStatement}
                  disabled={!selectedStatementClient}
                  className={`w-full py-4 font-black uppercase tracking-widest rounded-xl shadow-lg transition-all text-xs flex justify-center items-center gap-2 ${
                    !selectedStatementClient
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 active:scale-95'
                  }`}
                >
                  <FileText size={16} /> Generar PDF
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isDeleteModalOpen && invoiceToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-red-500/20 shadow-2xl rounded-3xl w-full max-w-sm overflow-hidden text-slate-200"
            >
              <div className="p-6 border-b border-red-500/10 flex justify-between items-center bg-slate-950/50">
                  <h2 className="text-xl font-display font-black text-white uppercase tracking-widest">Confirmar</h2>
                  <button onClick={() => setIsDeleteModalOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <div className="p-8 space-y-6 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto shadow-inner border border-red-500/20">
                  <Trash2 size={32} />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-white">¿Eliminar Factura?</p>
                  <p className="text-sm text-slate-400 font-medium">Esta acción no se puede deshacer. Se eliminará la factura <span className="text-slate-200 font-bold">{invoiceToDelete.invoiceNumber}</span> de forma permanente.</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 py-3 bg-slate-800 text-slate-400 font-black uppercase tracking-widest rounded-xl hover:text-white transition-all text-[10px]"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmDeleteInvoice}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-600/20 active:scale-95 transition-all text-[10px]"
                  >
                    Eliminar
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
