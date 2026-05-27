-- SQL Schema for provisioning Supabase Database for Plataforma CapiBee
-- Copy and run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/rmfiorgvfqucstiiwitg/sql)

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at BIGINT NOT NULL
);

-- 2. PLATFORM USERS TABLE
CREATE TABLE IF NOT EXISTS platform_users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    role_id TEXT REFERENCES roles(id) ON DELETE SET NULL,
    role_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    avatar TEXT,
    created_at BIGINT NOT NULL
);

-- 3. CUSTOM CLIENTS TABLE
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'Empresa',
    company_name TEXT,
    contact_name TEXT,
    email TEXT,
    language TEXT DEFAULT 'Español',
    currency TEXT DEFAULT 'USD',
    country TEXT,
    address TEXT,
    sector TEXT,
    phone TEXT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()) * 1000)::BIGINT,
    user_id TEXT REFERENCES platform_users(id) ON DELETE SET NULL
);

-- 4. BUSINESSES & ESTABLISHMENTS TABLE (WITH AGENTS)
CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    whatsapp TEXT,
    contact_name TEXT,
    user_id TEXT REFERENCES platform_users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Nuevo',
    prefix TEXT,
    responsible_name TEXT,
    responsible_phone TEXT,
    email TEXT,
    website TEXT,
    rating NUMERIC,
    city TEXT,
    state TEXT,
    country TEXT,
    contact_phone TEXT,
    branch_name TEXT,
    image_url TEXT,
    meeting_date TEXT,
    description TEXT,
    is_establishment BOOLEAN DEFAULT FALSE,
    agents JSONB DEFAULT '[]'::jsonb, -- Array of Agent structures inside
    notes JSONB DEFAULT '[]'::jsonb, -- Array of {date, text, authorName}
    memory_files JSONB DEFAULT '[]'::jsonb, -- Array of files
    created_at BIGINT NOT NULL
);

-- 5. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    invoice_number TEXT UNIQUE NOT NULL,
    business_id TEXT, -- simple text to support references to either businesses or clients without strict FK violation
    business_name TEXT NOT NULL,
    service TEXT DEFAULT '', -- for legacy support
    quantity INTEGER DEFAULT 1,
    price_usd NUMERIC DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb, -- Array of InvoiceItem
    tax NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'Efectivo',
    emission_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    note TEXT DEFAULT '',
    payments JSONB DEFAULT '[]'::jsonb, -- Array of payment records
    paid_amount NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDIENTE',
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()) * 1000)::BIGINT
);

-- 6. AGENT EARNINGS TABLE (COMISIONES)
CREATE TABLE IF NOT EXISTS agent_earnings (
    id TEXT PRIMARY KEY,
    amount NUMERIC NOT NULL,
    date TEXT NOT NULL,
    business_id TEXT, -- references either businesses or clients without strict FK
    business_name TEXT NOT NULL,
    invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('En proceso', 'Pagado', 'Procesado')),
    user_id TEXT REFERENCES platform_users(id) ON DELETE SET NULL
);

-- 7. WITHDRAWAL REQUESTS TABLE (RETIROS)
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id TEXT PRIMARY KEY,
    amount NUMERIC NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('En proceso', 'Pagado', 'Rechazado')),
    user_id TEXT REFERENCES platform_users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    note TEXT
);

-- 8. SOLICITUDES TABLE (FORMULARIO B2B)
CREATE TABLE IF NOT EXISTS solicitudes (
    id TEXT PRIMARY KEY,
    company_name TEXT,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    channel TEXT,
    type TEXT,
    prompt TEXT,
    status TEXT DEFAULT 'Requerido',
    created_at BIGINT NOT NULL
);

-- 9. COMISIONES DE EJECUTIVOS (MOVIMIENTOS DE COMISIONES)
CREATE TABLE IF NOT EXISTS comisiones_ejecutivos (
    id TEXT PRIMARY KEY,
    ejecutivo_id TEXT REFERENCES platform_users(id) ON DELETE CASCADE,
    ejecutivo_name TEXT NOT NULL,
    invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    client_business_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'EURO')),
    status TEXT NOT NULL DEFAULT 'En proceso' CHECK (status IN ('En proceso', 'Procesado', 'Pagado')),
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()) * 1000)::BIGINT,
    confirmed_at BIGINT,
    paid_at BIGINT,
    period_text TEXT -- Ej: `2026-05 Q2` para la segunda quincena de mayo 2026
);

