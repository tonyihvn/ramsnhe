/**
 * Role Utilities - Backend role checking functions
 * Ensures consistent role handling across the server
 * 
 * Database roles: super-admin, Admin, Form Builder, Data Collector, Reviewer, Viewer
 * All functions handle case-insensitive variations
 */

export function isAdminRole(role) {
    if (!role) return false;
    const normalized = String(role).toLowerCase().trim();
    return normalized === 'admin' || 
           normalized === 'super-admin' || 
           normalized === 'super_admin' || 
           normalized === 'super admin';
}

export function isSuperAdminRole(role) {
    if (!role) return false;
    const normalized = String(role).toLowerCase().trim();
    return normalized === 'super-admin' || 
           normalized === 'super_admin' || 
           normalized === 'super admin' ||
           normalized === 'superadmin';
}

export function isFormBuilderRole(role) {
    if (!role) return false;
    const normalized = String(role).toLowerCase().trim();
    return normalized === 'form builder' || 
           normalized === 'form-builder' || 
           normalized === 'form_builder';
}

export function isDataCollectorRole(role) {
    if (!role) return false;
    const normalized = String(role).toLowerCase().trim();
    return normalized === 'data collector' || 
           normalized === 'data-collector' || 
           normalized === 'data_collector';
}

export function isReviewerRole(role) {
    if (!role) return false;
    const normalized = String(role).toLowerCase().trim();
    return normalized === 'reviewer';
}

export function isViewerRole(role) {
    if (!role) return false;
    const normalized = String(role).toLowerCase().trim();
    return normalized === 'viewer';
}

/**
 * Normalize role to standard format for database storage and comparisons
 * Returns capitalized format matching database seeds
 */
export function normalizeRoleName(role) {
    if (!role) return role;
    const normalized = String(role).toLowerCase().trim();
    
    if (normalized === 'admin') return 'Admin';
    if (normalized === 'super-admin' || normalized === 'super_admin' || normalized === 'super admin') return 'super-admin';
    if (normalized === 'form builder' || normalized === 'form_builder' || normalized === 'form-builder') return 'Form Builder';
    if (normalized === 'data collector' || normalized === 'data_collector' || normalized === 'data-collector') return 'Data Collector';
    if (normalized === 'reviewer') return 'Reviewer';
    if (normalized === 'viewer') return 'Viewer';
    
    return role;
}

/**
 * Check if a role has admin-level access
 */
export function hasAdminAccess(role) {
    return isAdminRole(role);
}

/**
 * Check if a role has super-admin-level access
 */
export function hasSuperAdminAccess(role) {
    return isSuperAdminRole(role);
}

/**
 * List of all known roles
 */
export const KNOWN_ROLES = {
    ADMIN: 'Admin',
    SUPER_ADMIN: 'super-admin',
    FORM_BUILDER: 'Form Builder',
    DATA_COLLECTOR: 'Data Collector',
    REVIEWER: 'Reviewer',
    VIEWER: 'Viewer',
};

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
};

/**
 * Get role level in hierarchy
 */
export function getRoleLevel(role) {
    if (!role) return 0;
    const normalized = String(role).toLowerCase().trim().replace(/[_-]/g, ' ');
    return ROLE_HIERARCHY[normalized] || 0;
}
