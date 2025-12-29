import { ChartPieIcon, DocumentTextIcon, BuildingOfficeIcon, UserGroupIcon, FolderIcon, ClipboardDocumentListIcon, Cog6ToothIcon, UserIcon, MapIcon, CogIcon, CheckIcon, ClipboardIcon } from '@heroicons/react/24/outline';

export interface NavMenuItem {
  key: string;
  page_key: string;
  defaultName: string;
  href: string;
  icon: any;
  superAdminOnly?: boolean;
  openInNewWindow?: boolean;
  group?: string; // Group name for sidebar grouping
}

export interface NavMenuGroup {
  name: string;
  items: NavMenuItem[];
}

export const navigationStatic: NavMenuItem[] = [
  // Super Admin Tools (shown only for super-admin role)
  { key: 'super_admin_console', page_key: '/super-admin', defaultName: 'Super Admin Console', href: '/super-admin', icon: CogIcon, superAdminOnly: true, group: 'Super Admin' },
  { key: 'super_admin_users', page_key: '/super-admin/users', defaultName: 'User Management', href: '/super-admin/users', icon: UserGroupIcon, superAdminOnly: true, group: 'Super Admin' },
  { key: 'super_admin_landing', page_key: '/super-admin/landing-page', defaultName: 'Landing Page Config', href: '/super-admin/landing-page', icon: DocumentTextIcon, superAdminOnly: true, group: 'Super Admin' },
  { key: 'super_admin_payment_approvals', page_key: '/super-admin/payment-approvals', defaultName: 'Payment Approvals', href: '/super-admin/payment-approvals', icon: CheckIcon, superAdminOnly: true, group: 'Super Admin' },
  { key: 'super_admin_account_approvals', page_key: '/super-admin/account-approvals', defaultName: 'Account Approvals', href: '/super-admin/account-approvals', icon: ClipboardIcon, superAdminOnly: true, group: 'Super Admin' },
  { key: 'super_admin_landing_designer', page_key: '/super-admin/landing-page-designer', defaultName: 'Landing Page Designer', href: '/super-admin/landing-page-designer', icon: DocumentTextIcon, superAdminOnly: true, group: 'Super Admin' },
  
  // Data & Analytics
  { key: 'dashboard', page_key: '/dashboard', defaultName: 'Dashboard', href: '/dashboard', icon: ChartPieIcon, group: 'Data & Analytics' },
  { key: 'map_dashboard', page_key: '/map-dashboard', defaultName: 'Map Dashboard', href: '/map-dashboard', icon: MapIcon, group: 'Data & Analytics' },
  { key: 'indicators', page_key: '/indicators', defaultName: 'Indicators', href: '/indicators', icon: ChartPieIcon, group: 'Data & Analytics' },
  { key: 'reports', page_key: '/reports', defaultName: 'Reports', href: '/reports', icon: DocumentTextIcon, group: 'Data & Analytics' },
  
  // Content Management
  { key: 'programs', page_key: '/programs', defaultName: 'Programs', href: '/programs', icon: FolderIcon, group: 'Content' },
  { key: 'activities', page_key: '/activities', defaultName: 'Activities', href: '/activities', icon: ClipboardDocumentListIcon, group: 'Content' },
  { key: 'datasets', page_key: '/datasets', defaultName: 'Datasets', href: '/datasets', icon: FolderIcon, group: 'Content' },
  
  // Organization
  { key: 'facilities', page_key: '/facilities', defaultName: 'Facilities', href: '/facilities', icon: BuildingOfficeIcon, group: 'Organization' },
  { key: 'users', page_key: '/users', defaultName: 'Users', href: '/users', icon: UserGroupIcon, group: 'Organization' },
  
  // System
  { key: 'connectors', page_key: '/connectors', defaultName: 'Connectors', href: '/connectors', icon: DocumentTextIcon, group: 'System' },
  { key: 'settings', page_key: '/settings', defaultName: 'Settings', href: '/settings', icon: Cog6ToothIcon, group: 'System' },
  { key: 'profile', page_key: '/profile', defaultName: 'Profile', href: '/profile', icon: UserIcon, group: 'System' },
];

export default navigationStatic;
