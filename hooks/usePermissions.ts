import { useMemo } from 'react';
import { useMetadata } from '../contexts/MetadataContext';
import { useData } from './useData';

export const usePermissions = () => {
  const { meta } = useMetadata();
  const { currentUser } = useData();

  const perms = useMemo(() => {
    const roleId = currentUser?.role;
    if (!roleId) return [] as string[];
    const rolePerms = (meta.role_permissions && (meta.role_permissions as any)[roleId]) || [];
    return Array.isArray(rolePerms) ? rolePerms : [];
  }, [meta, currentUser]);

  const has = (permId: string) => perms.includes(permId);

  return { permissions: perms, hasPermission: has };
};

export default usePermissions;
