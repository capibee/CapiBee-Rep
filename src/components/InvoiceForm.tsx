/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Calendar, 
  User, 
  CreditCard, 
  FileText, 
  Check, 
  AlertCircle,
  Hash,
  DollarSign,
  Briefcase,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, Business, InvoiceItem } from '../types';

interface InvoiceFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  clients: Client[];
  businesses: Business[];
  onNewClient: () => void;
  nextInvoiceNumber: string;
}

export default function InvoiceForm({ 
  onClose, 
  onSubmit, 
  clients, 
  onNewClient, 
  nextInvoiceNumber 
}: InvoiceFormProps) {
  const [formData, setFormData] = useState({
    businessId: '',
    items: [{ description: '', quantity: 1, price: 0 }] as InvoiceItem[],
    tax: 0,
    paymentMethod: 'Transferencia',
    emissionDate: new Date().toISOString().split('T')[0],
    dueDate: 'Hoy',
    note: ''
  });

  const subtotal = formData.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const taxAmount = subtotal * (formData.tax / 100);
  const total = subtotal + taxAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessId) return;
    onSubmit(formData);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, price: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-inner border border-amber-500/20">
              <FileText size={20} className="sm:hidden" />
              <FileText size={24} className="hidden sm:block" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-display font-black text-white tracking-tight uppercase leading-none">Emitir Factura</h2>
              <div className="flex items-center gap-2 mt-1.5 sm:mt-0.5">
                <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Documento</span>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">{nextInvoiceNumber}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 sm:p-3 text-slate-500 hover:text-white hover:bg-slate-800 rounded-2xl transition-all active:scale-95 bg-slate-900/50 sm:bg-transparent"
          >
            <X size={20} className="sm:hidden" />
            <X size={24} className="hidden sm:block" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            
            {/* Left Column: Form Details */}
            <div className="lg:col-span-8 space-y-10">
              
              {/* Section: Client & General */}
              <div className="space-y-5 sm:space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-1.5 h-5 sm:w-1 sm:h-6 bg-amber-500 rounded-full" />
                    <h3 className="text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Facturar A</h3>
                  </div>
                  <button 
                    type="button"
                    onClick={onNewClient}
                    className="text-[9px] sm:text-[10px] font-black text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    <Plus size={14} className="shrink-0" /> <span className="hidden sm:inline">Nuevo Cliente</span><span className="sm:hidden">Nuevo</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Cliente / Empresa</label>
                    <div className="relative group">
                      <select 
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 sm:py-3 px-4 text-xs font-bold text-white focus:outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer shadow-inner"
                        value={formData.businessId}
                        onChange={e => setFormData({...formData, businessId: e.target.value})}
                      >
                        <option value="">Seleccionar empresa...</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.companyName || c.contactName} ({c.currency})</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-amber-500 transition-colors pointer-events-none" size={16} />
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Forma de Pago</label>
                    <div className="relative group">
                       <select 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 sm:py-3 px-4 text-xs font-bold text-white focus:outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer shadow-inner"
                        value={formData.paymentMethod}
                        onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                      >
                        {['Transferencia', 'Efectivo', 'T. Crédito', 'Crypto', 'Cheque'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-amber-500 transition-colors pointer-events-none" size={16} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Items Table */}
              <div className="space-y-5 sm:space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-1.5 h-5 sm:w-1 sm:h-6 bg-blue-500 rounded-full" />
                    <h3 className="text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Detalle de Servicios</h3>
                  </div>
                </div>

                <div className="bg-slate-950/30 border border-slate-800 sm:rounded-[1.5rem] rounded-2xl overflow-hidden shadow-inner">
                  <div className="hidden md:grid bg-slate-950/50 p-4 grid-cols-12 gap-4 border-b border-slate-800">
                    <div className="col-span-6 text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Descripción</div>
                    <div className="col-span-2 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Cant.</div>
                    <div className="col-span-2 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">V. Unitario</div>
                    <div className="col-span-2 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest pr-2">Subtotal</div>
                  </div>
                  
                  <div className="divide-y divide-slate-800/50">
                    <AnimatePresence initial={false}>
                      {formData.items.map((item, index) => (
                        <motion.div 
                          key={`${index}`}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-4 items-start md:items-center group relative bg-slate-900/10 hover:bg-slate-900/30 transition-colors"
                        >
                          <div className="col-span-1 md:col-span-6 w-full relative">
                            <label className="md:hidden text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1 block mb-2">Concepto / Servicio</label>
                            <input 
                              required
                              type="text"
                              placeholder="Ej. Honorarios profesionales..."
                              className="w-full bg-slate-950 md:bg-transparent border border-slate-800 md:border-transparent rounded-xl md:rounded-none py-3.5 md:py-1.5 px-4 md:px-0 text-sm font-medium text-white focus:outline-none placeholder:text-slate-600 focus:border-amber-500/50 transition-all shadow-inner md:shadow-none"
                              value={item.description}
                              onChange={e => updateItem(index, 'description', e.target.value)}
                            />
                            {formData.items.length > 1 && (
                               <button 
                                 type="button"
                                 onClick={() => removeItem(index)}
                                 className="absolute right-3 top-[34px] md:top-1/2 md:-translate-y-1/2 md:hidden p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500/20 transition-all border border-rose-500/20"
                               >
                                 <Trash2 size={14} />
                               </button>
                             )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 col-span-1 md:col-span-6 w-full">
                            <div className="col-span-1 md:col-span-2">
                              <label className="md:hidden text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1 block mb-2">Cantidad</label>
                              <div className="relative">
                                <input 
                                  type="number"
                                  min="1"
                                  className="w-full bg-slate-950 md:bg-slate-900 border border-slate-800 rounded-xl py-3 md:py-2.5 px-3 text-sm font-bold font-mono text-center text-white focus:border-amber-500/50 transition-all outline-none shadow-inner"
                                  value={item.quantity}
                                  onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                />
                              </div>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <label className="md:hidden text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1 block mb-2">Valor Neto</label>
                              <div className="relative">
                                <span className="absolute left-3 md:left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">$</span>
                                <input 
                                  type="number"
                                  step="0.01"
                                  className="w-full bg-slate-950 md:bg-slate-900 border border-slate-800 rounded-xl py-3 md:py-2.5 pl-8 md:pl-6 pr-3 text-sm font-bold font-mono text-right md:text-center text-white focus:border-amber-500/50 transition-all outline-none shadow-inner"
                                  value={item.price || ''}
                                  onChange={e => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="col-span-1 md:col-span-2 mt-2 md:mt-0 pt-3 md:pt-0 border-t border-slate-800 border-dashed md:border-none flex justify-between md:justify-end items-center relative w-full pr-2">
                             <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal Ítem</span>
                             <span className="text-sm font-mono font-black text-amber-400 md:text-slate-300">
                               $ {(item.quantity * item.price).toLocaleString(undefined, {minimumFractionDigits: 2})}
                             </span>
                             {formData.items.length > 1 && (
                               <button 
                                 type="button"
                                 onClick={() => removeItem(index)}
                                 className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-500 transition-all hover:bg-slate-800 rounded-lg"
                               >
                                 <Trash2 size={16} />
                               </button>
                             )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <div className="p-4 bg-slate-950">
                    <button 
                      type="button"
                      onClick={addItem}
                      className="flex items-center justify-center w-full md:w-auto gap-2 md:px-6 py-3.5 md:py-2.5 bg-slate-900 hover:bg-slate-800 sm:border border-slate-800 text-[11px] font-bold text-slate-300 hover:text-white transition-colors uppercase tracking-[0.15em] rounded-xl outline-dashed outline-1 outline-slate-700 outline-offset-2 sm:outline-none"
                    >
                      <Plus size={16} strokeWidth={3} /> Añadir Concepto
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Totals & Dates */}
            <div className="lg:col-span-4 space-y-8">
              
              {/* Dates Card */}
              <div className="bg-slate-950/80 p-5 sm:p-6 rounded-3xl sm:rounded-[2rem] border border-slate-800/80 space-y-6 shadow-xl relative overflow-hidden backdrop-blur-md">
                <div className="absolute -top-4 -right-4 p-8 opacity-[0.03] text-amber-500 pointer-events-none">
                  <Calendar size={120} />
                </div>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 relative z-10">
                  <Calendar size={14} className="text-amber-500" /> Tiempos & Vencimiento
                </h4>

                <div className="space-y-4 sm:space-y-5 relative z-10">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Fecha de Emisión</label>
                    <input 
                      type="date"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl py-3 px-4 text-sm font-bold text-white focus:border-amber-500/50 outline-none transition-all shadow-inner"
                      value={formData.emissionDate}
                      onChange={e => setFormData({...formData, emissionDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Términos de Pago</label>
                    <div className="grid grid-cols-2 lg:grid-cols-2 gap-2">
                      {['Hoy', '7 dias', '15 dias', '30 dias'].map(plazo => (
                        <button
                          key={plazo}
                          type="button"
                          onClick={() => setFormData({...formData, dueDate: plazo})}
                          className={`py-2.5 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-tighter sm:tracking-widest border transition-all ${
                            formData.dueDate === plazo 
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                              : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          {plazo}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-6 sm:p-8 rounded-3xl sm:rounded-[2rem] border border-white/5 space-y-6 sm:space-y-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/5 rounded-full blur-[50px] group-hover:bg-amber-500/10 transition-colors pointer-events-none" />
                
                <div className="space-y-5 sm:space-y-6 relative z-10">
                   <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-black text-slate-400 sm:text-slate-500 uppercase tracking-widest">
                     <span>Subtotal Neto</span>
                     <span className="text-slate-200 font-mono text-xs md:text-sm">$ {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                   </div>

                   <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-black text-slate-400 sm:text-slate-500 uppercase tracking-widest">
                     <span className="leading-tight">Impuestos (%)</span>
                     <div className="flex items-center gap-3">
                       <input 
                        type="number"
                        className="w-14 sm:w-16 bg-slate-900 border border-slate-700 rounded-lg md:rounded-xl py-1.5 px-2 text-xs sm:text-sm font-black text-center text-amber-400 outline-none focus:border-amber-500/50 shadow-inner"
                        value={formData.tax || ''}
                        placeholder="0"
                        min="0"
                        onChange={e => setFormData({...formData, tax: parseFloat(e.target.value) || 0})}
                       />
                       <span className="text-slate-400 font-mono text-xs w-[70px] text-right">+ $ {taxAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                     </div>
                   </div>

                   <div className="h-px bg-slate-800/60 w-full" />

                   <div className="space-y-2">
                     <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] block">Total Factura</span>
                     <div className="text-4xl sm:text-5xl font-display font-black text-white tracking-tighter tabular-nums truncate flex items-center">
                       <span className="text-2xl mt-1 text-slate-500 mr-2">$</span>
                       {total.toLocaleString(undefined, {minimumFractionDigits: 2})}
                     </div>
                   </div>
                </div>

                <div className="relative z-10 space-y-4 pt-2">
                  <button 
                    type="submit"
                    disabled={!formData.businessId}
                    className="w-full py-4 sm:py-5 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black uppercase tracking-[0.2em] rounded-2xl sm:rounded-3xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
                  >
                    Confirmar & Generar <Check size={18} strokeWidth={3} />
                  </button>
                  <p className="text-[8px] sm:text-[9px] text-center text-slate-500 uppercase font-bold tracking-widest leading-relaxed px-4">Al emitir, se guardará y notificará automáticamente.</p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
