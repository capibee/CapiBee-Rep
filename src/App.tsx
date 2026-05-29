/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Clock } from "lucide-react";
import Login from "./components/Login";
import ModulesSelection from "./components/ModulesSelection";
import Layout from "./components/Layout";
import SplashLoader from "./components/SplashLoader";
import ModuleLoader from "./components/ModuleLoader";
import ZadarmaWidget from "./components/ZadarmaWidget";
import { Role, ModulePermission } from "./types";

import Dashboard from "./components/Dashboard";
const Contabilidad = lazy(() => import("./components/Contabilidad"));
const Clientes = lazy(() => import("./components/Clientes"));
const MyBusinesses = lazy(() => import("./components/MyBusinesses"));
const Agentes = lazy(() => import("./components/Agentes"));
const Ganancias = lazy(() => import("./components/Ganancias"));
const Asuntos = lazy(() => import("./components/Asuntos"));
const Propuestas = lazy(() => import("./components/Propuestas"));
const UsuariosRoles = lazy(() => import("./components/UsuariosRoles"));
const Solicitudes = lazy(() => import("./components/Solicitudes"));
const Finanzas = lazy(() => import("./components/Finanzas"));
const SupabaseHub = lazy(() => import("./components/SupabaseHub"));

const FallbackLoader = () => (
  <div className="flex-1 h-full min-h-[300px] flex items-center justify-center">
    <div className="relative w-28 h-28 flex items-center justify-center animate-pulse">
      <img
        src="https://i.ibb.co/G4W60yY5/Logo-Capibee-2-removebg-preview.png"
        alt="CapiBee"
        className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(250,204,21,0.5)] mix-blend-screen"
      />
    </div>
  </div>
);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<{
    id?: string;
    email: string;
    roleId: string;
    roleName?: string;
    fullName?: string;
    avatar?: string;
  } | null>(null);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false);
  const [isModuleChanging, setIsModuleChanging] = useState<boolean>(false);
  const [pendingModule, setPendingModule] = useState<string | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem("capibee_auth");
    const storedUser = localStorage.getItem("capibee_user");
    if (auth === "true" && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
      setIsInitialLoading(true);
    }
  }, []);

  useEffect(() => {
    // Wipe all development data to prepare for real database connections
    if (!localStorage.getItem("capibee_wipe_all_v8_real_db")) {
      const keysToClear = [
        "capibee_businesses",
        "capibee_clientes",
        "capibee_invoices",
        "capibee_withdrawals",
        "capibee_agent_earnings",
        "capibee_solicitudes",
        "capibee_temp_reset_pagado",
        "capibee_limit_3_v1",
        "capibee_wipe_v5",
        "capibee_wipe_v6",
        "capibee_wipe_v_force_all_final",
        "capibee_platform_users",
        "capibee_platform_roles",
      ];
      keysToClear.forEach((key) => localStorage.removeItem(key));
      localStorage.setItem("capibee_wipe_all_v8_real_db", "true");

      // Also log them out
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem("capibee_auth");
      localStorage.removeItem("capibee_user");
    }
  }, []);

  const handleLogin = (
    loggedInUser: {
      id?: string;
      email: string;
      roleId: string;
      roleName?: string;
      fullName?: string;
      avatar?: string;
    } | null,
  ) => {
    setIsAuthenticated(true);
    setUser(loggedInUser);
    setIsInitialLoading(true);
    localStorage.setItem("capibee_auth", "true");
    if (loggedInUser) {
      localStorage.setItem("capibee_user", JSON.stringify(loggedInUser));
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setActiveModule(null);
    localStorage.removeItem("capibee_auth");
    localStorage.removeItem("capibee_user");
  };

  const handleModuleChange = (moduleId: string | null) => {
    if (moduleId === activeModule) return;
    setPendingModule(moduleId);
    setIsModuleChanging(true);
  };

  useEffect(() => {
    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        handleModuleChange(customEvent.detail);
      }
    };
    window.addEventListener("capibee-change-module", handleCustomChange);
    return () =>
      window.removeEventListener("capibee-change-module", handleCustomChange);
  }, [activeModule]);

  useEffect(() => {
    if (!isModuleChanging) return;

    const timer = setTimeout(() => {
      setActiveModule(pendingModule);
      setIsModuleChanging(false);
    }, 750);

    return () => clearTimeout(timer);
  }, [isModuleChanging, pendingModule, activeModule]);

  const userPermissions = useMemo(() => {
    const fullPermissions: Record<string, ModulePermission> = {
      registro_negocios: {
        active: true,
        view: true,
        create: true,
        edit: true,
        delete: true,
      },
      clientes: {
        active: true,
        view: true,
        create: true,
        edit: true,
        delete: true,
      },
      contabilidad: {
        active: true,
        view: true,
        create: true,
        edit: true,
        delete: true,
      },
      mis_negocios: {
        active: true,
        view: true,
        create: true,
        edit: true,
        delete: true,
      },
      agentes: {
        active: true,
        view: true,
        create: true,
        edit: true,
        delete: true,
      },
      ganancias: {
        active: true,
        view: true,
        create: true,
        edit: true,
        delete: true,
      },
      asuntos: {
        active: true,
        view: true,
        create: true,
        edit: true,
        delete: true,
      },
      propuestas: {
        active: true,
        view: true,
        create: true,
        edit: true,
        delete: true,
      },
      usuarios_roles: {
        active: true,
        view: true,
        create: true,
        edit: true,
        delete: true,
      },
      finanzas: {
        active: true,
        view: true,
        create: true,
        edit: true,
        delete: true,
      },
      solicitudes: {
        active: true,
        view: true,
        create: true,
        edit: true,
        delete: true,
      },
      supabase: {
        active: true,
        view: true,
        create: true,
        edit: true,
        delete: true,
      },
    };

    if (!user) return {};
    if (user.roleId === "ADMIN_MAESTRO") return fullPermissions;

    const savedRoles = localStorage.getItem("capibee_platform_roles");
    let roles: Role[] = [];
    if (savedRoles) {
      try {
        roles = JSON.parse(savedRoles);
      } catch (e) {
        // ignore
      }
    }

    const currentRole = roles.find((r) => r.id === user.roleId);
    if (!currentRole || !currentRole.permissions) {
      return {};
    }

    const perms = { ...currentRole.permissions };
    const roleIdStr = (user?.roleId || "").toLowerCase();
    const roleNameStr = (user?.roleName || "").toLowerCase();
    const isAllowed =
      user?.roleId === "ADMIN_MAESTRO" ||
      roleIdStr.includes("admin") ||
      roleNameStr.includes("admin") ||
      roleIdStr.includes("desarrollo") ||
      roleNameStr.includes("desarrollo");

    if (!isAllowed) {
      perms["mis_negocios"] = {
        active: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
      };
    }

    return perms;
  }, [user]);

  // Authenticated state and loader routing are configured in mainChild below

  const renderContent = () => {
    if (isModuleChanging) {
      const moduleNames: Record<string, string> = {
        registro_negocios: "Contactos",
        asuntos: "Asuntos",
        propuestas: "Propuestas",
        clientes: "Clientes",
        contabilidad: "Facturas",
        mis_negocios: "Establecimientos",
        agentes: "Agentes CapiBee",
        ganancias: "Transacciones",
        usuarios_roles: "Usuarios y Roles",
        solicitudes: "Formularios",
        supabase: "Backoffice",
        finanzas: "KPI's",
        panel: "Panel de Control",
      };
      const name = pendingModule
        ? moduleNames[pendingModule] || "Panel"
        : "Panel de Control";
      return <ModuleLoader moduleName={name} />;
    }

    if (activeModule === "panel") {
      return (
        <div className="text-white p-8">Panel Principal (Próximamente)</div>
      );
    }

    if (
      activeModule === "registro_negocios" &&
      userPermissions["registro_negocios"]?.active
    ) {
      return (
        <Dashboard
          onLogout={handleLogout}
          onBack={() => handleModuleChange(null)}
        />
      );
    }

    if (
      activeModule === "contabilidad" &&
      userPermissions["contabilidad"]?.active
    ) {
      return (
        <Contabilidad
          onLogout={handleLogout}
          onBack={() => handleModuleChange(null)}
        />
      );
    }

    if (activeModule === "clientes" && userPermissions["clientes"]?.active) {
      return (
        <Clientes
          onLogout={handleLogout}
          onBack={() => handleModuleChange(null)}
        />
      );
    }

    if (
      activeModule === "mis_negocios" &&
      userPermissions["mis_negocios"]?.active
    ) {
      return (
        <MyBusinesses
          onLogout={handleLogout}
          onBack={() => handleModuleChange(null)}
        />
      );
    }

    if (activeModule === "agentes" && userPermissions["agentes"]?.active) {
      return (
        <Agentes
          onLogout={handleLogout}
          onBack={() => handleModuleChange(null)}
        />
      );
    }

    if (activeModule === "ganancias" && userPermissions["ganancias"]?.active) {
      return (
        <Ganancias
          onLogout={handleLogout}
          onBack={() => handleModuleChange(null)}
          user={user}
        />
      );
    }

    if (activeModule === "asuntos" && userPermissions["asuntos"]?.active) {
      return <Asuntos onBack={() => handleModuleChange(null)} />;
    }

    if (
      activeModule === "propuestas" &&
      userPermissions["propuestas"]?.active
    ) {
      return <Propuestas onBack={() => handleModuleChange(null)} />;
    }

    if (
      activeModule === "usuarios_roles" &&
      userPermissions["usuarios_roles"]?.active
    ) {
      return (
        <UsuariosRoles
          onLogout={handleLogout}
          onBack={() => handleModuleChange(null)}
        />
      );
    }

    if (
      activeModule === "solicitudes" &&
      (user?.roleId === "ADMIN_MAESTRO" ||
        userPermissions["solicitudes"]?.active)
    ) {
      return <Solicitudes />;
    }

    if (
      activeModule === "finanzas" &&
      (user?.roleId === "ADMIN_MAESTRO" || userPermissions["finanzas"]?.active)
    ) {
      return <Finanzas />;
    }

    if (activeModule === "supabase" && userPermissions["supabase"]?.active) {
      return <SupabaseHub onBack={() => handleModuleChange(null)} />;
    }

    return (
      <ModulesSelection
        onSelectModule={handleModuleChange}
        onLogout={handleLogout}
        userPermissions={userPermissions}
      />
    );
  };

  const mainChild = (() => {
    if (!isAuthenticated || !user) {
      return <Login onLogin={handleLogin} />;
    }

    if (isInitialLoading) {
      return <SplashLoader onComplete={() => setIsInitialLoading(false)} />;
    }

    return (
      <Layout
        activeModule={isModuleChanging ? pendingModule : activeModule}
        onSelectModule={handleModuleChange}
        onLogout={handleLogout}
        userPermissions={userPermissions}
        user={user}
        onUpdateUser={setUser}
      >
        <Suspense fallback={<FallbackLoader />}>{renderContent()}</Suspense>
      </Layout>
    );
  })();

  return (
    <>
      {mainChild}
      {isAuthenticated && <ZadarmaWidget />}
      <WorldClocks />
    </>
  );
}

