/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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
  ChevronDown,
  Search
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
  businesses = [],
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

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const results: Array<{ id: string; name: string; sub: string; isBusiness: boolean }> = [];
    
    businesses.forEach(b => {
      const name = b.name || 'Sin Nombre';
      if (name.toLowerCase().includes(term) && !results.some(r => r.id === b.id)) {
        results.push({
          id: b.id,
          name: name,
          sub: 'Directorio/Empresa',
          isBusiness: true
        });
      }
    });

    return results.slice(0, 50);
  }, [businesses, searchTerm]);

  const selectedOption = useMemo(() => {
    const c = clients.find(c => c.id === formData.businessId);
    if (c) return { name: c.companyName || c.contactName || 'Sin Nombre', sub: c.currency };
    const b = businesses.find(b => b.id === formData.businessId);
    if (b) return { name: b.name || 'Sin Nombre', sub: '' };
    return null;
  }, [clients, businesses, formData.businessId]);

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        className="bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-800"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-500 flex items-center justify-center text-white shadow-lg">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Emitir Factura</h2>
              <div className="text-sm tracking-tight text-slate-500 mt-0.5">
                Documento <span className="font-mono text-amber-500 font-medium">{nextInvoiceNumber}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            
            {/* Top Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Client Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">Cliente / Empresa</label>
                </div>
                
                <div className="relative">
                  <div 
                     onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                     className={`w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all cursor-pointer flex items-center justify-between ${!formData.businessId ? 'text-slate-400' : 'text-white'}`}
                  >
                     <span className="truncate">
                        {selectedOption ? `${selectedOption.name} ${selectedOption.sub ? `(${selectedOption.sub})` : ''}` : 'Seleccionar...'}
                     </span>
                     <ChevronDown className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} size={16} />
                  </div>

                  <AnimatePresence>
                     {isDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                          <motion.div 
                              initial={{ opacity: 0, y: -5 }} 
                              animate={{ opacity: 1, y: 0 }} 
                              exit={{ opacity: 0, y: -5 }} 
                              className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-lg overflow-hidden flex flex-col"
                              style={{ maxHeight: '250px' }}
                          >
                             <div className="p-2 border-b border-slate-800 relative shrink-0">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                   type="text" 
                                   autoFocus
                                   placeholder="Buscar..." 
                                   className="w-full bg-slate-950 border border-slate-800 rounded-md py-1.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                                   value={searchTerm}
                                   onChange={e => setSearchTerm(e.target.value)}
                                />
                             </div>
                             <div className="flex-1 overflow-y-auto">
                                {filteredOptions.length > 0 ? (
                                   filteredOptions.map(opt => (
                                     <div 
                                         key={opt.id} 
                                         onClick={() => {
                                            setFormData({...formData, businessId: opt.id});
                                            setIsDropdownOpen(false);
                                            setSearchTerm('');
                                         }}
                                         className={`px-4 py-2 text-sm cursor-pointer hover:bg-slate-800 ${formData.businessId === opt.id ? 'bg-amber-500/10 text-amber-500' : 'text-slate-300'}`}
                                     >
                                        {opt.name} <span className="text-slate-400 text-xs">({opt.sub})</span>
                                     </div>
                                   ))
                                ) : (
                                   <div className="p-4 text-center text-sm text-slate-500">No se encontraron resultados</div>
                                )}
                             </div>
                          </motion.div>
                        </>
                     )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Dates & Payment */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <label className="text-sm font-medium text-slate-300">Fecha de Emisión</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 [color-scheme:dark]"
                    value={formData.emissionDate}
                    onChange={e => setFormData({...formData, emissionDate: e.target.value})}
                  />
                </div>
                
                <div className="space-y-4">
                  <label className="text-sm font-medium text-slate-300">Forma de Pago</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 appearance-none cursor-pointer"
                      value={formData.paymentMethod}
                      onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                    >
                      {['Transferencia'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white pb-2 border-b border-slate-800">
                Detalle de Servicios
              </h3>
              
              <div className="space-y-3">
                <div className="hidden md:grid grid-cols-12 gap-4 px-2">
                  <div className="col-span-6 text-xs text-slate-500 uppercase">Descripción</div>
                  <div className="col-span-2 text-xs text-slate-500 uppercase text-center">Cant</div>
                  <div className="col-span-2 text-xs text-slate-500 uppercase text-right">Precio</div>
                  <div className="col-span-2 text-xs text-slate-500 uppercase text-right">Total</div>
                </div>

                <AnimatePresence>
                  {formData.items.map((item, index) => (
                    <motion.div 
                      key={`${index}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                    >
                      <div className="col-span-6">
                        <input 
                          required
                          type="text"
                          placeholder="Descripción del servicio..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                          value={item.description}
                          onChange={e => updateItem(index, 'description', e.target.value)}
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <input 
                          type="number"
                          min="1"
                          placeholder="Cantidad"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-center text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono"
                          value={item.quantity}
                          onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        />
                      </div>

                      <div className="col-span-2">
                        <input 
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-right text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono"
                          value={item.price || ''}
                          onChange={e => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-between md:justify-end gap-3 text-sm font-mono text-white px-2">
                        <span>$ {(item.quantity * item.price).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        <div className="w-6">
                          {formData.items.length > 1 && (
                            <button 
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="pt-2">
                  <button 
                    type="button"
                    onClick={addItem}
                    className="text-sm text-emerald-500 hover:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Plus size={16} /> Añadir fila
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-6 mt-8 flex flex-col md:flex-row justify-end gap-10">
              <div className="w-full md:w-64 space-y-3">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-white">$ {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-400 items-center">
                  <span>Tax (%)</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      value={formData.tax || ''}
                      placeholder="0"
                      onChange={e => setFormData({...formData, tax: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-base font-medium text-white pt-2 border-t border-slate-800">
                  <span>Total</span>
                  <span className="font-mono text-emerald-400">$ {total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            </div>

          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!formData.businessId}
            className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
          >
            <Check size={16} strokeWidth={3} /> Emitir Factura
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
