import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Assuming this path

interface Business {
  id: string;
  name: string;
  category: string;
  email?: string;
  contactName?: string;
  contactPhone?: string;
}

interface AsuntoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: Business[];
  onSuccess: () => void;
}

export default function AsuntoFormModal({ isOpen, onClose, businesses, onSuccess }: AsuntoFormModalProps) {
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
    destinatario: "Área de Desarrollo"
  });
  const [isAsuntoClientDropdownOpen, setIsAsuntoClientDropdownOpen] = useState(false);
  const [asuntoClientSearch, setAsuntoClientSearch] = useState("");

  const handleCreateAsunto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const payload: any = {
            id: crypto.randomUUID(),
            fecha: new Date().toISOString(),
            nombre_asunto: asuntoFormData.nombreAsunto,
            business_id: asuntoFormData.businessId,
            datos_asunto: asuntoFormData.datosAsunto,
            archivo_adjunto_url: asuntoFormData.archivoAdjuntoUrl,
            contact_name: asuntoFormData.contactName,
            contact_phone: asuntoFormData.contactPhone,
            sector: asuntoFormData.sector,
            destinatario: asuntoFormData.destinatario,
            created_at: new Date().getTime()
        };

        let { error } = await supabase.from('Asuntos').insert(payload);

        if (error && (
            (error.message && error.message.includes('destinatario')) || 
            (error.details && error.details.includes('destinatario')) || 
            String(error).includes('destinatario')
        )) {
            console.warn("Retrying insert without 'destinatario' column because it's missing in Supabase schema");
            const { destinatario, ...retryPayload } = payload;
            const retryResult = await supabase.from('Asuntos').insert(retryPayload);
            error = retryResult.error;
        }

        if (error) throw error;
        onClose();
        setAsuntoFormData({
            nombreAsunto: "",
            businessId: "",
            datosAsunto: "",
            archivoAdjuntoUrl: "",
            clientEmail: "",
            meetingDate: "",
            contactName: "",
            contactPhone: "",
            sector: "",
            destinatario: "Área de Desarrollo"
        });
        onSuccess();
    } catch (error) {
        alert("Error al crear asunto: " + error);
    }
  };

  if (!isOpen) return null;

  return (
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
                    onClick={onClose}
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
                        <div className="w-full bg-slate-950/80 border border-slate-800 p-2 rounded-lg flex flex-col justify-center cursor-not-allowed text-xs transition-all opacity-80" onClick={() => setAsuntoFormData({...asuntoFormData, businessId: ""})}>
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
                                            key={`${b.id || 'biz'}-${idx}`} 
                                            className={`px-3 py-1.5 hover:bg-slate-900 cursor-pointer text-xs transition-all ${asuntoFormData.businessId === b.id ? 'bg-slate-900 text-blue-400 font-bold' : 'text-slate-300'}`}
                                            onClick={() => {
                                                setAsuntoFormData({
                                                    ...asuntoFormData, 
                                                    businessId: b.id, 
                                                    clientEmail: b.email || "",
                                                    contactName: b.contactName || "",
                                                    contactPhone: b.contactPhone || "",
                                                    sector: b.category || ""
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
                        onClick={onClose}
                        className="flex-1 py-1.5 bg-slate-800 text-slate-300 font-bold rounded-lg hover:bg-slate-700 hover:text-white transition-colors text-[10px] uppercase tracking-wider border border-slate-800"
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
  );
}
