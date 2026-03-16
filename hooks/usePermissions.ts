import { useMemo } from 'react';
import { useMetadata } from '../contexts/MetadataContext';
import { useMockData } from './useMockData';

export const usePermissions = () => {
  const { meta } = useMetadata();
  const { currentUser } = useMockData();

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
