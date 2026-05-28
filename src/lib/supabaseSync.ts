import { supabase } from './supabase';

export interface SyncStatus {
  connected: boolean;
  message: string;
  tables: Record<string, boolean>;
}

// Check database connection and verify if tables from the schema exist
export async function testSupabaseConnection(): Promise<SyncStatus> {
  const status: SyncStatus = {
    connected: false,
    message: 'No conectado',
    tables: {
      Roles: false,
      Usuarios: false,
      Clientes: false,
      Directorio: false,
      Facturas: false,
      Comisiones: false,
      Withdrawal_requests: false,
      Solicitudes: false,
      Propuestas: false,
      Asuntos: false,
      Agentes: false,
    },
  };

  try {
    // 1. Try a basic fetch to check API heartbeat
    const { data: dbTest, error: dbError } = await supabase.from('Roles').select('id').limit(1);
    
    if (dbError) {
      if (dbError.code === 'PGRST116' || dbError.code === '42P01') {
        // Connected but table 'Roles' does not exist yet (requires running schema)
        status.connected = true;
        status.message = 'Conectado a la API de Supabase, pero falta añadir las tablas. Ejecute la pestaña de "Crear Tablas" o el script SQL.';
        return status;
      }
      throw dbError;
    }

    status.connected = true;
    status.tables.Roles = true;
    status.message = 'Conexión totalmente exitosa y operativa.';

    // Check availability of other tables
    const checkTable = async (name: string): Promise<boolean> => {
      const { error } = await supabase.from(name).select('*').limit(1);
      return !error;
    };

    const tableNames = [
      'Usuarios',
      'Clientes',
      'Directorio',
      'Facturas',
      'Comisiones',
      'Withdrawal_requests',
      'Solicitudes',
      'Propuestas',
      'Asuntos',
      'Agentes'
    ];

    const results = await Promise.all(tableNames.map(checkTable));
    tableNames.forEach((n, i) => {
      status.tables[n] = results[i];
    });

  } catch (error: any) {
    console.error('Error testing Supabase connection:', error);
    status.connected = false;
    status.message = `Fallo en la conexión: ${error.message || 'Error de red o clave inválida'}`;
  }

  return status;
}

