import { useMemo } from 'react';
import { ModulePermission, Role } from '../types';

export function usePermissions(moduleId: string): ModulePermission {
  const user = localStorage.getItem('capibee_user') ? JSON.parse(localStorage.getItem('capibee_user') as string) : null;
  const rolesText = localStorage.getItem('capibee_platform_roles');

  return useMemo(() => {
    const fullPermissions: ModulePermission = { active: true, view: true, create: true, edit: true, delete: true };
    const emptyPermissions: ModulePermission = { active: false, view: false, create: false, edit: false, delete: false };

    if (!user) return emptyPermissions;
    if (user.roleId === 'ADMIN_MAESTRO') return fullPermissions;

    let roles: Role[] = [];
    if (rolesText) {
      try {
        roles = JSON.parse(rolesText);
      } catch (e) {}
    }

    const currentRole = roles.find(r => r.id === user.roleId);
    if (!currentRole || !currentRole.permissions || !currentRole.permissions[moduleId]) {
      return emptyPermissions;
    }
    
    return currentRole.permissions[moduleId];
  }, [user, rolesText, moduleId]);
}
