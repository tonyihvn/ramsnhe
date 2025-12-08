import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';

const DatasetContentPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const datasetId = id ? Number(id) : null;
  const [meta, setMeta] = useState<any | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!datasetId) return;
    setLoading(true);
    try {
      const mr = await fetch(`/api/admin/datasets/${datasetId}`);
      if (mr.ok) setMeta(await mr.json());
      const r = await fetch(`/api/admin/datasets/${datasetId}/content?limit=500`);
      if (r.ok) {
        const j = await r.json();
        const contentRows = Array.isArray(j.rows) ? j.rows.map((rr: any) => ({ __dc_id: rr.id, __roles: rr.dataset_roles || [], ...(rr.dataset_data || {}) })) : [];
        setRows(contentRows);
      }
    } catch (e) { console.error('Failed to load dataset content', e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{meta ? `Dataset: ${meta.name}` : 'Dataset'}</h1>
          {meta && <div className="text-sm text-gray-600">{meta.description}</div>}
        </div>
        <div className="space-x-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
          <Button onClick={() => load()}>Refresh</Button>
        </div>
      </div>

      <div className="bg-white shadow rounded p-4">
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {!loading && rows.length === 0 && <div className="text-sm text-gray-500">No rows to display.</div>}
        {!loading && rows.length > 0 && (
          <DataTable
            columns={(() => {
              const keys = Object.keys(rows[0] || {}).filter(k => k !== '__dc_id' && k !== '__roles');
              const cols = keys.map(k => ({ key: k, label: k, editable: true }));
              cols.push({ key: '__actions', label: 'Actions', render: (row: any) => (
                <div className="flex gap-2">
                  <button className="text-xs text-primary-600" onClick={async () => {
                    const roles = (row.__roles || []).join(',');
                    const edited = window.prompt('Edit roles (comma-separated)', roles);
                    if (edited === null) return;
                    const newRoles = edited.split(',').map((s: string) => s.trim()).filter(Boolean);
                    try {
                      const res = await fetch(`/api/admin/datasets/${datasetId}/content/${row.__dc_id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataset_roles: newRoles }) });
                      if (res.ok) await load(); else alert('Failed to update roles');
                    } catch (e) { console.error(e); alert('Failed to update roles'); }
                  }}>Roles</button>
                  <button className="text-xs text-gray-600" onClick={async () => { if (!confirm('Delete this row?')) return; try { const res = await fetch(`/api/admin/datasets/${datasetId}/content/${row.__dc_id}`, { method: 'DELETE' }); if (res.ok) await load(); else alert('Delete failed'); } catch (e) { console.error(e); alert('Delete failed'); } }}>Delete</button>
                </div>
              ) });
              return cols;
            })()}
            data={rows}
            pageSize={500}
            onCellEdit={async (rowIndex, key, newValue) => {
              try {
                const row = rows[rowIndex];
                if (!row) return;
                const contentId = row.__dc_id;
                const updatedRow = { ...row, [key]: newValue };
                const dataToSave: Record<string, any> = {};
                for (const k of Object.keys(updatedRow)) { if (k === '__dc_id' || k === '__roles') continue; dataToSave[k] = updatedRow[k]; }
                const res = await fetch(`/api/admin/datasets/${datasetId}/content/${contentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataset_data: dataToSave }) });
                if (!res.ok) return alert('Save failed');
                const newRows = [...rows]; newRows[rowIndex] = { ...updatedRow }; setRows(newRows);
              } catch (e) { console.error(e); alert('Save failed'); }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default DatasetContentPage;
