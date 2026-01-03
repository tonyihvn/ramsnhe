import { useEffect, useState } from 'react';
import { useMockData } from './useMockData';

export interface ActivityRolePermission {
  activity_id: string;
  role_id: number;
  page_key: string;
  section_key?: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  role_name?: string;
}

export interface OriginalRolePermission {
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

export const useActivityPermissions = (activityId?: string) => {
  const { currentUser } = useMockData();
  const [permissions, setPermissions] = useState<ActivityRolePermission[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<OriginalRolePermission | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activityId) return;

    const fetchPermissions = async () => {
      try {
        setLoading(true);
        
        // Fetch activity-level permissions (secondary)
        const res = await fetch(`/api/activities/${activityId}/role_permissions`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setPermissions(Array.isArray(data) ? data : []);
        }
        
        // Fetch original role permissions from backend (primary)
        // This checks the traditional ROLES/PERMISSIONS/USER_ROLES system
        try {
          const originalRes = await fetch(`/api/check-original-permissions?activityId=${activityId}`, {
            credentials: 'include',
          });
          if (originalRes.ok) {
            const originalData = await originalRes.json();
            setOriginalPermissions(originalData || null);
          }
        } catch (e) {
          console.debug('Original permissions endpoint not available, using activity permissions only:', e);
        }
      } catch (e) {
        console.error('Failed to fetch activity permissions:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [activityId]);

  const checkPermission = (
    action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    pageKey?: string,
    sectionKey?: string
  ): boolean => {
    if (!currentUser) return false;

    // Admins and super admins have all permissions
    const userRole = String(currentUser.role || '').toLowerCase().trim();
    if (userRole === 'admin' || userRole === 'super-admin' || userRole === 'super_admin') {
      return true;
    }

    // PRIORITY 1: Check original role permissions (PRIMARY)
    // If original permissions exist for this action, use them (even if false)
    if (originalPermissions && action in originalPermissions) {
      return !!originalPermissions[action];
    }

    // PRIORITY 2: Check activity-level permissions (SECONDARY)
    // Only use activity permissions if no original permission was found
    for (const perm of permissions) {
      // If no pageKey specified, check any permission record that has the action enabled
      if (!pageKey) {
        if (perm[action]) {
          return true;
        }
      }
      // Match by page_key and section_key if both are provided
      else if (pageKey && (sectionKey || sectionKey === null)) {
        if (perm.page_key === pageKey && perm.section_key === sectionKey) {
          return perm[action];
        }
      }
      // Match by page_key prefix
      else if (pageKey && !sectionKey) {
        if (perm.page_key === pageKey) {
          return perm[action];
        }
      }
    }

    return false;
  };

  return {
    permissions,
    originalPermissions,
    loading,
    checkPermission,
  };
};
