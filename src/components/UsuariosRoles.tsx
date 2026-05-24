/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Plus, 
  Search, 
  Trash2, 
  X, 
  Mail, 
  Lock, 
  UserCircle2,
  Calendar,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PlatformUser, Role, ModulePermission } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import { supabase } from '../lib/supabase';

const PLATFORM_MODULES = [
  { id: 'registro_negocios', name: 'Contactos' },
  { id: 'asuntos', name: 'Asuntos' },
  { id: 'propuestas', name: 'Propuestas' },
  { id: 'clientes', name: 'Clientes' },
  { id: 'contabilidad', name: 'Facturas' },
  { id: 'mis_negocios', name: 'Establecimientos' },
  { id: 'agentes', name: 'Agentes CapiBee' },
  { id: 'ganancias', name: 'Transacciones' },
  { id: 'usuarios_roles', name: 'Usuarios y Roles' },
  { id: 'solicitudes', name: 'Formularios' },
  { id: 'supabase', name: 'Backoffice' },
  { id: 'finanzas', name: 'KPI\'s' },
];
import { TableLoader } from './TableLoader';

interface UsuariosRolesProps {
  onLogout: () => void;
  onBack: () => void;
}

export default function UsuariosRoles({}: UsuariosRolesProps) {
  const permissions = usePermissions('usuarios_roles');
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  const [userForm, setUserForm] = useState({
    fullName: '',
    email: '',
    password: '',
    roleId: ''
  });

  const initialPermissions = useMemo(() => PLATFORM_MODULES.reduce((acc, mod) => {
    acc[mod.id] = { create: false, view: false, edit: false, delete: false, active: false };
    return acc;
  }, {} as Record<string, ModulePermission>), []);

  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: initialPermissions
  });

  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [isTableLoading, setIsTableLoading] = useState(true);

  useEffect(() => {
    // 1. Load initially from localStorage for fast render
    const savedUsers = localStorage.getItem('capibee_platform_users');
    const savedRoles = localStorage.getItem('capibee_platform_roles');
    const savedSolicitudes = localStorage.getItem('capibee_solicitudes');
    
    if (savedUsers) setUsers(JSON.parse(savedUsers));
    if (savedRoles) setRoles(JSON.parse(savedRoles));
    if (savedSolicitudes) setSolicitudes(JSON.parse(savedSolicitudes));

    // 2. Fetch fresh roles from Supabase
    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase.from('roles').select('*');
        if (!error && data) {
          const mapped = data.map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description || '',
            permissions: r.permissions || {},
            createdAt: Number(r.created_at) || Date.now()
          }));
          setRoles(mapped);
          localStorage.setItem('capibee_platform_roles', JSON.stringify(mapped));
        }
      } catch (err) {
        console.warn("Could not fetch roles from Supabase:", err);
      }
    };

    // 3. Fetch fresh users from Supabase
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase.from('platform_users').select('*');
        if (!error && data) {
          const mapped = data.map((u: any) => ({
            id: u.id,
            fullName: u.full_name,
            roleId: u.role_id || '',
            roleName: u.role_name || '',
            email: u.email,
            password: u.password || '',
            avatar: u.avatar || '',
            createdAt: Number(u.created_at) || Date.now(),
            status: u.status || 'Activo'
          }));
          setUsers(mapped);
          localStorage.setItem('capibee_platform_users', JSON.stringify(mapped));
        }
      } catch (err) {
        console.warn("Could not fetch users from Supabase:", err);
      }
    };

    // 4. Fetch fresh solicitudes from Supabase
    const fetchSolicitudes = async () => {
      try {
        const { data, error } = await supabase.from('solicitudes').select('*');
        if (!error && data) {
          const mapped = data.map((s: any) => {
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
      } catch (err) {
        console.warn("Could not fetch solicitudes:", err);
      }
    };

    const loadAll = async () => {
      await Promise.all([fetchRoles(), fetchUsers(), fetchSolicitudes()]);
      setIsTableLoading(false);
    };
    loadAll();

    // 5. Subscribe to real-time changes
    const rolesChannel = supabase.channel('roles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, () => {
        fetchRoles();
      })
      .subscribe();

    const usersChannel = supabase.channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_users' }, () => {
        fetchUsers();
      })
      .subscribe();

    const solsChannel = supabase.channel('solicitudes-users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' }, () => {
        fetchSolicitudes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(solsChannel);
    };
  }, []);

  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete-role' | 'delete-user' | 'edit-role' | 'error';
    id?: string;
    message?: string;
  } | null>(null);

  const saveToStorage = (newUsers: PlatformUser[], newRoles: Role[]) => {
    localStorage.setItem('capibee_platform_users', JSON.stringify(newUsers));
    localStorage.setItem('capibee_platform_roles', JSON.stringify(newRoles));
  };

  const handleSaveRole = () => {
    if (!roleForm.name) return;
    if (editingRole ? !permissions.edit : !permissions.create) return;
    
    if (editingRole) {
      setConfirmAction({ type: 'edit-role' });
    } else {
      executeSaveRole();
    }
  };

  const executeSaveRole = async () => {
    let updatedRoles: Role[];
    const roleId = editingRole ? editingRole.id : 'ROL-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const newRoleObj: Role = {
      id: roleId,
      name: roleForm.name,
      description: roleForm.description,
      permissions: roleForm.permissions,
      createdAt: editingRole ? editingRole.createdAt : Date.now()
    };
    
    if (editingRole) {
      updatedRoles = roles.map(r => r.id === editingRole.id ? newRoleObj : r);
    } else {
      updatedRoles = [...roles, newRoleObj];
    }

    setRoles(updatedRoles);
    saveToStorage(users, updatedRoles);

    // Save to Supabase DB Live
    try {
      const { error } = await supabase.from('roles').upsert({
        id: newRoleObj.id,
        name: newRoleObj.name,
        description: newRoleObj.description,
        permissions: newRoleObj.permissions,
        created_at: newRoleObj.createdAt
      }, { onConflict: 'id' });
      if (error) {
        console.error("Error saving role to Supabase:", error);
        setConfirmAction({
          type: 'error',
          message: `Error de Supabase al guardar el rol: ${error.message}. Por favor asegúrate de ejecutar el script de creación de tablas.`
        });
        return;
      }
    } catch (err: any) {
      console.error("Supabase communication error during role save:", err);
      setConfirmAction({
        type: 'error',
        message: `Error de red al guardar el rol: ${err.message || err}`
      });
      return;
    }

    setRoleForm({ name: '', description: '', permissions: initialPermissions });
    setEditingRole(null);
    setIsRoleModalOpen(false);
    setConfirmAction(null);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    // Merge existing permissions with defaults in case of missing keys in old data
    const mergedPermissions = { ...initialPermissions, ...role.permissions };                
    setRoleForm({
      name: role.name,
      description: role.description || '',
      permissions: mergedPermissions
    });
    setIsRoleModalOpen(true);
  };

  const handleDeleteRole = (id: string) => {
    if (!permissions.delete) return;
    if (users.some(u => u.roleId === id)) {
      setConfirmAction({
        type: 'error',
        message: 'No se puede eliminar un rol que tiene usuarios asignados. Modifica o elimina los usuarios asociados primero.',
      });
      return;
    }
    setConfirmAction({ type: 'delete-role', id });
  };

  const executeDeleteRole = async (id: string) => {
    const updatedRoles = roles.filter(r => r.id !== id);
    setRoles(updatedRoles);
    saveToStorage(users, updatedRoles);

    // Delete from Supabase DB Live
    try {
      const { error } = await supabase.from('roles').delete().eq('id', id);
      if (error) {
        console.error("Error deleting role from Supabase:", error);
      }
    } catch (err) {
      console.error("Supabase communication error during role deletion:", err);
    }
  };

  const handleCreateUser = async () => {
    if (!userForm.fullName || !userForm.email || !userForm.password || !userForm.roleId || !permissions.create) return;

    const selectedRole = roles.find(r => r.id === userForm.roleId);
    
    const newUser: PlatformUser = {
      id: 'USR-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
      fullName: userForm.fullName,
      email: userForm.email,
      password: userForm.password,
      roleId: userForm.roleId,
      roleName: selectedRole?.name || 'Invitado',
      createdAt: Date.now(),
      status: 'Activo'
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveToStorage(updatedUsers, roles);

    // Save to Supabase DB Live
    try {
      const { error } = await supabase.from('platform_users').upsert({
        id: newUser.id,
        full_name: newUser.fullName,
        role_id: newUser.roleId,
        role_name: newUser.roleName,
        email: newUser.email,
        password: newUser.password,
        status: newUser.status,
        created_at: newUser.createdAt
      }, { onConflict: 'id' });
      if (error) {
        console.error("Error saving user to Supabase:", error);
        setConfirmAction({
          type: 'error',
          message: `Error de Supabase al guardar personal: ${error.message}. Asegúrate de tener la tabla 'platform_users' listada con políticas RLS.`
        });
        return;
      }
    } catch (err: any) {
      console.error("Supabase communication error during user save:", err);
      setConfirmAction({
        type: 'error',
        message: `Error de red al guardar personal: ${err.message || err}`
      });
      return;
    }

    setUserForm({ fullName: '', email: '', password: '', roleId: '' });
    setIsUserModalOpen(false);
  };

  const handleDeleteUser = (id: string) => {
    if (!permissions.delete) return;
    setConfirmAction({ type: 'delete-user', id });
  };

  const executeDeleteUser = async (id: string) => {
    const updatedUsers = users.filter(u => u.id !== id);
    setUsers(updatedUsers);
    saveToStorage(updatedUsers, roles);

    // Delete from Supabase DB Live
    try {
      const { error } = await supabase.from('platform_users').delete().eq('id', id);
      if (error) {
        console.error("Error deleting user from Supabase:", error);
        setConfirmAction({
          type: 'error',
          message: `Error de Supabase al eliminar personal: ${error.message}.`
        });
      }
    } catch (err: any) {
      console.error("Supabase communication error during user deletion:", err);
      setConfirmAction({
        type: 'error',
        message: `Error de red al eliminar personal: ${err.message || err}`
      });
    }
  };

  const filteredUsers = useMemo(() => {
    let filtered = users;
    
    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.roleName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (userSearchTerm) {
       filtered = filtered.filter(u => 
         u.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
         u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
       );
    }
    
    if (userRoleFilter) {
       filtered = filtered.filter(u => u.roleId === userRoleFilter);
    }
    
    return filtered;
  }, [users, searchTerm, userSearchTerm, userRoleFilter]);

  const togglePasswordVisibility = (id: string) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const togglePermission = (moduleId: string, action: keyof ModulePermission) => {
    setRoleForm(prev => {
      const currentModule = prev.permissions[moduleId] || { create: false, view: false, edit: false, delete: false, active: false };
      const newValue = !currentModule[action];
      
      const newPermissions = {
        ...prev.permissions,
        [moduleId]: {
          ...currentModule,
          [action]: newValue
        }
      };

      // If any specific permission is checked, also mark the module as active, and vice versa
      if (action !== 'active' && newValue) {
        newPermissions[moduleId].active = true;
      }

      return {
        ...prev,
        permissions: newPermissions
      };
    });
  };

  const handleModuleActiveToggle = (moduleId: string) => {
    setRoleForm(prev => {
      const currentModule = prev.permissions[moduleId] || { create: false, view: false, edit: false, delete: false, active: false };
      const isActive = !currentModule.active;
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [moduleId]: {
            active: isActive,
            create: isActive,
            view: isActive,
            edit: isActive,
            delete: isActive
          }
        }
      };
    });
  };

  return (
    <div className="h-full bg-transparent flex flex-col font-sans overflow-hidden text-slate-200">
      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto custom-scrollbar min-h-0">
        <div className="max-w-[1400px] mx-auto">
          
          <div className="mb-10 flex flex-col md:flex-row md:items-center justify-end gap-6">
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => setIsRoleModalOpen(true)}
                disabled={!permissions.create}
                className={`px-6 py-3 border rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 group ${!permissions.create ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-900 border-slate-700/50 text-white hover:border-blue-500/50'}`}
              >
                <div className="w-5 h-5 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                  <Shield size={12} />
                </div>
                Crear Rol
              </button>

              <button 
                onClick={() => setIsUserModalOpen(true)}
                className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center gap-2 active:scale-95 ${roles.length === 0 || !permissions.create ? 'bg-blue-600/50 text-white/50 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                disabled={roles.length === 0 || !permissions.create}
                title={!permissions.create ? "No tienes permiso para crear" : (roles.length === 0 ? "Debes crear al menos un rol primero" : "")}
              >
                <Plus size={16} />
                Nuevo Usuario
              </button>
            </div>
          </div>

          <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                placeholder="Buscar por nombre, correo o rol..." 
                className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-sm focus:outline-none focus:border-blue-500/30 transition-all shadow-inner"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-4 text-xs font-bold text-slate-500 tracking-widest uppercase">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {users.length} Usuarios
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-700" />
                {roles.length} Roles definidos
              </div>
            </div>
          </div>

          <div className="mb-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Roles de Usuario</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Configura los niveles de acceso</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {roles.map((role) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={role.id}
                    className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 hover:border-blue-500/30 transition-all group relative"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[9px] font-mono font-black text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg">
                        {role.id}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { if (permissions.edit) handleEditRole(role); }}
                          disabled={!permissions.edit}
                          className={`p-2 rounded-xl transition-all ${!permissions.edit ? 'text-slate-700 cursor-not-allowed' : 'text-slate-600 hover:text-blue-400 hover:bg-blue-500/10'}`}
                          title={!permissions.edit ? "No tienes permiso" : "Editar Permisos"}
                        >
                          <ShieldCheck size={16} />
                        </button>
                        <button 
                          onClick={() => { if (permissions.delete) handleDeleteRole(role.id); }}
                          disabled={!permissions.delete}
                          className={`p-2 rounded-xl transition-all ${!permissions.delete ? 'text-slate-700 cursor-not-allowed' : 'text-slate-600 hover:text-red-500 hover:bg-red-500/10'}`}
                          title={!permissions.delete ? "No tienes permiso" : "Eliminar Rol"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-lg font-black text-white mb-2 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{role.name}</h3>
                    <p className="text-xs text-slate-500 font-medium mb-6 line-clamp-2">
                      {role.description || "Sin descripción establecida."}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-auto">
                      {PLATFORM_MODULES.map(mod => (
                        role.permissions[mod.id]?.active && (
                          <div key={mod.id} className="px-2 py-1 bg-slate-800/80 rounded-lg text-[8px] font-black uppercase text-slate-400 tracking-tighter hover:text-blue-400 transition-colors">
                            {mod.name.split(' ')[0]}
                          </div>
                        )
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {roles.length === 0 && (
              <div className="bg-slate-900/30 border border-slate-800/50 border-dashed rounded-3xl p-12 flex flex-col items-center text-center">
                <Shield size={32} className="text-slate-700 mb-4" />
                <p className="text-slate-600 text-xs font-black uppercase tracking-widest">No hay roles definidos aún</p>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Listado de Personal</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Gestión de usuarios y accesos</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o correo..."
                  className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500/50 transition-all text-white placeholder-slate-500"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="w-full sm:w-48 appearance-none pl-4 pr-10 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 focus:outline-none focus:border-blue-500/50 transition-all outline-none"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="">Todos los Roles</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/30">
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-10">#</th>
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">ID Usuario</th>
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre Completo</th>
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rol</th>
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha Ingreso</th>
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Correo Electrónico</th>
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Contraseña</th>
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado</th>
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isTableLoading ? (
                    <tr>
                      <td colSpan={10} className="py-8">
                        <TableLoader />
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 font-medium">
                        No se encontraron usuarios
                      </td>
                    </tr>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {filteredUsers.map((user, idx) => (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.05 }}
                        key={user.id} 
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-all group"
                      >
                        <td className="p-5 text-center font-mono text-[10px] text-slate-500 select-none w-10">
                          {idx + 1}
                        </td>
                        <td className="p-5">
                          <span className="text-[10px] font-mono font-black text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg">
                            {user.id}
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-all">
                              <UserCircle2 size={16} />
                            </div>
                            <span className="text-xs text-white font-bold tracking-tight">
                              {user.fullName}
                            </span>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-800 text-slate-300 border border-slate-700/50">
                            <Shield size={10} className="text-blue-400" />
                            {user.roleName}
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                            <Calendar size={12} className="text-slate-600" />
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <Mail size={12} className="text-slate-600" />
                            {user.email}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            <Lock size={12} className="text-slate-600" />
                            <span className="text-xs font-mono text-slate-500">
                              {showPassword[user.id] ? user.password : '••••••••'}
                            </span>
                            <button 
                              onClick={() => togglePasswordVisibility(user.id)}
                              className="text-slate-600 hover:text-blue-400 transition-colors p-1"
                            >
                              {showPassword[user.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${user.status === 'Inactivo' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                            {user.status === 'Inactivo' ? 'Inactivo' : 'Activo'}
                          </span>
                        </td>
                        <td className="p-5 text-right">
                          <button 
                            onClick={() => { if (permissions.delete) handleDeleteUser(user.id); }}
                            disabled={!permissions.delete}
                            className={`p-2 rounded-xl transition-all ${!permissions.delete ? 'text-slate-700 cursor-not-allowed' : 'text-slate-600 hover:text-red-500 hover:bg-red-500/10'}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center p-20 text-center">
                <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-700 mb-6 animate-pulse">
                  <Users size={32} />
                </div>
                <h3 className="text-slate-400 font-bold mb-2 tracking-tight">No se encontraron usuarios</h3>
                <p className="text-slate-600 text-[10px] uppercase tracking-widest font-black max-w-xs leading-relaxed">
                  Comienza creando roles y luego añade a tu equipo para gestionar los accesos.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Role Modal */}
      <AnimatePresence>
        {isRoleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRoleModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                  <Shield className="text-blue-500" />
                  {editingRole ? 'Editar Rol y Permisos' : 'Nuevo Rol y Permisos'}
                </h2>
                <button 
                  onClick={() => {
                    setIsRoleModalOpen(false);
                    setEditingRole(null);
                    setRoleForm({ name: '', description: '', permissions: initialPermissions });
                  }} 
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Nombre del Rol</label>
                    <input 
                      type="text"
                      placeholder="Ej: Administrador, Soporte..."
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-all font-medium"
                      value={roleForm.name}
                      onChange={e => setRoleForm({...roleForm, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Descripción</label>
                    <input 
                      type="text"
                      placeholder="Alcance del rol..."
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-all font-medium"
                      value={roleForm.description}
                      onChange={e => setRoleForm({...roleForm, description: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Configuración de Permisos por Módulo</label>
                  <div className="space-y-3">
                    {PLATFORM_MODULES.map((module) => (
                      <div key={module.id} className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-4 transition-all hover:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${roleForm.permissions[module.id]?.active ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                              <ShieldCheck size={16} />
                            </div>
                            <span className="text-xs font-black text-white uppercase tracking-tight">{module.name}</span>
                          </div>
                          <button 
                            onClick={() => handleModuleActiveToggle(module.id)}
                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                              roleForm.permissions[module.id]?.active 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {roleForm.permissions[module.id]?.active ? 'Habilitado' : 'Deshabilitado'}
                          </button>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {['view', 'create', 'edit', 'delete'].map((action) => (
                            <button
                              key={action}
                              onClick={() => togglePermission(module.id, action as keyof ModulePermission)}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                                roleForm.permissions[module.id]?.[action as keyof ModulePermission]
                                  ? 'bg-blue-500/5 border-blue-500/30 text-blue-400'
                                  : 'bg-transparent border-slate-800 text-slate-600 hover:border-slate-700'
                              }`}
                            >
                              <span className="text-[8px] font-black uppercase tracking-tighter mb-1">
                                {action === 'view' ? 'Ver' : 
                                 action === 'create' ? 'Crear' :
                                 action === 'edit' ? 'Editar' : 'Eliminar'}
                              </span>
                              <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                                roleForm.permissions[module.id][action as keyof ModulePermission]
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-slate-700'
                              }`}>
                                {roleForm.permissions[module.id][action as keyof ModulePermission] && <Plus size={8} className="text-slate-950 stroke-[4]" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleSaveRole}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!roleForm.name}
                  >
                    {editingRole ? 'Guardar Cambios' : 'Establecer Rol y Permisos'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Modal */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUserModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                  <UserCircle2 className="text-blue-500" />
                  Nuevo Usuario
                </h2>
                <button onClick={() => setIsUserModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Vincular Formulario B2B</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                    <select 
                      className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-all font-medium appearance-none"
                      onChange={e => {
                        const selectedId = e.target.value;
                        const sol = solicitudes.find(s => s.id === selectedId);
                        if (sol) {
                          setUserForm(prev => ({
                            ...prev,
                            fullName: sol.nombre,
                            email: sol.correo
                          }));
                        }
                      }}
                    >
                      <option value="">Seleccionar formulario de aplicación...</option>
                      {solicitudes.map(sol => (
                        <option key={sol.id} value={sol.id}>{sol.nombre} ({sol.correo})</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Selecciona un formulario para autocompletar la información del usuario.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Nombre Completo</label>
                    <div className="relative">
                      <UserCircle2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                      <input 
                        type="text"
                        placeholder="Cesar Orozco"
                        className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-all font-medium"
                        value={userForm.fullName}
                        onChange={e => setUserForm({...userForm, fullName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Rol Asignado</label>
                    <div className="relative">
                      <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                      <select 
                        className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-all font-medium appearance-none"
                        value={userForm.roleId}
                        onChange={e => setUserForm({...userForm, roleId: e.target.value})}
                      >
                        <option value="">Seleccionar Rol...</option>
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Correo Electrónico</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input 
                      type="email"
                      placeholder="admin@capibee.ia"
                      className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-all font-medium font-mono"
                      value={userForm.email}
                      onChange={e => setUserForm({...userForm, email: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Contraseña de Acceso</label>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input 
                      type="password"
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-all font-medium"
                      value={userForm.password}
                      onChange={e => setUserForm({...userForm, password: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleCreateUser}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!userForm.fullName || !userForm.email || !userForm.password || !userForm.roleId}
                  >
                    Habilitar Usuario
                  </button>
                  <p className="text-center text-[10px] text-slate-500 mt-4 font-bold uppercase tracking-tighter">
                    El usuario podrá acceder con estas credenciales inmediatamente
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {/* Confirm Modal */}
        {confirmAction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
              onClick={() => setConfirmAction(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-700/50 rounded-3xl p-6 md:p-8 w-full max-w-md relative z-10 overflow-hidden shadow-2xl"
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto mb-6 text-slate-400">
                  {confirmAction.type === 'error' ? <AlertTriangle size={32} className="text-amber-500" /> :
                   confirmAction.type.includes('delete') ? <Trash2 size={32} className="text-red-500" /> : <ShieldCheck size={32} className="text-blue-500" />}
                </div>
                <h3 className="text-2xl font-black text-white px-2 tracking-tight">
                  {confirmAction.type === 'error' ? 'Acción no permitida' :
                   confirmAction.type === 'delete-role' ? '¿Eliminar Rol?' :
                   confirmAction.type === 'delete-user' ? '¿Eliminar Usuario?' :
                   '¿Guardar Modificaciones?'}
                </h3>
                <p className="text-slate-400 mt-4 font-medium text-sm">
                  {confirmAction.type === 'error' ? confirmAction.message :
                   confirmAction.type === 'delete-role' ? 'El rol será eliminado permanentemente. Los usuarios actuales seguirán teniendo un texto en rol pero perderán el acceso asociado a los permisos.' :
                   confirmAction.type === 'delete-user' ? 'El acceso de este usuario a la plataforma será revocado de inmediato.' :
                   'Pulsar Confirmar para aplicar y guardar los nuevos permisos al rol. Esto afectará inmediatamente a los usuarios asignados.'}
                </p>

                <div className="flex gap-4 mt-8">
                  {confirmAction.type === 'error' ? (
                    <button 
                      onClick={() => setConfirmAction(null)}
                      className="w-full px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-900 bg-amber-500 hover:bg-amber-400 shadow-xl shadow-amber-500/20 transition-all"
                    >
                      Entendido
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => setConfirmAction(null)}
                        className="flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={() => {
                          if (confirmAction.type === 'delete-role' && confirmAction.id) executeDeleteRole(confirmAction.id);
                          if (confirmAction.type === 'delete-user' && confirmAction.id) executeDeleteUser(confirmAction.id);
                          if (confirmAction.type === 'edit-role') executeSaveRole();
                          setConfirmAction(null);
                        }}
                        className={`flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all ${
                          confirmAction.type.includes('delete') 
                            ? 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)]' 
                            : 'bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/20'
                        }`}
                      >
                        Confirmar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
