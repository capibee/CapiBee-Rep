import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { testSupabaseConnection, pushAllLocalDataToSupabase, pullAllRemoteDataFromSupabase, SyncStatus } from '../lib/supabaseSync';
import { Database, RefreshCw, UploadCloud, DownloadCloud, AlertTriangle, CheckCircle2, Copy, ShieldCheck, PlayCircle, LogOut } from 'lucide-react';
import { motion } from 'motion/react';

interface SupabaseHubProps {
  onBack?: () => void;
}

export default function SupabaseHub({ onBack }: SupabaseHubProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<'push' | 'pull' | 'test' | 'seed' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const checkConnection = async () => {
    setLoading(true);
    setSyncing('test');
    try {
      const res = await testSupabaseConnection();
      setStatus(res);
      if (res.connected) {
        const tableCount = Object.values(res.tables).filter(Boolean).length;
        if (tableCount === 9) {
          setMessage({ type: 'success', text: 'Conexión exitosa. Las 9 tablas de la plataforma están creadas y listas.' });
        } else {
          setMessage({ type: 'info', text: `Conexión establecida. Se detectaron ${tableCount} de 9 tablas. Ejecuta el script SQL en el panel de Supabase para configurar las faltantes.` });
        }
      } else {
        setMessage({ type: 'error', text: res.message });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: `Fallo de conexión: ${e.message}` });
    } finally {
      setLoading(false);
      setSyncing(null);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handlePush = async () => {
    if (!window.confirm('¿Estás seguro de subir todos tus datos locales de desarrollo a Supabase? Esto sobrescribirá filas con el mismo ID en tu base de datos central.')) return;
    setSyncing('push');
    try {
      const res = await pushAllLocalDataToSupabase();
      if (res.success) {
        setMessage({ type: 'success', text: res.detail });
        await checkConnection();
      } else {
        setMessage({ type: 'error', text: res.detail });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: `Fallo al subir: ${e.message}` });
    } finally {
      setSyncing(null);
    }
  };

  const handlePull = async () => {
    if (!window.confirm('¿Estás seguro de descargar todos los datos de Supabase a esta instancia local? Esto sobrescribirá los datos guardados en este navegador.')) return;
    setSyncing('pull');
    try {
      const res = await pullAllRemoteDataFromSupabase();
      if (res.success) {
        setMessage({ type: 'success', text: res.detail });
        await checkConnection();
      } else {
        setMessage({ type: 'error', text: res.detail });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: `Fallo al descargar: ${e.message}` });
    } finally {
      setSyncing(null);
    }
  };

  const handleSeedDefaults = async () => {
    setSyncing('seed');
    try {
      // Create seed role
      const { error: roleErr } = await supabase.from('Roles').upsert({
        id: 'ADMIN_MAESTRO',
        name: 'Super Administrador',
        description: 'Acceso completo e incondicional a todos los módulos del sistema.',
        permissions: {
          dashboard: { view: true, create: true, edit: true, delete: true, active: true },
          agentes: { view: true, create: true, edit: true, delete: true, active: true },
          clientes: { view: true, create: true, edit: true, delete: true, active: true },
          ganancias: { view: true, create: true, edit: true, delete: true, active: true },
          roles: { view: true, create: true, edit: true, delete: true, active: true },
          finanzas: { view: true, create: true, edit: true, delete: true, active: true },
          contabilidad: { view: true, create: true, edit: true, delete: true, active: true }
        },
        created_at: Date.now()
      });

      if (roleErr) throw new Error(`Error al crear rol: ${roleErr.message}`);

      // Create default user if not exists
      const { error: userErr } = await supabase.from('Usuarios').upsert({
        id: 'admin_seed_01',
        full_name: 'Super Administrador CapiBee',
        role_id: 'ADMIN_MAESTRO',
        role_name: 'Super Administrador',
        email: 'soporte@capibee.ia',
        password: 'admin',
        avatar: '',
        created_at: Date.now()
      });

      if (userErr) throw new Error(`Error al crear usuario de soporte: ${userErr.message}`);

      setMessage({ 
        type: 'success', 
        text: 'Datos semilla configurados en Supabase. Rol ADMIN_MAESTRO y usuario "soporte@capibee.ia" creado exitosamente. Ya puedes autenticarte con este usuario.' 
      });
      await checkConnection();
    } catch (e: any) {
      setMessage({ type: 'error', text: `Fallo al insertar semilla: ${e.message}. Asegúrate de cargar el archivo SQL schema primero.` });
    } finally {
      setSyncing(null);
    }
  };

  const copySQLEditorLink = () => {
    navigator.clipboard.writeText('https://supabase.com/dashboard/project/rmfiorgvfqucstiiwitg/sql/new');
    alert('Enlace del editor SQL copiado al portapapeles!');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.05)]">
              <Database className="text-amber-500" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded border border-emerald-500/20 shadow-sm">
                  PROYECTO: rmfiorgvfqucstiiwitg
                </span>
              </div>
              <h1 className="text-2xl font-black uppercase tracking-wider text-slate-200 mt-1">
                Conexión de Base de Datos Real
              </h1>
            </div>
          </div>

          {onBack && (
            <button 
              onClick={onBack}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-slate-300 font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-sm text-[10px]"
            >
              Cerrar Hub
            </button>
          )}
        </header>

        {/* Message Banner */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 shadow-md ${
            message.type === 'success' ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' :
            message.type === 'error' ? 'bg-red-950/20 border-red-500/30 text-red-400' :
            'bg-blue-950/20 border-blue-500/30 text-blue-400'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="shrink-0 mt-0.5" />}
            <div className="text-xs font-semibold leading-relaxed">
              {message.text}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Connection Card */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black tracking-widest uppercase text-slate-400 flex items-center gap-2">
                  <Database size={14} className="text-amber-500" />
                  Estado de la Conexión
                </h3>
                <span className={`w-2.5 h-2.5 rounded-full shadow-sm animate-pulse ${status?.connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
              </div>
              
              <div className="bg-slate-950/80 border border-slate-800/60 rounded-xl p-4 mb-4">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600 mb-1">PROYECTO URL DE SUPABASE</div>
                <div className="font-mono text-xs text-amber-500/90 break-all select-all">
                  https://rmfiorgvfqucstiiwitg.supabase.co
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs text-slate-400 leading-relaxed">
                  Esta plataforma CapiBee está conectada mediante el SDK oficial de Supabase con seguridad de nivel empresarial PostgreSQL. Usa variables de entorno <code className="text-amber-500 font-mono text-[10px] bg-slate-950 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> y <code className="text-amber-500 font-mono text-[10px] bg-slate-950 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>.
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button 
                disabled={loading}
                onClick={checkConnection}
                className="flex-1 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold uppercase tracking-widest px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm text-[10px] disabled:opacity-50"
              >
                <RefreshCw size={14} className={syncing === 'test' ? 'animate-spin' : ''} />
                Probar de nuevo
              </button>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black tracking-widest uppercase text-slate-400 mb-4 flex items-center gap-2">
                <ShieldCheck size={14} className="text-amber-500" />
                Acciones Administrativas
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Prepara tu base de datos de producción recién creada cargando el rol de administrador y de soporte predeterminado.
              </p>
            </div>

            <div className="space-y-2">
              <button 
                disabled={!!syncing}
                onClick={handleSeedDefaults}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-widest px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md text-[10px] disabled:opacity-50"
              >
                <PlayCircle size={14} />
                Insertar Datos Semilla
              </button>
              <button 
                onClick={copySQLEditorLink}
                className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold uppercase tracking-widest px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm text-[10px]"
              >
                <Copy size={13} />
                Ver Editor SQL de Supabase
              </button>
            </div>
          </div>
        </div>


        {/* Database Tables Verification */}
        {status && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xs font-black tracking-widest uppercase text-slate-400 mb-4 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              Verificación de Tablas del Sistema ({Object.values(status.tables).filter(Boolean).length} / 11 Listas)
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(status.tables).map(([tableName, exists]) => (
                <div key={tableName} className={`p-3 rounded-xl border flex items-center justify-between gap-2 overflow-hidden transition-all text-[11px] ${
                  exists 
                    ? 'bg-emerald-950/15 border-emerald-500/25 text-emerald-400' 
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                }`}>
                  <span className="font-mono uppercase tracking-wider truncate">{tableName.replace('_', ' ')}</span>
                  {exists ? (
                    <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase shrink-0">Lista</span>
                  ) : (
                    <span className="bg-slate-800 text-slate-500 text-[8px] font-bold px-1.5 py-0.5 rounded border border-slate-700/50 uppercase shrink-0">Falta</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="max-w-5xl mx-auto w-full text-center border-t border-slate-850 mt-12 pt-6 text-[11px] text-slate-600">
        <div>Plataforma CapiBee real-time database management • Diseñado por Hecho con IA S.A.S.</div>
      </footer>
    </div>
  );
}
