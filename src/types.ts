/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum BusinessCategory {
  RESTAURANT = "Restaurantes y Gastronomía",
  FOOD = "Alimentos y Bebidas",
  RETAIL = "Retail / Comercio",
  SERVICES = "Servicios Profesionales",
  AGENCY = "Agencias (Marketing/Viajes/etc)",
  TECH = "Tecnología y Software",
  HEALTH = "Salud y Bienestar",
  BEAUTY = "Belleza y Cuidado Personal",
  EDUCATION = "Educación y Capacitación",
  HOSPITALITY = "Hotelería y Turismo",
  CONSTRUCTION = "Construcción y Bienes Raíces",
  TRANSPORTATION = "Logística y Transporte",
  FINANCE = "Servicios Financieros",
  ENTERTAINMENT = "Entretenimiento y Ocio",
  OTHER = "Otros",
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  tasks: number;
  efficiency: number;
  status: "Requerido" | "En Desarrollo" | "Pruebas" | "Activo";
  channel: "WhatsApp" | "Telegram";
  contactInfo: string;
  type: string;
  prompt: string;
  notes?: { date: number; text: string; authorName?: string }[];
  training?: string;
  memoryFiles?: { name: string; url: string; size: number; date: number }[];
  rules?: string;
  language?: string;
  createdAt: number;
}

export interface Business {
  id: string;
  name: string;
  category: BusinessCategory;
  address?: string;
  phone?: string;
  whatsapp?: string;
  contactName?: string;
  contactPhone?: string;
  userId?: string; // Assigned Vendedor
  status?:
    | "Nuevo"
    | "Intento 2"
    | "Intento 3"
    | "Volver a llamar"
    | "Buzón de voz"
    | "Núm Equivocado"
    | "No Llamar"
    | "Núm. Erroneo"
    | "Enviar Present."
    | "Present. enviada"
    | "Recordatorio Present."
    | "Reunión programada"
    | "Enviar Propuesta"
    | "Prop. enviada"
    | "Prop. Rechazada"
    | "Prop. Aceptada";
  prefix?: string;
  responsibleName?: string;
  responsiblePhone?: string;
  email?: string;
  website?: string;
  rating?: number;
  city?: string;
  state?: string;
  country?: string;
  branchName?: string;
  imageUrl?: string;
  agents?: Agent[];
  meetingDate?: string;
  createdAt: number;
  notes?: { date: number; text: string; authorName?: string }[];
  description?: string;
  memoryFiles?: { name: string; url: string; size: number; date: number }[];
  isEstablishment?: boolean;
  placeId?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  businessId: string;
  businessName: string;
  service: string; // Keep for backward compatibility or display
  quantity: number; // Keep for backward compatibility or display
  priceUSD: number; // Keep for backward compatibility or display
  items: InvoiceItem[];
  tax: number;
  paymentMethod: string;
  emissionDate: string;
  dueDate: string;
  note?: string;
  createdAt: number;
  payments?: { amount: number; date: string; proofDataUrl?: string; proofName?: string }[];
  paidAmount?: number;
  status?: string;
}

export interface Client {
  id: string;
  type: 'Particular' | 'Empresa';
  companyName?: string;
  contactName: string;
  email: string;
  language: 'Español' | 'Inglés' | 'Portugués' | 'Francés';
  currency: 'USD' | 'EURO';
  country?: string;
  address?: string;
  sector?: string;
  phone?: string;
  createdAt: number;
  userId?: string; // Assigned Vendedor
  city?: string;
  contactPhone?: string;
}

export interface AgentEarning {
  id: string;
  amount: number;
  date: string;
  businessId: string;
  businessName: string;
  invoiceId: string;
  status: 'En proceso' | 'Pagado';
  userId?: string;
}

export interface Propuesta {
  id: string;
  asuntoId: string;
  propuestaTexto: string;
  honorarios: number;
  gastos: number;
  createdAt: number;
  userId: string;
  status?: 'Pendiente' | 'Enviada' | 'Aceptada' | 'Cancelada' | 'Rechazada';
  pdfUrl?: string;
  pdfName?: string;
}

export interface Asunto {
  id: string;
  fecha: string;
  nombreAsunto: string;
  businessId: string;
  userId: string;
  datosAsunto: string;
  archivoAdjuntoUrl?: string;
  createdAt: number;
  contactName?: string;
  contactPhone?: string;
  sector?: string;
  destinatario?: string;
  assignedUserId?: string;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  date: string;
  status: 'En proceso' | 'Pagado' | 'Rechazado';
  userId: string;
  userName: string;
  userEmail: string;
  note?: string;
}

export interface User {
  isAuthenticated: boolean;
  role: "admin" | "guest";
}

export interface ModulePermission {
  create: boolean;
  view: boolean;
  edit: boolean;
  delete: boolean;
  active: boolean;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, ModulePermission>;
  createdAt: number;
}

export interface PlatformUser {
  id: string;
  fullName: string;
  roleId: string;
  roleName: string;
  email: string;
  password?: string;
  avatar?: string;
  createdAt: number;
  status?: 'Activo' | 'Inactivo';
}
