import React, { useEffect, useState } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';

const RelList: React.FC<{ raw: any, paths: string[] }> = ({ raw, paths }) => {
  const getByPath = (raw: any, path: string) => {
    try {
      if (!path || path === '') return raw;
      const parts = path.split('.');
      let cur = raw;
      for (const p of parts) {
        if (!cur) return null;
        cur = cur[p];
      }
      return cur;
    } catch (e) { return null; }
  };
  const getArrayForPath = (raw: any, path: string) => {
    try {
      if (!raw) return [];
      if (!path) return Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      const val = getByPath(raw, path);
      return Array.isArray(val) ? val : [];
    } catch (e) { return []; }
  };

  const relations: string[] = [];
  try {
    for (const parent of paths) {
      const parr = getArrayForPath(raw, parent) || [];
      const pfirst = parr.length > 0 ? parr[0] : null;
      const parentName = (parent || '').split('.').slice(-1)[0] || '';
      const singular = parentName.endsWith('s') ? parentName.slice(0, -1) : parentName;
      const parentIdCandidates = new Set<string>();
      if (pfirst && typeof pfirst === 'object') Object.keys(pfirst).forEach(k => parentIdCandidates.add(k));
      parentIdCandidates.add('id');

      for (const child of paths) {
        if (child === parent) continue;
        const carr = getArrayForPath(raw, child) || [];
        const cfirst = carr.length > 0 ? carr[0] : null;
        if (!cfirst || typeof cfirst !== 'object') continue;
        const ckeys = Object.keys(cfirst);
        // heuristics: look for fk keys in child that reference parent
        const fkCandidates = [ `${parentName}_id`, `${singular}_id`, `${parentName}Id`, `${singular}Id`, 'parent_id', 'parentId' ];
        const found = fkCandidates.find(fk => ckeys.includes(fk));
        if (found) relations.push(`${parent || '(root)'} → ${child} via ${found}`);
        else {
          // try matching if child has a key equal to any parent id key
          for (const pk of Array.from(parentIdCandidates)) {
            const alt = `${pk}`;
            if (ckeys.includes(alt)) { relations.push(`${parent || '(root)'} → ${child} via ${alt}`); break; }
          }
        }
      }
    }
  } catch (e) { /* ignore */ }

  if (relations.length === 0) return <div className="text-sm text-gray-500">No relationships detected automatically.</div>;
  return (
    <div className="space-y-1">
      {relations.map((r, idx) => <div key={idx} className="text-sm">{r}</div>)}
    </div>
  );
};

