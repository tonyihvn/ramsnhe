import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import DataTable from '../components/ui/DataTable';
import BandEditor from '../components/ui/BandEditor';
import DatasetsPage from './DatasetsPage';
import { useTheme } from '../hooks/useTheme';
import { appRoutes } from '../appRoutes';

const LLMSettingsForm: React.FC = () => {
    const { settings, setSettings } = useTheme();
    const providers: any[] = (settings as any).llmProviders || [];
    const [local, setLocal] = useState<any[]>(providers.slice());
    const [detecting, setDetecting] = useState(false);
    const [detectedModels, setDetectedModels] = useState<string[]>([]);
    const [selectedDetected, setSelectedDetected] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                // Try admin endpoint first; fall back to public endpoint if unauthorized
                let r = await fetch('/api/admin/llm_providers', { credentials: 'include' });
                if (r.status === 401) r = await fetch('/api/llm_providers');
                if (r.ok) {
                    const provs = await r.json();
                    setLocal(provs.slice());
                }
            } catch (e) { /* ignore */ }
        })();
    }, []);

    const save = () => {
        setSettings({ ...(settings as any), llmProviders: local });
        alert('LLM settings saved');
    };

    const addProvider = () => setLocal(prev => [...prev, { id: `p_${Date.now()}`, provider_id: `p_${Date.now()}`, name: 'openai', model: '', apiKey: '', priority: (prev || []).length + 1 }]);

    const detectLocalOllama = async () => {
        setDetecting(true);
        setDetectedModels([]);
        setSelectedDetected(null);
        try {
            // try server admin detect endpoint first then fallback to public detect endpoint
            let r = await fetch('/api/admin/detect-ollama', { credentials: 'include' });
            if (r.status === 401) r = await fetch('/api/detect-ollama');

            // if server endpoints failed or returned no models, try direct local Ollama tag endpoint
            if (!r.ok) {
                try {
                    const direct = await fetch('http://127.0.0.1:11434/api/tags');
                    if (direct.ok) {
                        const jd = await direct.json();
                        if (jd && Array.isArray(jd.models) && jd.models.length) {
                            setDetectedModels(jd.models.map((m: any) => m.name || m.id || String(m)));
                            setDetecting(false);
                            return;
                        }
                    }
                } catch (e) { /* ignore local probe failure */ }
                alert('No local Ollama detected or not authorized');
                return;
            }

            const j = await r.json();
            // admin/public detect returns { ok: true, models: [...] } or { ok: true, version: ... }
            if (j && j.ok && Array.isArray(j.models) && j.models.length) {
                // may already be an array of names or objects
                const models = j.models.map((m: any) => (typeof m === 'string' ? m : (m.name || m.id || String(m))));
                setDetectedModels(models as string[]);
            } else if (j && j.ok && j.version) {
                // version found but no models; notify user
                alert('Ollama detected (version info found), but no models installed locally. Use /api/pull to install models.');
            } else {
                alert('No local Ollama models detected');
            }
        } catch (e) {
            console.error(e);
            alert('Error detecting local Ollama: ' + String(e));
        } finally { setDetecting(false); }
    };

    const addDetectedAsProvider = () => {
        if (!selectedDetected) return alert('Select a model first');
        const base = 'http://127.0.0.1:11434';
        setLocal(prev => [...prev, { id: `ollama_${Date.now()}`, provider_id: `ollama_${Date.now()}`, name: 'ollama-local', model: selectedDetected, apiKey: '', serverUrl: base, priority: (prev || []).length + 1 }]);
        setDetectedModels([]);
        setSelectedDetected(null);
    };

    const updateProvider = (idx: number, patch: any) => setLocal(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
    const removeProvider = (idx: number) => setLocal(prev => prev.filter((_, i) => i !== idx));
    const move = (idx: number, dir: -1 | 1) => {
        setLocal(prev => {
            const arr = prev.slice();
            const to = idx + dir;
            if (to < 0 || to >= arr.length) return prev;
            const tmp = arr[to]; arr[to] = arr[idx]; arr[idx] = tmp;
            return arr;
        });
    };

    return (
        <div className="space-y-3">
            {local.map((p, idx) => (
                <div key={p.id} className="p-3 border rounded bg-white">
                    <div className="flex items-center justify-between">
                        <div className="font-medium">{p.name || 'Provider'}</div>
                        <div className="flex gap-2">
                            <button onClick={() => move(idx, -1)} className="text-sm p-1 border rounded">↑</button>
                            <button onClick={() => move(idx, 1)} className="text-sm p-1 border rounded">↓</button>
                            <button onClick={() => removeProvider(idx)} className="text-sm p-1 border rounded text-red-600">Remove</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                        <input className="p-2 border rounded" value={p.name} onChange={e => updateProvider(idx, { name: e.target.value })} placeholder="provider id (openai/local)" />
                        <input className="p-2 border rounded" value={p.model} onChange={e => updateProvider(idx, { model: e.target.value })} placeholder="model id" />
                        <input className="p-2 border rounded" value={p.apiKey} onChange={e => updateProvider(idx, { apiKey: e.target.value })} placeholder="API key (if required)" />
                    </div>
                </div>
            ))}
            <div className="p-3 border rounded bg-white">
                <div className="flex items-center justify-between">
                    <div className="font-medium">Local LLM</div>
                    <div>
                        <button onClick={detectLocalOllama} className="text-sm p-1 border rounded">{detecting ? 'Detecting...' : 'Detect Local Ollama'}</button>
                    </div>
                </div>
                {detectedModels.length > 0 && (
                    <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700">Detected Models</label>
                        <div className="flex gap-2 mt-2 items-center">
                            <select className="p-2 border rounded" value={selectedDetected ?? ''} onChange={e => setSelectedDetected(e.target.value)}>
                                <option value="">-- select model --</option>
                                {detectedModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <Button onClick={addDetectedAsProvider}>Add Selected</Button>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex gap-2">
                <Button onClick={addProvider}>Add Provider</Button>
                <Button variant="secondary" onClick={async () => {
                    // Persist to server (admin endpoint) and also save to local settings
                    try {
                        // save providers: try admin endpoint first; on 401 fallback to public endpoint if available
                        for (const p of local) {
                            const payload = { provider_id: p.provider_id || p.id, name: p.name, model: p.model, config: { ...(p || {}) }, priority: p.priority || 0 };
                            let r = await fetch('/api/admin/llm_providers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
                            if (r.status === 401) {
                                // try public save (dev-only)
                                r = await fetch('/api/llm_providers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                            }
                            if (!r.ok) {
                                const txt = await r.text();
                                throw new Error(txt);
                            }
                        }
                        // fetch latest providers from server (admin preferred)
                        let r = await fetch('/api/admin/llm_providers', { credentials: 'include' });
                        if (r.status === 401) r = await fetch('/api/llm_providers');
                        if (r.ok) {
                            const provs = await r.json();
                            setSettings({ ...(settings as any), llmProviders: provs });
                            alert('LLM providers saved');
                        } else {
                            alert('Failed to save providers');
                        }
                    } catch (e) {
                        console.error(e);
                        alert('Failed to save LLM providers: ' + String(e));
                    }
                }}>Save LLM Settings</Button>
            </div>
            <BandEditor isOpen={bandsOpen} onClose={() => setBandsOpen(false)} />
        </div>
    );
};

// DBMS Tab Component: sidebar list of tables, SQL textarea and results with pagination
const DBMSTab: React.FC = () => {
    const [tables, setTables] = React.useState<string[]>([]);
    const [selectedTable, setSelectedTable] = React.useState<string | null>(null);
    const [sql, setSql] = React.useState('');
    const [rows, setRows] = React.useState<any[]>([]);
    const [columns, setColumns] = React.useState<string[]>([]);
    const [columnFilters, setColumnFilters] = React.useState<Record<string,string>>({});
    const [limit, setLimit] = React.useState(50);
    const [offset, setOffset] = React.useState(0);
    const [search, setSearch] = React.useState('');
    const [info, setInfo] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(false);

    const loadTables = async () => {
        try {
            let r = await fetch('/api/admin/db/tables', { credentials: 'include' });
            if (r.status === 401) r = await fetch('/api/rag_schemas');
            if (!r.ok) { setTables([]); return; }
            const j = await r.json();
            if (Array.isArray(j.tables)) setTables(j.tables);
            else if (Array.isArray(j)) setTables(j.map((x: any) => x.table_name || x));
            else if (Array.isArray(j)) setTables(j.map((x: any) => x.table_name || x));
        } catch (e) { console.error('loadTables', e); setTables([]); }
    };

    useEffect(() => { loadTables(); }, []);

    const loadTableInfo = async (t: string) => {
        try {
            const r = await fetch('/api/admin/db/table/' + encodeURIComponent(t) + '/info', { credentials: 'include' });
            if (!r.ok) return setInfo(null);
            const j = await r.json(); setInfo(j);
        } catch (e) { setInfo(null); }
    };

    const runQuery = async (overrideSql?: string) => {
        try {
            setLoading(true);
            const run = overrideSql || sql || (selectedTable ? `SELECT * FROM "${selectedTable}" LIMIT ${limit} OFFSET ${offset}` : '');
            if (!run) { setRows([]); setColumns([]); setLoading(false); return; }
            let r = await fetch('/api/admin/db/query', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql: run }) });
            if (r.status === 401) {
                // fallback to public execute_sql endpoint
                r = await fetch('/api/execute_sql', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql: run }) });
            }
            if (!r.ok) { const txt = await r.text(); alert('Query failed: ' + txt); setLoading(false); return; }
            const j = await r.json(); setRows(j.rows || j || []);
            if ((j.rows || []).length > 0) setColumns(Object.keys((j.rows || [])[0]));
            else setColumns([]);
        } catch (e) { console.error('runQuery', e); alert('Query error: ' + String(e)); }
        setLoading(false);
    };

    useEffect(() => {
        if (selectedTable) {
            const base = `SELECT * FROM "${selectedTable}"`;
            // build where clause from columnFilters
            const filters = Object.entries(columnFilters || {}).map(([c, v]) => {
                const vv = String(v || '').trim();
                if (!vv) return null;
                // safe-ish escaping for single quotes
                const esc = vv.replace(/'/g, "''");
                return `CAST(\"${c}\" AS TEXT) ILIKE '%${esc}%'`;
            }).filter(Boolean);
            const where = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';
            const built = `${base}${where} LIMIT ${limit} OFFSET ${offset}`;
            setSql(built);
            loadTableInfo(selectedTable);
            // immediately run the query to preview the table when clicked or filters change
            runQuery(built);
        }
    }, [selectedTable, limit, offset]);

    // Re-run query when column filters change
    useEffect(() => {
        if (!selectedTable) return;
        const base = `SELECT * FROM "${selectedTable}"`;
        const filters = Object.entries(columnFilters || {}).map(([c, v]) => {
            const vv = String(v || '').trim();
            if (!vv) return null;
            const esc = vv.replace(/'/g, "''");
            return `CAST(\"${c}\" AS TEXT) ILIKE '%${esc}%'`;
        }).filter(Boolean);
        const where = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';
        const built = `${base}${where} LIMIT ${limit} OFFSET ${offset}`;
        setSql(built);
        runQuery(built);
    }, [columnFilters]);

    return (
        <div className="grid grid-cols-4 gap-4">
            <div className="col-span-1">
                <div className="font-medium mb-2">Tables</div>
                <div className="border rounded max-h-[60vh] overflow-auto bg-white">
                    {tables.map(t => <div key={t} className={`p-2 cursor-pointer hover:bg-gray-50 ${t===selectedTable?'bg-gray-50 font-medium':''}`} onClick={() => setSelectedTable(t)}>{t}</div>)}
                </div>
            </div>
            <div className="col-span-3">
                <div className="grid grid-cols-1 gap-2">
                    <div className="flex gap-2">
                        <input className="flex-1 p-2 border rounded" value={sql} onChange={e=>setSql(e.target.value)} placeholder="Enter SELECT SQL or use table preview" />
                        <Button onClick={() => runQuery()}>Run</Button>
                        <Button variant="secondary" onClick={() => { setOffset(0); runQuery(); }}>Run (from start)</Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm">Search</label>
                        <input className="p-2 border rounded" value={search} onChange={e=>setSearch(e.target.value)} placeholder="text search across text columns" />
                        <label className="text-sm">Limit</label>
                        <input type="number" className="p-2 border rounded w-28" value={limit} onChange={e=>setLimit(Number(e.target.value||50))} />
                        <label className="text-sm">Offset</label>
                        <input type="number" className="p-2 border rounded w-28" value={offset} onChange={e=>setOffset(Number(e.target.value||0))} />
                    </div>

                    <div className="mt-2">
                        {loading && <div className="text-sm text-gray-500">Running query...</div>}
                        {/* Column-level filters */}
                        {columns.length > 0 && (
                            <div className="mt-2 mb-2 p-2 bg-gray-50 border rounded">
                                <div className="text-sm font-medium mb-2">Column Filters</div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    {columns.map(c => (
                                        <div key={c} className="flex items-center gap-2">
                                            <label className="text-xs w-28 text-gray-600">{c}</label>
                                            <input className="flex-1 p-2 border rounded" value={columnFilters[c] || ''} onChange={e => setColumnFilters(prev => ({ ...(prev || {}), [c]: e.target.value }))} placeholder={`Filter ${c}`} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {!loading && rows.length === 0 && <div className="text-sm text-gray-500">No rows to display.</div>}
                        {!loading && rows.length > 0 && (
                            <div>
                                <div className="overflow-auto max-h-[50vh] border rounded bg-white">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50 text-xs text-gray-600">
                                            <tr>{columns.map(c => <th key={c} className="p-2 border">{c}</th>)}</tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((r, i) => (
                                                <tr key={i} className="border-t">
                                                    {columns.map(c => <td key={c} className="p-2 align-top">{typeof r[c] === 'object' ? JSON.stringify(r[c]).slice(0,200) : String(r[c])}</td>)}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-2 text-sm text-gray-600">Returned {rows.length} rows.</div>
                            </div>
                        )}
                    </div>

                    {info && (
                        <div className="mt-3 p-2 border rounded bg-gray-50">
                            <div className="font-medium">Table Info</div>
                            <div className="text-sm">Primary Keys: {(info.primaryKeys || []).join(', ') || '—'}</div>
                            <div className="text-sm">Foreign Keys: {(info.foreignKeys || []).map((fk:any)=> `${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`).join('; ') || '—'}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Roles & Permissions helper components
const RolesList: React.FC = () => {
    const [list, setList] = useState<any[]>([]);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [manageRole, setManageRole] = useState<any | null>(null);
    const [allPerms, setAllPerms] = useState<any[]>([]);
    const [rolePerms, setRolePerms] = useState<number[]>([]);

    useEffect(() => {
        (async () => {
            try {
                // Try admin endpoints first; if unauthorized, fall back to public endpoints
                let r = await fetch('/api/admin/roles', { credentials: 'include' });
                if (r.status === 401) r = await fetch('/api/roles');
                if (r.ok) setList(await r.json());

                let pr = await fetch('/api/admin/permissions', { credentials: 'include' });
                if (pr.status === 401) pr = await fetch('/api/permissions');
                if (pr.ok) setAllPerms(await pr.json());
            } catch (e) { console.error(e); }
        })();
    }, []);

    const refreshRoles = async () => { const r = await fetch('/api/admin/roles', { credentials: 'include' }); if (r.ok) setList(await r.json()); };

    const save = async (id?: number) => {
        try {
            const payload = id ? { id, name, description: desc } : { name, description: desc };
            const r = await fetch('/api/admin/roles', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (r.ok) { await refreshRoles(); setName(''); setDesc(''); }
        } catch (e) { alert('Failed'); }
    };

    const openManage = async (role: any) => {
        setManageRole(role);
        try {
            const r = await fetch(`/api/admin/role_permissions?roleId=${role.id}`, { credentials: 'include' });
            if (r.ok) {
                const perms = await r.json();
                setRolePerms(perms.map((p: any) => p.id));
            } else setRolePerms([]);
        } catch (e) { console.error(e); setRolePerms([]); }
    };

    const toggleSelectAll = async () => {
        if (!manageRole) return;
        try {
            const allSelected = allPerms.length > 0 && rolePerms.length === allPerms.length;
            if (allSelected) {
                // remove all
                const toRemove = [...rolePerms];
                await Promise.all(toRemove.map(pid => fetch('/api/admin/role_permissions/remove', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roleId: manageRole.id, permissionId: pid }) })));
                setRolePerms([]);
            } else {
                // add all
                const toAdd = allPerms.map(p => p.id).filter((id: number) => !rolePerms.includes(id));
                await Promise.all(toAdd.map(pid => fetch('/api/admin/role_permissions', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roleId: manageRole.id, permissionId: pid }) })));
                setRolePerms(allPerms.map(p => p.id));
            }
        } catch (e) { console.error(e); alert('Failed to update permissions'); }
    };

    const togglePerm = async (permId: number) => {
        if (!manageRole) return;
        const has = rolePerms.includes(permId);
        try {
            if (!has) {
                await fetch('/api/admin/role_permissions', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roleId: manageRole.id, permissionId: permId }) });
                setRolePerms(prev => [...prev, permId]);
            } else {
                await fetch('/api/admin/role_permissions/remove', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roleId: manageRole.id, permissionId: permId }) });
                setRolePerms(prev => prev.filter(p => p !== permId));
            }
        } catch (e) { console.error(e); alert('Failed to update permission'); }
    };

    return (
        <div>
            <div className="space-y-2">
                {list.map(r => (
                    <div key={r.id} className="p-2 border rounded flex justify-between items-center">
                        <div>
                            <div className="font-medium">{r.name}</div>
                            <div className="text-xs text-gray-500">{r.description}</div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={async () => { setName(r.name); setDesc(r.description || ''); }} className="text-sm p-1 border rounded">Edit</button>
                            <button onClick={() => openManage(r)} className="text-sm p-1 border rounded">Manage Permissions</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2">
                <input className="p-2 border rounded" placeholder="Role name" value={name} onChange={e => setName(e.target.value)} />
                <input className="p-2 border rounded" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
                <div className="flex gap-2"><Button onClick={() => save()}>Create Role</Button><Button variant="secondary" onClick={() => save(undefined)}>Save Changes</Button></div>
            </div>

            {manageRole && (
                <div className="mt-4 p-3 border rounded bg-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium">Managing: {manageRole.name}</div>
                            <div className="text-xs text-gray-500">{manageRole.description}</div>
                        </div>
                        <div>
                            <button onClick={() => setManageRole(null)} className="text-sm p-1 border rounded">Close</button>
                        </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2">
                        <div className="flex items-center gap-2">
                            <label className="inline-flex items-center">
                                <input type="checkbox" checked={allPerms.length > 0 && rolePerms.length === allPerms.length} onChange={() => toggleSelectAll()} />
                                <span className="ml-2 text-sm">Select All</span>
                            </label>
                        </div>
                        {allPerms.map(p => (
                            <label key={p.id} className="flex items-center gap-2">
                                <input type="checkbox" checked={rolePerms.includes(p.id)} onChange={() => togglePerm(p.id)} />
                                <div className="ml-2"><div className="font-medium">{p.name}</div><div className="text-xs text-gray-500">{p.description}</div></div>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const UsersList: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [editing, setEditing] = useState<any | null>(null);
    const [manageUser, setManageUser] = useState<any | null>(null);
    const [userRoles, setUserRoles] = useState<number[]>([]);

    const fetchUsers = async () => {
        try {
            const r = await fetch('/api/users');
            if (r.ok) setUsers(await r.json());
        } catch (e) { console.error(e); }
    };
    const fetchRoles = async () => {
        try {
            let r = await fetch('/api/admin/roles', { credentials: 'include' });
            if (r.status === 401) r = await fetch('/api/roles');
            if (r.ok) setRoles(await r.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchUsers(); fetchRoles(); }, []);

    const openManage = async (user: any) => {
        setManageUser(user);
        setUserRoles([]);
        try {
            const r = await fetch(`/api/admin/user_roles?userId=${user.id}`, { credentials: 'include' });
            if (r.ok) {
                const rows = await r.json();
                setUserRoles(rows.map((r: any) => r.role_id));
            }
        } catch (e) { console.error(e); }
    };

    const toggleRoleForUser = async (roleId: number) => {
        if (!manageUser) return;
        const has = userRoles.includes(roleId);
        try {
            if (!has) {
                await fetch('/api/admin/roles/assign', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: manageUser.id, roleId }) });
                setUserRoles(prev => [...prev, roleId]);
            } else {
                await fetch('/api/admin/roles/unassign', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: manageUser.id, roleId }) });
                setUserRoles(prev => prev.filter((r: number) => r !== roleId));
            }
        } catch (e) { console.error(e); alert('Failed to update role'); }
    };

    const saveUser = async (u?: any) => {
        try {
            const payload = { ...(u || editing) };
            const r = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (r.ok) { fetchUsers(); setEditing(null); alert('User saved'); }
            else alert('Failed to save user: ' + await r.text());
        } catch (e) { console.error(e); alert('Failed to save user'); }
    };

    const deleteUser = async (id: number) => {
        if (!confirm('Delete user? This cannot be undone.')) return;
        try {
            const r = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', credentials: 'include' });
            if (r.ok) { fetchUsers(); alert('User deleted'); }
            else alert('Failed to delete user: ' + await r.text());
        } catch (e) { console.error(e); alert('Failed to delete user'); }
    };

    return (
        <div>
            <h4 className="font-medium">Users</h4>
            <div className="mt-2 space-y-2">
                {users.map(u => (
                    <div key={u.id} className="p-2 border rounded flex justify-between items-center">
                        <div>
                            <div className="font-medium">{u.firstName} {u.lastName} — <span className="text-xs text-gray-500">{u.email}</span></div>
                            <div className="text-xs text-gray-500">Roles: <span className="font-medium">{u.role || ''}</span></div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setEditing(u); }} className="text-sm p-1 border rounded">Edit</button>
                            <button onClick={() => openManage(u)} className="text-sm p-1 border rounded">Manage Roles</button>
                            <button onClick={() => deleteUser(u.id)} className="text-sm p-1 border rounded text-red-600">Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {editing && (
                <div className="mt-3 p-3 border rounded bg-white">
                    <h5 className="font-medium">Edit User</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        <input className="p-2 border rounded" placeholder="First name" value={editing.firstName || ''} onChange={e => setEditing({ ...editing, firstName: e.target.value })} />
                        <input className="p-2 border rounded" placeholder="Last name" value={editing.lastName || ''} onChange={e => setEditing({ ...editing, lastName: e.target.value })} />
                        <input className="p-2 border rounded" placeholder="Email" value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} />
                        <input className="p-2 border rounded" placeholder="Password (leave blank to keep)" value={editing.password || ''} onChange={e => setEditing({ ...editing, password: e.target.value })} />
                    </div>
                    <div className="mt-2 flex gap-2"><Button onClick={() => saveUser()}>Save</Button><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button></div>
                </div>
            )}

            {manageUser && (
                <div className="mt-3 p-3 border rounded bg-white">
                    <div className="flex justify-between items-center">
                        <div className="font-medium">Manage Roles for {manageUser.firstName} {manageUser.lastName}</div>
                        <button onClick={() => setManageUser(null)} className="text-sm p-1 border rounded">Close</button>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {roles.map(r => (
                            <label key={r.id} className="inline-flex items-center gap-2 border p-2 rounded">
                                <input type="checkbox" checked={userRoles.includes(r.id)} onChange={() => toggleRoleForUser(r.id)} />
                                <div>
                                    <div className="font-medium">{r.name}</div>
                                    <div className="text-xs text-gray-500">{r.description}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const PermissionsList: React.FC = () => {
    const [list, setList] = useState<any[]>([]);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [manualEntry, setManualEntry] = useState(false);
    useEffect(() => {
        (async () => {
            try {
                let r = await fetch('/api/admin/permissions', { credentials: 'include' });
                if (r.status === 401) r = await fetch('/api/permissions');
                if (r.ok) setList(await r.json());
            } catch (e) { /* ignore */ }
        })();
    }, []);
    const save = async (id?: number) => { try { const payload = id ? { id, name, description: desc } : { name, description: desc }; const r = await fetch('/api/admin/permissions', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (r.ok) setList(await (await fetch('/api/admin/permissions', { credentials: 'include' })).json()); setName(''); setDesc(''); setManualEntry(false); } catch (e) { alert('Failed'); } };

    // Build dropdown options from appRoutes and existing permission names
    const routeOptions = appRoutes || [];

    return (
        <div>
            <div className="space-y-2">
                {list.map(r => <div key={r.id} className="p-2 border rounded"><div className="font-medium">{r.name}</div><div className="text-xs text-gray-500">{r.description}</div></div>)}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2">
                {!manualEntry ? (
                    <>
                        <label className="text-xs text-gray-600">Choose a route or existing permission</label>
                        <select className="p-2 border rounded" value={name} onChange={e => {
                            const v = e.target.value;
                            if (v === '_manual') { setManualEntry(true); setName(''); }
                            else setName(v);
                        }}>
                            <option value="">-- select --</option>
                            <optgroup label="Routes">
                                {routeOptions.map(r => <option key={`route:${r.path}`} value={`route:${r.path}`}>{r.label || r.path}</option>)}
                            </optgroup>
                            <optgroup label="Existing Permissions">
                                {list.map(p => <option key={`perm:${p.id}`} value={p.name}>{p.name}</option>)}
                            </optgroup>
                            <option value="_manual">Other (enter manually)</option>
                        </select>
                    </>
                ) : (
                    <input className="p-2 border rounded" placeholder="Permission name (custom)" value={name} onChange={e => setName(e.target.value)} />
                )}

                <input className="p-2 border rounded" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
                <div className="flex gap-2"><Button onClick={() => save()}>Create Permission</Button><Button variant="secondary" onClick={() => save(undefined)}>Save</Button></div>
            </div>
        </div>
    );
};

const SettingsPage: React.FC = () => {
    const { settings, setSettings, reset } = useTheme();
    const [tab, setTab] = useState<'database' | 'dbms' | 'llm' | 'rag' | 'theme' | 'app' | 'permissions' | 'datasets' | 'audit' | 'email'>('theme');
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [bandsOpen, setBandsOpen] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const r = await fetch('/api/current_user', { credentials: 'include' });
                if (r.ok) {
                    const j = await r.json();
                    const role = j && (j.role || '').toString().toLowerCase();
                    setIsAdmin(role === 'admin');
                } else setIsAdmin(false);
            } catch (e) { setIsAdmin(false); }
        })();
    }, []);
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            setSettings({ logoDataUrl: dataUrl });
        };
        reader.readAsDataURL(f);
    };

    const [dbEnv, setDbEnv] = useState<{ dbUser?: string, dbHost?: string, dbName?: string, dbPort?: string, dbPassword?: string }>({});

    const [dbForm, setDbForm] = useState<{ dbUser?: string, dbHost?: string, dbName?: string, dbPort?: string, dbPassword?: string } | null>(null);

    const trackRef = useRef<HTMLDivElement | null>(null);
    const [dragging, setDragging] = useState(false);
    const MIN_LOGO = 24;
    const MAX_LOGO = 200;
    const logoPx = (() => {
        try { return parseInt((settings as any).logoWidth || '40px'); } catch (e) { return 40; }
    })();
    const fontPx = (() => {
        try { return parseInt((settings as any).fontSize || (settings as any).fontSize || '14px'); } catch (e) { return 14; }
    })();

    useEffect(() => {
        if (!dragging) return;
        const onMove = (e: MouseEvent) => {
            if (!trackRef.current) return;
            const rect = trackRef.current.getBoundingClientRect();
            let x = (e as MouseEvent).clientX - rect.left;
            if (x < 0) x = 0;
            if (x > rect.width) x = rect.width;
            const pct = x / rect.width;
            const px = Math.round(MIN_LOGO + pct * (MAX_LOGO - MIN_LOGO));
            setSettings({ ...(settings as any), logoWidth: `${px}px` });
        };
        const onUp = () => setDragging(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [dragging, setSettings, settings]);

    useEffect(() => {
        // try to load server env defaults and settings (admin-only). Fail silently if not authorized.
        (async () => {
            try {
                let r = await fetch('/api/admin/env', { credentials: 'include' });
                if (r.status === 401) {
                    // fallback to public env endpoint when not authenticated
                    try { r = await fetch('/api/env'); } catch (e) { /* ignore */ }
                }
                if (r && r.ok) {
                    const je = await r.json();
                    setDbEnv(je);
                    // populate editable form values if not already set
                    setDbForm(prev => prev || ({ dbUser: je.dbUser, dbHost: je.dbHost, dbName: je.dbName, dbPort: je.dbPort, dbPassword: je.dbPassword }));
                }
            } catch (e) { /* ignore */ }
        })();
    }, []);

    if (isAdmin === false) {
        return (
            <div className="p-6">
                <Card>
                    <h2 className="text-lg font-medium">Access Restricted</h2>
                    <p className="text-sm text-gray-600 mt-2">Settings are restricted to users with the Admin role. Contact an administrator if you need access.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Settings</h1>
            </div>

            <div className="bg-white rounded shadow p-2">
                <nav className="flex space-x-2">
                    <button onClick={() => setTab('database')} className={`px-3 py-2 rounded ${tab === 'database' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>Database</button>
                    <button onClick={() => setTab('dbms')} className={`px-3 py-2 rounded ${tab === 'dbms' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>DBMS</button>
                    <button onClick={() => setTab('llm')} className={`px-3 py-2 rounded ${tab === 'llm' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>LLM</button>
                    <button onClick={() => setTab('rag')} className={`px-3 py-2 rounded ${tab === 'rag' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>RAG</button>
                    <button onClick={() => setTab('theme')} className={`px-3 py-2 rounded ${tab === 'theme' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>Theme</button>
                    <button onClick={() => setTab('app')} className={`px-3 py-2 rounded ${tab === 'app' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>App</button>
                    <button onClick={() => setTab('email')} className={`px-3 py-2 rounded ${tab === 'email' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>Email / SMTP</button>
                    <button onClick={() => setTab('datasets')} className={`px-3 py-2 rounded ${tab === 'datasets' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>Datasets</button>
                    <button onClick={() => setTab('permissions')} className={`px-3 py-2 rounded ${tab === 'permissions' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>Roles & Permissions</button>
                    <button onClick={() => setTab('audit')} className={`px-3 py-2 rounded ${tab === 'audit' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>Audit Trails</button>
                    <a href="#/connectors" className="px-3 py-2 rounded text-gray-600 hover:bg-gray-50">API Connectors</a>
                </nav>
            </div>

            {tab === 'database' && (
                <Card>
                    <h3 className="text-lg font-medium mb-2">Database Connection</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Host</label>
                            <input className="mt-1 block w-full p-2 border rounded" value={(dbForm as any)?.dbHost ?? dbEnv.dbHost ?? (settings as any).dbHost ?? ''} onChange={e => setDbForm(prev => ({ ...(prev || {}), dbHost: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Port</label>
                            <input className="mt-1 block w-full p-2 border rounded" value={(dbForm as any)?.dbPort ?? dbEnv.dbPort ?? (settings as any).dbPort ?? ''} onChange={e => setDbForm(prev => ({ ...(prev || {}), dbPort: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Database</label>
                            <input className="mt-1 block w-full p-2 border rounded" value={(dbForm as any)?.dbName ?? dbEnv.dbName ?? (settings as any).dbName ?? ''} onChange={e => setDbForm(prev => ({ ...(prev || {}), dbName: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">User</label>
                            <input className="mt-1 block w-full p-2 border rounded" value={(dbForm as any)?.dbUser ?? dbEnv.dbUser ?? (settings as any).dbUser ?? ''} onChange={e => setDbForm(prev => ({ ...(prev || {}), dbUser: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input type="password" className="mt-1 block w-full p-2 border rounded" value={(dbForm as any)?.dbPassword ?? dbEnv.dbPassword ?? (settings as any).dbPassword ?? ''} onChange={e => setDbForm(prev => ({ ...(prev || {}), dbPassword: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Connection Test</label>
                            <div className="mt-1 flex gap-2">
                                <Button onClick={async () => {
                                    try {
                                        const payload = { ...(settings as any), ...(dbForm || {}), ...dbEnv };
                                        // Try admin endpoint first (supports server-side test and is preferred)
                                        let res = await fetch('/api/admin/test-db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
                                        if (res.status === 401) {
                                            // Not authorized -> fall back to public endpoint without credentials
                                            res = await fetch('/api/test-db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                                        }
                                        if (res.ok) {
                                            alert('Connection succeeded');
                                        } else {
                                            // try to parse json else text
                                            let body = await res.text();
                                            try { const j = JSON.parse(body); body = j.error || j.message || JSON.stringify(j); } catch (e) { /* keep text */ }
                                            alert('Connection failed: ' + body);
                                        }
                                    } catch (e) { alert('Connection test error: ' + String(e)); }
                                }}>Test Connection</Button>
                                <Button variant="secondary" onClick={async () => {
                                    try {
                                        const payload = { ...(dbForm || {}), ...(dbEnv || {}) };
                                        // Try admin write first
                                        let res = await fetch('/api/admin/env', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
                                        if (res.status === 401) {
                                            // fall back to public env write
                                            res = await fetch('/api/env', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                                            if (res.ok) {
                                                alert('Saved DB settings to .env and .env.local (server settings table not updated because not authenticated)');
                                                return;
                                            } else {
                                                const txt = await res.text();
                                                alert('Failed to save via public endpoint: ' + txt);
                                                return;
                                            }
                                        }

                                        if (res.ok) {
                                            // also save into settings table for app-level persistence (admin only)
                                            try {
                                                await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ db: payload }) });
                                            } catch (e) { /* ignore */ }
                                            alert('Saved DB settings to .env and settings table');
                                        } else {
                                            alert('Failed to save: ' + await res.text());
                                        }
                                    } catch (e) { alert('Save error: ' + String(e)); }
                                }}>Save DB Settings</Button>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {tab === 'dbms' && (
                <Card>
                    <h3 className="text-lg font-medium mb-2">DBMS Browser</h3>
                    <DBMSTab />
                </Card>
            )}

            {tab === 'llm' && (
                <Card>
                    <h3 className="text-lg font-medium mb-2">LLM Settings</h3>
                    <p className="text-sm text-gray-500 mb-3">Configure available LLMs and their priority for generation calls (local or cloud providers).</p>
                    <LLMSettingsForm />
                </Card>
            )}

            {tab === 'rag' && (
                <Card>
                    <h3 className="text-lg font-medium mb-2">RAG Settings</h3>
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Schema & Business Rule Generation</label>
                        <div className="text-sm text-gray-500">When enabled, the RAG engine will analyze sample data to construct contextual schemas and suggested business rules to improve query relevance.</div>
                        <div className="mt-2">
                            <label className="inline-flex items-center"><input type="checkbox" checked={(settings as any).ragAutoGenerate || false} onChange={e => setSettings({ ...(settings as any), ragAutoGenerate: e.target.checked })} className="mr-2" />Enable automatic schema generation</label>
                        </div>
                        {/* Removed Context Window Size and Preview Generated Rules per user request — RAG records must include explicit Business Rules */}
                        <RagManager />
                    </div>
                </Card>
            )}

            {tab === 'theme' && (
                <Card>
                    <h3 className="text-lg font-medium mb-2">Appearance & Theme Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Primary Color</label>
                            <input type="color" value={settings.primaryColor} onChange={e => setSettings({ primaryColor: e.target.value })} className="mt-2" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Sidebar Background</label>
                            <input type="color" value={settings.sidebarBg} onChange={e => setSettings({ sidebarBg: e.target.value })} className="mt-2" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Navbar / Nav Text Color</label>
                            <input type="color" value={settings.navTextColor} onChange={e => setSettings({ navTextColor: e.target.value })} className="mt-2" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Logo Color</label>
                            <input type="color" value={settings.logoColor} onChange={e => setSettings({ logoColor: e.target.value })} className="mt-2" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Navbar Background</label>
                            <input type="color" value={settings.navbarBg} onChange={e => setSettings({ navbarBg: e.target.value })} className="mt-2" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Upload Logo</label>
                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="mt-2" />
                            <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-700">Background Image (login page)</label>
                                <input type="file" accept="image/*" onChange={async (e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                        const dataUrl = ev.target?.result as string;
                                        setSettings({ backgroundImage: dataUrl });
                                    };
                                    reader.readAsDataURL(f);
                                }} className="mt-2" />
                                <p className="text-xs text-gray-500 mt-1">Optional background image used on the login page. Saved to theme settings (localStorage) and can be persisted to server via Save.</p>
                            </div>
                            <p className="text-xs text-gray-500">Uploaded logo will be saved to application settings (persisted to server on Save).</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Logo Text</label>
                            <input type="text" value={settings.logoText} onChange={e => setSettings({ logoText: e.target.value })} className="mt-2 block w-full p-2 border rounded" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Programs Link Label</label>
                            <input type="text" value={(settings as any).programsLabel || 'Programs'} onChange={e => setSettings({ ...(settings as any), programsLabel: e.target.value })} className="mt-2 block w-full p-2 border rounded" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Activities Link Label</label>
                            <input type="text" value={(settings as any).activitiesLabel || 'Activities'} onChange={e => setSettings({ ...(settings as any), activitiesLabel: e.target.value })} className="mt-2 block w-full p-2 border rounded" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Text Color</label>
                            <input type="color" value={settings.textColor} onChange={e => setSettings({ textColor: e.target.value })} className="mt-2" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Font Family</label>
                            <input type="text" value={settings.fontFamily} onChange={e => setSettings({ fontFamily: e.target.value })} className="mt-2 block w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Logo Width</label>
                            <div ref={trackRef} className="mt-2 w-full h-8 rounded bg-gray-100 relative" style={{ cursor: 'pointer' }} onClick={(e) => {
                                const rect = (trackRef.current as any)?.getBoundingClientRect?.();
                                if (!rect) return;
                                const x = (e as React.MouseEvent).clientX - rect.left;
                                const pct = Math.max(0, Math.min(1, x / rect.width));
                                const px = Math.round(MIN_LOGO + pct * (MAX_LOGO - MIN_LOGO));
                                setSettings({ ...(settings as any), logoWidth: `${px}px` });
                            }}>
                                <div className="absolute left-0 top-0 bottom-0 bg-primary-200" style={{ width: `calc(${logoPx}px)` }} />
                                <div className="absolute top-1/2 -translate-y-1/2 bg-white border rounded-full w-4 h-4 shadow" style={{ left: `${Math.max(0, Math.min(100, ((logoPx - MIN_LOGO) / (MAX_LOGO - MIN_LOGO)) * 100))}%` }} onMouseDown={() => setDragging(true)} />
                            </div>
                            <div className="mt-2 flex items-center gap-3">
                                <input type="range" min={MIN_LOGO} max={MAX_LOGO} value={logoPx} onChange={e => setSettings({ ...(settings as any), logoWidth: `${e.target.value}px` })} />
                                <div className="text-sm">{logoPx}px</div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Global Font Size</label>
                            <div className="mt-2 flex items-center gap-3">
                                <input type="range" min={10} max={28} value={fontPx} onChange={e => setSettings({ ...(settings as any), fontSize: `${e.target.value}px` })} />
                                <div className="text-sm">{fontPx}px</div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Default Rich Text Editor</label>
                            <select value={(settings as any).defaultRichTextEditor || 'editorjs'} onChange={e => setSettings({ ...(settings as any), defaultRichTextEditor: e.target.value })} className="mt-2 block w-full p-2 border rounded">
                                <option value="editorjs">Editor.js (recommended - block-based)</option>
                                <option value="summernote">Summernote (jQuery)</option>
                                <option value="taptap">TapTap / Tiptap (inline-rich)</option>
                                <option value="tinymce">TinyMCE (self-hosted)</option>
                                <option value="ckeditor">CKEditor (classic)</option>
                                <option value="basic">Basic (fallback)</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Choose the default rich text editor for paragraph elements and form builders.</p>
                        </div>
                    </div>

                    <div className="mt-6 flex space-x-3">
                        <Button onClick={() => reset()}>Reset to Defaults</Button>
                        <Button variant="secondary" onClick={async () => {
                            try {
                                // Persist full settings object to admin settings endpoint
                                const payload = settings || {};
                                let r = await fetch('/api/admin/settings', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                                if (r.status === 401) {
                                    alert('Not authorized to save settings on server. Please login as Admin to persist settings.');
                                    return;
                                }
                                if (!r.ok) {
                                    const txt = await r.text();
                                    alert('Failed to save settings: ' + txt);
                                    return;
                                }
                                alert('Theme saved to server');
                            } catch (e) {
                                console.error('Failed to save theme settings', e);
                                alert('Failed to save theme settings: ' + String(e));
                            }
                        }}>Save</Button>
                        <Button variant="secondary" onClick={() => setBandsOpen(true)}>Edit Bands</Button>
                    </div>

                    <div className="mt-4">
                        <h4 className="font-medium">Preview</h4>
                        <div className="p-4 rounded" style={{ background: 'var(--sidebar-bg)', color: 'var(--app-text-color)' }}>
                            <div style={{ color: 'var(--logo-color)', fontWeight: 700 }}>{settings.logoText || 'DQAPlus'}</div>
                            <p>Primary accent: <span style={{ color: 'var(--primary-color)' }}>{settings.primaryColor}</span></p>
                        </div>
                    </div>
                </Card>
            )}

            {tab === 'app' && (
                <Card>
                    <h3 className="text-lg font-medium mb-2">App Settings</h3>
                    <div className="space-y-3">
                        <label className="inline-flex items-center"><input type="checkbox" className="mr-2" checked={(settings as any).allowPublicReports || false} onChange={e => setSettings({ ...(settings as any), allowPublicReports: e.target.checked })} />Allow public report links</label>
                        <label className="inline-flex items-center"><input type="checkbox" className="mr-2" checked={(settings as any).enableAnalytics || false} onChange={e => setSettings({ ...(settings as any), enableAnalytics: e.target.checked })} />Enable usage analytics</label>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Default page after login</label>
                            <select value={(settings as any).defaultPage || '/dashboard'} onChange={e => setSettings({ ...(settings as any), defaultPage: e.target.value })} className="mt-1 block p-2 border rounded">
                                <option value="/dashboard">Dashboard</option>
                                <option value="/activities">Activities</option>
                                <option value="/reports">Reports</option>
                            </select>
                        </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Default Map Provider</label>
                                    <select value={(settings as any).defaultMapProvider || 'leaflet'} onChange={e => setSettings({ ...(settings as any), defaultMapProvider: e.target.value })} className="mt-1 block p-2 border rounded">
                                        <option value="leaflet">Leaflet / OpenStreetMap</option>
                                        <option value="osmand">OsmAnd</option>
                                        <option value="organic">Organic Maps</option>
                                        <option value="herewego">HERE WeGo (requires API key)</option>
                                        <option value="google">Google Maps (requires API key)</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Choose the default map implementation used when picking locations or viewing dashboards.</p>

                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">HERE Maps API Key</label>
                                            <input className="mt-1 block w-full p-2 border rounded" value={(settings as any).hereApiKey || ''} onChange={e => setSettings({ ...(settings as any), hereApiKey: e.target.value })} placeholder="Paste HERE API key (optional)" />
                                            <p className="text-xs text-gray-400 mt-1">Required only if you select HERE WeGo as the default provider.</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Google Maps API Key</label>
                                            <input className="mt-1 block w-full p-2 border rounded" value={(settings as any).googleMapsApiKey || ''} onChange={e => setSettings({ ...(settings as any), googleMapsApiKey: e.target.value })} placeholder="Paste Google Maps API key (optional)" />
                                            <p className="text-xs text-gray-400 mt-1">Required only if you select Google Maps as the default provider.</p>
                                        </div>
                                    </div>
                                <p className="text-xs text-gray-500 mt-1">Choose the default map implementation used when picking locations or viewing dashboards.</p>
                            </div>
                    </div>
                    <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700">Organization Name (shown on map header)</label>
                        <input className="mt-1 block w-full p-2 border rounded" value={(settings as any).organizationName || ''} onChange={e => setSettings({ ...(settings as any), organizationName: e.target.value })} placeholder="Organization name" />
                        <p className="text-xs text-gray-500 mt-1">This value will be displayed above the map as the controller/organization ribbon.</p>
                    </div>
                </Card>
            )}

            {tab === 'email' && (
                <Card>
                    <h3 className="text-lg font-medium mb-2">Email / SMTP Settings</h3>
                    <div className="space-y-3">
                        <p className="text-sm text-gray-500">Configure SMTP used for password resets and notifications.</p>
                        <SMTPSettings />
                    </div>
                </Card>
            )}

            {tab === 'datasets' && (
                <Card>
                    <h3 className="text-lg font-medium mb-2">Datasets</h3>
                    <DatasetsPage />
                </Card>
            )}

            {tab === 'permissions' && (
                <Card>
                    <h3 className="text-lg font-medium mb-2">Roles & Permissions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <h4 className="font-medium">Roles</h4>
                            <div className="mt-2 space-y-2">
                                <RolesList />
                            </div>
                        </div>
                        <div>
                            <h4 className="font-medium">Permissions</h4>
                            <div className="mt-2 space-y-2">
                                <PermissionsList />
                            </div>
                        </div>
                        <div>
                            <h4 className="font-medium">Users</h4>
                            <div className="mt-2 space-y-2">
                                <UsersList />
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {tab === 'audit' && (
                <Card>
                    <h3 className="text-lg font-medium mb-2">Audit Trails</h3>
                    <AuditTrails />
                </Card>
            )}
        </div>
    );
};

function SMTPSettings() {
    const [smtp, setSmtp] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testTo, setTestTo] = useState('');
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                let r = await fetch('/api/admin/smtp', { credentials: 'include' });
                if (r.status === 401) r = await fetch('/api/smtp');
                if (r.ok) setSmtp(await r.json());
            } catch (e) { /* ignore */ }
        })();
    }, []);

    const save = async () => {
        setSaving(true);
        try {
            const r = await fetch('/api/admin/smtp', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(smtp || {}) });
            if (!r.ok) return alert('Failed to save: ' + await r.text());
            alert('Saved');
        } catch (e) { alert('Save failed: ' + String(e)); }
        setSaving(false);
    };

    const test = async () => {
        setTesting(true);
        try {
            const payload = { to: testTo || ((smtp && smtp.from) ? smtp.from : ''), subject: 'Test email', text: 'Test message' };
            const r = await fetch('/api/admin/test-smtp', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!r.ok) return alert('Test failed: ' + await r.text());
            alert('Test email sent');
        } catch (e) { alert('Test failed: ' + String(e)); }
        setTesting(false);
    };

    const applyGmailDefaults = () => {
        setSmtp({ ...(smtp || {}), host: 'smtp.gmail.com', port: 465, secure: true, from: (smtp && smtp.user) ? smtp.user : (smtp && smtp.from) || '' });
        setShowHelp(true);
    };

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">SMTP Host</label>
                    <input className="mt-1 block w-full p-2 border rounded" value={(smtp && smtp.host) || ''} onChange={e => setSmtp({ ...(smtp || {}), host: e.target.value })} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Port</label>
                    <input className="mt-1 block w-full p-2 border rounded" value={(smtp && smtp.port) || ''} onChange={e => setSmtp({ ...(smtp || {}), port: e.target.value })} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Secure (TLS)</label>
                    <div className="mt-1"><input type="checkbox" checked={(smtp && smtp.secure) || false} onChange={e => setSmtp({ ...(smtp || {}), secure: e.target.checked })} /></div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">User</label>
                    <input className="mt-1 block w-full p-2 border rounded" value={(smtp && smtp.user) || ''} onChange={e => setSmtp({ ...(smtp || {}), user: e.target.value })} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input type="password" className="mt-1 block w-full p-2 border rounded" value={(smtp && smtp.pass) || ''} onChange={e => setSmtp({ ...(smtp || {}), pass: e.target.value })} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">From address</label>
                    <input className="mt-1 block w-full p-2 border rounded" value={(smtp && smtp.from) || ''} onChange={e => setSmtp({ ...(smtp || {}), from: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Admin emails (comma separated)</label>
                    <input className="mt-1 block w-full p-2 border rounded" value={(smtp && smtp.admins) ? (Array.isArray(smtp.admins) ? smtp.admins.join(',') : smtp.admins) : ''} onChange={e => {
                        const v = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setSmtp({ ...(smtp || {}), admins: v });
                    }} />
                </div>
            </div>

            <div className="mt-4 flex gap-2">
                <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save SMTP Settings'}</Button>
                <Button variant="secondary" onClick={test} disabled={testing}>{testing ? 'Testing...' : 'Send test email'}</Button>
                <Button variant="secondary" onClick={applyGmailDefaults}>Use Gmail defaults</Button>
                <input className="p-2 border rounded" placeholder="Test recipient (optional)" value={testTo} onChange={e => setTestTo(e.target.value)} />
            </div>

            {/* Help / guidance for common providers (Gmail) */}
            <div className="mt-3 text-sm text-gray-700">
                <button className="text-sm text-primary-600 hover:underline" onClick={() => setShowHelp(s => !s)}>{showHelp ? 'Hide' : 'Show'} SMTP help</button>
                {showHelp && (
                    <div className="mt-2 p-3 bg-gray-50 border rounded text-sm text-gray-700">
                        <div className="font-medium">Gmail (smtp.gmail.com) notes</div>
                        <ul className="list-disc pl-5 mt-2">
                            <li>For Gmail use <strong>Host</strong>: <code>smtp.gmail.com</code>.</li>
                            <li>If using SSL set <strong>Port</strong> to <code>465</code> and <strong>Secure</strong> to true; for STARTTLS use port <code>587</code> and secure=false.</li>
                            <li>If your Google account has 2-step verification enabled, create an <strong>App Password</strong> and use it as the SMTP password (recommended).</li>
                            <li>Google blocks simple username/password auth for many accounts; if you see <code>530 Authentication Required</code> obtain an App Password or use OAuth2.</li>
                            <li>After saving settings click <strong>Send test email</strong> and check server logs for nodemailer errors.</li>
                        </ul>
                        <div className="mt-2 text-xs text-gray-500">See: <a className="text-primary-600 hover:underline" href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noreferrer">Google App Passwords</a></div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SettingsPage;

const AuditTrails: React.FC = () => {
    const [list, setList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [jsonViewerOpen, setJsonViewerOpen] = useState(false);
    const [jsonViewerContent, setJsonViewerContent] = useState<any>(null);
    const [datasetModalOpen, setDatasetModalOpen] = useState(false);
    const [datasetName, setDatasetName] = useState('');
    const [datasetNamePlaceholder, setDatasetNamePlaceholder] = useState('');
    const [datasetCategory, setDatasetCategory] = useState('');
    const [datasetPreview, setDatasetPreview] = useState<any[] | null>(null);
    const [creatingDataset, setCreatingDataset] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            let r = await fetch('/api/admin/audit_batches', { credentials: 'include' });
            if (r.status === 401) r = await fetch('/api/audit_batches');
            if (r.ok) setList(await r.json());
            else setList([]);
        } catch (e) { console.error('Failed to load audit batches', e); setList([]); }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const startCreateDatasetFromRow = (raw: any) => {
        // normalize candidate rows from raw.events or raw.details
        const payload = raw.events || raw.details || [];
        const rows = Array.isArray(payload) ? payload : (payload && typeof payload === 'object' ? [payload] : []);
        const placeholder = `audit_batch_${raw.id || Date.now()}`;
        setDatasetNamePlaceholder(placeholder);
        setDatasetName(placeholder);
        setDatasetCategory('audit');
        setDatasetPreview(rows);
        setDatasetModalOpen(true);
    };

    const createDatasetFromPreview = async () => {
        if (!datasetPreview || datasetPreview.length === 0) return alert('No rows to create dataset from');
        const name = datasetName && String(datasetName).trim() ? datasetName.trim() : datasetNamePlaceholder || `dataset_${Date.now()}`;
        setCreatingDataset(true);
        try {
            // create dataset
            const r = await fetch('/api/admin/datasets', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, category: datasetCategory || null, dataset_fields: [] }) });
            if (r.status === 401) { alert('Unauthorized - admin required to create dataset'); setCreatingDataset(false); return; }
            if (!r.ok) { alert('Failed to create dataset: ' + await r.text()); setCreatingDataset(false); return; }
            const created = await r.json();
            const dsId = created.id;
            // push rows as content (one by one) - server accepts JSON body for content
            let inserted = 0;
            for (const row of datasetPreview) {
                try {
                    const rc = await fetch(`/api/admin/datasets/${dsId}/content`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
                    if (rc.ok) inserted++;
                } catch (e) { /* ignore row-level failures */ }
            }
            alert(`Dataset created (id=${dsId}). Inserted ${inserted}/${datasetPreview.length} rows.`);
            setDatasetModalOpen(false);
            // refresh datasets? not necessary here; user can view datasets in settings
        } catch (e) {
            console.error('Failed to create dataset from audit', e);
            alert('Failed to create dataset: ' + String(e));
        }
        setCreatingDataset(false);
    };

    const columns = [
        { key: 'id', label: 'ID' },
        { key: 'batch_name', label: 'Batch' },
        { key: 'created_at', label: 'Created' },
        { key: 'created_by', label: 'By' },
        { key: 'status', label: 'Status' },
        {
            key: 'details', label: 'Details', render: (row: any) => {
                // If the original raw row contains structured JSON, show a View link
                const raw = row._raw || {};
                const payload = raw.events || raw.details || raw;
                const isStructured = payload && (typeof payload === 'object');
                if (isStructured) return <button className="text-xs text-blue-600" onClick={() => { setJsonViewerContent(payload); setJsonViewerOpen(true); }}>View</button>;
                return <span className="text-sm text-gray-600">{row.details || ''}</span>;
            }
        },
        {
            key: '__actions', label: '', render: (row: any) => (
                <div className="flex items-center gap-2">
                    <button className="text-xs text-blue-600" onClick={() => { const raw = row._raw || {}; setJsonViewerContent(raw.events || raw.details || raw); setJsonViewerOpen(true); }}>View</button>
                    {row._raw && (row._raw.events || row._raw.details) && (
                        <button className="text-xs text-green-600" onClick={() => startCreateDatasetFromRow(row._raw)}>Create Dataset</button>
                    )}
                </div>
            )
        }
    ];

    const data = (list || []).map((r: any) => ({
        id: r.id,
        batch_name: r.batch_name || r.name || '',
        created_at: r.created_at || r.created || '',
        created_by: r.created_by || (r.user && (r.user.email || r.user.name)) || '',
        status: r.status || r.state || '',
        details: (r.details && typeof r.details !== 'object') ? String(r.details) : (r.description || ''),
        _raw: r
    }));

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <div className="font-medium">Audit Batches</div>
                <div className="flex gap-2">
                    <Button onClick={load}>Refresh</Button>
                </div>
            </div>
            {loading && <div className="text-sm text-gray-500">Loading...</div>}
            {!loading && data.length === 0 && <div className="text-sm text-gray-500">No audit batches found.</div>}
            {!loading && data.length > 0 && (
                <>
                    <DataTable columns={columns} data={data} />
                    <Modal isOpen={jsonViewerOpen} onClose={() => setJsonViewerOpen(false)} title="Audit Events">
                        <div>
                            <JSONTableViewer data={jsonViewerContent} />
                            <div className="flex justify-end mt-2">
                                <Button onClick={() => setJsonViewerOpen(false)}>Close</Button>
                            </div>
                        </div>
                    </Modal>

                    {/* Dataset creation modal for audit batches */}
                    <Modal isOpen={datasetModalOpen} onClose={() => setDatasetModalOpen(false)} title="Create Dataset from Audit">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium">Dataset Name</label>
                                <input className="mt-1 block w-full p-2 border rounded" value={datasetName} onChange={e => setDatasetName(e.target.value)} placeholder={datasetNamePlaceholder} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Category (optional)</label>
                                <input className="mt-1 block w-full p-2 border rounded" value={datasetCategory} onChange={e => setDatasetCategory(e.target.value)} placeholder="e.g. audit_events" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Preview (first 5 rows)</label>
                                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded" style={{ maxHeight: 200, overflow: 'auto' }}>{datasetPreview ? JSON.stringify(datasetPreview.slice(0,5), null, 2) : 'No preview'}</pre>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="secondary" onClick={() => setDatasetModalOpen(false)}>Cancel</Button>
                                <Button onClick={createDatasetFromPreview} disabled={creatingDataset}>{creatingDataset ? 'Creating...' : 'Create Dataset'}</Button>
                            </div>
                        </div>
                    </Modal>
                </>
            )}
        </div>
    );
};

// Small JSON-to-table viewer with search, nested drill and download
const JSONTableViewer: React.FC<{ data: any }> = ({ data }) => {
    const [stack, setStack] = React.useState<any[]>([data]);
    const [filter, setFilter] = React.useState('');
    const cur = stack[stack.length - 1] || null;

    React.useEffect(() => { setStack([data]); setFilter(''); }, [data]);

    const flatten = (obj: any) => {
        if (obj === null || obj === undefined) return [{ path: '(root)', value: '' }];
        if (typeof obj !== 'object') return [{ path: '(root)', value: String(obj) }];
        const rows: { path: string; value: any }[] = [];
        const walk = (v: any, p: string) => {
            if (v === null || v === undefined) { rows.push({ path: p, value: '' }); return; }
            if (typeof v !== 'object') { rows.push({ path: p, value: v }); return; }
            if (Array.isArray(v)) {
                for (let i = 0; i < v.length; i++) walk(v[i], `${p}[${i}]`);
                return;
            }
            for (const k of Object.keys(v)) walk(v[k], p ? `${p}.${k}` : k);
        };
        walk(obj, '');
        return rows;
    };

    const rows = React.useMemo(() => flatten(cur).filter(r => {
        if (!filter) return true;
        const q = filter.toLowerCase();
        try { return String(r.path).toLowerCase().includes(q) || String(r.value).toLowerCase().includes(q); } catch (e) { return false; }
    }), [cur, filter]);

    const downloadCurrent = () => {
        const blob = new Blob([JSON.stringify(cur, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'audit.json'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            <div className="flex gap-2 items-center mb-2">
                <input className="p-2 border rounded flex-1" placeholder="Filter path or value" value={filter} onChange={e => setFilter(e.target.value)} />
                <Button onClick={downloadCurrent}>Download JSON</Button>
            </div>
            <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs text-gray-500">
                            <th className="px-2 py-1">Path</th>
                            <th className="px-2 py-1">Value / Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, idx) => (
                            <tr key={idx} className="border-t">
                                <td className="px-2 py-1 align-top text-xs text-gray-700 break-all" style={{ maxWidth: 420 }}>{r.path || '(root)'}</td>
                                <td className="px-2 py-1 align-top">
                                    {r.value !== null && typeof r.value === 'object' ? (
                                        <div>
                                            <span className="text-xs text-gray-600 mr-2">{Array.isArray(r.value) ? `[Array ${r.value.length}]` : '[Object]'}</span>
                                            <button className="text-xs text-blue-600" onClick={() => setStack(s => [...s, r.value])}>View</button>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-700 break-all">{String(r.value)}</div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-2 flex gap-2">
                <Button variant="secondary" onClick={() => setStack([data])} disabled={stack.length === 1}>Back to root</Button>
                <Button variant="secondary" onClick={() => setStack(s => s.slice(0, Math.max(1, s.length - 1)))} disabled={stack.length <= 1}>Up</Button>
            </div>
        </div>
    );
};

const RagManager: React.FC = () => {
    const [list, setList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const nameRef = useRef<HTMLInputElement | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            // try admin endpoint first
            let r = await fetch('/api/admin/rag_schemas', { credentials: 'include' });
            if (r.status === 401) {
                // fallback to public listing
                r = await fetch('/api/rag_schemas');
            } else {
                setIsAdmin(true);
            }
            if (r.ok) {
                const data = await r.json();
                setList(data || []);
            }
        } catch (e) { console.error('Failed to load rag schemas', e); }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    // NOTE: removed automatic focus on table_name to avoid refocusing while editing/creating records

    const startCreate = () => setEditing({ table_name: '', schema: [], sample_rows: [] });

    const save = async () => {
        if (!editing || !editing.table_name) return alert('Table name required');
        if (!editing.business_rules || !String(editing.business_rules).trim()) return alert('Business Rules (natural language) are required for every RAG record');
        try {
            const payload = { ...editing };
            // POST to admin endpoint (requires auth)
            const r = await fetch('/api/admin/rag_schemas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
            if (r.status === 401) return alert('Unauthorized - please login as admin');
            if (!r.ok) return alert('Save failed: ' + await r.text());
            alert('Saved');
            setEditing(null);
            await load();
        } catch (e) { alert('Save failed: ' + String(e)); }
    };

    const remove = async (id: any) => {
        if (!confirm('Delete this RAG record?')) return;
        try {
            const r = await fetch('/api/admin/rag_schemas/' + id, { method: 'DELETE', credentials: 'include' });
            if (r.status === 401) return alert('Unauthorized');
            if (!r.ok) return alert('Delete failed: ' + await r.text());
            await load();
        } catch (e) { alert('Delete failed: ' + String(e)); }
    };

    return (
        <div className="mt-4">
            {/* Edit form appears above the list when focused */}
            {editing && (
                <div className="mb-4 p-3 border rounded bg-gray-50">
                    <h4 className="font-medium mb-2">Edit RAG Record</h4>
                    <div className="grid grid-cols-1 gap-2">
                        <label className="text-sm">Table name</label>
                        <input ref={nameRef} className="p-2 border rounded" value={editing.table_name} onChange={e => setEditing({ ...editing, table_name: e.target.value })} />
                        <label className="text-sm">Schema (JSON array)</label>
                        <textarea className="p-2 border rounded" rows={6} value={JSON.stringify(editing.schema || [], null, 2)} onChange={e => {
                            try { setEditing({ ...editing, schema: JSON.parse(e.target.value) }); } catch (err) { /* ignore parse until save */ setEditing({ ...editing, schema: e.target.value as any }); }
                        }} />
                        <label className="text-sm">Sample rows (JSON array)</label>
                        <textarea className="p-2 border rounded" rows={6} value={JSON.stringify(editing.sample_rows || [], null, 2)} onChange={e => {
                            try { setEditing({ ...editing, sample_rows: JSON.parse(e.target.value) }); } catch (err) { setEditing({ ...editing, sample_rows: e.target.value as any }); }
                        }} />
                        <label className="text-sm">Category</label>
                        <select className="p-2 border rounded" value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })}>
                            <option value="">(none)</option>
                            <option value="Compulsory">Compulsory</option>
                            <option value="Reference">Reference</option>
                            <option value="Optional">Optional</option>
                        </select>

                        <label className="text-sm">Business Rules (natural language)</label>
                        <textarea className="p-2 border rounded" rows={4} value={editing.business_rules || ''} onChange={e => setEditing({ ...editing, business_rules: e.target.value })} placeholder="E.g. Always aggregate per facility; ignore provisional records" />
                        <div className="flex gap-2">
                            <Button onClick={async () => { await save(); }} >Save</Button>
                            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="font-medium">RAG Records</div>
                <div className="flex gap-2">
                    <Button onClick={load}>Refresh</Button>
                    <Button variant="secondary" onClick={startCreate}>New</Button>
                </div>
            </div>
            <div className="mt-3">
                {loading && <div className="text-sm text-gray-500">Loading...</div>}
                {!loading && list.length === 0 && <div className="text-sm text-gray-500">No RAG records found.</div>}
                <div className="space-y-2 mt-2">
                    {list.map(r => (
                        <div key={r.id || r.table_name} className="p-2 border rounded flex items-start justify-between">
                            <div>
                                <div className="font-medium">{r.table_name}</div>
                                <div className="text-xs text-gray-500">Columns: {(r.schema || []).map((c: any) => c.column_name || c.name).filter(Boolean).slice(0, 5).join(', ')}</div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => alert(JSON.stringify(r.sample_rows || [], null, 2))}>Preview</Button>
                                {isAdmin && <Button variant="secondary" onClick={() => setEditing(r)}>Edit</Button>}
                                {isAdmin && <Button variant="danger" onClick={() => remove(r.id)}>Delete</Button>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