-- 10. ASUNTOS TABLE
CREATE TABLE IF NOT EXISTS asuntos (
    id TEXT PRIMARY KEY,
    fecha TEXT NOT NULL,
    nombre_asunto TEXT NOT NULL,
    business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES platform_users(id) ON DELETE SET NULL,
    datos_asunto TEXT,
    archivo_adjunto_url TEXT,
    sector TEXT,
    destinatario TEXT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()) * 1000)::BIGINT
);

-- 11. PROPUESTAS TABLE
CREATE TABLE IF NOT EXISTS propuestas (
    id TEXT PRIMARY KEY,
    asunto_id TEXT REFERENCES asuntos(id) ON DELETE CASCADE,
    propuesta_texto TEXT,
    honorarios NUMERIC DEFAULT 0,
    gastos NUMERIC DEFAULT 0,
    user_id TEXT REFERENCES platform_users(id) ON DELETE SET NULL,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()) * 1000)::BIGINT,
    status TEXT NOT NULL DEFAULT 'Enviada',
    pdf_url TEXT,
    pdf_name TEXT
);

-- Add to Realtime Publication safely (enables live sync in frontend)
-- We use an idempotent PL/pgSQL block to only add tables that are not already in the publication.
DO $$
BEGIN
  -- add solicitudes
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    JOIN pg_publication p ON pr.prpubid = p.oid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'solicitudes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE solicitudes;
  END IF;

  -- add roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    JOIN pg_publication p ON pr.prpubid = p.oid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'roles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE roles;
  END IF;

  -- add platform_users
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    JOIN pg_publication p ON pr.prpubid = p.oid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'platform_users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE platform_users;
  END IF;

  -- add businesses
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    JOIN pg_publication p ON pr.prpubid = p.oid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'businesses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE businesses;
  END IF;

  -- add clients
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    JOIN pg_publication p ON pr.prpubid = p.oid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'clients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE clients;
  END IF;

  -- add comisiones_ejecutivos
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    JOIN pg_publication p ON pr.prpubid = p.oid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'comisiones_ejecutivos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE comisiones_ejecutivos;
  END IF;

  -- add asuntos
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    JOIN pg_publication p ON pr.prpubid = p.oid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'asuntos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE asuntos;
  END IF;

  -- add propuestas
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    JOIN pg_publication p ON pr.prpubid = p.oid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'propuestas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE propuestas;
  END IF;
END $$;

-- Enable Row Level Security (RLS) on all live tables
ALTER TABLE solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE comisiones_ejecutivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE asuntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE propuestas ENABLE ROW LEVEL SECURITY;

-- 1. SOLICITUDES POLICIES
DROP POLICY IF EXISTS "Allow anon insert on solicitudes" ON solicitudes;
DROP POLICY IF EXISTS "Allow select on solicitudes" ON solicitudes;
DROP POLICY IF EXISTS "Allow update on solicitudes" ON solicitudes;
DROP POLICY IF EXISTS "Allow delete on solicitudes" ON solicitudes;

CREATE POLICY "Allow anon insert on solicitudes" ON solicitudes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow select on solicitudes" ON solicitudes FOR SELECT TO public USING (true);
CREATE POLICY "Allow update on solicitudes" ON solicitudes FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete on solicitudes" ON solicitudes FOR DELETE TO public USING (true);

-- 2. ROLES POLICIES
DROP POLICY IF EXISTS "Allow select on roles" ON roles;
DROP POLICY IF EXISTS "Allow insert on roles" ON roles;
DROP POLICY IF EXISTS "Allow update on roles" ON roles;
DROP POLICY IF EXISTS "Allow delete on roles" ON roles;

CREATE POLICY "Allow select on roles" ON roles FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert on roles" ON roles FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update on roles" ON roles FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete on roles" ON roles FOR DELETE TO public USING (true);

-- 3. PLATFORM USERS POLICIES
DROP POLICY IF EXISTS "Allow select on platform_users" ON platform_users;
DROP POLICY IF EXISTS "Allow insert on platform_users" ON platform_users;
DROP POLICY IF EXISTS "Allow update on platform_users" ON platform_users;
DROP POLICY IF EXISTS "Allow delete on platform_users" ON platform_users;