// Push all localStorage data up into Supabase database tables!
export async function pushAllLocalDataToSupabase(): Promise<{ success: boolean; detail: string }> {
  try {
    // 1. Fetch current local data
    const localRoles = JSON.parse(localStorage.getItem('capibee_platform_roles') || '[]');
    const localUsers = JSON.parse(localStorage.getItem('capibee_platform_users') || '[]');
    const localClients = JSON.parse(localStorage.getItem('capibee_clientes') || '[]');
    const localBusinesses = JSON.parse(localStorage.getItem('capibee_businesses') || '[]');
    const localInvoices = JSON.parse(localStorage.getItem('capibee_invoices') || '[]');
    const localEarnings = JSON.parse(localStorage.getItem('capibee_agent_earnings') || '[]');
    const localWithdrawals = JSON.parse(localStorage.getItem('capibee_withdrawals') || '[]');
    const localSolicitudes = JSON.parse(localStorage.getItem('capibee_solicitudes') || '[]');
    const localPropuestas = JSON.parse(localStorage.getItem('capibee_propuestas') || '[]');

    // 2. Clear & insert Roles
    if (localRoles.length > 0) {
      const mappedRoles = localRoles.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        permissions: r.permissions || {},
        created_at: r.createdAt || Date.now()
      }));
      const { error } = await supabase.from('Roles').upsert(mappedRoles, { onConflict: 'id' });
      if (error) throw new Error(`Roles Upload failed: ${error.message}`);
    }

    // 3. Clear & insert Users
    if (localUsers.length > 0) {
      const mappedUsers = localUsers.map((u: any) => ({
        id: u.id,
        full_name: u.fullName,
        role_id: u.roleId,
        role_name: u.roleName,
        email: u.email,
        password: u.password || '',
        avatar: u.avatar || '',
        created_at: u.createdAt || Date.now()
      }));
      const { error } = await supabase.from('Usuarios').upsert(mappedUsers, { onConflict: 'id' });
      if (error) throw new Error(`Platform Users Upload failed: ${error.message}`);
    }

    // 4. Clients
    if (localClients.length > 0) {
      const mappedClients = localClients.map((c: any) => ({
        id: c.id,
        type: c.type || 'Particular',
        company_name: c.companyName || '',
        contact_name: c.contactName,
        email: c.email && c.email.trim() !== '' ? c.email.trim() : null,
        language: c.language || 'Español',
        currency: c.currency || 'USD',
        country: c.country || '',
        address: c.address || '',
        sector: c.sector || '',
        phone: c.phone || '',
        created_at: c.createdAt || Date.now(),
        user_id: c.userId || null
      }));
      const { error } = await supabase.from('Clientes').upsert(mappedClients, { onConflict: 'id' });
      if (error) throw new Error(`Clients Upload failed: ${error.message}`);
    }

    // 5. Businesses
    if (localBusinesses.length > 0) {
      const mappedBusinesses = localBusinesses.map((b: any) => ({
        id: b.id,
        name: b.name,
        category: b.category,
        address: b.address || '',
        phone: b.phone || '',
        whatsapp: b.whatsapp || '',
        contact_name: b.contactName || '',
        user_id: b.userId || null,
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
        created_at: b.createdAt || Date.now()
      }));
      const { error } = await supabase.from('Directorio').upsert(mappedBusinesses, { onConflict: 'id' });
      if (error) throw new Error(`Businesses Upload failed: ${error.message}`);
    }

    // 6. Invoices
    if (localInvoices.length > 0) {
      const mappedInvoices = localInvoices.map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        business_id: inv.businessId,
        business_name: inv.businessName,
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
      }));
      const { error } = await supabase.from('Facturas').upsert(mappedInvoices, { onConflict: 'id' });
      if (error) throw new Error(`Invoices Upload failed: ${error.message}`);
    }

    // 7. Agent Earnings
    if (localEarnings.length > 0) {
      const mappedEarnings = localEarnings.map((e: any) => ({
        id: e.id,
        amount: e.amount,
        date: e.date,
        business_id: e.businessId,
        business_name: e.businessName,
        invoice_id: e.invoiceId,
        status: e.status || 'En proceso',
        user_id: e.userId || null
      }));
      const { error } = await supabase.from('Comisiones').upsert(mappedEarnings, { onConflict: 'id' });
      if (error) throw new Error(`Comisiones Upload failed: ${error.message}`);
    }

    // 8. Withdrawals
    if (localWithdrawals.length > 0) {
      const mappedWithdrawals = localWithdrawals.map((w: any) => ({
        id: w.id,
        amount: w.amount,
        date: w.date,
        status: w.status,
        user_id: w.userId,
        user_name: w.userName,
        user_email: w.userEmail,
        note: w.note || ''
      }));
      const { error } = await supabase.from('Withdrawal_requests').upsert(mappedWithdrawals, { onConflict: 'id' });
      if (error) throw new Error(`Retiros Upload failed: ${error.message}`);
    }

    // 9. Solicitudes
    if (localSolicitudes.length > 0) {
      const mappedSolicitudes = localSolicitudes.map((s: any) => {
        let ts = Date.now();
        if (s.createdAt) {
          const parsed = new Date(s.createdAt).getTime();
          if (!isNaN(parsed)) {
            ts = parsed;
          } else if (typeof s.createdAt === 'number') {
            ts = s.createdAt;
          }
        }
        
        return {
          id: s.id,
          company_name: s.ciudad || s.companyName || '',
          contact_name: s.nombre || s.contactName || '',
          email: s.correo || s.email || '',
          phone: s.whatsapp || s.phone || '',
          channel: (s.idiomas && Array.isArray(s.idiomas)) ? s.idiomas.join(', ') : (s.channel || ''),
          type: s.pais || s.type || '',
          prompt: s.otroIdioma || s.prompt || '',
          status: s.status || 'En revisión',
          created_at: ts
        };
      });
      const { error } = await supabase.from('Solicitudes').upsert(mappedSolicitudes, { onConflict: 'id' });
      if (error) throw new Error(`Formularios B2B Upload failed: ${error.message}`);
    }

    // 10. Propuestas
    if (localPropuestas.length > 0) {
      const mappedPropuestas = localPropuestas.map((p: any) => ({
        id: p.id,
        asunto_id: p.asuntoId,
        propuesta_texto: p.propuestaTexto,
        honorarios: p.honorarios,
        gastos: p.gastos,
        user_id: p.userId,
        created_at: p.createdAt || Date.now(),
        status: p.status || 'Enviada',
        pdf_url: p.pdfUrl || null,
        pdf_name: p.pdfName || null
      }));
      // Safe to upsert? If table is missing, it will throw, but it shouldn't if we handle it
      const { error } = await supabase.from('Propuestas').upsert(mappedPropuestas, { onConflict: 'id' });
      if (error && error.code !== '42P01') throw new Error(`Propuestas Upload failed: ${error.message}`);
    }

    return { success: true, detail: 'Todos los datos locales han sido guardados en la base de datos real de Supabase.' };
  } catch (err: any) {
    console.error('Push data error:', err);
    return { success: false, detail: err.message || 'Error desconocido al subir los datos.' };
  }
}