function WorldClocks() {
  const [times, setTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      const zones = {
        "EE.UU": "America/New_York",
        México: "America/Mexico_City",
        Colombia: "America/Bogota",
        Argentina: "America/Argentina/Buenos_Aires",
        España: "Europe/Madrid",
      };
      const formatted: Record<string, string> = {};
      Object.entries(zones).forEach(([name, tz]) => {
        try {
          formatted[name] = now.toLocaleTimeString("es-ES", {
            timeZone: tz,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        } catch (e) {
          formatted[name] = "--:--";
        }
      });
      setTimes(formatted);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-1.5 right-2 sm:right-4 z-[99999] pointer-events-none select-none flex items-center gap-1.5 sm:gap-2.5 text-[8.5px] sm:text-[10.5px] font-medium text-white/50 sm:text-white/60 tracking-wide font-mono bg-slate-950/40 backdrop-blur-[2px] px-2 py-0.5 rounded-full sm:bg-transparent sm:backdrop-blur-none sm:px-0 sm:py-0">
      <span className="flex items-center gap-1">
        <Clock size={8.5} className="text-amber-400 animate-pulse sm:w-2.5 sm:h-2.5" />
        <span className="hidden sm:inline">EE.UU</span>
        <span className="sm:hidden">US</span> {times["EE.UU"] || "--:--"}
      </span>
      <span className="text-white/20 select-none">•</span>
      <span className="flex items-center gap-1">
        <Clock size={8.5} className="text-amber-400 animate-pulse sm:w-2.5 sm:h-2.5" />
        <span className="hidden sm:inline">México</span>
        <span className="sm:hidden">MX</span> {times["México"] || "--:--"}
      </span>
      <span className="text-white/20 select-none">•</span>
      <span className="flex items-center gap-1">
        <Clock size={8.5} className="text-amber-400 animate-pulse sm:w-2.5 sm:h-2.5" />
        <span className="hidden sm:inline">Colombia</span>
        <span className="sm:hidden">CO</span> {times["Colombia"] || "--:--"}
      </span>
      <span className="text-white/20 select-none">•</span>
      <span className="flex items-center gap-1">
        <Clock size={8.5} className="text-amber-400 animate-pulse sm:w-2.5 sm:h-2.5" />
        <span className="hidden sm:inline">Argentina</span>
        <span className="sm:hidden">AR</span> {times["Argentina"] || "--:--"}
      </span>
      <span className="text-white/20 select-none">•</span>
      <span className="flex items-center gap-1">
        <Clock size={8.5} className="text-amber-400 animate-pulse sm:w-2.5 sm:h-2.5" />
        <span className="hidden sm:inline">España</span>
        <span className="sm:hidden">ES</span> {times["España"] || "--:--"}
      </span>
    </div>
  );
}
