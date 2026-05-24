import React, { useEffect, useState, useMemo } from 'react';
import { Mail, User, Phone, MapPin, Clock, Search, Filter, Briefcase, FileText, Download, Trash2, Edit2, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { TableLoader } from './TableLoader';

export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPais, setFilterPais] = useState('');
  const [filterIdioma, setFilterIdioma] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [editingApp, setEditingApp] = useState<any>(null);
  const [statusToConfirm, setStatusToConfirm] = useState<{id: string, newStatus: string} | null>(null);
  const [isTableLoading, setIsTableLoading] = useState(true);

  useEffect(() => {
    // 1. Load initially from localStorage for fast render
    const saved = localStorage.getItem('capibee_solicitudes');
    if (saved) {
      setSolicitudes(JSON.parse(saved));
    }

    // 2. Fetch fresh from Supabase
    const fetchSolicitudes = async () => {
      const { data, error } = await supabase.from('solicitudes').select('*');
      if (!error && data) {
        const mapped = data.map(s => {
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
        setSolicitudes(mapped);
        localStorage.setItem('capibee_solicitudes', JSON.stringify(mapped));
      }
      setIsTableLoading(false);
    };
    fetchSolicitudes();

    // 3. Subscribe to real-time changes
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' }, (payload) => {
        fetchSolicitudes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const paises = useMemo(() => {
    const list = new Set(solicitudes.map(s => s.pais).filter(Boolean));
    return Array.from(list).sort();
  }, [solicitudes]);

  const idiomas = useMemo(() => {
    const list = new Set<string>();
    solicitudes.forEach(s => {
      if (s.idiomas && Array.isArray(s.idiomas)) {
        s.idiomas.forEach((i: string) => list.add(i));
      }
    });
    return Array.from(list).sort();
  }, [solicitudes]);

  const filteredSolicitudes = useMemo(() => {
    return solicitudes.filter(s => {
      const createdAt = new Date(s.createdAt);
      const matchSearch = (s.nombre + s.correo + s.whatsapp).toLowerCase().includes(searchTerm.toLowerCase());
      const matchPais = filterPais ? s.pais === filterPais : true;
      const matchIdioma = filterIdioma ? (s.idiomas && s.idiomas.includes(filterIdioma)) : true;
      
      const matchStart = filterDateStart ? createdAt >= new Date(filterDateStart) : true;
      const matchEnd = filterDateEnd ? createdAt <= new Date(new Date(filterDateEnd).setHours(23, 59, 59, 999)) : true;

      return matchSearch && matchPais && matchIdioma && matchStart && matchEnd;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [solicitudes, searchTerm, filterPais, filterIdioma, filterDateStart, filterDateEnd]);

  const handleChangeStatus = async (id: string, newStatus: string) => {
    const updated = solicitudes.map(s => s.id === id ? { ...s, status: newStatus } : s);
    setSolicitudes(updated);
    localStorage.setItem('capibee_solicitudes', JSON.stringify(updated));

    try {
      await supabase
        .from('solicitudes')
        .update({ status: newStatus })
        .eq('id', id);
    } catch (e) {
      console.warn("Could not sync status change directly to Supabase:", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este formulario?')) {
      const updated = solicitudes.filter(s => s.id !== id);
      setSolicitudes(updated);
      localStorage.setItem('capibee_solicitudes', JSON.stringify(updated));

      try {
        await supabase
          .from('solicitudes')
          .delete()
          .eq('id', id);
      } catch (e) {
        console.warn("Could not sync deletion directly to Supabase:", e);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editingApp) return;
    const updated = solicitudes.map(s => s.id === editingApp.id ? editingApp : s);
    setSolicitudes(updated);
    localStorage.setItem('capibee_solicitudes', JSON.stringify(updated));

    try {
      await supabase
        .from('solicitudes')
        .upsert({
          id: editingApp.id,
          company_name: editingApp.ciudad || '',
          contact_name: editingApp.nombre,
          email: editingApp.correo,
          phone: editingApp.whatsapp,
          channel: editingApp.idiomas ? editingApp.idiomas.join(', ') : '',
          type: editingApp.pais,
          prompt: editingApp.otroIdioma || '',
          status: editingApp.status,
          created_at: editingApp.createdAt ? new Date(editingApp.createdAt).getTime() : Date.now()
        }, { onConflict: 'id' });
    } catch (e) {
      console.warn("Could not sync edit changes directly to Supabase:", e);
    }

    setEditingApp(null);
  };

  const handleConfirmStatus = () => {
    if (!statusToConfirm) return;
    handleChangeStatus(statusToConfirm.id, statusToConfirm.newStatus);
    setStatusToConfirm(null);
  };

  const ESTADOS = [
    'En revisión',
    'Preseleccionado',
    'En proceso (Entrevistas / Pruebas)',
    'Ofertado',
    'Contratado',
    'Descartado',
    'En reserva'
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En revisión': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Preseleccionado': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'En proceso (Entrevistas / Pruebas)': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Ofertado': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Contratado': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'Descartado': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'En reserva': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
  };

  return (
    <div className="p-4 sm:p-8 font-sans text-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
             <Briefcase className="text-amber-500" />
            Formularios
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Gestiona y evalúa los perfiles de los prospectos para ventas B2B.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            <Download size={16} /> Exportar
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, correo, whatsapp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl pl-12 pr-4 py-3 outline-none text-sm transition-all"
            />
          </div>
          
          <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-4">
            <input 
              type="date" 
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className="w-32 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-3 outline-none text-xs transition-all text-slate-300"
            />
            <input 
              type="date" 
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className="w-32 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-3 outline-none text-xs transition-all text-slate-300"
            />
            <div className="relative w-full md:w-48">
               <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
               <select 
                 value={filterPais}
                 onChange={(e) => setFilterPais(e.target.value)}
                 className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl pl-12 pr-4 py-3 outline-none text-sm appearance-none cursor-pointer transition-all text-slate-300"
               >
                 <option value="">Todos los países</option>
                 {paises.map(p => (
                   <option key={p} value={p}>{p}</option>
                 ))}
               </select>
            </div>
            <div className="relative w-full md:w-48">
               <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
               <select 
                 value={filterIdioma}
                 onChange={(e) => setFilterIdioma(e.target.value)}
                 className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl pl-12 pr-4 py-3 outline-none text-sm appearance-none cursor-pointer transition-all text-slate-300"
               >
                 <option value="">Todos los idiomas</option>
                 {idiomas.map(i => (
                   <option key={i} value={i}>{i}</option>
                 ))}
               </select>
            </div>
            <div className="bg-amber-500/10 text-amber-500 px-4 py-3 rounded-xl border border-amber-500/20 text-sm font-bold whitespace-nowrap text-center w-full md:w-auto">
              {filteredSolicitudes.length} Solicitudes
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950">
                <th className="py-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center w-10">#</th>
                <th className="py-2 px-4 text-xs font-bold uppercase tracking-widest text-slate-500">Fecha</th>
                <th className="py-2 px-4 text-xs font-bold uppercase tracking-widest text-slate-500">Prospecto</th>
                <th className="py-2 px-4 text-xs font-bold uppercase tracking-widest text-slate-500">Contacto</th>
                <th className="py-2 px-4 text-xs font-bold uppercase tracking-widest text-slate-500">Ubicación & Idiomas</th>
                <th className="py-2 px-4 text-xs font-bold uppercase tracking-widest text-slate-500">Estado</th>
                <th className="py-2 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isTableLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <TableLoader />
                  </td>
                </tr>
              ) : filteredSolicitudes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="p-4 bg-slate-800/50 rounded-full">
                        <FileText size={40} className="text-slate-600" />
                      </div>
                      <p className="text-lg">No se encontraron solicitudes.</p>
                      {searchTerm || filterPais || filterIdioma ? (
                        <button 
                          onClick={() => {setSearchTerm(''); setFilterPais(''); setFilterIdioma('');}}
                          className="text-amber-500 hover:underline text-sm font-semibold"
                        >
                          Limpiar filtros
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSolicitudes.map((app, index) => (
                  <tr key={app.id} className="border-b border-slate-800/50 transition-colors hover:bg-slate-800/20 group">
                    <td className="py-2 px-2 text-[10px] text-slate-500 font-mono text-center select-none w-10">
                      {index + 1}
                    </td>
                    <td className="py-2 px-4 text-sm text-slate-400 font-mono">
                      {new Date(app.createdAt).toLocaleDateString('es-ES', { 
                        day: '2-digit', month: 'short', year: 'numeric' 
                      })}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
                           <User size={14} />
                        </div>
                        <span className="font-bold text-slate-200 group-hover:text-amber-400 transition-colors">{app.nombre}</span>
                      </div>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <Mail size={12} className="text-slate-500" />
                          <a href={`mailto:${app.correo}`} className="hover:text-amber-400 transition-colors">{app.correo}</a>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Phone size={12} className="text-slate-500" />
                          <a href={`https://wa.me/${app.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">{app.whatsapp}</a>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <MapPin size={12} className="text-slate-500" />
                          {app.ciudad}, {app.pais}
                        </div>
                        {app.idiomas && app.idiomas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {app.idiomas.map((idioma: string) => (
                              <span key={idioma} className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded block border border-slate-700">
                                {idioma}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-4">
                      <select
                        value={app.status === 'Recibido' ? 'En revisión' : (app.status || 'En revisión')}
                        onChange={(e) => setStatusToConfirm({id: app.id, newStatus: e.target.value})}
                        className={`appearance-none cursor-pointer outline-none pl-3 pr-8 py-1 rounded-full text-xs font-bold uppercase border transition-colors ${getStatusColor(app.status === 'Recibido' ? 'En revisión' : (app.status || 'En revisión'))}`}
                        style={{ backgroundRepeat: 'no-repeat', backgroundSize: '1rem', backgroundPosition: 'right 0.5rem center', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                      >
                        {app.status === 'Pendiente' && <option value="Pendiente" disabled>Pendiente</option>}
                        {ESTADOS.map(estado => (
                          <option key={estado} value={estado} className="bg-slate-900 text-slate-200">
                            {estado}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setEditingApp({ ...app })}
                          className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                          title="Editar formulario"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(app.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Eliminar formulario"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Confirmation Modal */}
      <AnimatePresence>
        {statusToConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-4">Confirmar cambio de estado</h3>
              <p className="text-slate-400 text-sm mb-6">
                ¿Estás seguro de que deseas cambiar el estado a <strong>{statusToConfirm.newStatus}</strong>?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setStatusToConfirm(null)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmStatus}
                  className="px-4 py-2 rounded-xl font-bold text-black bg-amber-500 hover:bg-amber-400 transition-colors text-sm"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Edit2 size={20} className="text-amber-500" />
                  Editar Formulario
                </h3>
                <button
                  onClick={() => setEditingApp(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Nombre</label>
                  <input
                    type="text"
                    value={editingApp.nombre}
                    onChange={e => setEditingApp({ ...editingApp, nombre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 outline-none text-sm text-slate-200 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Correo electrónico</label>
                  <input
                    type="email"
                    value={editingApp.correo}
                    onChange={e => setEditingApp({ ...editingApp, correo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 outline-none text-sm text-slate-200 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">WhatsApp</label>
                  <input
                    type="text"
                    value={editingApp.whatsapp}
                    onChange={e => setEditingApp({ ...editingApp, whatsapp: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 outline-none text-sm text-slate-200 transition-all font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">País</label>
                    <input
                      type="text"
                      value={editingApp.pais}
                      onChange={e => setEditingApp({ ...editingApp, pais: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 outline-none text-sm text-slate-200 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Ciudad</label>
                    <input
                      type="text"
                      value={editingApp.ciudad}
                      onChange={e => setEditingApp({ ...editingApp, ciudad: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 outline-none text-sm text-slate-200 transition-all font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Idiomas (separados por coma)</label>
                  <input
                    type="text"
                    value={(editingApp.idiomas || []).join(', ')}
                    onChange={e => setEditingApp({ ...editingApp, idiomas: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 outline-none text-sm text-slate-200 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={() => setEditingApp(null)}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-2.5 rounded-xl font-bold text-black bg-amber-500 hover:bg-amber-400 shadow-lg hover:shadow-amber-500/20 transition-all flex items-center gap-2"
                >
                  <Save size={18} /> Guardar cambios
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
