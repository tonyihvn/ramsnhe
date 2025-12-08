import { ChartPieIcon, DocumentTextIcon, BuildingOfficeIcon, UserGroupIcon, FolderIcon, ClipboardDocumentListIcon, Cog6ToothIcon, UserIcon, MapIcon } from '@heroicons/react/24/outline';

export const navigationStatic = [
  { key: 'dashboard', page_key: '/dashboard', defaultName: 'Dashboard', href: '/dashboard', icon: ChartPieIcon },
  { key: 'map_dashboard', page_key: '/map-dashboard', defaultName: 'Map Dashboard', href: '/map-dashboard', icon: MapIcon },
  { key: 'programs', page_key: '/programs', defaultName: 'Programs', href: '/programs', icon: FolderIcon },
  { key: 'datasets', page_key: '/datasets', defaultName: 'Datasets', href: '/datasets', icon: FolderIcon },
  { key: 'activities', page_key: '/activities', defaultName: 'Activities', href: '/activities', icon: ClipboardDocumentListIcon },
  { key: 'reports', page_key: '/reports', defaultName: 'Reports', href: '/reports', icon: DocumentTextIcon },
  { key: 'indicators', page_key: '/indicators', defaultName: 'Indicators', href: '/indicators', icon: ChartPieIcon },
  { key: 'facilities', page_key: '/facilities', defaultName: 'Facilities', href: '/facilities', icon: BuildingOfficeIcon },
  { key: 'users', page_key: '/users', defaultName: 'Users', href: '/users', icon: UserGroupIcon },
  { key: 'connectors', page_key: '/connectors', defaultName: 'Connectors', href: '/connectors', icon: DocumentTextIcon },
  { key: 'settings', page_key: '/settings', defaultName: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  { key: 'profile', page_key: '/profile', defaultName: 'Profile', href: '/profile', icon: UserIcon },
];

export default navigationStatic;
