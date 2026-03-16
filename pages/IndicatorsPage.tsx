import React, { useEffect, useState, useRef } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useTheme } from '../hooks/useTheme';

// Small DB schema browser used by Indicators form to insert fields into formula
const DBSchemaBrowser: React.FC<{ onInsert: (s: string) => void }> = ({ onInsert }) => {
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [columns, setColumns] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadTables = async () => {
        setLoading(true);
        try {
            // try admin endpoint first
            let r = await fetch('/api/admin/db/tables', { credentials: 'include' });
            if (r.status === 401) r = await fetch('/api/rag_schemas');
            if (!r.ok) { setTables([]); setLoading(false); return; }
            const j = await r.json();
            if (Array.isArray(j)) setTables(j.map((x: any) => x.table_name || x));
            else if (Array.isArray(j.tables)) setTables(j.tables);
            else if (Array.isArray(j)) setTables(j.map((x: any) => x.table_name || x));
        } catch (e) { console.error('loadTables', e); setTables([]); }
        setLoading(false);
    };

    useEffect(() => { loadTables(); }, []);

    const loadColumns = async (t: string) => {
        setLoading(true);
        try {
            let r = await fetch('/api/admin/db/table/' + encodeURIComponent(t) + '/schema', { credentials: 'include' });
            if (r.status === 401) r = await fetch('/api/rag_schemas/' + encodeURIComponent(t));
            if (!r.ok) { setColumns([]); setLoading(false); return; }
            const j = await r.json();
            if (j.columns) setColumns(j.columns);
            else if (Array.isArray(j.schema)) setColumns(j.schema.map((c: any) => ({ column_name: c.column_name || c.name, data_type: c.data_type || c.type })));
            else setColumns([]);
        } catch (e) { console.error('loadColumns', e); setColumns([]); }
        setLoading(false);
    };

    return (
        <div className="p-2 border rounded bg-gray-50">
            <div className="font-medium mb-2">DB Schema</div>
            {loading && <div className="text-sm text-gray-500">Loading...</div>}
            {!loading && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <div className="text-xs text-gray-600 mb-1">Tables</div>
                        <div className="max-h-64 overflow-auto border rounded bg-white">
                            {tables.map(t => (
                                <div key={t} className={`p-2 text-sm hover:bg-gray-100 cursor-pointer ${t === selectedTable ? 'bg-gray-100 font-medium' : ''}`} onClick={() => { setSelectedTable(t); loadColumns(t); }}>{t}</div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-600 mb-1">Columns</div>
                        <div className="max-h-64 overflow-auto border rounded bg-white p-2 text-sm">
                            {columns.length === 0 && <div className="text-xs text-gray-500">Select a table to view columns</div>}
                            {columns.map((c: any) => (
                                <div key={c.column_name} className="flex items-center justify-between py-1">
                                    <div className="truncate">{c.column_name} <span className="text-xs text-gray-400">{c.data_type}</span></div>
                                    <button className="text-xs text-blue-600" onClick={() => onInsert(`${selectedTable}.${c.column_name}`)}>Insert</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const IndicatorsPage: React.FC = () => {
    const { settings } = useTheme();
    const [list, setList] = useState<any[]>([]);
    const [editing, setEditing] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await fetch('/api/indicators');
            if (r.ok) setList(await r.json());
            // load activities for dropdown
            try {
                const ares = await fetch('/api/activities');
                if (ares.ok) setActivities(await ares.json());
            } catch (e) { /* ignore */ }
            try {
                const fres = await fetch('/api/facilities');
                if (fres.ok) setFacilities(await fres.json());
            } catch (e) { /* ignore */ }
            try {
                const ures = await fetch('/api/users');
                if (ures.ok) setUsers(await ures.json());
            } catch (e) { /* ignore */ }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    

    const [activities, setActivities] = useState<any[]>([]);
    const [facilities, setFacilities] = useState<any[]>([]);
    const [filteredFacilities, setFilteredFacilities] = useState<any[]>([]);
    const [testIndicatorId, setTestIndicatorId] = useState<string>('');
    const [testFacilityId, setTestFacilityId] = useState<string>('');
    const [users, setUsers] = useState<any[]>([]);
    const [testUserId, setTestUserId] = useState<string>('');
    const [testLevel, setTestLevel] = useState<string>('');
    // when indicator selection changes, compute filtered facilities for its activity and set default level
    useEffect(() => {
        (async () => {
            try {
                if (!testIndicatorId) {
                    setFilteredFacilities([]);
                    return;
                }
                const ind = list.find(l => String(l.id) === String(testIndicatorId));
                if (!ind) return;
                // set default test level from indicator definition
                if (ind.indicator_level) setTestLevel(ind.indicator_level);

                const activityId = ind.activity_id || ind.activityId || null;
                if (activityId) {
                    try {
                        const r = await fetch('/api/public/facility_ids_for_filters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activityIds: [activityId] }) });
                        if (r.ok) {
                            const j = await r.json();
                            const ids: number[] = (j && j.facilityIds) ? j.facilityIds : (Array.isArray(j) ? j : []);
                            if (Array.isArray(facilities) && facilities.length) {
                                const filtered = facilities.filter(f => ids.includes(f.id));
                                setFilteredFacilities(filtered);
                                if (filtered.length === 1) setTestFacilityId(String(filtered[0].id));
                                return;
                            }
                            const fres = await fetch('/api/facilities');
                            if (fres.ok) {
                                const all = await fres.json();
                                setFacilities(all);
                                const filtered = all.filter((f: any) => ids.includes(f.id));
                                setFilteredFacilities(filtered);
                                if (filtered.length === 1) setTestFacilityId(String(filtered[0].id));
                            }
                        }
                    } catch (e) { console.error('Failed to load filtered facilities', e); }
                }
            } catch (e) { console.error(e); }
        })();
    }, [testIndicatorId, list, facilities]);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [showGuide, setShowGuide] = useState(false);

    const save = async () => {
        if (!editing || !editing.name) return alert('Name is required');
        try {
            const payload = { ...editing };
            // coerce formula_type default
            if (!payload.formula_type) payload.formula_type = payload.formula && String(payload.formula).trim().toLowerCase().startsWith('select') ? 'sql' : 'expression';
            const r = await fetch('/api/admin/indicators', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (r.status === 401) return alert('Unauthorized - please login as admin to save indicators');
            if (!r.ok) return alert('Save failed: ' + await r.text());
            setEditing(null);
            // load facilities for test runner
            try {
                const fres = await fetch('/api/facilities');
                if (fres.ok) setFacilities(await fres.json());
            } catch (e) { /* ignore */ }
            await load();
            alert('Saved');
        } catch (e) { console.error(e); alert('Save failed'); }
    };

    const remove = async (id: number) => {
        if (!confirm('Delete indicator?')) return;
        try {
            const r = await fetch('/api/admin/indicators/' + id, { method: 'DELETE', credentials: 'include' });
            if (r.status === 401) return alert('Unauthorized');
            if (!r.ok) return alert('Delete failed: ' + await r.text());
            await load();
        } catch (e) { console.error(e); alert('Delete failed'); }
    };

    return (
        <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Indicators</h1>
                <div className="flex gap-2">
                    <Button onClick={() => setEditing({})}>New Indicator</Button>
                    <Button variant="secondary" onClick={() => setShowGuide(true)}>Guide</Button>
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
            </div>

            {/* Guidance modal */}
            {showGuide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowGuide(false)} />
                    <div className="relative w-11/12 max-w-4xl bg-white p-4 rounded shadow">
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-lg font-bold">Indicators Guide</div>
                            <button className="text-sm text-gray-600" onClick={() => setShowGuide(false)}>Close</button>
                        </div>
                        <div className="space-y-3 text-sm text-gray-800">
                            <p>Indicators support two formula types: <strong>SQL</strong> and <strong>Expression</strong> (JS-like). Use <code>{'{selected_facility_id}'}</code> in SQL to let the runtime substitute the facility id where the indicator is evaluated (map marker, facility dashboard, activities dashboard).</p>
                            <h4 className="font-semibold">SQL example</h4>
                            <pre className="p-2 bg-gray-100 rounded text-xs whitespace-pre-wrap break-words">{`SELECT SUM( (CASE WHEN jsonb_typeof(answer_value) = 'number' THEN (answer_value::text)::numeric ELSE 0 END) ) as value FROM dqai_answers WHERE question_id = 'q1764684635235' AND facility_id = `}{'{selected_facility_id}'}</pre>
                            <h4 className="font-semibold">Numerator / Denominator (SQL)</h4>
                                                        <pre className="p-2 bg-gray-100 rounded text-xs whitespace-pre-wrap break-words">{`-- return two columns: numerator and denominator
SELECT
    SUM(CASE WHEN answer_value::text::numeric >= 1 THEN 1 ELSE 0 END) AS num,
    COUNT(*) AS denom
FROM dqai_answers
WHERE question_id = 'q1764684635235' AND facility_id = {selected_facility_id};

-- You can compute percentage directly in SQL: SELECT (num::numeric/NULLIF(denom,0)) * 100 AS pct FROM ( ... ) t;`}</pre>
                            <h4 className="font-semibold">Expression (JS) example (using SQL rows)</h4>
                            <pre className="p-2 bg-gray-100 rounded text-xs whitespace-pre-wrap break-words">{`// If your SQL returns rows, the server returns them as r.rows
// Example: r.rows[0].num and r.rows[0].denom
const r = await executeSql("SELECT SUM(...) AS num, COUNT(*) AS denom FROM ... WHERE facility_id = {selected_facility_id}");
const num = Number(r.rows[0].num || 0);
const denom = Number(r.rows[0].denom || 0);
return denom === 0 ? 0 : (num / denom) * 100;`}
                            </pre>
                            <h4 className="font-semibold">Expression (JS) example (simple)</h4>
                            <pre className="p-2 bg-gray-100 rounded text-xs whitespace-pre-wrap break-words">// payload: answers array or facility object
const vals = answers.filter(a =&gt; a.question_id === 'q1764684635235').map(a =&gt; Number(a.answer_value || 0));
return vals.reduce((s,v) =&gt; s + (isNaN(v)?0:v), 0);
                            </pre>
                            <h4 className="font-semibold">MySQL functions note</h4>
                            <p>You are using Postgres. Some MySQL functions differ — common equivalents:</p>
                            <ul className="list-disc pl-5 text-sm">
                                <li><strong>IFNULL(x,y)</strong> → <strong>COALESCE(x,y)</strong></li>
                                <li><strong>CONCAT(a,b)</strong> → <strong>a || b</strong> or use <strong>CONCAT</strong> in Postgres if available</li>
                                <li><strong>DATE_FORMAT</strong> → <strong>to_char(date_col, 'YYYY-MM-DD')</strong></li>
                            </ul>
                            <p className="text-xs text-gray-500">See full documentation in <code>docs/INDICATORS.md</code></p>
                        </div>
                    </div>
                </div>
            )}

            {editing && (
                <Card>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium">Name / Code</label>
                            <input className="mt-1 p-2 border rounded w-full" value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Title</label>
                            <input className="mt-1 p-2 border rounded w-full" value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Unit Of Measurement</label>
                            <input className="mt-1 p-2 border rounded w-full" value={editing.unit_of_measurement || ''} onChange={e => setEditing({ ...editing, unit_of_measurement: e.target.value })} />
                        </div>
                                <div>
                                    <label className="block text-sm font-medium">Activity</label>
                                    <select className="mt-1 p-2 border rounded w-full" value={editing.activity_id || ''} onChange={e => setEditing({ ...editing, activity_id: e.target.value ? Number(e.target.value) : null })}>
                                        <option value="">(none)</option>
                                        {activities.map(a => <option key={a.id} value={a.id}>{a.title || a.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Category</label>
                                    <input className="mt-1 p-2 border rounded w-full" value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Level</label>
                                    <select className="mt-1 p-2 border rounded w-full" value={editing.indicator_level || ''} onChange={e => setEditing({ ...editing, indicator_level: e.target.value })}>
                                        <option value="">(none)</option>
                                        <option value="National">National</option>
                                        <option value="State">State</option>
                                        <option value="LGA">LGA</option>
                                        <option value="Facility">Facility</option>
                                        <option value="User">User</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Show On Map</label>
                                    <select className="mt-1 p-2 border rounded w-full" value={editing.show_on_map ? 'yes' : 'no'} onChange={e => setEditing({ ...editing, show_on_map: e.target.value === 'yes' })}>
                                        <option value="yes">Yes</option>
                                        <option value="no">No</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Formula Type</label>
                                    <select className="mt-1 p-2 border rounded w-full" value={editing.formula_type || 'expression'} onChange={e => setEditing({ ...editing, formula_type: e.target.value })}>
                                        <option value="expression">Expression (JS-like)</option>
                                        <option value="sql">SQL (SELECT)</option>
                                    </select>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-sm font-medium">Formula</label>
                                    <div className="grid grid-cols-3 gap-3">
                                                <div className="col-span-2">
                                                    <textarea ref={textareaRef as any} className="mt-1 p-2 border rounded w-full h-40" value={editing.formula || ''} onChange={e => setEditing({ ...editing, formula: e.target.value })} placeholder="SQL: SELECT ... OR expression referencing table.column or question ids" />
                                                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                        {['{selected_facility_id}', '{selected_state}', '{selected_lga}', '{selected_user_id}'].map(ph => (
                                                            <button key={ph} className="text-xs px-2 py-1 border rounded bg-gray-50" onClick={() => {
                                                                try {
                                                                    const el = textareaRef.current as HTMLTextAreaElement | null;
                                                                    const s = ph;
                                                                    if (!el) return setEditing(prev => ({ ...prev, formula: ((prev && prev.formula) ? prev.formula + ' ' : '') + s }));
                                                                    const start = el.selectionStart || 0;
                                                                    const end = el.selectionEnd || 0;
                                                                    const before = (el.value || '').slice(0, start);
                                                                    const after = (el.value || '').slice(end);
                                                                    const nextVal = before + s + after;
                                                                    setEditing(prev => ({ ...prev, formula: nextVal }));
                                                                    setTimeout(() => { try { el.selectionStart = el.selectionEnd = start + s.length; el.focus(); } catch (e) { } }, 20);
                                                                } catch (e) { console.error(e); setEditing(prev => ({ ...prev, formula: ((prev && prev.formula) ? prev.formula + ' ' : '') + ph })); }
                                                            }}>{ph}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                        <div className="col-span-1">
                                            <DBSchemaBrowser onInsert={(s) => {
                                                // insert at cursor position in textarea
                                                try {
                                                    const el = textareaRef.current as HTMLTextAreaElement | null;
                                                    if (!el) return setEditing(prev => ({ ...prev, formula: ((prev && prev.formula) ? prev.formula + ' ' : '') + s }));
                                                    const start = el.selectionStart || 0;
                                                    const end = el.selectionEnd || 0;
                                                    const before = (el.value || '').slice(0, start);
                                                    const after = (el.value || '').slice(end);
                                                    const nextVal = before + s + after;
                                                    setEditing(prev => ({ ...prev, formula: nextVal }));
                                                    // restore cursor after inserted string
                                                    setTimeout(() => {
                                                        try { el.selectionStart = el.selectionEnd = start + s.length; el.focus(); } catch (e) { /* ignore */ }
                                                    }, 20);
                                                } catch (e) { console.error(e); setEditing(prev => ({ ...prev, formula: ((prev && prev.formula) ? prev.formula + ' ' : '') + s })); }
                                            }} />
                                        </div>
                                    </div>
                                </div>
                    </div>
                    <div className="mt-3 flex gap-2 justify-end">
                        <Button onClick={save}>Save</Button>
                        <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
                    </div>
                </Card>
            )}

            <Card>
                <div className="space-y-2">
                    {loading && <div className="text-sm text-gray-500">Loading...</div>}
                    {!loading && list.length === 0 && <div className="text-sm text-gray-500">No indicators found.</div>}
                    {!loading && list.map(ind => (
                        <div key={ind.id} className="p-3 border rounded flex items-center justify-between">
                            <div>
                                <div className="font-medium">{ind.title || ind.name}</div>
                                <div className="text-xs text-gray-500">Unit: {ind.unit_of_measurement || '—'} • Level: {ind.indicator_level || '—'}</div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => setEditing(ind)}>Edit</Button>
                                <Button variant="danger" onClick={() => remove(ind.id)}>Delete</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            {/* Test runner for indicators */}
            <Card>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="font-medium">Test Indicator</div>
                        <div className="text-xs text-gray-500">Run an indicator against a facility</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium">Indicator</label>
                            <select className="mt-1 p-2 border rounded w-full" value={testIndicatorId} onChange={e => setTestIndicatorId(e.target.value)}>
                                <option value="">(select)</option>
                                {list.map(i => <option key={i.id} value={i.id}>{i.title || i.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Level</label>
                            <select id="__indicator_test_level" className="mt-1 p-2 border rounded w-full" value={testLevel} onChange={e => setTestLevel(e.target.value)}>
                                <option value="">(auto)</option>
                                <option value="Facility">Facility</option>
                                <option value="LGA">LGA</option>
                                <option value="State">State</option>
                                <option value="National">National</option>
                                <option value="User">User</option>
                            </select>
                        </div>
                        <div>
                            {testLevel === 'User' ? (
                                <div>
                                    <label className="block text-sm font-medium">User</label>
                                    <select id="__indicator_test_user" className="mt-1 p-2 border rounded w-full" value={testUserId} onChange={e => setTestUserId(e.target.value)}>
                                        <option value="">(select)</option>
                                        {users.map((u: any) => <option key={u.id} value={u.id}>{u.firstName || u.first_name || u.email || u.id}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium">Facility</label>
                                    <select id="__indicator_test_facility" className="mt-1 p-2 border rounded w-full" value={testFacilityId} onChange={e => setTestFacilityId(e.target.value)}>
                                        <option value="">(select)</option>
                                        {(filteredFacilities && filteredFacilities.length ? filteredFacilities : facilities).map((f: any) => <option key={f.id} value={f.id}>{f.name || f.title || f.id}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button onClick={async () => {
                            try {
                                const indicatorId = testIndicatorId;
                                const level = testLevel || '';
                                if (!indicatorId) return alert('Select an indicator');
                                // User-level evaluation
                                if (level === 'User') {
                                    if (!testUserId) return alert('Select a user');
                                    const url = `/api/indicators/compute?indicatorId=${encodeURIComponent(indicatorId)}&selected_user_id=${encodeURIComponent(testUserId)}`;
                                    const r = await fetch(url);
                                    if (!r.ok) return alert('Compute failed: ' + await r.text());
                                    const j = await r.json();
                                    const el = document.getElementById('__indicator_test_result');
                                    if (el) el.textContent = JSON.stringify(j, null, 2);
                                    return;
                                }

                                // Facility or geographic level evaluation
                                const facilityId = testFacilityId;
                                if (!facilityId) return alert('Select a facility');
                                const url = `/api/indicators/compute?indicatorId=${encodeURIComponent(indicatorId)}&facilityId=${encodeURIComponent(facilityId)}`;
                                const r = await fetch(url);
                                if (!r.ok) return alert('Compute failed: ' + await r.text());
                                const j = await r.json();
                                const el = document.getElementById('__indicator_test_result');
                                if (el) el.textContent = JSON.stringify(j, null, 2);
                            } catch (e) { console.error(e); alert('Compute failed'); }
                        }}>Run</Button>
                    </div>
                    <div>
                        <div className="text-xs text-gray-600 mb-1">Result</div>
                        <pre id="__indicator_test_result" className="p-2 bg-gray-100 rounded text-xs text-left max-h-64 overflow-auto">(no result)</pre>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default IndicatorsPage;
