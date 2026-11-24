/**
 * Role Utilities - Centralized role checking functions
 * Ensures consistent role handling across the frontend application
 * 
 * Database roles: super-admin, Admin, Form Builder, Data Collector, Reviewer, Viewer
 * All functions handle case-insensitive variations:
 *   - admin, Admin, ADMIN
 *   - super-admin, Super Admin, super_admin, SUPER_ADMIN, etc.
 */

export function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = String(role).toLowerCase().trim();
  return normalized === 'admin' || 
         normalized === 'super-admin' || 
         normalized === 'super_admin' || 
         normalized === 'super admin';
}

export function isSuperAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = String(role).toLowerCase().trim();
  return normalized === 'super-admin' || 
         normalized === 'super_admin' || 
         normalized === 'super admin' ||
         normalized === 'superadmin';
}

export function isFormBuilderRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = String(role).toLowerCase().trim();
  return normalized === 'form builder' || 
         normalized === 'form-builder' || 
         normalized === 'form_builder';
}

export function isDataCollectorRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = String(role).toLowerCase().trim();
  return normalized === 'data collector' || 
         normalized === 'data-collector' || 
         normalized === 'data_collector';
}

export function isReviewerRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = String(role).toLowerCase().trim();
  return normalized === 'reviewer';
}

export function isViewerRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = String(role).toLowerCase().trim();
  return normalized === 'viewer';
}

/**
 * Get human-readable role name for display purposes
 * Normalizes all variations to standard format
 */
export function getHumanReadableRole(role?: string | null): string {
  if (!role) return '';
  const normalized = String(role).toLowerCase().trim();
  
  if (normalized === 'admin') return 'Admin';
  if (normalized === 'super-admin' || normalized === 'super_admin' || normalized === 'super admin' || normalized === 'superadmin') return 'Super Admin';
  if (normalized === 'form builder' || normalized === 'form_builder' || normalized === 'form-builder') return 'Form Builder';
  if (normalized === 'data collector' || normalized === 'data_collector' || normalized === 'data-collector') return 'Data Collector';
  if (normalized === 'reviewer') return 'Reviewer';
  if (normalized === 'viewer') return 'Viewer';
  
  // Return original role if not recognized (e.g., custom roles)
  return String(role);
}

/**
 * Check if a role has admin-level access
 * Includes both Admin and Super Admin roles
 */
export function hasAdminAccess(role?: string | null): boolean {
  return isAdminRole(role);
}

/**
 * Check if a role has super-admin-level access
 */
export function hasSuperAdminAccess(role?: string | null): boolean {
  return isSuperAdminRole(role);
}

/**
 * List of all known role types (for UI components, filters, etc.)
 */
export const KNOWN_ROLES = {
  ADMIN: 'Admin',
  SUPER_ADMIN: 'super-admin',
  FORM_BUILDER: 'Form Builder',
  DATA_COLLECTOR: 'Data Collector',
  REVIEWER: 'Reviewer',
  VIEWER: 'Viewer',
} as const;

/**
 * Role hierarchy (higher number = more permissions)
 */
export const ROLE_HIERARCHY = {
  'viewer': 1,
  'reviewer': 2,
  'data collector': 3,
  'form builder': 4,
  'admin': 5,
  'super-admin': 6,
} as const;

/**
 * Get role level in hierarchy
 */
export function getRoleLevel(role?: string | null): number {
  if (!role) return 0;
  const normalized = String(role).toLowerCase().trim().replace(/[_-]/g, ' ');
  return (ROLE_HIERARCHY as Record<string, number>)[normalized] || 0;
}
