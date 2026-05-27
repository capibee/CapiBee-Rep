import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Send, User, Mail, Phone, Briefcase, Sparkles, BrainCircuit, ArrowRight, ArrowLeft } from 'lucide-react';
import BackgroundPattern from './BackgroundPattern';
import Logo from './Logo';
import { supabase } from '../lib/supabase';

const countriesAndCities: Record<string, string[]> = {
  "Colombia": ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Cúcuta", "Bucaramanga", "Pereira", "Santa Marta", "Ibagué", "Pasto", "Manizales", "Neiva", "Villavicencio", "Armenia", "Valledupar", "Montería", "Sincelejo", "Popayán", "Tunja"],
  "México": ["Ciudad de México", "Guadalajara", "Monterrey", "Puebla", "Tijuana", "Toluca", "León", "Ciudad Juárez", "Torreón", "Querétaro", "Mérida", "San Luis Potosí", "Aguascalientes", "Mexicali", "Hermosillo", "Culiacán", "Chihuahua", "Saltillo", "Veracruz", "Morelia"],
  "España": ["Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Málaga", "Murcia", "Palma", "Las Palmas de Gran Canaria", "Bilbao", "Alicante", "Córdoba", "Valladolid", "Vigo", "Gijón", "Vitoria-Gasteiz", "A Coruña", "Granada", "Elche", "Oviedo"],
  "Argentina": ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "Tucumán", "La Plata", "Mar del Plata", "Salta", "Santa Fe", "San Juan", "Resistencia", "Santiago del Estero", "Corrientes", "Neuquén", "Posadas", "San Salvador de Jujuy", "Bahía Blanca", "Paraná", "Formosa", "Catamarca"],
  "Chile": ["Santiago", "Valparaíso", "Concepción", "La Serena", "Antofagasta", "Temuco", "Rancagua", "Talca", "Arica", "Chillán", "Iquique", "Puerto Montt", "Los Ángeles", "Copiapó", "Valdivia", "Osorno", "Quillota", "Curicó", "Punta Arenas", "Calama"],
  "Perú": ["Lima", "Arequipa", "Trujillo", "Chiclayo", "Piura", "Cusco", "Chimbote", "Huancayo", "Tacna", "Juliaca", "Ica", "Cajamarca", "Pucallpa", "Sullana", "Ayacucho", "Chincha", "Huánuco", "Tarapoto", "Iquitos", "Puno"],
  "Estados Unidos": ["Nueva York", "Los Ángeles", "Chicago", "Houston", "Phoenix", "Filadelfia", "San Antonio", "San Diego", "Dallas", "San José", "Austin", "Jacksonville", "Fort Worth", "Columbus", "San Francisco", "Charlotte", "Indianápolis", "Seattle", "Denver", "Washington D.C.", "Miami"],
  "Brasil": ["São Paulo", "Río de Janeiro", "Brasilia", "Salvador", "Fortaleza", "Belo Horizonte", "Manaos", "Curitiba", "Recife", "Porto Alegre", "Belém", "Goiânia", "Campinas", "São Luís", "Maceió", "Natal", "Teresina", "Campo Grande"],
  "Ecuador": ["Guayaquil", "Quito", "Cuenca", "Santo Domingo", "Machala", "Durán", "Manta", "Portoviejo", "Loja", "Ambato", "Esmeraldas", "Quevedo", "Riobamba", "Ibarra", "Latacunga"],
  "Bolivia": ["Santa Cruz de la Sierra", "El Alto", "La Paz", "Cochabamba", "Oruro", "Sucre", "Tarija", "Potosí", "Montero", "Trinidad", "Cobija"],
  "Uruguay": ["Montevideo", "Salto", "Ciudad de la Costa", "Paysandú", "Las Piedras", "Rivera", "Maldonado", "Tacuarembó", "Melo", "Mercedes", "Colonia del Sacramento"],
  "Paraguay": ["Asunción", "Ciudad del Este", "Luque", "San Lorenzo", "Capiatá", "Lambaré", "Fernando de la Mora", "Limpio", "Ñemby", "Encarnación"],
  "Venezuela": ["Caracas", "Maracaibo", "Valencia", "Barquisimeto", "Maracay", "Ciudad Guayana", "Maturín", "Barcelona", "San Cristóbal", "Cumaná"],
  "Costa Rica": ["San José", "Alajuela", "Cartago", "Heredia", "Puntarenas", "Liberia", "Limón", "San Isidro de El General", "Desamparados", "San Vicente"],
  "Panamá": ["Ciudad de Panamá", "San Miguelito", "Tocumen", "David", "Arraiján", "Colón", "Las Cumbres", "La Chorrera", "Pacora", "Santiago de Veraguas"],
  "República Dominicana": ["Santo Domingo", "Santiago de los Caballeros", "Santo Domingo Este", "Santo Domingo Norte", "Santo Domingo Oeste", "San Felipe de Puerto Plata", "San Pedro de Macorís", "La Romana", "Los Alcarrizos", "San Cristóbal"],
  "Guatemala": ["Ciudad de Guatemala", "Mixco", "Villa Nueva", "Petapa", "San Juan Sacatepéquez", "Quetzaltenango", "Villa Canales", "Escuintla", "Chinautla", "Chimaltenango"],
  "El Salvador": ["San Salvador", "Santa Ana", "San Miguel", "Soyapango", "Apopa", "Mejicanos", "Santa Tecla", "Ciudad Delgado", "Ilopango", "Tonacatepeque"],
  "Honduras": ["Tegucigalpa", "San Pedro Sula", "Choloma", "La Ceiba", "El Progreso", "Villanueva", "Choluteca", "Comayagua", "Puerto Cortés", "Danlí"],
  "Nicaragua": ["Managua", "León", "Masaya", "Chinandega", "Tipitapa", "Matagalpa", "Estelí", "Granada", "Jinotega", "Juigalpa"],
  "Otros": ["Otra"]
};

