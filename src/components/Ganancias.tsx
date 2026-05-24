/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  FileText, 
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Send,
  X,
  History,
  Users,
  Briefcase,
  User,
  Globe2,
  Mail,
  Globe,
  Info,
  Download,
  Phone,
  Banknote,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, WithdrawalRequest, Client, Business, AgentEarning } from '../types';
import InvoiceForm from './InvoiceForm';
import { usePermissions } from '../hooks/usePermissions';
import { supabase } from '../lib/supabase';
import { calculateUserRank } from '../lib/rankUtils';
import { Pagination } from './Pagination';
import { TableLoader } from './TableLoader';

interface GananciasProps {
  onLogout: () => void;
  onBack: () => void;
  user: { id?: string; email: string; roleId: string; roleName?: string; fullName?: string; avatar?: string } | null;
}

export default function Ganancias({ user }: GananciasProps) {
  const permissions = usePermissions('ganancias');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [agentEarnings, setAgentEarnings] = useState<AgentEarning[]>([]);
  const [platformUsers, setPlatformUsers] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [clientes, setClientes] = useState<Client[]>([]);
  const [asuntos, setAsuntos] = useState<any[]>([]);
  const [propuestas, setPropuestas] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState('all');
  const [quincenaFilter, setQuincenaFilter] = useState('all');
  const [vendedorFilter, setVendedorFilter] = useState('all');
  
  const [movYearFilter, setMovYearFilter] = useState(new Date().getFullYear().toString());
  const [movMonthFilter, setMovMonthFilter] = useState('all');
  const [movQuincenaFilter, setMovQuincenaFilter] = useState('all');
  const [movVendedorFilter, setMovVendedorFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const itemsPerPage = 50;
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  
  const [isConfirmPayModalOpen, setIsConfirmPayModalOpen] = useState(false);
  const [confirmPayTarget, setConfirmPayTarget] = useState<string | null>(null);
  const [isConfirmProcessModalOpen, setIsConfirmProcessModalOpen] = useState(false);
  const [confirmProcessTarget, setConfirmProcessTarget] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
      const calculateTimeLeft = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        // Find next closing date
        let closingDate = new Date(year, month, 15, 23, 59, 59); // Try 15th
        if (now > closingDate) {
          // It's after the 15th, find EOM
          closingDate = new Date(year, month + 1, 0, 23, 59, 59); // 0th of next month is EOM
          if (now > closingDate) {
            // It's after EOM, start of next month period (meaning EOM passed, so next is 15th of next month)
             closingDate = new Date(year, month + 1, 15, 23, 59, 59);
          }
        }
    
        const diff = closingDate.getTime() - now.getTime();
        
        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diff / (1000 * 60)) % 60);
          return `Quedan ${days} día${days !== 1 ? 's' : ''}, ${hours} hora${hours !== 1 ? 's' : ''} y ${minutes} minuto${minutes !== 1 ? 's' : ''} para hacer el cierre del periodo de pagos`;
        }
        return "Cerrando periodo";
      };
      
      setTimeLeft(calculateTimeLeft());
      const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 60000); // 1 minute
      return () => clearInterval(timer);
    }, []);

  const userRank = useMemo(() => {
    if (user?.id) {
       return calculateUserRank(user.id, user.fullName || '');
    }
    return null;
  }, [user, invoices]);

  const [selectedEarnings, setSelectedEarnings] = useState<string[]>([]);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientFormData, setClientFormData] = useState({
    type: 'Particular' as 'Particular' | 'Empresa',
    companyName: '',
    contactName: '',
    email: '',
    language: 'Español' as 'Español' | 'Inglés' | 'Portugués' | 'Francés',
    currency: 'USD' as 'USD' | 'EURO',
    country: '',
    sector: '',
  });

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

  useEffect(() => {
    // Immediate fallback load from local storage
    const savedInvoices = localStorage.getItem('capibee_invoices');
    if (savedInvoices) {
      setInvoices(JSON.parse(savedInvoices));
    }
    
    const savedWithdrawals = localStorage.getItem('capibee_withdrawals');
    if (savedWithdrawals) {
      setWithdrawals(JSON.parse(savedWithdrawals));
    }

    const savedEarnings = localStorage.getItem('capibee_agent_earnings');
    if (savedEarnings) {
      let earnings = JSON.parse(savedEarnings);
      
      const hasReset = localStorage.getItem('capibee_temp_reset_pagado');
      if (!hasReset) {
        earnings = earnings.map((e: any) => ({ ...e, status: 'En proceso' }));
        localStorage.setItem('capibee_temp_reset_pagado', 'true');
        localStorage.setItem('capibee_agent_earnings', JSON.stringify(earnings));
      }
      
      setAgentEarnings(earnings);
    }
    
    const savedUsers = localStorage.getItem('capibee_platform_users');
    if (savedUsers) setPlatformUsers(JSON.parse(savedUsers));

    const savedBusinesses = localStorage.getItem('capibee_businesses');
    if (savedBusinesses) setBusinesses(JSON.parse(savedBusinesses));

    const savedClientes = localStorage.getItem('capibee_clientes');
    if (savedClientes) setClientes(JSON.parse(savedClientes));

    const savedAsuntos = localStorage.getItem('capibee_asuntos');
    if (savedAsuntos) setAsuntos(JSON.parse(savedAsuntos));

    const savedPropuestas = localStorage.getItem('capibee_propuestas');
    if (savedPropuestas) setPropuestas(JSON.parse(savedPropuestas));

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

        const { data: dbWithdrawals } = await supabase.from('withdrawal_requests').select('*');
        if (dbWithdrawals) {
          const mappedW = dbWithdrawals.map((w: any) => ({
            id: w.id,
            amount: Number(w.amount),
            date: w.date,
            status: w.status,
            userId: w.user_id,
            userName: w.user_name,
            userEmail: w.user_email,
            note: w.note || ''
          }));
          setWithdrawals(mappedW);
          localStorage.setItem('capibee_withdrawals', JSON.stringify(mappedW));
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
        console.warn("Could not sync data from Supabase in Ganancias:", err);
      } finally {
        setIsTableLoading(false);
      }
    };

    fetchFreshInvoiceData();

    // Subscribe to real-time additions/edits
    const invoicesChannel = supabase.channel('invoices-realtime-ganancias-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        fetchFreshInvoiceData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_earnings' }, () => {
        fetchFreshInvoiceData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, () => {
        fetchFreshInvoiceData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(invoicesChannel);
    };
  }, []);

  const handleCreateInvoice = (formData: any) => {
    if (!permissions.create) return;
    
    const selectedBusiness = businesses.find(b => b.id === formData.businessId);
    const selectedClient = clientes.find(c => c.id === formData.businessId);
    
    if (!selectedBusiness && !selectedClient) return;

    const displayName = selectedClient 
      ? (selectedClient.companyName || selectedClient.contactName)
      : selectedBusiness!.name;

    const emissionDate = new Date(formData.emissionDate);
    const dueDateObj = new Date(emissionDate);
    
    if (formData.dueDate === '1 dia') dueDateObj.setDate(dueDateObj.getDate() + 1);
    else if (formData.dueDate === '7 dias') dueDateObj.setDate(dueDateObj.getDate() + 7);
    else if (formData.dueDate === '15 dias') dueDateObj.setDate(dueDateObj.getDate() + 15);
    else if (formData.dueDate === '30 dias') dueDateObj.setDate(dueDateObj.getDate() + 30);

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
      service: formData.items[0]?.description || '',
      quantity: formData.items[0]?.quantity || 1,
      priceUSD: formData.items[0]?.price || 0,
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

    const updatedInvoices = [newInvoice, ...invoices];
    setInvoices(updatedInvoices);
    localStorage.setItem('capibee_invoices', JSON.stringify(updatedInvoices));

    // Save to Supabase live
    try {
      supabase.from('invoices').upsert({
        id: newInvoice.id,
        invoice_number: newInvoice.invoiceNumber,
        business_id: newInvoice.businessId || null,
        business_name: newInvoice.businessName || 'Cliente No Identificado',
        service: newInvoice.service || '',
        quantity: newInvoice.quantity || 1,
        price_usd: newInvoice.priceUSD || 0,
        items: newInvoice.items || [],
        tax: newInvoice.tax || 0,
        payment_method: newInvoice.paymentMethod || 'Efectivo',
        emission_date: newInvoice.emissionDate,
        due_date: newInvoice.dueDate,
        note: newInvoice.note || '',
        payments: newInvoice.payments || [],
        paid_amount: newInvoice.paidAmount || 0,
        status: newInvoice.status || 'PENDIENTE',
        created_at: newInvoice.createdAt || Date.now()
      }, { onConflict: 'id' }).then(({ error }) => {
        if (error) console.error("🔴 Supabase invoice upload from Ganancias error:", error);
        else console.log("💚 Supabase invoice uploaded from Ganancias successfully!");
      });
    } catch (e) {
      console.error("🔴 Supabase invoice creation failed in Ganancias:", e);
    }

    setIsInvoiceModalOpen(false);
  };

  const toggleEarningSelection = (id: string) => {
    setSelectedEarnings(prev => prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]);
  };

  const toggleAllEarnings = () => {
    if (selectedEarnings.length > 0) {
      setSelectedEarnings([]);
    } else {
      setSelectedEarnings(filteredEarnings.filter(e => e.status === 'En proceso' || e.status === 'Procesado').map(e => e.id));
    }
  };

  const requestBulkPay = () => {
    setConfirmPayTarget(null);
    setIsConfirmPayModalOpen(true);
  };

  const requestSinglePay = (id: string) => {
    setConfirmPayTarget(id);
    setIsConfirmPayModalOpen(true);
  };

  const confirmPay = () => {
    if (confirmPayTarget) {
      handleUpdateEarningStatus(confirmPayTarget, 'Pagado');
    } else {
      handleBulkPay();
    }
    setIsConfirmPayModalOpen(false);
  };

  const requestSingleProcess = (id: string) => {
    setConfirmProcessTarget(id);
    setIsConfirmProcessModalOpen(true);
  };

  const confirmProcess = () => {
    if (confirmProcessTarget) {
      handleUpdateEarningStatus(confirmProcessTarget, 'Procesado');
    }
    setIsConfirmProcessModalOpen(false);
  };

  const handleBulkPay = () => {
    if (user?.roleId !== 'ADMIN_MAESTRO') return;
    const updated = agentEarnings.map(e => selectedEarnings.includes(e.id) ? { ...e, status: 'Pagado' as const } : e);
    setAgentEarnings(updated);
    localStorage.setItem('capibee_agent_earnings', JSON.stringify(updated));
    selectedEarnings.forEach(id => {
      const earning = updated.find(e => e.id === id);
      if (earning) {
        supabase.from('agent_earnings').upsert({
          id: earning.id,
          amount: earning.amount,
          date: earning.date,
          business_id: earning.businessId,
          business_name: earning.businessName,
          invoice_id: earning.invoiceId,
          status: 'Pagado',
          user_id: earning.userId
        }).then(({ error }) => {
          if (error) console.error("🔴 Supabase bulk update agent_earnings error:", error);
        });
      }
    });
    setSelectedEarnings([]);
  };

  const baseEarnings = useMemo(() => {
    const resolvedEarnings = agentEarnings.map(e => {
       const bus = businesses.find(b => b.id === e.businessId);
       let actualUserId = e.userId;
       if (bus && bus.responsibleName) {
         const seller = platformUsers.find(u => u.fullName === bus.responsibleName);
         if (seller) actualUserId = seller.id;
       } else {
         const cli = clientes.find(c => c.id === e.businessId);
         if (cli && cli.userId) {
             actualUserId = cli.userId;
         }
       }
       return { ...e, userId: actualUserId };
    });

    return resolvedEarnings.filter(e => {
        // Role check
        if (user?.roleId !== 'ADMIN_MAESTRO' && e.userId !== user?.id) return false;

        // Vendedor filter
        const matchesVendedor = vendedorFilter === 'all' || e.userId === vendedorFilter;

        return matchesVendedor;
    });
  }, [agentEarnings, user, vendedorFilter, businesses, platformUsers, clientes]);

  const statsByStatus = useMemo(() => {
    let totals = {
      'En proceso': { USD: 0, EURO: 0 },
      'Procesado': { USD: 0, EURO: 0 },
      'Pagado': { USD: 0, EURO: 0 }
    };

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentQuincena = now.getDate() <= 15 ? 1 : 2;

    baseEarnings.forEach(e => {
        const eDate = new Date(e.date);
        if (eDate.getFullYear() === currentYear && eDate.getMonth() === currentMonth) {
            const eQuincena = eDate.getDate() <= 15 ? 1 : 2;
            if (eQuincena === currentQuincena) {
                const inv = invoices.find(i => i.id === e.invoiceId);
                const cli = clientes.find(c => c.id === inv?.businessId);
                const currency = cli?.currency || 'USD';
                
                if (e.status === 'En proceso') {
                    if (currency === 'EURO') totals['En proceso'].EURO += e.amount;
                    else totals['En proceso'].USD += e.amount;
                } else if (e.status === 'Procesado') {
                    if (currency === 'EURO') totals['Procesado'].EURO += e.amount;
                    else totals['Procesado'].USD += e.amount;
                } else if (e.status === 'Pagado') {
                    if (currency === 'EURO') totals['Pagado'].EURO += e.amount;
                    else totals['Pagado'].USD += e.amount;
                }
            }
        }
    });
      
    return totals;
  }, [baseEarnings, invoices, clientes]);

  const currentPeriodText = useMemo(() => {
    let text = 'COMISIONES ';
    const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    
    if (quincenaFilter === '1') text += '1-15 ';
    else if (quincenaFilter === '2') text += '16-31 ';
    else text += new Date().getDate() <= 15 ? '1-15 ' : '16-31 ';

    if (monthFilter !== 'all') {
      text += months[parseInt(monthFilter)] + ' ';
    } else {
      text += months[new Date().getMonth()] + ' ';
    }

    if (yearFilter !== 'all') {
      text += yearFilter;
    } else {
      text += new Date().getFullYear();
    }
    
    return text;
  }, [quincenaFilter, monthFilter, yearFilter]);

  const agentTransactionStats = useMemo(() => {
    const isSuperAdmin = user?.roleName?.toUpperCase() === 'SUPERADMIN' || user?.roleId?.toUpperCase() === 'SUPERADMIN' || user?.roleId === 'ADMIN_MAESTRO';
    if (!isSuperAdmin) return null;

    const executives = platformUsers.filter(u => 
      u.roleName?.toLowerCase().includes('ejecutivo') || 
      u.roleId?.includes('6940')
    );
    
    // Filtro de fecha para comisiones
    const filteredBaseEarnings = baseEarnings.filter(e => {
        const eDate = new Date(e.date);
        const matchesYear = yearFilter === 'all' || eDate.getFullYear().toString() === yearFilter;
        const matchesMonth = monthFilter === 'all' || eDate.getMonth().toString() === monthFilter;

        let matchesQuincena = true;
        if (quincenaFilter === '1') matchesQuincena = eDate.getDate() <= 15;
        if (quincenaFilter === '2') matchesQuincena = eDate.getDate() > 15;

        return matchesYear && matchesMonth && matchesQuincena;
    });

    const stats: {name: string, currency: string, totalProceso: number, totalProcesado: number, totalPagado: number, pendientesEnvio: number}[] = [];

    executives.forEach(exec => {
      const execEarnings = filteredBaseEarnings.filter(e => e.userId === exec.id);
      let totalUSDProceso = 0;
      let totalUSDProcesado = 0;
      let totalUSDPagado = 0;
      let totalEUROProceso = 0;
      let totalEUROProcesado = 0;
      let totalEUROPagado = 0;
      
      execEarnings.forEach(e => {
        const inv = invoices.find(i => i.id === e.invoiceId);
        const cli = clientes.find(c => c.id === inv?.businessId);
        const currency = cli?.currency || 'USD';
        
        if (currency === 'EURO') {
          if (e.status === 'En proceso') totalEUROProceso += e.amount;
          if (e.status === 'Procesado') totalEUROProcesado += e.amount;
          if (e.status === 'Pagado') totalEUROPagado += e.amount;
        } else {
          if (e.status === 'En proceso') totalUSDProceso += e.amount;
          if (e.status === 'Procesado') totalUSDProcesado += e.amount;
          if (e.status === 'Pagado') totalUSDPagado += e.amount;
        }
      });

      // Calcular "Pendientes de Envío": Asuntos de este ejecutivo que no tienen propuesta asignada
      const execAsuntos = asuntos.filter(a => {
        if (a.userId !== exec.id) return false;
        const d = a.fecha ? new Date(a.fecha) : (a.createdAt ? new Date(a.createdAt) : null);
        if (!d || isNaN(d.getTime())) return false;

        const matchYear = yearFilter === 'all' || String(d.getFullYear()) === yearFilter;
        const matchMonth = monthFilter === 'all' || String(d.getMonth()) === monthFilter;
        
        let matchesQuincena = true;
        if (quincenaFilter === '1') matchesQuincena = d.getDate() <= 15;
        if (quincenaFilter === '2') matchesQuincena = d.getDate() > 15;

        return matchYear && matchMonth && matchesQuincena;
      });
      const pendientesCount = execAsuntos.filter(a => !propuestas.some(p => p.asuntoId === a.id)).length;
      
      if (totalUSDProceso === 0 && totalUSDProcesado === 0 && totalUSDPagado === 0 && totalEUROProceso === 0 && totalEUROProcesado === 0 && totalEUROPagado === 0) {
        stats.push({ name: exec.fullName, currency: 'USD', totalProceso: 0, totalProcesado: 0, totalPagado: 0, pendientesEnvio: pendientesCount });
      } else {
        if (totalUSDProceso > 0 || totalUSDProcesado > 0 || totalUSDPagado > 0) {
          stats.push({ name: exec.fullName, currency: 'USD', totalProceso: totalUSDProceso, totalProcesado: totalUSDProcesado, totalPagado: totalUSDPagado, pendientesEnvio: pendientesCount });
        }
        if (totalEUROProceso > 0 || totalEUROProcesado > 0 || totalEUROPagado > 0) {
          stats.push({ name: exec.fullName, currency: 'EURO', totalProceso: totalEUROProceso, totalProcesado: totalEUROProcesado, totalPagado: totalEUROPagado, pendientesEnvio: pendientesCount });
        }
      }
    });

    return stats.sort((a,b) => b.totalProceso - a.totalProceso);
  }, [baseEarnings, platformUsers, user, invoices, clientes, yearFilter, monthFilter, quincenaFilter, asuntos, propuestas]);

  const grandTotalPendientesEnvio = useMemo(() => {
    if (!platformUsers || !asuntos) return 0;
    const executives = platformUsers.filter(u => 
      u.roleName?.toLowerCase().includes('ejecutivo') || 
      u.roleId?.includes('6940')
    );
    let total = 0;
    executives.forEach(exec => {
      const execAsuntos = asuntos.filter(a => {
        if (a.userId !== exec.id) return false;
        const d = a.fecha ? new Date(a.fecha) : (a.createdAt ? new Date(a.createdAt) : null);
        if (!d || isNaN(d.getTime())) return false;

        const matchYear = yearFilter === 'all' || String(d.getFullYear()) === yearFilter;
        const matchMonth = monthFilter === 'all' || String(d.getMonth()) === monthFilter;
        
        let matchesQuincena = true;
        if (quincenaFilter === '1') matchesQuincena = d.getDate() <= 15;
        if (quincenaFilter === '2') matchesQuincena = d.getDate() > 15;

        return matchYear && matchMonth && matchesQuincena;
      });
      const pendientes = execAsuntos.filter(a => !propuestas.some(p => p.asuntoId === a.id)).length;
      total += pendientes;
    });
    return total;
  }, [platformUsers, asuntos, propuestas, yearFilter, monthFilter, quincenaFilter]);

  const filteredEarnings = useMemo(() => {
    return baseEarnings.filter(e => {
        const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
        
        const matchesVendedor = movVendedorFilter === 'all' || e.userId === movVendedorFilter;

        const eDate = new Date(e.date);
        const matchesYear = movYearFilter === 'all' || eDate.getFullYear().toString() === movYearFilter;
        const matchesMonth = movMonthFilter === 'all' || eDate.getMonth().toString() === movMonthFilter;

        let matchesQuincena = true;
        if (movQuincenaFilter === '1') matchesQuincena = eDate.getDate() <= 15;
        if (movQuincenaFilter === '2') matchesQuincena = eDate.getDate() > 15;

        return matchesStatus && matchesVendedor && matchesYear && matchesMonth && matchesQuincena;
    });
  }, [baseEarnings, statusFilter, movYearFilter, movMonthFilter, movQuincenaFilter, movVendedorFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, movYearFilter, movMonthFilter, movQuincenaFilter, movVendedorFilter]);

  const totalPages = Math.ceil(filteredEarnings.length / itemsPerPage);
  const currentItems = useMemo(() => {
    return filteredEarnings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredEarnings, currentPage, itemsPerPage]);

  const availableBalance = statsByStatus['En proceso'] || 0;

  const handleRequestPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(requestAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setError('Por favor ingresa un monto válido');
      return;
    }
    
    if (amount > availableBalance) {
      setError(`No puedes solicitar más del saldo disponible ($${safeToLocaleString(availableBalance)})`);
      return;
    }

    setIsSubmitting(true);
    
    const newRequest: WithdrawalRequest = {
      id: `RET-${Date.now()}`,
      amount,
      date: new Date().toISOString(),
      status: 'En proceso',
      userId: user?.id || 'unknown',
      userName: user?.fullName || 'Usuario',
      userEmail: user?.email || 'email@unknown.com',
      note: requestNote
    };

    const updatedWithdrawals = [newRequest, ...withdrawals];
    setWithdrawals(updatedWithdrawals);
    localStorage.setItem('capibee_withdrawals', JSON.stringify(updatedWithdrawals));
    
    supabase.from('withdrawal_requests').upsert({
      id: newRequest.id,
      amount: newRequest.amount,
      date: newRequest.date,
      status: newRequest.status,
      user_id: newRequest.userId,
      user_name: newRequest.userName,
      user_email: newRequest.userEmail,
      note: newRequest.note
    }).then(({ error }) => {
      if (error) console.error("🔴 Supabase create withdrawal error:", error);
    });
    
    setIsSubmitting(false);
    setIsModalOpen(false);
    setRequestAmount('');
    setRequestNote('');
    setError(null);
  };

  const handleDeleteEarning = async (id: string) => {
    if (user?.roleId !== 'ADMIN_MAESTRO') return;
    if (!window.confirm("¿Está seguro que desea eliminar este registro de comisión?")) return;
    
    // update local state
    const updated = agentEarnings.filter(e => e.id !== id);
    setAgentEarnings(updated);
    localStorage.setItem('capibee_agent_earnings', JSON.stringify(updated));

    // update supabase
    const { error } = await supabase.from('agent_earnings').delete().eq('id', id);
    if (error) {
      console.error("🔴 Supabase delete agent_earnings error:", error);
    }
  };

  const handleUpdateEarningStatus = (id: string, newStatus: string) => {
    if (user?.roleId !== 'ADMIN_MAESTRO') return;
    
    const updated = agentEarnings.map(e => e.id === id ? { ...e, status: newStatus } : e);
    setAgentEarnings(updated);
    localStorage.setItem('capibee_agent_earnings', JSON.stringify(updated));
    const earning = updated.find(e => e.id === id);
    if (earning) {
      supabase.from('agent_earnings').upsert({
        id: earning.id,
        amount: earning.amount,
        date: earning.date,
        business_id: earning.businessId,
        business_name: earning.businessName,
        invoice_id: earning.invoiceId,
        status: newStatus,
        user_id: earning.userId
      }).then(({ error }) => {
        if (error) console.error("🔴 Supabase update agent_earnings error:", error);
      });
    }
  };

  const handleUpdateWithdrawalStatus = (id: string, newStatus: 'Pagado' | 'Rechazado') => {
    if (user?.roleId !== 'ADMIN_MAESTRO') return;
    
    const updated = withdrawals.map(w => w.id === id ? { ...w, status: newStatus } : w);
    setWithdrawals(updated);
    localStorage.setItem('capibee_withdrawals', JSON.stringify(updated));
    const withdrawal = updated.find(w => w.id === id);
    if (withdrawal) {
      supabase.from('withdrawal_requests').upsert({
        id: withdrawal.id,
        amount: withdrawal.amount,
        date: withdrawal.date,
        status: newStatus,
        user_id: withdrawal.userId,
        user_name: withdrawal.userName,
        user_email: withdrawal.userEmail,
        note: withdrawal.note
      }).then(({ error }) => {
        if (error) console.error("🔴 Supabase update withdrawal_requests error:", error);
      });
    }
  };

  const handleDownloadStatement = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Configuración de colores
    const primaryColor = [245, 158, 11] as [number, number, number]; // Amber 500
    const darkColor = [15, 23, 42] as [number, number, number]; // Slate 950
    const grayColor = [100, 116, 139] as [number, number, number]; // Slate 500
    
    // Header - CapiBee logo text / Branding
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(...darkColor);
    doc.text("CAPIBEE", 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...grayColor);
    doc.text("Resumen de Movimientos", 14, 26);
    
    // Header Right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.text("ESTADO DE CUENTA", pageWidth - 14, 20, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...darkColor);
    doc.text(`Emitido: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - 14, 26, { align: "right" });
    
    // Divider
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.5);
    doc.line(14, 32, pageWidth - 14, 32);

    // Info Blocks
    // Left: Emisor
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.text("EMISOR", 14, 40);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...darkColor);
    doc.text("Hecho con IA S.A.S.", 14, 46);
    doc.text("Plataforma CapiBee", 14, 51);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.text("contacto@hechoconia.com", 14, 56);
    
    // Right: Vendedor / Destinatario
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.text("A NOMBRE DE", 105, 40);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...darkColor);
    doc.text(user?.fullName || 'Vendedor y/o Usuario', 105, 46);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.text(user?.email || 'capibee.ia@gmail.com', 105, 51);
    doc.text(user?.roleName || 'Agente / Vendedor', 105, 56);

    // Period Details
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const currentMonthName = monthFilter !== 'all' ? months[parseInt(monthFilter)] : 'Todos los meses';
    const currentYearStr = yearFilter !== 'all' ? yearFilter : new Date().getFullYear().toString();
    
    let periodText = yearFilter !== 'all' ? yearFilter : 'Histórico';
    if (monthFilter !== 'all') {
        periodText += ` - ${months[parseInt(monthFilter)]}`;
    }
    if (quincenaFilter === '1') periodText += ' (1ra Quincena)';
    else if (quincenaFilter === '2') periodText += ' (2da Quincena)';

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 62, pageWidth - 14, 62);

    // Resumen de Saldos
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.text("RESUMEN DEL PERÍODO", 14, 70);
    doc.setFont("helvetica", "normal");
    doc.text(periodText, 14, 75);

    const formatCurrency = (val: number) => `$ ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Tabla de Movimientos
    const tableData = filteredEarnings.map(e => {
        const dateObj = new Date(e.date);
        const d = `${dateObj.toLocaleDateString('es-ES')} ${dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
        const seller = platformUsers.find(u => u.id === e.userId)?.fullName || 'Desconocido';
        const month = months[dateObj.getMonth()];
        const quincena = dateObj.getDate() <= 15 ? 'Q1 (1-15)' : 'Q2 (16-31)';
        const amount = formatCurrency(e.amount);
        return [d, seller, month.toUpperCase(), quincena, amount, e.status.toUpperCase()];
    });

    autoTable(doc, {
        startY: 88,
        head: [['FECHA', 'VENDEDOR', 'MES', 'PERIODO', 'COMISIÓN', 'ESTADO']],
        body: tableData,
        theme: 'plain',
        headStyles: { 
            fillColor: [248, 250, 252], 
            textColor: [100, 116, 139],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'left'
        },
        bodyStyles: {
            fontSize: 9,
            textColor: [15, 23, 42]
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250]
        },
        columnStyles: {
            4: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] }, // Amount column
            5: { halign: 'center', fontStyle: 'bold' } // Status column
        },
        didParseCell: function(data: any) {
            if (data.section === 'body' && data.column.index === 5) {
               if (data.cell.raw === 'PAGADO') {
                   data.cell.styles.textColor = [16, 185, 129]; // Emerald
               } else {
                   data.cell.styles.textColor = [245, 158, 11]; // Amber
               }
            }
        },
        margin: { top: 88, left: 14, right: 14 }
    });
    
    // Footer
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text("Este documento es un comprobante de ingresos y movimientos generados en la plataforma CapiBee.", 14, finalY + 10);
    doc.text("Documento desarrollado por Hecho con IA S.A.S.", 14, finalY + 15);
    doc.text("© " + new Date().getFullYear() + " Hecho con IA S.A.S. Todos los derechos reservados.", 14, finalY + 20);

    const fileName = `Movimientos ${currentMonthName} ${currentYearStr}.pdf`;
    doc.save(fileName);
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const invDate = new Date(inv.emissionDate);
      
      const matchesSearch = 
        (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.service || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.businessName || inv.businessId || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      const matchesYear = yearFilter === 'all' || invDate.getFullYear().toString() === yearFilter;
      const matchesMonth = monthFilter === 'all' || invDate.getMonth().toString() === monthFilter;

      return matchesSearch && matchesStatus && matchesYear && matchesMonth;
    }).sort((a, b) => new Date(b.emissionDate).getTime() - new Date(a.emissionDate).getTime());
  }, [invoices, searchTerm, statusFilter, yearFilter, monthFilter]);

  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case 'USD': return '$';
      case 'EUR': return '€';
      default: return '$';
    }
  };

  const safeToLocaleString = (val: number) => {
    try {
      return val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch {
      return val.toString();
    }
  };

  return (
    <div className="h-full bg-transparent flex flex-col font-sans overflow-hidden text-slate-200">
      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto relative custom-scrollbar min-h-0">
        <div className="max-w-[1400px] mx-auto relative z-10">
          
          <header className="mb-6 border-b border-slate-800/50 pb-6 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-black text-white tracking-tight mb-0.5">Transacciones</h1>
                    <p className="text-slate-500 font-semibold uppercase tracking-widest text-[9px]">Movimientos</p>
                </div>
                
                <div className="border border-amber-500/20 bg-amber-500/5 p-2.5 rounded-lg flex items-center justify-between gap-4 w-full md:w-auto md:min-w-[420px]">
                   <div className="flex items-center gap-2.5">
                      <Info size={14} className="text-amber-500" />
                      <div className="flex flex-col">
                          <span className="text-[9px] uppercase tracking-wide font-bold text-amber-500 leading-tight">{timeLeft}</span>
                          <p className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">1 a 2 días háb. para procesarse.</p>
                      </div>
                   </div>
                   <a 
                      href="https://wa.me/5219994373800?text=Tengo%20una%20novedad%20en%20Transacciones"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1.5 text-[8px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-widest px-2.5 py-1.5 rounded-md transition-colors"
                   >
                      <Phone size={10} />
                      Soporte
                   </a>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-3 items-stretch">
              {user?.roleId !== 'ADMIN_MAESTRO' && user?.roleName?.toUpperCase() !== 'SUPER ADMINISTRADOR' && user?.roleName?.toUpperCase() !== 'SUPERADMIN' && (
                  <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 flex flex-row items-center gap-4 xl:w-[35%]">
                      <div className="w-10 h-10 rounded-full border border-amber-500/30 flex items-center justify-center bg-amber-500/10 text-amber-500 font-black text-xl shrink-0">
                          {userRank?.rankLetter || 'A'}
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-tight">Rango: <span className="text-amber-500">{userRank?.rankName || 'Aprendiz'}</span></div>
                          <div className="text-xl font-display font-black text-white leading-tight mt-0.5">{userRank?.commissionRate ? Math.round(userRank.commissionRate * 100) : 10}% <span className="text-[8px] font-sans text-slate-400 font-normal uppercase tracking-widest">Com.</span></div>
                      </div>
                      <div className="text-[8px] text-slate-500 font-medium uppercase tracking-wider flex justify-between flex-col gap-1.5 sm:border-l border-slate-800/80 sm:pl-3 w-[150px]">
                          <div className="flex justify-between items-center"><span className={`${userRank?.rankLetter === 'J' ? 'text-white font-bold' : 'text-slate-400'}`}>J:</span> <span>2k-6k (10%)</span></div>
                          <div className="flex justify-between items-center"><span className={`${userRank?.rankLetter === 'S' ? 'text-white font-bold' : 'text-slate-400'}`}>S:</span> <span>8k-14k (12%)</span></div>
                          <div className="flex justify-between items-center"><span className={`${userRank?.rankLetter === 'M' ? 'text-amber-500 font-bold' : 'text-amber-500/60'}`}>M:</span> <span className={userRank?.rankLetter === 'M' ? 'text-amber-500' : ''}>16k+ (15%)</span></div>
                      </div>
                  </div>
              )}

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'En proceso', label: 'En proceso', desc: 'Por confirmar', value: statsByStatus['En proceso'], icon: Clock },
                  { id: 'Procesado', label: 'Procesado', desc: 'Confirmado, pdte. pago', value: statsByStatus['Procesado'], icon: Banknote },
                  { id: 'Pagado', label: 'Pagado', desc: 'Marcado como pagado', value: statsByStatus['Pagado'], icon: CheckCircle2 }
                ].map((kpi) => {
                  const Icon = kpi.icon;
                  const isActive = statusFilter === kpi.id;
                  return (
                    <div 
                      key={kpi.id}
                      className={`p-3 rounded-lg border transition-all duration-300 group cursor-pointer flex flex-col justify-between ${
                        isActive
                          ? 'bg-slate-900/80 border-amber-500/50 shadow-sm shadow-amber-500/10'
                          : 'bg-slate-950/30 border-slate-800 hover:border-slate-700'
                      }`}
                      onClick={() => setStatusFilter(isActive ? "" : kpi.id)}
                    >
                      <div className="flex justify-between items-center mb-1.5 gap-2">
                        <div className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? 'text-amber-500' : 'text-slate-500'}`}>
                          {kpi.label}
                        </div>
                        <Icon size={12} className={`shrink-0 ${isActive ? 'text-amber-500' : 'text-slate-600'}`} />
                      </div>
                      <div className="flex-1 text-[8px] text-slate-400 mb-2.5 leading-tight" title={kpi.desc}>
                        {kpi.desc}
                      </div>
                      <div className="flex flex-col gap-0.5 mt-auto">
                        <div className={`text-base font-display font-black tracking-tight leading-tight ${isActive ? 'text-white' : 'text-slate-300'}`}>
                          <span className={isActive ? 'text-amber-500/50' : 'text-slate-600'}>$</span>{safeToLocaleString(kpi.value.USD)} <span className="text-[8px] text-slate-500">USD</span>
                        </div>
                        <div className={`text-base font-display font-black tracking-tight leading-tight ${isActive ? 'text-white' : 'text-slate-300'}`}>
                          <span className={isActive ? 'text-amber-500/50' : 'text-slate-600'}>€</span>{safeToLocaleString(kpi.value.EURO)} <span className="text-[8px] text-slate-500">EUR</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </header>

          {/* Controls Bar */}
          {user?.roleId === 'ADMIN_MAESTRO' && (
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-2 mb-8 flex flex-col xl:flex-row gap-2 justify-between items-stretch shadow-sm">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar concepto o factura..." 
                  className="w-full pl-11 pr-4 py-3 bg-transparent border-none text-sm text-slate-300 focus:outline-none placeholder:text-slate-600"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="w-px bg-slate-800 hidden xl:block mx-1 my-2"></div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative group flex-1 xl:flex-none">
                  <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                  <select 
                    className="w-full xl:w-auto bg-transparent hover:bg-slate-900/50 border border-slate-800/80 rounded-xl pl-10 pr-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer transition-all appearance-none focus:border-amber-500/50"
                    value={yearFilter}
                    onChange={e => setYearFilter(e.target.value)}
                    style={{ backgroundRepeat: 'no-repeat', backgroundSize: '1rem', backgroundPosition: 'right 0.75rem center', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                  >
                    <option value="all" className="bg-slate-950 text-slate-200">Año</option>
                    {Array.from(new Set(invoices.map(inv => new Date(inv.emissionDate).getFullYear().toString()))).sort().map(year => (
                      <option key={year} value={year} className="bg-slate-950 text-slate-200">{year}</option>
                    ))}
                    {!invoices.some(inv => new Date(inv.emissionDate).getFullYear().toString() === new Date().getFullYear().toString()) && (
                      <option value={new Date().getFullYear().toString()} className="bg-slate-950 text-slate-200">{new Date().getFullYear()}</option>
                    )}
                  </select>
                </div>

                <div className="relative group flex-1 xl:flex-none">
                  <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                  <select 
                    className="w-full xl:w-auto bg-transparent hover:bg-slate-900/50 border border-slate-800/80 rounded-xl pl-10 pr-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer transition-all appearance-none focus:border-amber-500/50"
                    value={monthFilter}
                    onChange={e => setMonthFilter(e.target.value)}
                    style={{ backgroundRepeat: 'no-repeat', backgroundSize: '1rem', backgroundPosition: 'right 0.75rem center', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                  >
                    <option value="all" className="bg-slate-950 text-slate-200">Mes</option>
                    {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                      <option key={i} value={i.toString()} className="bg-slate-950 text-slate-200">{m}</option>
                    ))}
                  </select>
                </div>

                <div className="relative group flex-1 xl:flex-none">
                  <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                  <select 
                    className="w-full xl:w-auto bg-transparent hover:bg-slate-900/50 border border-slate-800/80 rounded-xl pl-10 pr-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer transition-all appearance-none focus:border-amber-500/50"
                    value={quincenaFilter}
                    onChange={e => setQuincenaFilter(e.target.value)}
                    style={{ backgroundRepeat: 'no-repeat', backgroundSize: '1rem', backgroundPosition: 'right 0.75rem center', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                  >
                    <option value="all" className="bg-slate-950 text-slate-200">Quincena</option>
                    <option value="1" className="bg-slate-950 text-slate-200">Q1 (1-15)</option>
                    <option value="2" className="bg-slate-950 text-slate-200">Q2 (16-31)</option>
                  </select>
                </div>

                <div className="relative group flex-1 xl:flex-none">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                  <select 
                    className="w-full xl:w-auto bg-transparent hover:bg-slate-900/50 border border-slate-800/80 rounded-xl pl-10 pr-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer transition-all appearance-none focus:border-amber-500/50"
                    value={vendedorFilter}
                    onChange={e => setVendedorFilter(e.target.value)}
                    style={{ backgroundRepeat: 'no-repeat', backgroundSize: '1rem', backgroundPosition: 'right 0.75rem center', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                  >
                    <option value="all" className="bg-slate-950 text-slate-200">Todos los Vendedores</option>
                    {platformUsers.map(u => (
                      <option key={u.id} value={u.id} className="bg-slate-950 text-slate-200">{u.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {agentTransactionStats && (
            <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl mb-6">
              <div className="p-6 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white uppercase tracking-widest">{currentPeriodText}</h3>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800">
                      <th className="py-3 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center w-10">#</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Ejecutivo Comercial</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Moneda</th>
                      <th className="py-3 px-4 text-xs font-bold text-amber-500 uppercase tracking-widest text-right">Pendientes Envío</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">En proceso</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Procesado</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Pagado</th>
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
                        <td colSpan={7} className="py-8 text-center text-slate-500 italic text-sm">
                          No hay ejecutivos comerciales registrados o en proceso.
                        </td>
                      </tr>
                    ) : (
                      agentTransactionStats.map((stat, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-2 text-[10px] font-mono text-slate-500 text-center select-none w-10">{idx + 1}</td>
                          <td className="py-3 px-4 text-xs text-white font-bold">{stat.name}</td>
                          <td className="py-3 px-4 text-xs text-slate-300 text-right">{stat.currency}</td>
                          <td className="py-3 px-4 text-xs text-amber-500 font-extrabold text-right font-mono">
                            {stat.pendientesEnvio}
                          </td>
                          <td className="py-3 px-4 text-xs text-emerald-400 font-bold text-right">
                            {stat.currency === 'EURO' ? '€' : '$'}{stat.totalProceso.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-xs text-blue-400 font-bold text-right">
                            {stat.currency === 'EURO' ? '€' : '$'}{stat.totalProcesado.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-xs text-indigo-400 font-bold text-right">
                            {stat.currency === 'EURO' ? '€' : '$'}{stat.totalPagado.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {agentTransactionStats.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-950/70 border-t border-slate-800 font-bold">
                        <td className="py-4 px-2"></td>
                        <td className="py-4 px-4 text-xs text-slate-400 uppercase tracking-widest">TOTAL ACUMULADO (ADMIN)</td>
                        <td className="py-4 px-4"></td>
                        <td className="py-4 px-4 text-sm text-amber-500 font-extrabold text-right font-mono">{grandTotalPendientesEnvio}</td>
                        <td className="py-4 px-4 text-right text-xs text-emerald-400 font-mono">
                          ${agentTransactionStats.filter(s => s.currency === 'USD').reduce((sum, s) => sum + s.totalProceso, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {agentTransactionStats.some(s => s.currency === 'EURO') && (
                            <span className="block text-[10px] text-slate-500">
                              €{agentTransactionStats.filter(s => s.currency === 'EURO').reduce((sum, s) => sum + s.totalProceso, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right text-xs text-blue-400 font-mono">
                          ${agentTransactionStats.filter(s => s.currency === 'USD').reduce((sum, s) => sum + s.totalProcesado, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {agentTransactionStats.some(s => s.currency === 'EURO') && (
                            <span className="block text-[10px] text-slate-500">
                              €{agentTransactionStats.filter(s => s.currency === 'EURO').reduce((sum, s) => sum + s.totalProcesado, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right text-xs text-indigo-400 font-mono">
                          ${agentTransactionStats.filter(s => s.currency === 'USD').reduce((sum, s) => sum + s.totalPagado, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {agentTransactionStats.some(s => s.currency === 'EURO') && (
                            <span className="block text-[10px] text-slate-500">
                              €{agentTransactionStats.filter(s => s.currency === 'EURO').reduce((sum, s) => sum + s.totalPagado, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}


    
          <div className="mt-10 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-inner">
                <History size={16} />
              </div>
              <div>
                <h2 className="text-lg font-display font-black text-white tracking-tight">Movimientos</h2>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <button 
                onClick={handleDownloadStatement}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-amber-500/50 text-slate-300 font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm text-[10px]"
              >
                <Download size={14} className="text-amber-500" />
                Descargar Estado de Cuenta
              </button>
            </div>
          </div>

          {/* Filtros Movimientos */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-2 mb-6 flex flex-wrap gap-2 items-center shadow-sm">
            <div className="relative group flex-1 min-w-[120px] xl:flex-none">
              <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
              <select 
                className="w-full xl:w-auto bg-transparent hover:bg-slate-900/50 border border-slate-800/80 rounded-xl pl-10 pr-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer transition-all appearance-none focus:border-amber-500/50"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ backgroundRepeat: 'no-repeat', backgroundSize: '1rem', backgroundPosition: 'right 0.75rem center', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
              >
                <option value="all" className="bg-slate-950 text-slate-200">Todos los Estados</option>
                <option value="En proceso" className="bg-slate-950 text-slate-200">En proceso</option>
                <option value="Procesado" className="bg-slate-950 text-slate-200">Procesado</option>
                <option value="Pagado" className="bg-slate-950 text-slate-200">Pagado</option>
              </select>
            </div>

            <div className="w-px bg-slate-800 hidden xl:block mx-1 my-2"></div>

            <div className="relative group flex-1 xl:flex-none">
              <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
              <select 
                className="w-full xl:w-auto bg-transparent hover:bg-slate-900/50 border border-slate-800/80 rounded-xl pl-10 pr-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer transition-all appearance-none focus:border-amber-500/50"
                value={movYearFilter}
                onChange={e => setMovYearFilter(e.target.value)}
                style={{ backgroundRepeat: 'no-repeat', backgroundSize: '1rem', backgroundPosition: 'right 0.75rem center', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
              >
                <option value="all" className="bg-slate-950 text-slate-200">Año</option>
                {Array.from(new Set(invoices.map(inv => new Date(inv.emissionDate).getFullYear().toString()))).sort().map(year => (
                  <option key={year} value={year} className="bg-slate-950 text-slate-200">{year}</option>
                ))}
                {!invoices.some(inv => new Date(inv.emissionDate).getFullYear().toString() === new Date().getFullYear().toString()) && (
                  <option value={new Date().getFullYear().toString()} className="bg-slate-950 text-slate-200">{new Date().getFullYear()}</option>
                )}
              </select>
            </div>

            <div className="relative group flex-1 xl:flex-none">
              <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
              <select 
                className="w-full xl:w-auto bg-transparent hover:bg-slate-900/50 border border-slate-800/80 rounded-xl pl-10 pr-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer transition-all appearance-none focus:border-amber-500/50"
                value={movMonthFilter}
                onChange={e => setMovMonthFilter(e.target.value)}
                style={{ backgroundRepeat: 'no-repeat', backgroundSize: '1rem', backgroundPosition: 'right 0.75rem center', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
              >
                <option value="all" className="bg-slate-950 text-slate-200">Mes</option>
                {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                  <option key={i} value={i.toString()} className="bg-slate-950 text-slate-200">{m}</option>
                ))}
              </select>
            </div>

            <div className="relative group flex-1 xl:flex-none">
              <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
              <select 
                className="w-full xl:w-auto bg-transparent hover:bg-slate-900/50 border border-slate-800/80 rounded-xl pl-10 pr-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer transition-all appearance-none focus:border-amber-500/50"
                value={movQuincenaFilter}
                onChange={e => setMovQuincenaFilter(e.target.value)}
                style={{ backgroundRepeat: 'no-repeat', backgroundSize: '1rem', backgroundPosition: 'right 0.75rem center', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
              >
                <option value="all" className="bg-slate-950 text-slate-200">Quincena</option>
                <option value="1" className="bg-slate-950 text-slate-200">Q1 (1-15)</option>
                <option value="2" className="bg-slate-950 text-slate-200">Q2 (16-31)</option>
              </select>
            </div>

            {user?.roleId === 'ADMIN_MAESTRO' && (
              <div className="relative group flex-1 xl:flex-none">
                <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                <select 
                  className="w-full xl:w-auto bg-transparent hover:bg-slate-900/50 border border-slate-800/80 rounded-xl pl-10 pr-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer transition-all appearance-none focus:border-amber-500/50"
                  value={movVendedorFilter}
                  onChange={e => setMovVendedorFilter(e.target.value)}
                  style={{ backgroundRepeat: 'no-repeat', backgroundSize: '1rem', backgroundPosition: 'right 0.75rem center', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                >
                  <option value="all" className="bg-slate-950 text-slate-200">Todos los Vendedores</option>
                  {platformUsers.map(u => (
                    <option key={u.id} value={u.id} className="bg-slate-950 text-slate-200">{u.fullName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {user?.roleId === 'ADMIN_MAESTRO' && selectedEarnings.length > 0 && (
             <div className="mb-6 flex justify-end">
                <button 
                    onClick={requestBulkPay}
                    className="bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-500 font-bold uppercase tracking-widest px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm text-[10px]"
                >
                    <CheckCircle2 size={16} />
                    Confirmar Pago ({selectedEarnings.length})
                </button>
             </div>
          )}

          <div className="bg-slate-950/50 border border-slate-800 shadow-xl rounded-2xl overflow-hidden mb-10">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50">
                    {user?.roleId === 'ADMIN_MAESTRO' && (
                       <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-12">
                         <input type="checkbox" onChange={toggleAllEarnings} checked={selectedEarnings.length > 0 && selectedEarnings.length === filteredEarnings.filter(e => e.status === 'En proceso' || e.status === 'Procesado').length} className="w-4 h-4 accent-emerald-500 cursor-pointer bg-slate-800 border-slate-700 rounded" />
                       </th>
                    )}
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-10">#</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Vendedor</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Concepto</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Comisión</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Estado</th>
                    {user?.roleId === 'ADMIN_MAESTRO' && (
                       <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {isTableLoading ? (
                    <tr>
                      <td colSpan={10} className="py-8">
                        <TableLoader />
                      </td>
                    </tr>
                  ) : currentItems.length > 0 ? currentItems.map((e, idx) => {
                    const seller = platformUsers.find(u => u.id === e.userId);
                    return (
                        <motion.tr 
                        key={e.id} 
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group"
                        >
                          {user?.roleId === 'ADMIN_MAESTRO' && (
                             <td className="p-4 text-center">
                              {(e.status === 'En proceso' || e.status === 'Procesado') && (
                                <input type="checkbox" checked={selectedEarnings.includes(e.id)} onChange={() => toggleEarningSelection(e.id)} className="w-4 h-4 accent-emerald-500 cursor-pointer bg-slate-800 border-slate-700 rounded" />
                              )}
                             </td>
                          )}
                          <td className="p-4 text-[10px] font-mono text-slate-500 text-center select-none w-10">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                          <td className="p-4 text-xs text-slate-300 font-medium">
                            <div className="flex flex-col">
                              <span>{new Date(e.date).toLocaleDateString()}</span>
                              <span className="text-[10px] text-slate-500">{new Date(e.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </td>
                          <td className="p-4 text-xs text-slate-200">{seller?.fullName || 'Desconocido'}</td>
                          <td className="p-4">
                            <div className="text-xs text-white font-medium">Comisión a las ventas</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Factura: {filteredInvoices.find(inv => inv.id === e.invoiceId)?.invoiceNumber || e.invoiceId}</div>
                          </td>
                          <td className="p-4 text-right font-mono text-xs text-emerald-400 font-bold">
                            {(() => {
                              const busOrCli = clientes.find(c => c.id === e.businessId) || businesses.find(b => b.id === e.businessId);
                              const currency = (busOrCli as any)?.currency || 'USD';
                              return `${currency === 'EURO' ? '€' : '$'} ${safeToLocaleString(e.amount)} ${currency}`;
                            })()}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest ${
                              e.status === 'Pagado' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                              e.status === 'Procesado' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                              'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {e.status}
                            </span>
                          </td>
                          {user?.roleId === 'ADMIN_MAESTRO' && (
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {e.status === 'En proceso' && (
                                  <button 
                                    onClick={() => requestSingleProcess(e.id)}
                                    className="bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500 hover:border-blue-500 text-blue-500 hover:text-slate-950 p-1.5 rounded-lg transition-all"
                                    title="Marcar como Procesado"
                                  >
                                    <Banknote size={14} />
                                  </button>
                                )}
                                {(e.status === 'En proceso' || e.status === 'Procesado') && (
                                  <button 
                                    onClick={() => requestSinglePay(e.id)}
                                    className="bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:border-emerald-500 text-emerald-500 hover:text-slate-950 p-1.5 rounded-lg transition-all"
                                    title="Marcar como Pagado"
                                  >
                                    <CheckCircle2 size={14} />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDeleteEarning(e.id)}
                                  className="bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:border-red-500 text-red-500 hover:text-slate-950 p-1.5 rounded-lg transition-all ml-1"
                                  title="Eliminar comisión"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          )}
                        </motion.tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={user?.roleId === 'ADMIN_MAESTRO' ? 8 : 6} className="p-10 text-center text-slate-500 text-xs font-semibold uppercase tracking-widest">
                        No hay movimientos registrados
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

      {/* Request Payment Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-black text-white">Solicitar Pago</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Retirar saldo disponible</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRequestPayment} className="p-6 space-y-5">
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Saldo Disponible</div>
                    <div className="text-2xl font-display font-black text-emerald-500">$ {safeToLocaleString(availableBalance)}</div>
                  </div>
                  <div className="text-emerald-500/20">
                    <TrendingUp size={32} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Monto a Solicitar</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      value={requestAmount}
                      onChange={(e) => setRequestAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nota (Opcional)</label>
                  <textarea 
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    placeholder="Detalles adicionales sobre el retiro..."
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all text-sm h-24 resize-none"
                  />
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase"
                  >
                    <AlertCircle size={14} />
                    {error}
                  </motion.div>
                )}

                <button 
                  type="submit"
                  disabled={isSubmitting || parseFloat(requestAmount) <= 0 || parseFloat(requestAmount) > availableBalance}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-500/20"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={18} />
                      Enviar Solicitud
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isInvoiceModalOpen && (
          <InvoiceForm 
            onClose={() => setIsInvoiceModalOpen(false)}
            onSubmit={handleCreateInvoice}
            clients={clientes}
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
      </AnimatePresence>

      <AnimatePresence>
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
        {isConfirmProcessModalOpen && (
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
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
              
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 mx-auto">
                <CheckCircle2 size={32} />
              </div>

              <h3 className="text-lg font-bold text-white mb-2 text-center">Confirmar proceso</h3>
              <p className="text-slate-400 text-sm mb-6 text-center">
                ¿Estás seguro de que deseas marcar este pago como <strong>Procesado</strong>?
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setIsConfirmProcessModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmProcess}
                  className="px-4 py-2 rounded-xl font-bold text-slate-950 bg-blue-500 hover:bg-blue-400 transition-colors text-sm"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {isConfirmPayModalOpen && (
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
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
              
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6 mx-auto">
                <CheckCircle2 size={32} />
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-xl font-display font-black text-white tracking-tight mb-2">
                  Confirmar Pago
                </h3>
                <p className="text-slate-400 text-sm font-medium">
                  {confirmPayTarget 
                    ? "¿Estás seguro de que deseas marcar esta comisión como pagada?"
                    : `¿Estás seguro de que deseas marcar ${selectedEarnings.length} comisiones como pagadas?`
                  }
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsConfirmPayModalOpen(false)}
                  className="flex-1 py-3 bg-slate-800 text-slate-400 font-black uppercase tracking-widest rounded-2xl hover:text-white transition-all text-[10px]"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={confirmPay}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all text-[10px]"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
