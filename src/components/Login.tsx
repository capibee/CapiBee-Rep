/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Shield,
  Mail,
  Lock,
  ChevronDown,
  Hexagon,
  Sparkles,
  Network,
  Cpu,
  Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ADMIN_PASSWORD } from "../constants";
import { Role, PlatformUser } from "../types";
import BackgroundPattern from "./BackgroundPattern";
import Logo from "./Logo";
import B2BSalesApplicationForm from "./B2BSalesApplicationForm";
import { supabase } from "../lib/supabase";

interface LoginProps {
  onLogin: (
    user: {
      id?: string;
      email: string;
      roleId: string;
      roleName?: string;
      fullName?: string;
      avatar?: string;
    } | null,
  ) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showB2BForm, setShowB2BForm] = useState(false);

  const THEMES = [
    { name: "yellow", rgb1: "250, 204, 21", rgb2: "234, 179, 8", hexDark: "#422006", rawHex: "#facc15" },
    { name: "blue", rgb1: "56, 189, 248", rgb2: "14, 165, 233", hexDark: "#082f49", rawHex: "#38bdf8" },
    { name: "green", rgb1: "74, 222, 128", rgb2: "34, 197, 94", hexDark: "#052e16", rawHex: "#4ade80" },
    { name: "cyan", rgb1: "34, 211, 238", rgb2: "6, 182, 212", hexDark: "#083344", rawHex: "#22d3ee" },
    { name: "white", rgb1: "248, 250, 252", rgb2: "226, 232, 240", hexDark: "#0f172a", rawHex: "#f8fafc" }
  ];

  const getThemeIndex = (roleId: string) => {
    if (!roleId || roleId === "ADMIN_MAESTRO") return 0;
    let hash = 0;
    for (let i = 0; i < roleId.length; i++) {
        hash = roleId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 1 + (Math.abs(hash) % (THEMES.length - 1));
  };

  const activeTheme = THEMES[getThemeIndex(selectedRoleId)];

  const messages = [
    {
      title: "Creamos la Inteligencia que mueve al mundo",
      color: "text-white",
      description: "Transformamos empresas con Agentes IA de nueva generación. Implementamos tecnología CapiBee para compañías que no solo adoptan la IA, sino que la convierten en el motor de su éxito."
    },
    {
      title: "Desarrollamos soluciones cognitivas a medida",
      color: "text-white",
      description: "Conceptualizamos soluciones inteligentes para desafíos operativos complejos. Convertimos fricciones en ventajas competitivas mediante nuestra arquitectura avanzada."
    },
    {
      title: "Evolución digital de alcance global",
      color: "text-white",
      description: "Con una sólida presencia en Estados Unidos, España, Colombia, México y Argentina, somos el aliado tecnológico de referencia para organizaciones que lideran el mercado iberoamericano."
    },
    {
      title: "Tu ambición merece resultados exponenciales",
      color: "text-yellow-500",
      description: "Recibe las comisiones más competitivas del mercado por vender soluciones de Inteligencia Artificial. Transformamos tu talento y esfuerzo en una ventaja financiera superior."
    },
    {
      title: "Sé un Ejecutivo Comercial de élite",
      color: "text-yellow-500",
      description: "Únete a CapiBee y redefine tu éxito profesional. Como Ejecutivo Comercial, formas parte de un ecosistema de alto impacto donde la tecnología y la rentabilidad se encuentran."
    },
    {
      title: "Optimización que redefine la eficiencia",
      color: "text-yellow-500",
      description: "Ahorramos horas críticas al automatizar procesos. Ayudamos a las empresas a recuperar tiempo valioso para que se centren en lo único que importa: escalar su negocio."
    }
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    // 1. Load initially from localStorage for fast render
    const savedRoles = localStorage.getItem("capibee_platform_roles");
    if (savedRoles) {
      setRoles(JSON.parse(savedRoles));
    }

    // 2. Fetch fresh roles from Supabase
    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase.from('Roles').select('*');
        if (!error && data) {
          const mapped = data.map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description || '',
            permissions: r.permissions || {},
            createdAt: Number(r.created_at) || r.created_at || Date.now()
          }));
          setRoles(mapped);
          localStorage.setItem('capibee_platform_roles', JSON.stringify(mapped));
        }
      } catch (err) {
        console.warn("Could not fetch roles from Supabase at login:", err);
      }
    };

    fetchRoles();

    // 3. Subscribe to real-time changes
    const channel = supabase.channel('login-roles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Roles' }, () => {
        fetchRoles();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [messages.length]);

  const handleRoleChange = (roleId: string) => {
    setSelectedRoleId(roleId);
    setError("");
    if (roleId === "ADMIN_MAESTRO") {
      setEmail("admin@capibee.ia");
    } else {
      setEmail("");
    }
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoleId) {
      setError("Selecciona un rol de acceso.");
      return;
    }
    if (!email) {
      setError("Ingresa tu correo.");
      return;
    }
    if (!password) {
      setError("Ingresa tu contraseña.");
      return;
    }

    setIsSubmitting(true);

    // Artificial delay for feel
    await new Promise((r) => setTimeout(r, 600));

    // 1. First, try to authenticate via Supabase if connected
    try {
      const { data: dbUsers, error: dbError } = await supabase
        .from("Usuarios")
        .select("*")
        .eq("email", email.trim());

      if (!dbError && dbUsers && dbUsers.length > 0) {
        const matchingUser = dbUsers.find(
          (u) => u.role_id === selectedRoleId && u.password === password
        );
        if (matchingUser) {
          onLogin({
            id: matchingUser.id,
            email: matchingUser.email,
            roleId: matchingUser.role_id,
            roleName: matchingUser.role_name || (matchingUser.role_id === "ADMIN_MAESTRO" ? "Super Administrador" : ""),
            fullName: matchingUser.full_name,
            avatar: matchingUser.avatar,
          });
          setIsSubmitting(false);
          return;
        }
      }
    } catch (suppressedError) {
      console.warn("Supabase auth check failed, falling back to local credentials:", suppressedError);
    }

    // 2. Local Fallback for offline / development
    if (selectedRoleId === "ADMIN_MAESTRO") {
      const isCustomAdmin = email === "capibee.ia@gmail.com" && (password === ADMIN_PASSWORD || password === "1$alome$0");
      const isLegacyAdmin = email === "admin@capibee.ia" && password === ADMIN_PASSWORD;

      if (isCustomAdmin) {
        onLogin({
          email: "capibee.ia@gmail.com",
          roleId: "ADMIN_MAESTRO",
          roleName: "SuperAdmin",
          fullName: "Admin Global",
        });
      } else if (isLegacyAdmin) {
        onLogin({
          email: "admin@capibee.ia",
          roleId: "ADMIN_MAESTRO",
          roleName: "SuperAdmin",
          fullName: "Admin Global",
        });
      } else {
        setError("Credenciales de SuperAdmin incorrectas.");
        setIsSubmitting(false);
      }
    } else {
      // Check platform users
      const savedUsers = localStorage.getItem("capibee_platform_users");
      const users: PlatformUser[] = savedUsers ? JSON.parse(savedUsers) : [];

      const user = users.find(
        (u) => u.email === email && u.roleId === selectedRoleId,
      );

      if (user && user.password === password) {
        onLogin({
          id: user.id,
          email: user.email,
          roleId: user.roleId,
          roleName: user.roleName,
          fullName: user.fullName,
          avatar: user.avatar,
        });
      } else {
        setError("Credenciales incorrectas para el rol seleccionado.");
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-950 p-3 xs:p-5 sm:p-8 lg:p-12 relative font-sans overflow-x-hidden overflow-y-auto">
        {!showB2BForm && (
          <button 
            onClick={() => setShowB2BForm(true)}
            className="fixed top-3 right-3 sm:top-6 sm:right-8 z-[999] px-3.5 py-2 sm:px-5 sm:py-2.5 bg-slate-900/60 backdrop-blur-md border border-slate-800 hover:bg-yellow-500/10 hover:border-yellow-500/30 hover:text-yellow-500 text-slate-300 text-[9px] sm:text-xs font-bold tracking-widest uppercase rounded-xl flex items-center gap-1.5 sm:gap-2.5 transition-all shadow-lg"
          >
            <Briefcase size={12} className="sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">Trabaja con nosotros</span>
            <span className="inline xs:hidden">Unirse</span>
          </button>
        )}

        {/* Background Decor - Honeycomb / AI Aesthetic */}
        <BackgroundPattern />

      {/* Glows */}
      <motion.div 
         animate={{ backgroundColor: `rgba(${activeTheme.rgb1}, 0.1)` }}
         transition={{ duration: 1 }}
         className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full animate-pulse pointer-events-none" 
      />
      <motion.div 
         animate={{ backgroundColor: `rgba(${activeTheme.rgb2}, 0.1)` }}
         transition={{ duration: 1 }}
         className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full pointer-events-none" 
      />

      <div className="max-w-7xl w-full mx-auto relative z-10 flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-12 items-center px-2 xs:px-4 md:px-6 py-6 lg:py-0">
        
        {/* Mobile Header: Hidden on lg screens */}
        <div className="lg:hidden flex flex-col items-center text-center mt-12 mb-2 z-10">
          <Logo size={60} textClassName="text-2xl" />
          <h2 className="text-[10px] font-light text-yellow-200/60 tracking-[0.15em] uppercase flex items-center gap-1.5 mt-2">
            <Network className="text-yellow-500/40" size={11} />
            Software & IA
          </h2>
          <div className="w-8 h-0.5 bg-gradient-to-r from-yellow-500 to-transparent mt-3 opacity-60" />
        </div>

        {/* Left Column content (slideshow description) - Visible on lg screens */}
        <div className="hidden lg:flex flex-col justify-center py-8 lg:py-0 text-center lg:text-left">
          
          <div className="mb-4 flex justify-center lg:justify-start">
            <Logo size={80} textClassName="text-3xl sm:text-4xl lg:text-5xl" />
          </div>
          
          <h2 className="text-base sm:text-lg font-light text-yellow-200/80 mb-4 mt-2 tracking-[0.15em] uppercase flex items-center justify-center lg:justify-start gap-2">
            <Network className="text-yellow-500/50" size={16} />
            Software & IA
          </h2>

          <div className="w-12 h-1 bg-gradient-to-r from-yellow-500 to-transparent mb-6 mx-auto lg:mx-0 opacity-80" />

          <div className="relative h-40 sm:h-32 mb-6 w-full overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentMessageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <h2 className={`text-xl md:text-2xl font-bold mb-2 leading-tight ${messages[currentMessageIndex].color}`}>
                  {messages[currentMessageIndex].title}
                </h2>
                <p className="text-[#A0AEC0] text-xs md:text-sm leading-[1.5] max-w-lg mx-auto lg:mx-0">
                  {messages[currentMessageIndex].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex gap-1.5 justify-center lg:justify-start mb-6">
            {messages.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1 rounded-full transition-all duration-500 ${idx === currentMessageIndex ? 'w-6 bg-yellow-500' : 'w-1.5 bg-slate-800'}`}
              />
            ))}
          </div>
        </div>

        {/* Right Column: Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            "--theme-r1": activeTheme.rgb1,
            "--theme-r2": activeTheme.rgb2,
            "--theme-raw": activeTheme.rawHex,
            "--theme-dark": activeTheme.hexDark,
          } as any}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-sm mx-auto lg:max-w-md z-10"
        >
          <div className="bg-slate-950/80 backdrop-blur-2xl rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden p-5 sm:p-8 relative">
            
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />

            <div className="mb-6 sm:mb-8 text-center lg:text-left relative z-10 border-b border-slate-800/50 pb-4">
              <h3 className="text-slate-200 text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] flex items-center justify-center lg:justify-start gap-2">
                <Shield size={13} className="text-yellow-500" />
                Acceso al Sistema
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              <div className="space-y-3.5 sm:space-y-4">
                {/* Role Select Dropdown */}
                <div className="space-y-1">
                  <label className="block text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 sm:px-2">
                    Seleccione su rol
                  </label>
                  <div className="relative group">
                    <Shield
                      className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-yellow-500 transition-colors"
                      size={13}
                    />
                    <select
                      className="w-full pl-9 sm:pl-10 pr-8 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-yellow-500/50 text-slate-200 text-xs sm:text-sm outline-none appearance-none cursor-pointer transition-all"
                      value={selectedRoleId}
                      onChange={(e) => handleRoleChange(e.target.value)}
                    >
                      <option value="" className="bg-slate-950 text-slate-500">
                        Seleccionar Rol de Sistema...
                      </option>
                      <option
                        value="ADMIN_MAESTRO"
                        className="bg-slate-950 text-yellow-500 font-medium"
                      >
                        Super Administrador
                      </option>
                      {roles.filter(role => role.id !== "ADMIN_MAESTRO").map((role) => (
                        <option
                          key={role.id}
                          value={role.id}
                          className="bg-slate-950 text-slate-200"
                        >
                          {role.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <ChevronDown size={13} />
                    </div>
                  </div>
                </div>

                {/* Conditional Fields */}
                <AnimatePresence mode="wait">
                  {selectedRoleId && (
                    <motion.div
                      key="auth-fields"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3.5 sm:space-y-4 overflow-hidden"
                    >
                      <div className="space-y-1">
                        <label className="block text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 sm:px-2">
                          Correo Electrónico
                        </label>
                        <div className="relative group">
                          <Mail
                            className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-yellow-500 transition-colors"
                            size={13}
                          />
                          <input
                            type="email"
                            placeholder={selectedRoleId === "ADMIN_MAESTRO" ? "admin@capibee.ia" : "agente@capibee.ia"}
                            className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-yellow-500/50 text-slate-200 text-xs sm:text-sm outline-none placeholder:text-slate-650 transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 sm:px-2">
                          Contraseña de Acceso
                        </label>
                        <div className="relative group">
                          <Lock
                            className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-yellow-500 transition-colors"
                            size={13}
                          />
                          <input
                            type="password"
                            placeholder="••••••••"
                            className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-yellow-500/50 text-slate-200 text-xs sm:text-sm outline-none placeholder:text-slate-650 transition-all tracking-widest"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-2 sm:pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedRoleId}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold tracking-widest uppercase py-3 sm:py-3.5 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:hover:bg-yellow-500 flex items-center justify-center gap-2 text-xs"
                >
                  {isSubmitting ? "Autenticando..." : "Ingresar"}
                </button>
              </div>
            </form>
            
            <div className="mt-6 pt-5 border-t border-slate-800/50 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Hecho con IA S.A.S.</p>
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-1 font-medium">© 2026 Todos los derechos reservados</p>
            </div>
          </div>
        </motion.div>
      </div>
      {showB2BForm && (
        <B2BSalesApplicationForm onClose={() => setShowB2BForm(false)} />
      )}
    </div>
  );
}

