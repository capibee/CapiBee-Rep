import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, Briefcase, FileText, CheckCircle, BarChart3, Users, Calendar, FolderOpen, ClipboardList, Ban, Building } from 'lucide-react';
import { motion } from 'motion/react';
import { Business, Invoice, Asunto, Propuesta } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Finanzas() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [asuntos, setAsuntos] = useState<Asunto[]>([]);
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'EUR'>('USD');
  const [isTableLoading, setIsTableLoading] = useState(true);

  useEffect(() => {
    const savedInvoices = localStorage.getItem('capibee_invoices');
    if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
    
    const savedBusinesses = localStorage.getItem('capibee_businesses');
    if (savedBusinesses) setBusinesses(JSON.parse(savedBusinesses));

    const savedClients = localStorage.getItem('capibee_clients');
    if (savedClients) setClients(JSON.parse(savedClients));

    const savedAsuntos = localStorage.getItem('capibee_asuntos');
    if (savedAsuntos) setAsuntos(JSON.parse(savedAsuntos));

    const savedPropuestas = localStorage.getItem('capibee_propuestas');
    if (savedPropuestas) setPropuestas(JSON.parse(savedPropuestas));

    const t = setTimeout(() => setIsTableLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  const kpis = useMemo(() => {
    let ventas = 0;
    let propAceptadas = 0;
    let llamados = 0;
    let ytdPropAceptadas = 0;

    const currentYear = new Date().getFullYear();

    invoices.forEach(inv => {
        // Find client for this invoice to check currency
        const client = clients.find(c => c.id === inv.businessId);
        const invCurrency = client?.currency === 'EURO' ? 'EUR' : 'USD';
        if (invCurrency === selectedCurrency) {
            const subtotal = inv.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
            ventas += subtotal * (1 + (inv.tax || 0) / 100);
        }
    });

    businesses.forEach(b => {
        if (b.status === 'Prop. Aceptada') {
            propAceptadas++;
            const bDate = new Date(b.createdAt);
            if (bDate.getFullYear() === currentYear) {
                ytdPropAceptadas++;
            }
        }
        if (b.status && b.status !== 'Nuevo') llamados++;
    });

    const costos = ventas * 0.3;
    const comisiones = ventas * 0.1;
    const margen = ventas - costos - comisiones;

    return { ventas, costos, comisiones, margen, propAceptadas, llamados, ytdPropAceptadas };
  }, [invoices, businesses, clients, selectedCurrency]);

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const chartData = useMemo(() => {
    if (viewMode === 'month') {
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        const data = Array.from({ length: daysInMonth }, (_, i) => ({
          name: `${i + 1}/${selectedMonth}`,
          aceptadas: 0,
          ventas: 0
        }));

        businesses.forEach(b => {
          if (b.status === 'Prop. Aceptada') {
            const d = new Date(b.createdAt);
            if (d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth) {
              const dayIndex = d.getDate() - 1;
              if (data[dayIndex]) {
                data[dayIndex].aceptadas++;
              }
            }
          }
        });

        invoices.forEach(inv => {
            const client = clients.find(c => c.id === inv.businessId);
            const invCurrency = client?.currency === 'EURO' ? 'EUR' : 'USD';

            if (invCurrency === selectedCurrency) {
                const d = new Date(inv.date || inv.createdAt);
                if (d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth) {
                    const dayIndex = d.getDate() - 1;
                    if (data[dayIndex]) {
                        const subtotal = inv.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
                        data[dayIndex].ventas += subtotal * (1 + (inv.tax || 0) / 100);
                    }
                }
            }
        });

        return data;
    } else {
        const data = Array.from({ length: 12 }, (_, i) => ({
          name: months[i].substring(0, 3),
          aceptadas: 0,
          ventas: 0
        }));

        businesses.forEach(b => {
          if (b.status === 'Prop. Aceptada') {
            const d = new Date(b.createdAt);
            if (d.getFullYear() === selectedYear) {
              data[d.getMonth()].aceptadas++;
            }
          }
        });

        invoices.forEach(inv => {
            const client = clients.find(c => c.id === inv.businessId);
            const invCurrency = client?.currency === 'EURO' ? 'EUR' : 'USD';

            if (invCurrency === selectedCurrency) {
                const d = new Date(inv.date || inv.createdAt);
                if (d.getFullYear() === selectedYear) {
                    const subtotal = inv.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
                    data[d.getMonth()].ventas += subtotal * (1 + (inv.tax || 0) / 100);
                }
            }
        });

        return data;
    }
  }, [businesses, invoices, clients, selectedCurrency, selectedMonth, selectedYear, viewMode]);

  const propuestasAceptadas = useMemo(() => {
    return propuestas.filter(p => (p.status || 'Enviada') === 'Aceptada');
  }, [propuestas]);

  const propuestasCanceladas = useMemo(() => {
    return propuestas.filter(p => (p.status || 'Enviada') === 'Cancelada');
  }, [propuestas]);

  const agentsList = useMemo(() => {
    return businesses.flatMap(b => (b.agents || []).map(a => ({
      ...a,
      createdAt: a.createdAt || b.createdAt
    })));
  }, [businesses]);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="p-4 sm:p-8 font-sans text-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">KPI's</h1>
        <div className="flex bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-1">
          <div className="flex items-center px-3 border-r border-slate-800 text-emerald-500">
            <DollarSign size={16} />
          </div>
          <select 
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value as any)}
            className="bg-transparent text-sm font-semibold text-white px-4 py-2 outline-none hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <option value="USD" className="bg-slate-900">USD - Dólar</option>
            <option value="EUR" className="bg-slate-900">EUR - Euro</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
            { label: 'Ventas', value: kpis.ventas, icon: DollarSign, color: 'text-emerald-400', isCurrency: true, p: kpis.ventas > 0 ? 100 : 0 },
            { label: 'Costos Operativos', value: kpis.costos, icon: Briefcase, color: 'text-red-400', isCurrency: true, p: kpis.ventas > 0 ? (kpis.costos / kpis.ventas) * 100 : 0 },
            { label: 'Total Comisiones', value: kpis.comisiones, icon: FileText, color: 'text-amber-400', isCurrency: true, p: kpis.ventas > 0 ? (kpis.comisiones / kpis.ventas) * 100 : 0 },
            { label: 'Margen', value: kpis.margen, icon: TrendingUp, color: 'text-blue-400', isCurrency: true, p: kpis.ventas > 0 ? (kpis.margen / kpis.ventas) * 100 : 0 },
        ].map((kpi, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                <div className="flex gap-4 items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl bg-slate-950/80 border border-slate-800 ${kpi.color}`}>
                          <kpi.icon size={22} />
                        </div>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{kpi.label}</span>
                    </div>
                    <div className={`text-xs font-bold ${kpi.color} bg-slate-950 px-2 py-1 rounded-md border border-slate-800 shadow-sm`}>
                        {kpi.p.toFixed(1)}%
                    </div>
                </div>
                <div className="text-3xl font-black text-white relative z-10">
                  {kpi.isCurrency ? (selectedCurrency === 'EUR' ? '€' : '$') : ''}
                  {kpi.value.toLocaleString(undefined, {minimumFractionDigits: kpi.isCurrency ? 2 : 0, maximumFractionDigits: kpi.isCurrency ? 2 : 0})}
                </div>
                <div className="absolute -bottom-6 -right-6 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                  <kpi.icon size={120} />
                </div>
            </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
            <div>
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Propuestas Aceptadas</h3>
               <div className="text-4xl font-black text-white">{kpis.propAceptadas}</div>
            </div>
            <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20">
               <CheckCircle className="text-emerald-500" size={32} />
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
            <div>
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Llamados</h3>
               <div className="text-4xl font-black text-white">{kpis.llamados}</div>
            </div>
            <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/20">
               <Users className="text-amber-500" size={32} />
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
            <div>
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Prop. Aceptadas (YTD)</h3>
               <div className="text-4xl font-black text-white">{kpis.ytdPropAceptadas}</div>
            </div>
            <div className="p-4 bg-blue-500/10 rounded-full border border-blue-500/20">
               <BarChart3 className="text-blue-500" size={32} />
            </div>
          </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-white">Análisis Gráfico</h2>
            <p className="text-slate-400 text-sm">Visualización de cierres de aceptaciones y valores facturados.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
             <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1">
                 <button onClick={() => setViewMode('month')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${viewMode === 'month' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>Por Mes</button>
                 <button onClick={() => setViewMode('year')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${viewMode === 'year' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>Todo el Año</button>
             </div>
             
             <div className="flex bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-1">
                 <div className="flex items-center px-3 border-r border-slate-800 text-amber-500">
                     <Calendar size={16} />
                 </div>
                 {viewMode === 'month' && (
                     <select 
                         value={selectedMonth}
                         onChange={(e) => setSelectedMonth(Number(e.target.value))}
                         className="bg-transparent text-sm font-semibold text-white px-4 py-2 outline-none border-r border-slate-800 hover:bg-slate-900 transition-colors cursor-pointer"
                     >
                         {months.map((m, i) => (
                             <option key={i} value={i + 1} className="bg-slate-900">{m}</option>
                         ))}
                     </select>
                 )}
                 <select 
                     value={selectedYear}
                     onChange={(e) => setSelectedYear(Number(e.target.value))}
                     className="bg-transparent text-sm font-semibold text-white px-4 py-2 outline-none hover:bg-slate-900 transition-colors cursor-pointer"
                 >
                     {years.map(y => (
                         <option key={y} value={y} className="bg-slate-900">{y}</option>
                     ))}
                 </select>
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Aceptaciones Chart */}
        <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl">
          <h3 className="text-lg font-bold text-white mb-6">Cierres de Aceptaciones</h3>
          <div className="h-[300px] md:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAceptadas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} dx={-10} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="aceptadas" 
                  name="Aceptadas" 
                  stroke="#f59e0b" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorAceptadas)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ventas Chart */}
        <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl">
          <h3 className="text-lg font-bold text-white mb-6">Valores Facturados</h3>
          <div className="h-[300px] md:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} dx={-10} tickFormatter={(value) => `${selectedCurrency === 'EUR' ? '€' : '$'}${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                  formatter={(value: number) => [`${selectedCurrency === 'EUR' ? '€' : '$'}${value.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 'Ventas']}
                />
                <Area 
                  type="monotone" 
                  dataKey="ventas" 
                  name="Ventas" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorVentas)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECCION ANALISIS CUANTITATIVO ANUAL */}
      <div className="mt-16 pt-8 border-t border-slate-800">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-3">
             <BarChart3 className="text-yellow-400" size={26} />
             Análisis Cuantitativo Anual
          </h2>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
             Evolución mensual consecutiva de los principales activos, relaciones y gestiones comerciales de CapiBee para el año seleccionado.
          </p>
        </div>

        <div className="flex flex-col gap-8">
           {/* 1. Asuntos potenciales creados */}
           <QuantitativeChart 
              title="Asuntos Potenciales Creados"
              description="Volumen de expedientes de asuntos potenciales registrados para oportunidades comerciales."
              items={asuntos}
              getDate={(a) => a.createdAt || a.fecha}
              barColor="#f59e0b"
              gradientId="colorAsuntos"
              icon={FolderOpen}
           />

           {/* 2. Propuestas enviadas */}
           <QuantitativeChart 
              title="Propuestas Comerciales Enviadas"
              description="Cantidad de propuestas comerciales redactadas y expedidas para clientes."
              items={propuestas}
              getDate={(p) => p.createdAt}
              barColor="#3b82f6"
              gradientId="colorPropuestas"
              icon={ClipboardList}
           />

           {/* 3. Propuestas aceptadas */}
           <QuantitativeChart 
              title="Propuestas Comerciales Aceptadas"
              description="Propuestas que han sido formalmente aprobadas o marcadas como aceptadas por sus receptores."
              items={propuestasAceptadas}
              getDate={(p) => p.createdAt}
              barColor="#10b981"
              gradientId="colorPropuestasAceptadas"
              icon={CheckCircle}
           />

           {/* 4. Propuestas canceladas */}
           <QuantitativeChart 
              title="Propuestas Comerciales Canceladas"
              description="Propuestas comerciales que han sido marcadas como canceladas o desestimadas."
              items={propuestasCanceladas}
              getDate={(p) => p.createdAt}
              barColor="#f43f5e"
              gradientId="colorPropuestasCanceladas"
              icon={Ban}
           />

           {/* 5. Cantidad de clientes */}
           <QuantitativeChart 
              title="Cantidad de Clientes"
              description="Nuevos perfiles de cliente y cuentas empresariales incorporadas al portafolio activo."
              items={clients || []}
              getDate={(c) => c.createdAt}
              barColor="#8b5cf6"
              gradientId="colorClientes"
              icon={Users}
           />

           {/* 6. Agentes Capibee */}
           <QuantitativeChart 
              title="Agentes CapiBee Creados"
              description="Evolución de asistentes conversacionales e integraciones de agentes inteligentes creadas."
              items={agentsList}
              getDate={(a) => a.createdAt}
              barColor="#06b6d4"
              gradientId="colorAgentes"
              icon={Users}
           />

           {/* 7. Establecimientos */}
           <QuantitativeChart 
              title="Establecimientos"
              description="Total de establecimientos comerciales y puntos de servicio gestionados e integrados."
              items={businesses}
              getDate={(b) => b.createdAt}
              barColor="#ec4899"
              gradientId="colorEstablecimientos"
              icon={Building}
           />
        </div>
      </div>
    </div>
  );
}

