import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const RolePermissionsPage: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [perms, setPerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newRow, setNewRow] = useState({ page_key: '', section_key: '', role_name: '', can_create: false, can_view: true, can_edit: false, can_delete: false });

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
              <option value="/dashboard" />
              <option value="/map-dashboard" />
              <option value="/programs" />
              <option value="/activities" />
              <option value="/reports" />
              <option value="/indicators" />
              <option value="/facilities" />
              <option value="/users" />
              <option value="/settings" />
              <option value="/profile" />
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
    </div>
  );
};

export default RolePermissionsPage;