// Pull all data down from Supabase database tables into localStorage!
export async function pullAllRemoteDataFromSupabase(): Promise<{ success: boolean; detail: string }> {
  try {
    // 1. Pull Roles
    const { data: dbRoles, error: rolesErr } = await supabase.from('Roles').select('*');
    if (rolesErr) throw rolesErr;
    if (dbRoles) {
      const mapped = dbRoles.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions,
        createdAt: r.created_at
      }));
      localStorage.setItem('capibee_platform_roles', JSON.stringify(mapped));
    }

    // 2. Pull Users
    const { data: dbUsers, error: usersErr } = await supabase.from('Usuarios').select('*');
    if (usersErr) throw usersErr;
    if (dbUsers) {
      const mapped = dbUsers.map(u => ({
        id: u.id,
        fullName: u.full_name,
        roleId: u.role_id,
        roleName: u.role_name,
        email: u.email,
        password: u.password,
        avatar: u.avatar,
        createdAt: u.created_at
      }));
      const uniqueMapped = Array.from(new Map(mapped.map(u => [u.id, u])).values());
      localStorage.setItem('capibee_platform_users', JSON.stringify(uniqueMapped));
    }

    // 3. Pull Clients
    const { data: dbClients, error: clientsErr } = await supabase.from('Clientes').select('*');
    if (clientsErr) throw clientsErr;
    if (dbClients) {
      const mapped = dbClients.map(c => ({
        id: c.id,
        type: c.type,
        companyName: c.company_name,
        contactName: c.contact_name,
        email: c.email,
        language: c.language,
        currency: c.currency,
        country: c.country,
        address: c.address,
        sector: c.sector,
        phone: c.phone,
        createdAt: c.created_at,
        userId: c.user_id
      }));
      localStorage.setItem('capibee_clientes', JSON.stringify(mapped));
    }

    // 4. Pull Businesses
    const { data: dbBusinesses, error: busErr } = await supabase.from('Directorio').select('*');
    if (busErr) throw busErr;
    if (dbBusinesses) {
      const mapped = dbBusinesses.map(b => ({
        id: b.id,
        name: b.name,
        category: b.category,
        address: b.address,
        phone: b.phone,
        whatsapp: b.whatsapp,
        contactName: b.contact_name,
        userId: b.user_id,
        status: b.status,
        prefix: b.prefix,
        responsibleName: b.responsible_name,
        responsiblePhone: b.responsible_phone,
        email: b.email,
        website: b.website,
        rating: Number(b.rating),
        city: b.city,
        country: b.country,
        branchName: b.branch_name,
        imageUrl: b.image_url,
        meetingDate: b.meeting_date,
        description: b.description,
        isEstablishment: b.is_establishment,
        agents: b.agents,
        notes: b.notes,
        memoryFiles: b.memory_files,
        createdAt: b.created_at
      }));
      localStorage.setItem('capibee_businesses', JSON.stringify(mapped));
    }

    // 5. Pull Invoices
    const { data: dbInvs, error: invsErr } = await supabase.from('Facturas').select('*');
    if (invsErr) throw invsErr;
    if (dbInvs) {
      const mapped = dbInvs.map(i => ({
        id: i.id,
        invoiceNumber: i.invoice_number,
        businessId: i.business_id,
        businessName: i.business_name,
        service: i.service,
        quantity: i.quantity,
        priceUSD: Number(i.price_usd),
        items: i.items,
        tax: Number(i.tax),
        paymentMethod: i.payment_method,
        emissionDate: i.emission_date,
        dueDate: i.due_date,
        note: i.note,
        payments: i.payments,
        paidAmount: Number(i.paid_amount),
        status: i.status,
        createdAt: i.created_at
      }));
      localStorage.setItem('capibee_invoices', JSON.stringify(mapped));
    }

    // 6. Pull Earnings
    const { data: dbEarnings, error: earnErr } = await supabase.from('Comisiones').select('*');
    if (earnErr) throw earnErr;
    if (dbEarnings) {
      const mapped = dbEarnings.map(e => ({
        id: e.id,
        amount: Number(e.amount),
        date: e.date,
        businessId: e.business_id,
        businessName: e.business_name,
        invoiceId: e.invoice_id,
        status: e.status,
        userId: e.user_id
      }));
      localStorage.setItem('capibee_agent_earnings', JSON.stringify(mapped));
    }

    // 7. Pull Withdrawals
    const { data: dbWithdrawals, error: withErr } = await supabase.from('Withdrawal_requests').select('*');
    if (withErr) throw withErr;
    if (dbWithdrawals) {
      const mapped = dbWithdrawals.map(w => ({
        id: w.id,
        amount: Number(w.amount),
        date: w.date,
        status: w.status,
        userId: w.user_id,
        userName: w.user_name,
        userEmail: w.user_email,
        note: w.note
      }));
      localStorage.setItem('capibee_withdrawals', JSON.stringify(mapped));
    }

    // 8. Pull Solicitudes
    const { data: dbSols, error: solErr } = await supabase.from('Solicitudes').select('*');
    if (solErr) throw solErr;
    if (dbSols) {
      const mapped = dbSols.map(s => {
        let dateStr = new Date().toISOString();
        if (s.created_at) {
          const num = Number(s.created_at);
          if (!isNaN(num)) {
            dateStr = new Date(num).toISOString();
          } else {
            dateStr = String(s.created_at);
          }
        }
        
        return {
          id: s.id,
          nombre: s.contact_name || '',
          correo: s.email || '',
          whatsapp: s.phone || '',
          pais: s.type || '',
          ciudad: s.company_name || '',
          idiomas: s.channel ? s.channel.split(',').map((x: any) => x.trim()).filter(Boolean) : [],
          otroIdioma: s.prompt || '',
          status: s.status || 'En revisión',
          createdAt: dateStr
        };
      });
      localStorage.setItem('capibee_solicitudes', JSON.stringify(mapped));
    }

    // 9. Pull Propuestas
    const { data: dbPropuestas, error: propErr } = await supabase.from('Propuestas').select('*');
    if (propErr && propErr.code !== '42P01') throw propErr;
    if (dbPropuestas) {
      const mapped = dbPropuestas.map(p => ({
        id: p.id,
        asuntoId: p.asunto_id,
        propuestaTexto: p.propuesta_texto,
        honorarios: p.honorarios,
        gastos: p.gastos,
        userId: p.user_id,
        createdAt: Number(p.created_at) || Date.now(),
        status: p.status || 'Enviada',
        pdfUrl: p.pdf_url || "",
        pdfName: p.pdf_name || ""
      }));
      localStorage.setItem('capibee_propuestas', JSON.stringify(mapped));
    }

    return { success: true, detail: 'Todos los datos de la base de datos de Supabase han sido descargados en Almacenamiento Local.' };
  } catch (err: any) {
    console.error('Pull data error:', err);
    return { success: false, detail: err.message || 'Error desconocido al descargar datos desde Supabase.' };
  }
}
