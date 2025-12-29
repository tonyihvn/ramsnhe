import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { DocumentPlusIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import navigationStatic from './navigation';
import { useMockData } from '../../hooks/useMockData';
import { useTheme } from '../../hooks/useTheme';
import { useEffect, useState } from 'react';
import BusinessSelector from './BusinessSelector';

// navigationStatic imported from ./navigation

const Sidebar: React.FC<{ collapsed?: boolean; mobileOpen?: boolean; onClose?: () => void }> = ({ collapsed = false, mobileOpen = false, onClose }) => {
  const location = useLocation();
  const sidebarWidthClass = collapsed ? 'md:w-20' : 'md:w-64';
  const { settings } = useTheme();
  const { activities, currentUser } = useMockData();
  const [activitiesOpen, setActivitiesOpen] = React.useState(false);
  const [datasetsOpen, setDatasetsOpen] = React.useState(false);
  const [datasetsList, setDatasetsList] = useState<any[] | null>(null);
  const [pagePerms, setPagePerms] = useState<any[] | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Super Admin': true,
    'Data & Analytics': true,
    'Content': true,
    'Organization': true,
    'System': true,
  });

  // Fetch page permissions for current user's role (if available)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!currentUser || !currentUser.role) return;
        const roleName = String(currentUser.role || '').trim();
        if (!roleName) return;
        const resp = await fetch(`/api/page_permissions?role=${encodeURIComponent(roleName)}`);
        if (!resp.ok) return;
        const j = await resp.json();
        if (!cancelled) setPagePerms(j);
      } catch (e) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [currentUser && currentUser.role]);

  // load datasets for sidebar submenu
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        // Add cache-busting to force fresh data when user changes
        const cacheBust = `?t=${Date.now()}`;
        const r = await fetch(`/api/admin/datasets${cacheBust}`, { credentials: 'include' });
        if (!r.ok) return;
        const j = await r.json();
        if (!canceled) setDatasetsList(Array.isArray(j) ? j.filter((d:any)=>d.show_in_menu) : []);
      } catch (e) { /* ignore */ }
    })();
    return () => { canceled = true; };
  }, [currentUser?.id]);

  const normalizePageKey = (k: string) => {
    if (!k) return k;
    return '/' + k.split('/').map(seg => seg.startsWith(':') ? '' : seg).filter(Boolean).join('/');
  };

  const hasPermissionFlag = (flag: 'can_view' | 'can_create' | 'can_edit' | 'can_delete', pageKey: string, sectionKey?: string) => {
    try {
      const userRole = String(currentUser?.role || '').toLowerCase().trim();
      
      // Super admin and admin users see all menus
      if (userRole === 'admin' || userRole === 'super-admin' || userRole === 'super_admin') {
        return true;
      }
      
      // If permissions not yet loaded, default deny (menus visible only by assignment)
      if (!pagePerms) return false;
      
      const norm = normalizePageKey(pageKey || '');
      
      // exact match first (page+section)
      for (const p of pagePerms) {
        const pk = normalizePageKey(p.page_key || p.pageKey || '');
        const sk = p.section_key || p.sectionKey || p.section || null;
        const skClean = sk ? String(sk) : null;
        if (skClean) {
          if (pk === norm && skClean === (sectionKey || null)) return !!p[flag];
        }
      }
      
      // then match by page prefix
      for (const p of pagePerms) {
        const pk = normalizePageKey(p.page_key || p.pageKey || '');
        if (!pk) continue;
        if (norm.startsWith(pk)) return !!p[flag];
      }
      
      return false;
    } catch (e) { return true; }
  };

  // Mobile drawer
  const mobileDrawer = mobileOpen ? (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="fixed inset-0 bg-black opacity-30" onClick={onClose} />
      <aside className={`relative w-64 bg-white h-full shadow-xl z-50`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center px-4 py-4">
            {settings?.logoDataUrl ? (
              <img src={settings.logoDataUrl} alt="logo" className="object-contain" style={{ width: 'var(--logo-width)', height: 'var(--logo-width)' }} />
            ) : (
              <DocumentPlusIcon className="text-primary-600" style={{ width: 'var(--logo-width)', height: 'var(--logo-width)' }} />
            )}
          </div>
          
          {/* Business Selector for Super Admin (Mobile) */}
          {String(currentUser?.role || '').toLowerCase().trim() === 'super-admin' || String(currentUser?.role || '').toLowerCase().trim() === 'super_admin' ? (
            <BusinessSelector />
          ) : null}
          
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <nav className="space-y-1">
              {navigationStatic
                .filter(item => {
                  // Filter out super admin items for non-super-admin users
                  const userRole = String(currentUser?.role || '').toLowerCase().trim();
                  const isSuperAdmin = userRole === 'super-admin' || userRole === 'super_admin';
                  if (item.superAdminOnly && !isSuperAdmin) return false;
                  return hasPermissionFlag('can_view', item.page_key || item.href);
                })
                .map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                const label = (item.key === 'programs' ? ((settings as any).programsLabel || item.defaultName) : (item.key === 'activities' ? ((settings as any).activitiesLabel || item.defaultName) : (item.defaultName)));
                
                // Handle opening in new window for super admin items
                if ((item as any).openInNewWindow) {
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        window.open(item.href, '_blank');
                        if (onClose) onClose();
                      }}
                      className="w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
                    >
                      <item.icon className="flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                      <span className="ml-3">{label}</span>
                    </button>
                  );
                }
                
                return (
                  <Link key={item.key} to={item.href} onClick={onClose} className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                    <item.icon className={`flex-shrink-0 h-6 w-6 ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}`} aria-hidden="true" />
                    <span className="ml-3">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>
    </div>
  ) : null;

  return (
    <>
      {mobileDrawer}
      <aside className={`app-sidebar hidden md:flex ${sidebarWidthClass} md:flex-col md:fixed md:inset-y-0 transition-all bg-white z-20`} style={{ backgroundColor: '#ffffff' }}>
        <div className="app-sidebar-inner flex flex-col flex-grow overflow-y-auto border-r border-gray-200 h-full" style={{ backgroundColor: '#ffffff' }}>
          <div className="flex flex-col items-center flex-shrink-0 px-4" style={{ paddingTop: 0, paddingBottom: 0, margin: 0 }}>
            {settings?.logoDataUrl ? (
              <img src={settings.logoDataUrl} alt="logo" className="object-contain block" style={{ width: 'var(--logo-width)', height: 'var(--logo-width)', margin: 0, padding: 0, display: 'block' }} />
            ) : (
              <DocumentPlusIcon className="text-primary-600" style={{ width: 'var(--logo-width)', height: 'var(--logo-width)', margin: 0, padding: 0, display: 'block' }} />
            )}
            {!collapsed && (
              <div style={{ marginTop: 0, padding: 0, textAlign: 'center' }}>
                <div className="font-bold text-gray-800" style={{ color: 'var(--logo-color)', fontSize: 'var(--app-font-size)', margin: 0, padding: 0 }}>{settings?.logoText || ''}</div>
              </div>
            )}
          </div>

          {/* Business Selector for Super Admin */}
          {!collapsed && (String(currentUser?.role || '').toLowerCase().trim() === 'super-admin' || String(currentUser?.role || '').toLowerCase().trim() === 'super_admin') && (
            <BusinessSelector />
          )}

          <div className="mt-0 flex-1 flex flex-col">
            <nav className="flex-1 px-2 pb-4">
              {(() => {
                // Filter items and group them
                const filteredItems = navigationStatic.filter(item => {
                  const userRole = String(currentUser?.role || '').toLowerCase().trim();
                  const isSuperAdmin = userRole === 'super-admin' || userRole === 'super_admin';
                  if (item.superAdminOnly && !isSuperAdmin) return false;
                  return hasPermissionFlag('can_view', item.page_key || item.href);
                });

                // Group items by their group property
                const groups = new Map<string, typeof navigationStatic>();
                const groupOrder = ['Super Admin', 'Data & Analytics', 'Content', 'Organization', 'System'];
                
                filteredItems.forEach(item => {
                  const groupName = item.group || 'Other';
                  if (!groups.has(groupName)) {
                    groups.set(groupName, []);
                  }
                  groups.get(groupName)!.push(item);
                });

                // Render groups in order
                return Array.from(groupOrder).map(groupName => {
                  if (!groups.has(groupName)) return null;
                  const items = groups.get(groupName)!;
                  const groupExpanded = expandedGroups[groupName] ?? true;

                  return (
                    <div key={groupName} className="mb-4">
                      {!collapsed && (
                        <button
                          onClick={() => setExpandedGroups(prev => ({
                            ...prev,
                            [groupName]: !prev[groupName]
                          }))}
                          className="w-full flex items-center justify-between px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          <span>{groupName}</span>
                          <ChevronDownIcon className={`h-4 w-4 transition-transform ${groupExpanded ? 'transform rotate-180' : ''}`} />
                        </button>
                      )}
                      {groupExpanded && (
                        <div className="space-y-1 mt-2">
                          {items.map((item) => {
                            const label = (item.key === 'programs' ? ((settings as any).programsLabel || item.defaultName) : (item.key === 'activities' ? ((settings as any).activitiesLabel || item.defaultName) : (item.defaultName)));
                            
                            // Activities with expandable list
                            if (item.key === 'activities') {
                              const isActive = location.pathname.startsWith(item.href);
                              const published = Array.isArray(activities) ? activities.filter(a => String(a.status || '').toLowerCase() === 'published') : [];
                              return (
                                <div key={item.key}>
                                  <div onClick={() => setActivitiesOpen(o => !o)} className={`group flex items-center cursor-pointer ${collapsed ? 'justify-center' : ''} px-2 py-2 text-sm font-medium rounded-md ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                                    <item.icon className={`flex-shrink-0 h-6 w-6 ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}`} aria-hidden="true" />
                                    {!collapsed && <span className="ml-3 flex-1">{label}</span>}
                                    {!collapsed && <ChevronDownIcon className={`h-5 w-5 transition-transform ${activitiesOpen ? 'transform rotate-180' : ''} text-gray-400`} />}
                                  </div>
                                  {!collapsed && activitiesOpen && (
                                    <div className="pl-8 mt-1 space-y-1">
                                      {published.length === 0 && <div className="text-xs text-gray-400">No published activities</div>}
                                      {published.map(a => (
                                        <Link
                                          key={a.id}
                                          to={`/activities/dashboard/${a.id}`}
                                          className="flex items-center text-xs text-gray-600 hover:bg-primary-50 hover:text-primary-700 px-2 py-1 rounded-md"
                                        >
                                          <ChevronRightIcon className="flex-shrink-0 h-4 w-4 text-gray-400 mr-2" />
                                          <span className="truncate">{a.title || a.name || `Activity ${a.id}`}</span>
                                        </Link>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            // Datasets with expandable list
                            if (item.key === 'datasets') {
                              const isActive = location.pathname.startsWith(item.href);
                              const labelDatasets = (settings as any).datasetsLabel || item.defaultName || 'Datasets';
                              return (
                                <div key={item.key}>
                                  <div onClick={() => setDatasetsOpen(o => !o)} className={`group flex items-center cursor-pointer ${collapsed ? 'justify-center' : ''} px-2 py-2 text-sm font-medium rounded-md ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                                    <item.icon className={`flex-shrink-0 h-6 w-6 ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}`} aria-hidden="true" />
                                    {!collapsed && <span className="ml-3 flex-1">{labelDatasets}</span>}
                                    {!collapsed && <ChevronDownIcon className={`h-5 w-5 transition-transform ${datasetsOpen ? 'transform rotate-180' : ''} text-gray-400`} />}
                                  </div>
                                  {!collapsed && datasetsOpen && (
                                    <div className="pl-8 mt-1 space-y-1">
                                      {!datasetsList || datasetsList.length === 0 ? <div className="text-xs text-gray-400">No datasets</div> : datasetsList.map(ds => (
                                        <Link key={ds.id} to={`/datasets/${ds.id}`} className="flex items-center text-xs text-gray-600 hover:bg-primary-50 hover:text-primary-700 px-2 py-1 rounded-md">
                                          <ChevronRightIcon className="flex-shrink-0 h-4 w-4 text-gray-400 mr-2" />
                                          <span className="truncate">{ds.name || `Dataset ${ds.id}`}</span>
                                        </Link>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            const isActive = location.pathname.startsWith(item.href);
                            const labelNormal = label;
                            
                            // Handle opening in new window for super admin items
                            if ((item as any).openInNewWindow) {
                              return (
                                <button
                                  key={item.key}
                                  onClick={() => window.open(item.href, '_blank')}
                                  className={`w-full group flex items-center ${collapsed ? 'justify-center' : ''} px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer`}
                                >
                                  <item.icon className="flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                                  {!collapsed && <span className="ml-3">{labelNormal}</span>}
                                </button>
                              );
                            }
                            
                            return (
                              <Link
                                key={item.key}
                                to={item.href}
                                className={`group flex items-center ${collapsed ? 'justify-center' : ''} px-2 py-2 text-sm font-medium rounded-md ${isActive
                                  ? 'bg-primary-50 text-primary-600'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                  }`}
                              >
                                <item.icon className={`flex-shrink-0 h-6 w-6 ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}`} aria-hidden="true" />
                                {!collapsed && <span className="ml-3">{labelNormal}</span>}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;