// Reusable Quantitative Bar Chart Component with Independent Year Filter
interface QuantitativeChartProps {
  title: string;
  description: string;
  items: any[];
  getDate: (item: any) => number | string;
  barColor: string;
  gradientId: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

function QuantitativeChart({ title, description, items, getDate, barColor, gradientId, icon: Icon }: QuantitativeChartProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 3 + i);

  const chartData = useMemo(() => {
    const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const data = monthsShort.map(m => ({ name: m, "Cantidad": 0 }));

    if (items && Array.isArray(items)) {
      items.forEach(item => {
        const rawDate = getDate(item);
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime()) && d.getFullYear() === selectedYear) {
            const monthIndex = d.getMonth();
            if (monthIndex >= 0 && monthIndex < 12) {
              data[monthIndex]["Cantidad"]++;
            }
          }
        }
      });
    }

    return data;
  }, [items, selectedYear, getDate]);

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl transition-colors hover:border-slate-700 relative overflow-hidden group">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 relative z-10">
        <div className="flex gap-4 items-start">
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner flex items-center justify-center shrink-0" style={{ color: barColor }}>
             <Icon size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">{title}</h3>
            <p className="text-slate-400 text-sm mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-1 shrink-0">
          <div className="flex items-center px-3 border-r border-slate-800" style={{ color: barColor }}>
            <Calendar size={15} className="mr-1.5" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Año</span>
          </div>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent text-sm font-semibold text-white px-4 py-1.5 outline-none hover:bg-slate-900 transition-colors cursor-pointer"
          >
            {years.map(y => (
              <option key={y} value={y} className="bg-slate-900">{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-[260px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={barColor} stopOpacity={0.45}/>
                <stop offset="95%" stopColor={barColor} stopOpacity={0.02}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} dy={8} />
            <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} dx={-8} allowDecimals={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
              itemStyle={{ color: barColor, fontWeight: 'bold' }}
              cursor={{ fill: '#1e293b', opacity: 0.15 }}
            />
            <Bar 
              dataKey="Cantidad" 
              name="Unidades" 
              fill={`url(#${gradientId})`}
              stroke={barColor}
              strokeWidth={1.5}
              radius={[6, 6, 0, 0]}
              barSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="absolute -bottom-10 -right-10 opacity-[0.02] group-hover:opacity-[0.07] transition-all duration-500 scale-100 group-hover:scale-110 pointer-events-none" style={{ color: barColor }}>
         <Icon size={200} />
      </div>
    </div>
  );
}