interface Props {
  onClose: () => void;
}

export default function B2BSalesApplicationForm({ onClose }: Props) {
  const [formData, setFormData] = useState({
    nombre: '',
    pais: '',
    ciudad: '',
    correo: '',
    whatsapp: '',
    idiomas: [] as string[],
    otroIdioma: '',
    aceptaDatos: false,
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  
  const totalSteps = 6;

  const nextStep = () => {
    if (currentStep === 0 && !formData.nombre.trim()) return;
    if (currentStep === 1 && (!formData.pais || !formData.ciudad)) return;
    if (currentStep === 2 && !formData.correo.includes('@')) return;
    if (currentStep === 3 && !formData.whatsapp.trim()) return;
    if (currentStep === 4 && formData.idiomas.length === 0) return;
    
    setDirection(1);
    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setDirection(-1);
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.aceptaDatos) return;

    try {
      const saved = localStorage.getItem('capibee_solicitudes');
      const solicitudes = saved ? JSON.parse(saved) : [];

      const finalIdiomas = formData.idiomas.filter(i => i !== 'Otros');
      if (formData.idiomas.includes('Otros') && formData.otroIdioma.trim()) {
          finalIdiomas.push(...formData.otroIdioma.split(',').map(s => s.trim()).filter(Boolean));
      }

      const newSolicitud = {
        id: crypto.randomUUID(),
        ...formData,
        idiomas: finalIdiomas,
        createdAt: new Date().toISOString(),
        status: 'En revisión'
      };
      solicitudes.push(newSolicitud);
      localStorage.setItem('capibee_solicitudes', JSON.stringify(solicitudes));
      
      // Upsert directly to Supabase so it persists live
      const { error: dbErr } = await supabase.from('Solicitudes').upsert({
        id: newSolicitud.id,
        company_name: newSolicitud.ciudad || '',
        contact_name: newSolicitud.nombre,
        email: newSolicitud.correo,
        phone: newSolicitud.whatsapp,
        channel: newSolicitud.idiomas ? newSolicitud.idiomas.join(', ') : '',
        type: newSolicitud.pais,
        prompt: newSolicitud.otroIdioma || '',
        status: newSolicitud.status,
        created_at: Date.now()
      }, { onConflict: 'id' });

      if (dbErr) {
        console.error("Could not save to Supabase directly:", dbErr);
        throw new Error(dbErr.message || "Failed to save to Supabase");
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error('Error saving application:', err);
      alert('Hubo un error al enviar tu solicitud. Inténtalo de nuevo.');
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0,
      position: 'absolute' as const,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      position: 'relative' as const,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 20 : -20,
      opacity: 0,
      position: 'absolute' as const,
    }),
  };

  // Prevent submit on 'Enter' key unless it's the last step
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentStep < totalSteps - 1) {
        nextStep();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] text-slate-100 overflow-y-auto font-sans flex items-center justify-center">
      <BackgroundPattern />
      
      <div className="absolute top-8 left-8 md:top-12 md:left-12 z-20">
        <Logo />
      </div>

      <div className="absolute top-8 right-8 z-20 flex gap-2">
        <button 
           onClick={onClose}
           className="text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 font-bold px-4 h-10 flex items-center justify-center transition-colors text-xs uppercase tracking-widest rounded-full"
        >
          Regresar a Login
        </button>
        <button 
           onClick={onClose}
           className="text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="w-full max-w-lg p-6 md:p-8 relative z-10 flex flex-col items-center justify-center min-h-[500px]">
        {isSubmitted ? (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-slate-800 p-12 md:p-16 rounded-[2rem] text-center w-full shadow-2xl"
            >
                <div className="bg-emerald-500/10 p-6 rounded-full inline-block mb-8">
                    <CheckCircle className="w-20 h-20 text-emerald-500" />
                </div>
                <h3 className="text-3xl md:text-4xl font-display font-bold mb-6">Aplicación recibida con éxito</h3>
                <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                    Su aplicación para ventas B2B ha sido registrada. Nuestro equipo de selección evaluará su perfil y nos pondremos en contacto en un plazo de 24 horas.
                </p>
                <button 
                    onClick={onClose}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl transition-all text-lg shadow-lg hover:shadow-emerald-500/20"
                >
                    Volver a la plataforma
                </button>
            </motion.div>
        ) : (
            <div className="w-full bg-[#0a0a0a]/80 backdrop-blur-xl p-8 md:p-10 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative">
                
                <div className="mb-8">
                    <h2 className="text-xl md:text-2xl font-display font-bold flex items-center justify-center gap-3 mb-2 text-center text-slate-100">
                        <Briefcase className="text-amber-500" size={24} />
                        Formulario de Aplicación
                    </h2>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full mt-6 overflow-hidden">
                        <motion.div 
                            className="bg-amber-500 h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>

                <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="relative min-h-[220px] flex items-center">
                    <AnimatePresence custom={direction} mode="popLayout" initial={false}>
                        {currentStep === 0 && (
                            <motion.div
                                key="step-0"
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full"
                            >
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 text-center">Nombre completo</label>
                                <p className="text-xs text-slate-500 text-center mb-6 px-4">Empecemos por conocernos. Ingresa tu nombre tal como aparece en tu documento de identidad.</p>
                                <div className="relative">
                                    <User className="absolute left-4 top-4 text-slate-600" size={20} />
                                    <input 
                                        autoFocus
                                        required 
                                        type="text"
                                        value={formData.nombre} 
                                        onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
                                        className="w-full pl-12 pr-4 py-3.5 bg-[#111] border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-base font-medium" 
                                        placeholder="Ej. Ana María Gómez"
                                    />
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 1 && (
                            <motion.div
                                key="step-1"
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full space-y-4"
                            >
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 text-center">Ubicación</label>
                                <p className="text-xs text-slate-500 text-center mb-6 px-4">Selecciona el país y la ciudad desde donde estarás operando.</p>
                                <div>
                                    <select 
                                        required 
                                        value={formData.pais} 
                                        onChange={(e) => setFormData({...formData, pais: e.target.value, ciudad: ''})} 
                                        className="w-full px-4 py-3.5 bg-[#111] border border-slate-800 rounded-xl text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm font-medium appearance-none cursor-pointer"
                                    >
                                        <option value="" disabled>Seleccione un país</option>
                                        {Object.keys(countriesAndCities).map(pais => (
                                            <option key={pais} value={pais}>{pais}</option>
                                        ))}
                                    </select>
                                </div>
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: formData.pais ? 1 : 0, height: formData.pais ? 'auto' : 0 }}
                                    className="overflow-hidden"
                                >
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1 mt-2">Ciudad</label>
                                    <select 
                                        required 
                                        value={formData.ciudad} 
                                        onChange={(e) => setFormData({...formData, ciudad: e.target.value})} 
                                        className="w-full px-4 py-3.5 bg-[#111] border border-slate-800 rounded-xl text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm font-medium appearance-none cursor-pointer"
                                    >
                                        <option value="" disabled>Seleccione una ciudad</option>
                                        {formData.pais && countriesAndCities[formData.pais]?.map(ciudad => (
                                            <option key={ciudad} value={ciudad}>{ciudad}</option>
                                        ))}
                                    </select>
                                </motion.div>
                            </motion.div>
                        )}

                        {currentStep === 2 && (
                            <motion.div
                                key="step-2"
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full"
                            >
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 text-center">Dirección de correo electrónico</label>
                                <p className="text-xs text-slate-500 text-center mb-6 px-4">Asegúrate de ingresar un correo que revises con frecuencia.</p>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-4 text-slate-600" size={20} />
                                    <input 
                                        autoFocus
                                        type="email" 
                                        required 
                                        value={formData.correo} 
                                        onChange={(e) => setFormData({...formData, correo: e.target.value})} 
                                        className="w-full pl-12 pr-4 py-3.5 bg-[#111] border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-base font-medium" 
                                        placeholder="correo@ejemplo.com"
                                    />
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 3 && (
                            <motion.div
                                key="step-3"
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full"
                            >
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 text-center">Número de teléfono (WhatsApp)</label>
                                <p className="text-xs text-slate-500 text-center mb-6 px-4">Nuestro equipo se pondrá en contacto contigo por este medio.</p>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-4 text-slate-600" size={20} />
                                    <input 
                                        autoFocus
                                        type="tel"
                                        required 
                                        value={formData.whatsapp} 
                                        onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} 
                                        className="w-full pl-12 pr-4 py-3.5 bg-[#111] border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-base font-medium" 
                                        placeholder="+57 321 000 0000"
                                    />
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 4 && (
                            <motion.div
                                key="step-4"
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full"
                            >
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 text-center">Idiomas de dominio profesional</label>
                                <p className="text-xs text-slate-500 text-center mb-6 px-4">Selecciona los idiomas en los que tienes fluidez profesional o nativa.</p>
                                <div className="grid grid-cols-2 gap-4 px-1">
                                    {['Español', 'Inglés', 'Portugués', 'Francés', 'Alemán'].map((idioma) => {
                                        const isSelected = formData.idiomas.includes(idioma);
                                        return (
                                            <label 
                                                key={idioma} 
                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' : 'bg-[#111] border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-[#151515]'}`}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected} 
                                                    onChange={(e) => {
                                                        if (e.target.checked) setFormData({...formData, idiomas: [...formData.idiomas, idioma]});
                                                        else setFormData({...formData, idiomas: formData.idiomas.filter(i => i !== idioma)});
                                                    }} 
                                                    className="w-4 h-4 rounded border-slate-700 bg-transparent text-amber-500 focus:ring-amber-500 focus:ring-offset-0" 
                                                />
                                                <span className="text-sm font-medium">{idioma}</span>
                                            </label>
                                        );
                                    })}
                                    <div className={`flex flex-col justify-center p-3 rounded-xl border transition-all ${formData.idiomas.includes('Otros') ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' : 'bg-[#111] border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-[#151515]'}`}>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={formData.idiomas.includes('Otros')} 
                                                onChange={(e) => {
                                                    if (e.target.checked) setFormData({...formData, idiomas: [...formData.idiomas, 'Otros']});
                                                    else setFormData({...formData, idiomas: formData.idiomas.filter(i => i !== 'Otros'), otroIdioma: ''});
                                                }} 
                                                className="w-4 h-4 rounded border-slate-700 bg-transparent text-amber-500 focus:ring-amber-500 focus:ring-offset-0" 
                                            />
                                            <span className="text-sm font-medium">Otros</span>
                                        </label>
                                        {formData.idiomas.includes('Otros') && (
                                            <input 
                                                type="text" 
                                                value={formData.otroIdioma} 
                                                onChange={(e) => setFormData({...formData, otroIdioma: e.target.value})}
                                                placeholder="Ej. Italiano, Ruso..." 
                                                className="w-full mt-2 bg-black border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                                            />
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 5 && (
                            <motion.div
                                key="step-5"
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full text-center"
                            >
                                <div className="mb-6 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 inline-block">
                                    <BrainCircuit className="text-amber-500" size={32} />
                                </div>
                                <h3 className="text-xl font-bold mb-4 text-slate-200">Confirmación de aplicación</h3>
                                <p className="text-slate-400 text-sm mb-6">Por favor, revise y acepte los términos correspondientes para procesar su aplicación.</p>
                                
                                <label className="flex items-start justify-center gap-3 cursor-pointer pt-1 group bg-[#111] border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        required 
                                        checked={formData.aceptaDatos} 
                                        onChange={(e) => setFormData({...formData, aceptaDatos: e.target.checked})} 
                                        className="w-5 h-5 mt-0.5 rounded border-slate-700 bg-black text-amber-500 focus:ring-amber-500 flex-shrink-0" 
                                    />
                                    <span className="text-xs text-slate-400 group-hover:text-slate-300 text-left leading-relaxed">
                                        Autorizo el tratamiento de mis datos personales para los fines del proceso de selección de CapiBee de acuerdo a las políticas de privacidad.
                                    </span>
                                </label>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between items-center relative z-20">
                    <button
                        type="button"
                        onClick={prevStep}
                        className={`flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white px-4 py-2 rounded-lg transition-colors ${currentStep === 0 ? 'opacity-0 pointer-events-none' : ''}`}
                    >
                        <ArrowLeft size={16} /> Atrás
                    </button>
                    
                    {currentStep < totalSteps - 1 ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-all shadow-lg hover:shadow-amber-500/20"
                        >
                            Siguiente <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            type="button" // Use type button then trigger submit on form or call handle explicitly
                            onClick={handleSubmit}
                            disabled={!formData.aceptaDatos}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-all shadow-lg disabled:shadow-none hover:shadow-emerald-500/20"
                        >
                            <Send size={16} /> Enviar Solicitud
                        </button>
                    )}
                </div>

            </div>
        )}
      </div>
    </div>
  );
}

