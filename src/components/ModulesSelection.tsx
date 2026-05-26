/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Store, User, Target, PieChart, MessageSquare, LogOut, Bug, Bot, LayoutDashboard, Calculator, Users, TrendingUp, ShieldCheck, Phone, Mail, Database, FileText, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';
import { ModulePermission, User as UserType } from '../types';

interface ModulesSelectionProps {
  onSelectModule: (moduleId: string) => void;
  onLogout: () => void;
  userPermissions?: Record<string, ModulePermission>;
}

const MODULES = [
  {
    id: 'registro_negocios',
    title: 'Directorio',
    description: 'Gestión y administración integral de cuentas y contactos autorizados.',
    icon: Phone,
    active: true,
    color: 'yellow'
  },
  {
    id: 'asuntos',
    title: 'Asuntos',
    description: 'Gestión de asuntos y oportunidades de negocio.',
    icon: FileText,
    active: true,
    color: 'amber'
  },
  {
    id: 'propuestas',
    title: 'Propuestas',
    description: 'Creación, diseño y envío de propuestas comerciales formalizadas para clientes.',
    icon: ClipboardList,
    active: true,
    color: 'yellow'
  },
  {
    id: 'clientes',
    title: 'Clientes',
    description: 'Administración de perfiles de clientes, idiomas y preferencias de divisas.',
    icon: Users,
    active: true,
    color: 'blue'
  },
  {
    id: 'contabilidad',
    title: 'Facturas',
    description: 'Sistema centralizado de facturación, impuestos y seguimiento de pagos.',
    icon: Calculator,
    active: true,
    color: 'emerald'
  },
  {
    id: 'ganancias',
    title: 'Transacciones',
    description: 'Historial detallado de ingresos, facturación y métricas de rentabilidad.',
    icon: TrendingUp,
    active: true,
    color: 'emerald'
  },
  {
    id: 'mis_negocios',
    title: 'Establecimientos',
    description: 'Panel de control y métricas de activos operacionales en tiempo real.',
    icon: Store,
    active: true,
    color: 'amber'
  },
  {
    id: 'agentes',
    title: 'Agentes CapiBee',
    description: 'Creación y gestión de agentes CapiBee para las cuentas corporativas.',
    icon: Bot,
    active: true,
    color: 'blue'
  },
  {
    id: 'usuarios_roles',
    title: 'Usuarios y Roles',
    description: 'Control de accesos, definición de permisos y gestión de equipo de trabajo.',
    icon: ShieldCheck,
    active: true,
    color: 'blue'
  },
  {
    id: 'solicitudes',
    title: 'Formularios',
    description: 'Gestión de formularios de aplicación de ventas B2B y prospectos.',
    icon: Mail,
    active: true,
    color: 'amber'
  },
  {
    id: 'supabase',
    title: 'Backoffice',
    description: 'Gestión y sincronización de base de datos relacional de producción con Supabase.',
    icon: Database,
    active: true,
    color: 'amber'
  },
  {
    id: 'finanzas',
    title: 'KPI\'s',
    description: 'Indicadores clave de rendimiento (KPIs) y análisis de rentabilidad.',
    icon: PieChart,
    active: true,
    color: 'yellow'
  }
];