const ApiConnectorsPage: React.FC = () => {
  const [connectors, setConnectors] = useState<any[]>([]);
  const [ingests, setIngests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({ name: '', base_url: '', method: 'GET', auth_config: null, auth_type: 'none', bearerToken: '', basicUsername: '', basicPassword: '' });
  const [editingConnector, setEditingConnector] = useState<any>(null);
  const [connectorModalOpen, setConnectorModalOpen] = useState(false);
  const [ingestViewerOpen, setIngestViewerOpen] = useState(false);
  const [selectedIngest, setSelectedIngest] = useState<any>(null);
  const [selectedArrayPath, setSelectedArrayPath] = useState<string>('');
  const [ingestArrayPaths, setIngestArrayPaths] = useState<string[]>([]);
  const [showAllArrays, setShowAllArrays] = useState<boolean>(false);

  const load = async () => {
    try {
      const res = await fetch('/api/api_connectors', { credentials: 'include' });
      if (res.ok) setConnectors(await res.json());
      const ir = await fetch('/api/api_ingests', { credentials: 'include' });
      if (ir.ok) setIngests(await ir.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const payload: any = { ...form };
      try {
        if (form.auth_type === 'none') payload.auth_config = null;
        else if (form.auth_type === 'bearer') payload.auth_config = JSON.stringify({ type: 'bearer', token: form.bearerToken || '' });
        else if (form.auth_type === 'basic') payload.auth_config = JSON.stringify({ type: 'basic', username: form.basicUsername || '', password: form.basicPassword || '' });
        else if (form.auth_config && typeof form.auth_config !== 'string') payload.auth_config = JSON.stringify(form.auth_config);
      } catch (e) { /* ignore */ }
      const res = await fetch('/api/api_connectors', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        setForm({ name: '', base_url: '', method: 'GET', auth_config: null, auth_type: 'none', bearerToken: '', basicUsername: '', basicPassword: '' });
        await load();
      } else {
        alert('Failed to save connector');
      }
    } catch (e) { console.error(e); alert('Failed to save connector'); }
  };

  const openEdit = async (id?: number) => {
    if (!id) {
      setEditingConnector({ name: '', base_url: '', method: 'GET', auth_config: null, expected_format: 'json', auth_type: 'none', bearerToken: '', basicUsername: '', basicPassword: '' });
      setConnectorModalOpen(true);
      return;
    }
    try {
      const r = await fetch(`/api/api_connectors/${id}`, { credentials: 'include' });
      if (!r.ok) { alert('Failed to load connector'); return; }
      const j = await r.json();
      // parse auth_config if string
      try { j.auth_config = j.auth_config ? (typeof j.auth_config === 'string' ? JSON.parse(j.auth_config) : j.auth_config) : null; } catch (e) { j.auth_config = j.auth_config; }
      // derive structured auth fields
      const ec: any = { ...j, auth_type: 'none', bearerToken: '', basicUsername: '', basicPassword: '' };
      try {
        if (ec.auth_config && typeof ec.auth_config === 'object') {
          if (ec.auth_config.type === 'bearer' || ec.auth_config.token) { ec.auth_type = 'bearer'; ec.bearerToken = ec.auth_config.token || ec.auth_config.bearerToken || ''; }
          else if (ec.auth_config.type === 'basic' || ec.auth_config.username) { ec.auth_type = 'basic'; ec.basicUsername = ec.auth_config.username || ''; ec.basicPassword = ec.auth_config.password || ''; }
        } else if (ec.auth_config && typeof ec.auth_config === 'string') {
          // raw string -> attempt to detect bearer
          if (ec.auth_config.startsWith('Bearer ')) { ec.auth_type = 'bearer'; ec.bearerToken = ec.auth_config.substring(7); }
        }
      } catch (e) { /* ignore */ }
      setEditingConnector(ec);
      setConnectorModalOpen(true);
    } catch (e) { console.error(e); alert('Failed to load connector'); }
  };

  // Open edit modal using a local connector object first for snappy UI,
  // then refresh from server to populate any missing sensitive fields.
  const openEditFromList = async (c: any) => {
    try {
      const j = { ...c };
      try { j.auth_config = j.auth_config ? (typeof j.auth_config === 'string' ? JSON.parse(j.auth_config) : j.auth_config) : null; } catch (e) { j.auth_config = j.auth_config; }
      const ec: any = { ...j, auth_type: 'none', bearerToken: '', basicUsername: '', basicPassword: '' };
      try {
        if (ec.auth_config && typeof ec.auth_config === 'object') {
          if (ec.auth_config.type === 'bearer' || ec.auth_config.token) { ec.auth_type = 'bearer'; ec.bearerToken = ec.auth_config.token || ec.auth_config.bearerToken || ''; }
          else if (ec.auth_config.type === 'basic' || ec.auth_config.username) { ec.auth_type = 'basic'; ec.basicUsername = ec.auth_config.username || ''; ec.basicPassword = ec.auth_config.password || ''; }
        } else if (ec.auth_config && typeof ec.auth_config === 'string') {
          if (ec.auth_config.startsWith('Bearer ')) { ec.auth_type = 'bearer'; ec.bearerToken = ec.auth_config.substring(7); }
        }
      } catch (e) { /* ignore */ }
      setEditingConnector(ec);
      setConnectorModalOpen(true);
      // refresh from server in background to populate any secure fields
      try { await openEdit(c.id); } catch (e) { /* ignore */ }
    } catch (e) { console.error(e); openEdit(c.id); }
  };

  const saveEditing = async () => {
    try {
      const payload = { ...editingConnector };
      // build auth_config from structured fields if present
      try {
        if (editingConnector) {
          if (editingConnector.auth_type === 'none') payload.auth_config = null;
          else if (editingConnector.auth_type === 'bearer') payload.auth_config = JSON.stringify({ type: 'bearer', token: editingConnector.bearerToken || '' });
          else if (editingConnector.auth_type === 'basic') payload.auth_config = JSON.stringify({ type: 'basic', username: editingConnector.basicUsername || '', password: editingConnector.basicPassword || '' });
          else if (editingConnector.auth_config && typeof editingConnector.auth_config !== 'string') payload.auth_config = JSON.stringify(editingConnector.auth_config);
        }
      } catch (e) { /* ignore */ }
      const res = await fetch('/api/api_connectors', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { alert('Failed to save connector'); return; }
      setConnectorModalOpen(false);
      await load();
    } catch (e) { console.error(e); alert('Failed to save connector'); }
  };

  const deleteConnector = async (id: number) => {
    if (!confirm('Delete connector? This will remove its configuration and cannot be undone.')) return;
    try {
      const r = await fetch(`/api/api_connectors/${id}`, { method: 'DELETE', credentials: 'include' });
      if (r.ok) { await load(); alert('Connector deleted'); }
      else alert('Failed to delete connector: ' + await r.text());
    } catch (e) { console.error(e); alert('Failed to delete connector'); }
  };

  const openIngestViewer = (ingest: any) => {
    setSelectedIngest(ingest);
    // prepare candidate array paths (detect arrays in JSON or XML)
    let raw = ingest.raw_data;
    const candidates: string[] = [];
    try {
      // if raw is string and looks like XML, parse to object
      if (typeof raw === 'string' && raw.trim().startsWith('<')) {
        try {
          const parser = new DOMParser();
          const xmldoc = parser.parseFromString(raw, 'application/xml');
          const toJson = (node: any) => {
            const obj: any = {};
            if (node.nodeType === 3) return node.nodeValue;
            const children = Array.from(node.childNodes || []).filter((n: any) => n.nodeType === 1 || (n.nodeType === 3 && n.nodeValue.trim()));
            if (children.length === 0) return node.textContent;
            for (const ch of children) {
              const name = (ch as any).nodeName;
              const val = toJson(ch);
              if (obj[name]) {
                if (!Array.isArray(obj[name])) obj[name] = [obj[name]];
                obj[name].push(val);
              } else obj[name] = val;
            }
            return obj;
          };
          raw = toJson(xmldoc);
        } catch (e) { /* leave raw as string */ }
      }
    } catch (e) { /* ignore */ }

    const listPaths = (obj: any, prefix = '') => {
      try {
        if (!obj) return;
        if (Array.isArray(obj)) {
          candidates.push(prefix || '');
          // inspect first element for nested arrays
          if (obj.length > 0) listPaths(obj[0], prefix);
          return;
        }
        if (typeof obj === 'object') {
          for (const k of Object.keys(obj)) {
            const v = obj[k];
            const path = prefix ? `${prefix}.${k}` : k;
            if (Array.isArray(v)) { candidates.push(path); if (v.length > 0) listPaths(v[0], path); }
            else if (typeof v === 'object') listPaths(v, path);
          }
        }
      } catch (e) { /* ignore */ }
    };

    try { listPaths(raw); } catch (e) { /* ignore */ }
    const defaultPath = candidates.length ? candidates[0] : '';
    setIngestArrayPaths(candidates);
    setSelectedArrayPath(defaultPath);
    setIngestViewerOpen(true);
  };

  const getByPath = (raw: any, path: string) => {
    try {
      if (!path || path === '') return raw;
      const parts = path.split('.');
      let cur = raw;
      for (const p of parts) {
        if (!cur) return null;
        cur = cur[p];
      }
      return cur;
    } catch (e) { return null; }
  };

  const getArrayForPath = (raw: any, path: string) => {
    try {
      if (!raw) return [];
      if (!path) return Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      const val = getByPath(raw, path);
      return Array.isArray(val) ? val : [];
    } catch (e) { return []; }
  };

  const trigger = async (id: number) => {
    try {
      const res = await fetch(`/api/api_connectors/${id}/trigger`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        const j = await res.json();
        // reload ingests but try to preserve single-row per connector behavior
        await load();
        alert('Triggered connector; ingested data saved' + (j.ingestId ? (', ingestId: ' + j.ingestId) : ''));
      } else {
        alert('Failed to trigger connector');
      }
    } catch (e) { console.error(e); alert('Failed to trigger connector'); }
  };

  const deleteIngest = async (id: number) => {
    if (!confirm('Delete ingest?')) return;
    try {
      const r = await fetch(`/api/api_ingests/${id}`, { method: 'DELETE', credentials: 'include' });
      if (r.ok) { await load(); alert('Ingest deleted'); }
      else alert('Failed to delete ingest');
    } catch (e) { console.error(e); alert('Failed to delete ingest'); }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">API Connectors</h1>
      </div>
      <Card>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <h3 className="font-semibold">Create Connector</h3>
            <div className="mt-2 space-y-2">
              <input className="w-full border p-2" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input className="w-full border p-2" placeholder="Base URL" value={form.base_url} onChange={e => setForm({ ...form, base_url: e.target.value })} />
              <select className="w-full border p-2" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
              </select>
              <div className="mt-2">
                <label className="block text-sm font-medium">Auth</label>
                <select className="w-full border p-2" value={form.auth_type || 'none'} onChange={e => setForm({ ...form, auth_type: e.target.value })}>
                  <option value="none">None</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic (username/password)</option>
                </select>

                {form.auth_type === 'bearer' && (
                  <div className="mt-2">
                    <label className="block text-sm">Bearer Token</label>
                    <input className="w-full border p-2" value={form.bearerToken || ''} onChange={e => setForm({ ...form, bearerToken: e.target.value })} placeholder="token" />
                  </div>
                )}

                {form.auth_type === 'basic' && (
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input className="w-full border p-2" placeholder="Username" value={form.basicUsername || ''} onChange={e => setForm({ ...form, basicUsername: e.target.value })} />
                    <input className="w-full border p-2" placeholder="Password" value={form.basicPassword || ''} onChange={e => setForm({ ...form, basicPassword: e.target.value })} />
                  </div>
                )}

              </div>
              <div className="flex justify-end space-x-2">
                <Button onClick={() => openEdit()}>New</Button>
                <Button onClick={save}>Save</Button>
              </div>
            </div>
          </div>
          <div className="col-span-2">
            <h3 className="font-semibold">Connectors</h3>
              <div className="mt-2">
                {connectors.length === 0 && <div className="text-sm text-gray-500">No connectors configured.</div>}
                {connectors.map(c => (
                  <div key={c.id} className="p-2 border-b flex items-center justify-between">
                    <div>
                      <div className="font-medium">{c.name} <span className="text-xs text-gray-500">{c.method} {c.base_url}</span></div>
                      {c.description && <div className="text-xs text-gray-500">{c.description}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => openEdit(c.id)}>Edit</Button>
                      <Button size="sm" onClick={() => trigger(c.id)}>Trigger</Button>
                      <Button size="sm" variant="danger" onClick={() => deleteConnector(c.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold">Recent Ingests</h3>
        <div className="mt-2">
          {ingests.length === 0 && <div className="text-sm text-gray-500">No ingests yet.</div>}
          {ingests.map(i => (
            <div key={i.id} className="p-2 border-b flex items-center justify-between">
              <div>
                <div className="font-medium">Ingest #{i.id} <span className="text-xs text-gray-500">connector {i.connector_id} · {i.received_at}</span></div>
                <div className="text-xs text-gray-600 mt-1">{String(i.raw_data && typeof i.raw_data === 'object' ? JSON.stringify(i.raw_data).slice(0, 200) : String(i.raw_data)).slice(0, 300)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => openIngestViewer(i)}>View</Button>
                <Button size="sm" variant="danger" onClick={() => deleteIngest(i.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Connector Editor Modal */}
      <Modal open={connectorModalOpen} onClose={() => setConnectorModalOpen(false)} title={editingConnector ? (editingConnector.id ? 'Edit Connector' : 'New Connector') : 'Connector'}>
        {editingConnector && (
          <div className="space-y-2">
            <input className="w-full border p-2" placeholder="Name" value={editingConnector.name || ''} onChange={e => setEditingConnector({ ...editingConnector, name: e.target.value })} />
            <input className="w-full border p-2" placeholder="Base URL" value={editingConnector.base_url || ''} onChange={e => setEditingConnector({ ...editingConnector, base_url: e.target.value })} />
            <select className="w-full border p-2" value={editingConnector.method || 'GET'} onChange={e => setEditingConnector({ ...editingConnector, method: e.target.value })}>
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
            </select>
            <div>
              <label className="block text-sm font-medium">Auth</label>
              <select className="w-full border p-2" value={editingConnector.auth_type || 'none'} onChange={e => setEditingConnector({ ...editingConnector, auth_type: e.target.value })}>
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic (username/password)</option>
              </select>

              {editingConnector.auth_type === 'bearer' && (
                <div className="mt-2">
                  <label className="block text-sm">Bearer Token</label>
                  <input className="w-full border p-2" value={editingConnector.bearerToken || ''} onChange={e => setEditingConnector({ ...editingConnector, bearerToken: e.target.value })} placeholder="token" />
                </div>
              )}

              {editingConnector.auth_type === 'basic' && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input className="w-full border p-2" placeholder="Username" value={editingConnector.basicUsername || ''} onChange={e => setEditingConnector({ ...editingConnector, basicUsername: e.target.value })} />
                  <input className="w-full border p-2" placeholder="Password" value={editingConnector.basicPassword || ''} onChange={e => setEditingConnector({ ...editingConnector, basicPassword: e.target.value })} />
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button onClick={() => setConnectorModalOpen(false)}>Cancel</Button>
              <Button onClick={saveEditing}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Ingest Viewer Modal */}
      <Modal open={ingestViewerOpen} onClose={() => setIngestViewerOpen(false)} title={selectedIngest ? `Ingest ${selectedIngest.id}` : 'Ingest'}>
        {selectedIngest && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Array Path</label>
              <div className="flex gap-2 items-center">
                <select className="w-full border p-2" value={selectedArrayPath} onChange={e => setSelectedArrayPath(e.target.value)}>
                  <option value="">(root)</option>
                  {ingestArrayPaths.map(p => <option key={p} value={p}>{p || '(root)'}</option>)}
                </select>
                <label className="inline-flex items-center text-sm"><input type="checkbox" className="ml-2 mr-1" checked={showAllArrays} onChange={e => setShowAllArrays(e.target.checked)} />Show all tables</label>
              </div>
            </div>
            <div>
              <h4 className="font-semibold">Preview Rows</h4>
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <Button onClick={() => {
                    try {
                      const arr = getArrayForPath(selectedIngest.raw_data, selectedArrayPath) || [];
                      if (!arr || arr.length === 0) return alert('No rows to download');
                      // build CSV
                      const cols = new Set<string>();
                      arr.slice(0, 500).forEach((r: any) => { if (r && typeof r === 'object') Object.keys(r).forEach(k => cols.add(k)); });
                      const keys = Array.from(cols);
                      const lines: string[] = [];
                      lines.push(keys.map(k => '"' + String(k).replace(/"/g, '""') + '"').join(','));
                      for (const r of arr) {
                        const row = keys.map(k => {
                          let v = r && (r[k] !== undefined ? r[k] : '');
                          if (v === null || v === undefined) v = '';
                          if (typeof v === 'object') v = JSON.stringify(v);
                          return '"' + String(v).replace(/"/g, '""') + '"';
                        }).join(',');
                        lines.push(row);
                      }
                      const csv = lines.join('\r\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `ingest_${selectedIngest.id || 'data'}.csv`;
                      document.body.appendChild(a);
                      a.click(); a.remove(); URL.revokeObjectURL(url);
                    } catch (e) { console.error(e); alert('Failed to generate CSV: ' + String(e)); }
                  }}>Download CSV</Button>

                  <Button onClick={async () => {
                    try {
                      const arr = getArrayForPath(selectedIngest.raw_data, selectedArrayPath) || [];
                      if (!arr || arr.length === 0) return alert('No rows to download');
                      const ExcelJS = (await import('exceljs')) as any;
                      const wb: any = new ExcelJS.Workbook();
                      const ws = wb.addWorksheet('Ingest');
                      const cols = new Set<string>();
                      arr.slice(0, 500).forEach((r: any) => { if (r && typeof r === 'object') Object.keys(r).forEach(k => cols.add(k)); });
                      const keys = Array.from(cols);
                      if (keys.length === 0) {
                        arr.forEach((r: any) => { if (Array.isArray(r)) ws.addRow(r); else ws.addRow([String(r)]); });
                      } else {
                        ws.columns = keys.map(k => ({ header: String(k), key: k, width: Math.min(40, Math.max(10, String(k).length + 5)) }));
                        for (const r of arr) {
                          const rowVals = keys.map(k => { const v = r && r[k] !== undefined ? r[k] : ''; return (typeof v === 'object' ? JSON.stringify(v) : v); });
                          ws.addRow(rowVals);
                        }
                      }
                      const buf = await wb.xlsx.writeBuffer();
                      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = `ingest_${selectedIngest.id || 'data'}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                    } catch (e) { console.error(e); alert('Failed to generate XLSX: ' + String(e)); }
                  }}>Download XLSX</Button>
                </div>
                {showAllArrays ? (
                  ingestArrayPaths.length === 0 ? <div className="text-sm text-gray-500">No tabular arrays discovered.</div> : (
                    ingestArrayPaths.map(p => {
                      const arr = getArrayForPath(selectedIngest.raw_data, p);
                      const cols = new Set<string>();
                      (arr || []).slice(0, 10).forEach((r: any) => { if (r && typeof r === 'object') Object.keys(r).forEach(k => cols.add(k)); });
                      const columns = Array.from(cols).map(c => ({ key: c, label: c }));
                      return (
                        <div key={p} className="p-2 border rounded bg-white">
                          <div className="font-medium mb-2">Table: {p || '(root)'}</div>
                          <DataTable columns={columns} data={(arr || []).slice(0, 200).map((r: any, idx: number) => ({ id: idx, ...r }))} />
                        </div>
                      );
                    })
                  )
                ) : (
                  <DataTable columns={(() => {
                    const arr = getArrayForPath(selectedIngest.raw_data, selectedArrayPath);
                    const cols = new Set<string>();
                    (arr || []).slice(0, 10).forEach((r: any) => { if (r && typeof r === 'object') Object.keys(r).forEach(k => cols.add(k)); });
                    return Array.from(cols).map(c => ({ key: c, label: c }));
                  })()} data={(getArrayForPath(selectedIngest.raw_data, selectedArrayPath) || []).slice(0, 200).map((r: any, idx: number) => ({ id: idx, ...r }))} />
                )}
              </div>
            </div>
            {/* Relationships detection */}
            {!showAllArrays && ingestArrayPaths.length > 1 && (
              <div className="p-2 border rounded bg-gray-50">
                <h5 className="font-medium">Detected Relationships</h5>
                <RelList raw={selectedIngest.raw_data} paths={ingestArrayPaths} />
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setIngestViewerOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ApiConnectorsPage;