CREATE POLICY "Allow select on platform_users" ON platform_users FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert on platform_users" ON platform_users FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update on platform_users" ON platform_users FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete on platform_users" ON platform_users FOR DELETE TO public USING (true);

-- 4. BUSINESSES POLICIES (Llamar Empresas / Leads)
DROP POLICY IF EXISTS "Allow select on businesses" ON businesses;
DROP POLICY IF EXISTS "Allow insert on businesses" ON businesses;
DROP POLICY IF EXISTS "Allow update on businesses" ON businesses;
DROP POLICY IF EXISTS "Allow delete on businesses" ON businesses;

CREATE POLICY "Allow select on businesses" ON businesses FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert on businesses" ON businesses FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update on businesses" ON businesses FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete on businesses" ON businesses FOR DELETE TO public USING (true);

-- 5. CLIENTS POLICIES (Clientes Registrados)
DROP POLICY IF EXISTS "Allow select on clients" ON clients;
DROP POLICY IF EXISTS "Allow insert on clients" ON clients;
DROP POLICY IF EXISTS "Allow update on clients" ON clients;
DROP POLICY IF EXISTS "Allow delete on clients" ON clients;

CREATE POLICY "Allow select on clients" ON clients FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert on clients" ON clients FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update on clients" ON clients FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete on clients" ON clients FOR DELETE TO public USING (true);


-- 6. INVOICES POLICIES (Facturas y Cobros)
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_business_id_fkey;

DROP POLICY IF EXISTS "Allow select on invoices" ON invoices;
DROP POLICY IF EXISTS "Allow insert on invoices" ON invoices;
DROP POLICY IF EXISTS "Allow update on invoices" ON invoices;
DROP POLICY IF EXISTS "Allow delete on invoices" ON invoices;

CREATE POLICY "Allow select on invoices" ON invoices FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert on invoices" ON invoices FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update on invoices" ON invoices FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete on invoices" ON invoices FOR DELETE TO public USING (true);

-- 7. AGENT EARNINGS POLICIES (Comisiones de Vendedores)
ALTER TABLE agent_earnings DROP CONSTRAINT IF EXISTS agent_earnings_business_id_fkey;

DROP POLICY IF EXISTS "Allow select on agent_earnings" ON agent_earnings;
DROP POLICY IF EXISTS "Allow insert on agent_earnings" ON agent_earnings;
DROP POLICY IF EXISTS "Allow update on agent_earnings" ON agent_earnings;
DROP POLICY IF EXISTS "Allow delete on agent_earnings" ON agent_earnings;

CREATE POLICY "Allow select on agent_earnings" ON agent_earnings FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert on agent_earnings" ON agent_earnings FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update on agent_earnings" ON agent_earnings FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete on agent_earnings" ON agent_earnings FOR DELETE TO public USING (true);

-- 8. WITHDRAWAL REQUESTS POLICIES (Solicitudes de Retiros)
DROP POLICY IF EXISTS "Allow select on withdrawal_requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Allow insert on withdrawal_requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Allow update on withdrawal_requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Allow delete on withdrawal_requests" ON withdrawal_requests;

CREATE POLICY "Allow select on withdrawal_requests" ON withdrawal_requests FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert on withdrawal_requests" ON withdrawal_requests FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update on withdrawal_requests" ON withdrawal_requests FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete on withdrawal_requests" ON withdrawal_requests FOR DELETE TO public USING (true);

-- 9. COMISIONES EJECUTIVOS POLICIES
DROP POLICY IF EXISTS "Allow select on comisiones_ejecutivos" ON comisiones_ejecutivos;
DROP POLICY IF EXISTS "Allow insert on comisiones_ejecutivos" ON comisiones_ejecutivos;
DROP POLICY IF EXISTS "Allow update on comisiones_ejecutivos" ON comisiones_ejecutivos;
DROP POLICY IF EXISTS "Allow delete on comisiones_ejecutivos" ON comisiones_ejecutivos;

CREATE POLICY "Allow select on comisiones_ejecutivos" ON comisiones_ejecutivos FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert on comisiones_ejecutivos" ON comisiones_ejecutivos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update on comisiones_ejecutivos" ON comisiones_ejecutivos FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete on comisiones_ejecutivos" ON comisiones_ejecutivos FOR DELETE TO public USING (true);

