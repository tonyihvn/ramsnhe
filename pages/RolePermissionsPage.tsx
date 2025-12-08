import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
// navigation list used for menu names
let navigationStatic: any[] = [];
try { navigationStatic = require('../components/layout/navigation').default || []; } catch (e) { navigationStatic = []; }

const RolePermissionsPage: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [perms, setPerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newRow, setNewRow] = useState({ page_key: '', section_key: '', role_name: '', can_create: false, can_view: true, can_edit: false, can_delete: false });
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [menuRows, setMenuRows] = useState<Array<{ page_key: string; label: string }>>([]);
  const [datasets, setDatasets] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      let r = await fetch('/api/admin/roles', { credentials: 'include' });
      if (r.status === 401) r = await fetch('/api/roles');
      if (r.ok) setRoles(await r.json());
    } catch (e) { console.error('load roles', e); }
    try {
      const p = await fetch('/api/admin/page_permissions', { credentials: 'include' });
      if (p.ok) setPerms(await p.json());
    } catch (e) { console.error('load perms', e); }
    try {
      const dr = await fetch('/api/admin/datasets', { credentials: 'include' });
      if (dr.ok) setDatasets(await dr.json());
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  const togglePerm = (idx: number, field: string) => {
    setPerms(prev => prev.map((r,i) => i===idx ? ({ ...r, [field]: !r[field] }) : r));
  };

  const save = async () => {
    try {
      const r = await fetch('/api/admin/page_permissions', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(perms) });
      if (!r.ok) return alert('Save failed');
      alert('Saved');
      await load();
    } catch (e) { console.error(e); alert('Save failed'); }
  };

  const addRow = () => {
    if (!newRow.page_key || !newRow.role_name) return alert('Page and role required');
    setPerms(prev => [{ ...newRow }, ...prev]);
    setNewRow({ page_key: '', section_key: '', role_name: '', can_create: false, can_view: true, can_edit: false, can_delete: false });
  };

  // Build matrix from navigation + datasets and existing perms
  useEffect(() => {
    try {
      const menus: Array<{ page_key: string; label: string }> = [];
      // navigationStatic may contain items with page_key or href
      (navigationStatic || []).forEach(it => {
        const pk = it.page_key || it.href || '';
        const label = it.defaultName || it.label || pk || '';
        if (pk) menus.push({ page_key: pk, label });
      });
      // add datasets as submenu links (/datasets/:id)
      if (Array.isArray(datasets)) {
        datasets.forEach((d: any) => {
          try {
            if (d && d.id && d.show_in_menu) menus.push({ page_key: `/datasets/${d.id}`, label: d.name || `Dataset ${d.id}` });
          } catch (e) { /* ignore */ }
        });
      }
      setMenuRows(menus);

      const map: Record<string, Record<string, boolean>> = {};
      (perms || []).forEach(p => {
        try {
          const pk = p.page_key || p.pageKey || p.page || '';
          const rn = p.role_name || p.roleName || p.role || '';
          if (!pk || !rn) return;
          if (!map[pk]) map[pk] = {};
          map[pk][rn] = !!p.can_view;
        } catch (e) { /* ignore */ }
      });
      setMatrix(map);
    } catch (e) { console.error('build matrix', e); }
  }, [perms, navigationStatic, datasets]);

  const toggleMatrix = (pageKey: string, roleName: string) => {
    setMatrix(prev => {
      const copy = { ...(prev || {}) } as any;
      copy[pageKey] = { ...(copy[pageKey] || {}) };
      copy[pageKey][roleName] = !copy[pageKey][roleName];
      return copy;
    });
  };

  const selectAllForRole = (roleName: string) => {
    setMatrix(prev => {
      const copy = { ...(prev || {}) } as any;
      (menuRows || []).forEach(m => {
        copy[m.page_key] = { ...(copy[m.page_key] || {}) };
        copy[m.page_key][roleName] = true;
      });
      return copy;
    });
  };

  const clearRole = (roleName: string) => {
    setMatrix(prev => {
      const copy = { ...(prev || {}) } as any;
      (menuRows || []).forEach(m => {
        copy[m.page_key] = { ...(copy[m.page_key] || {}) };
        copy[m.page_key][roleName] = false;
      });
      return copy;
    });
  };

  const selectAll = () => {
    setMatrix(prev => {
      const copy = { ...(prev || {}) } as any;
      (menuRows || []).forEach(m => {
        copy[m.page_key] = copy[m.page_key] || {};
        (roles || []).forEach(r => { copy[m.page_key][r.name || r] = true; });
      });
      return copy;
    });
  };

  const clearAll = () => {
    setMatrix(prev => {
      const copy = { ...(prev || {}) } as any;
      (menuRows || []).forEach(m => {
        copy[m.page_key] = copy[m.page_key] || {};
        (roles || []).forEach(r => { copy[m.page_key][r.name || r] = false; });
      });
      return copy;
    });
  };

  const saveMatrix = async () => {
    try {
      // Build permissions array for save: include only can_view flags (others false)
      const payload: any[] = [];
      (menuRows || []).forEach(m => {
        (roles || []).forEach(r => {
          payload.push({ page_key: m.page_key, section_key: null, role_name: r.name || r, can_create: false, can_view: !!(matrix[m.page_key] && matrix[m.page_key][(r.name || r)]), can_edit: false, can_delete: false });
        });
      });
      const res = await fetch('/api/admin/page_permissions', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) return alert('Failed to save permissions');
      alert('Permissions saved');
      // reload server-set perms
      await load();
    } catch (e) { console.error(e); alert('Failed to save matrix'); }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Page & Section Permissions</h1>
        <div className="flex gap-2">
          <Button onClick={load}>Refresh</Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-4 gap-2 items-end">
          <div>
            <label className="text-sm">Page Key</label>
            <input list="nav-pages" className="mt-1 p-2 border rounded w-full" value={newRow.page_key} onChange={e => setNewRow(s => ({ ...s, page_key: e.target.value }))} placeholder="/activities/fill/:activityId" />
              <datalist id="nav-pages">
                {/** Populate from shared navigation list so admins can assign menu permissions consistently */}
                {(() => {
                  try {
                    // lazy require to avoid circular imports at module load time
                    const nav = require('../components/layout/navigation').default;
                    return nav.map((n: any) => <option key={n.page_key} value={n.page_key} />);
                  } catch (e) {
                    return [
                      <option key="/dashboard" value="/dashboard" />,
                      <option key="/map-dashboard" value="/map-dashboard" />,
                      <option key="/programs" value="/programs" />,
                      <option key="/activities" value="/activities" />,
                      <option key="/reports" value="/reports" />,
                      <option key="/indicators" value="/indicators" />,
                      <option key="/facilities" value="/facilities" />,
                      <option key="/users" value="/users" />,
                      <option key="/settings" value="/settings" />,
                      <option key="/profile" value="/profile" />,
                    ];
                  }
                })()}
              </datalist>
          </div>
          <div>
            <label className="text-sm">Section Key (optional)</label>
            <input className="mt-1 p-2 border rounded w-full" value={newRow.section_key} onChange={e => setNewRow(s => ({ ...s, section_key: e.target.value }))} placeholder="section-id-or-name" />
          </div>
          <div>
            <label className="text-sm">Role</label>
            <select className="mt-1 p-2 border rounded w-full" value={newRow.role_name} onChange={e => setNewRow(s => ({ ...s, role_name: e.target.value }))}>
              <option value="">(select role)</option>
              {roles.map(r => <option key={r.id || r.name} value={r.name || r}>{r.name || r}</option>)}
            </select>
          </div>
          <div>
            <Button onClick={addRow}>Add Permission</Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-600">
                <th className="p-2">Page</th>
                <th className="p-2">Section</th>
                <th className="p-2">Role</th>
                <th className="p-2">Create</th>
                <th className="p-2">View</th>
                <th className="p-2">Edit</th>
                <th className="p-2">Delete</th>
              </tr>
            </thead>
            <tbody>
              {perms.map((p, idx) => (
                <tr key={p.id || idx} className="border-t">
                  <td className="p-2">{p.page_key}</td>
                  <td className="p-2">{p.section_key || '—'}</td>
                  <td className="p-2">{p.role_name}</td>
                  <td className="p-2"><input type="checkbox" checked={!!p.can_create} onChange={() => togglePerm(idx, 'can_create')} /></td>
                  <td className="p-2"><input type="checkbox" checked={p.can_view === undefined ? true : !!p.can_view} onChange={() => togglePerm(idx, 'can_view')} /></td>
                  <td className="p-2"><input type="checkbox" checked={!!p.can_edit} onChange={() => togglePerm(idx, 'can_edit')} /></td>
                  <td className="p-2"><input type="checkbox" checked={!!p.can_delete} onChange={() => togglePerm(idx, 'can_delete')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {/* Permissions Matrix for Sidebar / Menu Links */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold">Menu Visibility Matrix</h3>
            <div className="text-xs text-gray-500">Toggle which roles can view each sidebar/menu link.</div>
          </div>
          <div className="flex gap-2 items-center">
              <Button onClick={() => { load(); }}>Refresh</Button>
              <Button onClick={() => saveMatrix()}>Save Matrix</Button>
              <Button onClick={() => selectAll()} variant="secondary">Select All</Button>
              <Button onClick={() => clearAll()} variant="danger">Clear All</Button>
            </div>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-600">
                <th className="p-2">Menu</th>
                  {roles.map(r => <th key={r.name || r} className="p-2">
                      <div className="flex items-center gap-2">
                        <span>{r.name || r}</span>
                        <button className="text-xs text-gray-600" onClick={() => selectAllForRole(r.name || r)}>All</button>
                        <button className="text-xs text-red-600" onClick={() => clearRole(r.name || r)}>Clear</button>
                      </div>
                    </th>)}
              </tr>
            </thead>
            <tbody>
              {(menuRows || []).map((m, mi) => (
                <tr key={m.page_key + ':' + mi} className="border-t">
                  <td className="p-2">{m.label || m.page_key}</td>
                  {roles.map(r => (
                    <td key={`${m.page_key}__${r.name || r}`} className="p-2">
                      <input type="checkbox" checked={!!(matrix[m.page_key] && matrix[m.page_key][(r.name || r)])} onChange={() => toggleMatrix(m.page_key, r.name || r)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default RolePermissionsPage;