export default function ModulesSelection({ onSelectModule, onLogout, userPermissions }: ModulesSelectionProps) {
  const [propuestasPorEnviarCount, setPropuestasPorEnviarCount] = useState<number>(0);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('capibee_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        const isAdmin = user?.roleId === 'ADMIN_MAESTRO' || user?.roleName?.toUpperCase() === 'SUPERADMIN' || user?.roleId?.toUpperCase() === 'SUPERADMIN';
        const savedAsuntos = JSON.parse(localStorage.getItem('capibee_asuntos') || '[]');
        const savedPropuestas = JSON.parse(localStorage.getItem('capibee_propuestas') || '[]');
        let count = 0;
        savedAsuntos.forEach((a: any) => {
          if (!isAdmin && a.userId !== user?.id) return;
          const hasPropuesta = savedPropuestas.some((p: any) => p.asuntoId === a.id);
          if (!hasPropuesta) {
            count++;
          }
        });
        setPropuestasPorEnviarCount(count);
      }
    } catch (err) {
      console.warn("Could not load user or data for pending proposals count");
    }
  }, []);

  const visibleModules = MODULES.filter(m => {
    if (!userPermissions) return m.active;
    const perm = userPermissions[m.id];
    return perm?.active && (perm.view || perm.create || perm.edit || perm.delete);
  });

  return (
    <div className="h-full flex flex-col font-sans overflow-hidden bg-transparent">
      {/* Main Content */}
      <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto min-h-0 custom-scrollbar">
        <div className="max-w-[1200px] mx-auto py-4 sm:py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {visibleModules.map((module, index) => (
              <motion.button
                key={module.id}
                onClick={() => module.active && onSelectModule(module.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className={`relative flex flex-col items-start p-5 rounded-2xl shadow-[0_4px_16px_rgba(245,158,11,0.02)] backdrop-blur-md border text-left transition-all duration-300 overflow-hidden group ${
                  module.active 
                    ? 'bg-slate-900/60 border-amber-500/10 hover:bg-slate-900/80 hover:border-amber-500/30 hover:shadow-[0_4px_24px_rgba(245,158,11,0.05)] hover:-translate-y-1' 
                    : 'bg-slate-950/20 border-white/5 opacity-50 cursor-not-allowed grayscale'
                }`}
              >
                {/* Background glow effect */}
                <div className={`absolute top-0 right-0 w-20 h-20 blur-[60px] opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${
                  module.color === 'yellow' ? 'bg-yellow-400' : 
                  module.color === 'amber' ? 'bg-amber-500' : 
                  module.color === 'emerald' ? 'bg-emerald-500' : 
                  'bg-slate-500'
                }`} />

                {!module.active && (
                   <div className="absolute top-3 right-3 bg-slate-800 text-slate-500 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-white/5">
                     Restringido
                   </div>
                )}
                {module.active && module.id === 'propuestas' && propuestasPorEnviarCount > 0 && (
                   <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                     {propuestasPorEnviarCount} PENDIENTE{propuestasPorEnviarCount !== 1 ? 'S' : ''}
                   </div>
                )}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 shadow-inner transition-all duration-300 ${
                  module.active 
                    ? `bg-gradient-to-br from-slate-900 to-slate-800 border ${
                        module.color === 'emerald' ? 'border-emerald-500/20 text-emerald-500 group-hover:from-emerald-500 group-hover:to-teal-400 group-hover:text-slate-950 group-hover:shadow-[0_2px_12px_rgba(16,185,129,0.2)]' : 
                        'border-amber-500/20 text-amber-500 group-hover:from-amber-500 group-hover:to-yellow-400 group-hover:text-slate-950 group-hover:shadow-[0_2px_12px_rgba(245,158,11,0.2)]'
                      } group-hover:border-transparent transition-all duration-300`
                    : 'bg-slate-800/50 text-slate-600'
                }`}>
                  <module.icon size={18} strokeWidth={2} />
                </div>
                
                <h3 className={`text-sm sm:text-lg font-display font-black tracking-tight mb-1 transition-colors duration-300 ${
                  module.active ? `text-transparent bg-clip-text bg-gradient-to-br ${
                    module.color === 'emerald' ? 'from-emerald-50 to-emerald-200 group-hover:from-emerald-200 group-hover:to-emerald-500' : 
                    'from-amber-50 to-amber-200 group-hover:from-yellow-200 group-hover:to-amber-500'
                  }` : 'text-slate-600'
                }`}>
                  {module.title}
                </h3>
                
                <p className={`text-[10px] sm:text-xs font-medium leading-relaxed mb-4 transition-colors duration-300 ${
                  module.active ? 'text-slate-500 group-hover:text-slate-400' : 'text-slate-700'
                }`}>
                  {module.description}
                </p>

                {module.active && (
                  <div className="mt-auto flex items-center gap-1.5 text-[9px] font-bold text-amber-500 uppercase tracking-widest group-hover:translate-x-0.5 transition-transform duration-300">
                    Inicializar <span className="text-xs">→</span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