-- 10. ASUNTOS POLICIES
DROP POLICY IF EXISTS "Allow select on asuntos" ON asuntos;
DROP POLICY IF EXISTS "Allow insert on asuntos" ON asuntos;
DROP POLICY IF EXISTS "Allow update on asuntos" ON asuntos;
DROP POLICY IF EXISTS "Allow delete on asuntos" ON asuntos;

CREATE POLICY "Allow select on asuntos" ON asuntos FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert on asuntos" ON asuntos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update on asuntos" ON asuntos FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete on asuntos" ON asuntos FOR DELETE TO public USING (true);


-- 11. PROPUESTAS POLICIES (Propuestas de Asuntos)
DROP POLICY IF EXISTS "Allow select on propuestas" ON propuestas;
DROP POLICY IF EXISTS "Allow insert on propuestas" ON propuestas;
DROP POLICY IF EXISTS "Allow update on propuestas" ON propuestas;
DROP POLICY IF EXISTS "Allow delete on propuestas" ON propuestas;

CREATE POLICY "Allow select on propuestas" ON propuestas FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert on propuestas" ON propuestas FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update on propuestas" ON propuestas FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete on propuestas" ON propuestas FOR DELETE TO public USING (true);


-- INITIAL SEED DATA FOR ADMIN_MAESTRO ROLE (Super Administrador)
INSERT INTO roles (id, name, description, permissions, created_at)
VALUES ('ADMIN_MAESTRO', 'Super Administrador', 'Acceso completo e incondicional a todos los módulos del sistema.', '{
  "dashboard": {"view": true, "create": true, "edit": true, "delete": true, "active": true},
  "agentes": {"view": true, "create": true, "edit": true, "delete": true, "active": true},
  "clientes": {"view": true, "create": true, "edit": true, "delete": true, "active": true},
  "ganancias": {"view": true, "create": true, "edit": true, "delete": true, "active": true},
  "roles": {"view": true, "create": true, "edit": true, "delete": true, "active": true},
  "finanzas": {"view": true, "create": true, "edit": true, "delete": true, "active": true},
  "contabilidad": {"view": true, "create": true, "edit": true, "delete": true, "active": true}
}'::jsonb, 1716260000000)
ON CONFLICT (id) DO NOTHING;

-- CREATE INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_agent_earnings_user_id ON agent_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_users_role_id ON platform_users(role_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_ejecutivos_id ON comisiones_ejecutivos(ejecutivo_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_ejecutivos_status ON comisiones_ejecutivos(status);


-- SEED DATA FOR ADDITIONAL ROLES (EJECUTIVO COMERCIAL)
INSERT INTO roles (id, name, description, permissions, created_at)
VALUES ('ROL-89WD', 'Ejecutivo Comercial', 'Acceso para gestionar leads asignados, llamadas y facturación comercial.', '{
  "dashboard": {"view": true, "create": true, "edit": true, "delete": false, "active": true},
  "agentes": {"view": false, "create": false, "edit": false, "delete": false, "active": false},
  "clientes": {"view": true, "create": true, "edit": true, "delete": false, "active": true},
  "ganancias": {"view": true, "create": false, "edit": false, "delete": false, "active": true},
  "roles": {"view": false, "create": false, "edit": false, "delete": false, "active": false},
  "finanzas": {"view": false, "create": false, "edit": false, "delete": false, "active": false},
  "contabilidad": {"view": false, "create": false, "edit": false, "delete": false, "active": false}
}'::jsonb, 1716260000000)
ON CONFLICT (id) DO NOTHING;


-- SEED DATA FOR KEY PLATFORM USERS (SUPERADMIN & EJECUTIVO COMERCIAL LOGIN)
INSERT INTO platform_users (id, full_name, role_id, role_name, email, password, avatar, created_at)
VALUES (
    'admin_real_01', 
    'Super Administrador CapiBee', 
    'ADMIN_MAESTRO', 
    'Super Administrador', 
    'capibee.ia@gmail.com', 
    '1$alome$0', 
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 
    1716260000000
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO platform_users (id, full_name, role_id, role_name, email, password, avatar, created_at)
VALUES (
    'USR-VQVQ', 
    'Cesar David Orozco Mariño', 
    'ROL-89WD', 
    'Ejecutivo Comercial', 
    'cesardavid.orozco@gmail.com', 
    '123456', 
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 
    1716260000000
)
ON CONFLICT (id) DO NOTHING;

