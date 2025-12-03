import React, { createContext, useContext, useEffect, useState } from 'react';

type MetaItem = { id: string; name: string; [k: string]: any };

type Metadata = {
  care_levels: MetaItem[];
  ownership_types: MetaItem[];
  indicators: MetaItem[];
  roles: MetaItem[];
  permissions: MetaItem[];
  role_permissions: Record<string, string[]>; // role id -> permission ids
};

const defaultMeta: Metadata = {
  care_levels: [],
  ownership_types: [],
  indicators: [],
  roles: [],
  permissions: [],
  role_permissions: {},
};

const MetadataContext = createContext<{ meta: Metadata; loading: boolean }>({ meta: defaultMeta, loading: true });

export const MetadataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [meta, setMeta] = useState<Metadata>(defaultMeta);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try server endpoint first (`/api/public/metadata`). Fallback to static files in /metadata.
    const fallbackPaths = {
      care_levels: '/metadata/care_levels.json',
      ownership_types: '/metadata/ownership_types.json',
      indicators: '/metadata/indicators.json',
      roles: '/metadata/roles.json',
      permissions: '/metadata/permissions.json',
      role_permissions: '/metadata/role_permissions.json',
    } as const;

    const fetchAll = async () => {
      // If developer enabled Firestore integration, try it first
      try {
        if ((import.meta as any).env?.VITE_FIRESTORE_ENABLED === 'true') {
          try {
            const adapter = await import('../adapters/firestoreMetadata');
            const data = await adapter.fetchMetadataFromFirestore((import.meta as any).env?.VITE_APP_ID || 'default');
            if (data) {
              const next: any = {
                care_levels: data.care_levels || [],
                ownership_types: data.ownership_types || [],
                indicators: data.indicators || [],
                roles: data.roles || [],
                permissions: data.permissions || [],
                role_permissions: data.role_permissions || {},
              };
              setMeta(next as Metadata);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn('Firestore adapter not available or failed', e.message || e);
          }
        }
      } catch (e) {}
      try {
        // prefer server-provided consolidated metadata
        const resp = await fetch('/api/public/metadata');
        if (resp.ok) {
          const j = await resp.json();
          // ensure defaults for missing keys
          const next: any = {
            care_levels: j.care_levels || [],
            ownership_types: j.ownership_types || [],
            indicators: j.indicators || [],
            roles: j.roles || [],
            permissions: j.permissions || [],
            role_permissions: j.role_permissions || {},
          };
          setMeta(next as Metadata);
          setLoading(false);
          return;
        }
      } catch (e) {
        // server endpoint not available; fall through to static
      }

      // fallback: load individual static files from /metadata
      try {
        const keys = Object.keys(fallbackPaths) as (keyof typeof fallbackPaths)[];
        const results = await Promise.all(keys.map(k => fetch(fallbackPaths[k]).then(r => r.json())));
        const next: any = {};
        keys.forEach((k, i) => (next[k] = results[i] || (k === 'role_permissions' ? {} : [])));
        setMeta(next as Metadata);
      } catch (err) {
        console.error('Failed to load metadata', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return <MetadataContext.Provider value={{ meta, loading }}>{children}</MetadataContext.Provider>;
};

export const useMetadata = () => useContext(MetadataContext);

export default MetadataContext;
