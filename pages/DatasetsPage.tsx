import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import DataTable from '../components/ui/DataTable';
import { useMockData } from '../hooks/useMockData';

const DatasetsPage: React.FC = () => {
  const { currentUser } = useMockData();
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' || currentUser?.role === 'super-admin';
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [contentRows, setContentRows] = useState<any[]>([]);
  const [contentDatasetId, setContentDatasetId] = useState<number | null>(null);
  const [contentDatasetName, setContentDatasetName] = useState<string | null>(null);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState(false);
  const [manualRowFields, setManualRowFields] = useState<Array<{ key: string; value: string }>>([]);
  const [jsonViewerOpen, setJsonViewerOpen] = useState(false);
  const [jsonViewerContent, setJsonViewerContent] = useState<any>(null);

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/datasets');
      const j = await r.json();
      setDatasets(Array.isArray(j) ? j : []);
    } catch (e) { console.error('Failed to load datasets', e); setDatasets([]); }
    setLoading(false);
  };

  useEffect(() => { loadDatasets(); }, []);

  const saveDataset = async (ds: any) => {
    try {
      const r = await fetch('/api/admin/datasets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ds) });
      const j = await r.json();
      await loadDatasets();
      setIsEditModalOpen(false);
    } catch (e) { console.error('Failed to save dataset', e); alert('Failed to save'); }
  };

  const deleteDataset = async (id: number) => {
    if (!confirm('Delete dataset and all its content?')) return;
    try {
      await fetch(`/api/admin/datasets/${id}`, { method: 'DELETE' });
      await loadDatasets();
    } catch (e) { console.error('Failed to delete', e); alert('Delete failed'); }
  };

  const navigate = useNavigate();
  const viewContent = (id: number) => {
    navigate(`/datasets/${id}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contentDatasetId) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const ab = evt.target?.result as ArrayBuffer;
        // Browser-safe ArrayBuffer -> base64
        const bytes = new Uint8Array(ab as ArrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        const r = await fetch(`/api/admin/datasets/${contentDatasetId}/content/upload`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: file.name, fileBase64: base64 }) });
        const j = await r.json();
        alert(`Inserted ${j.inserted || 0} rows`);
        viewContent(contentDatasetId);
      } catch (err) { console.error(err); alert('Upload failed'); }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Datasets</h1>
        <div className="space-x-2">
          <Button onClick={() => { setEditing(null); setIsEditModalOpen(true); }}>+ New Dataset</Button>
          <Button variant="secondary" onClick={loadDatasets}>Refresh</Button>
        </div>
      </div>

      <div className="bg-white shadow rounded p-4">
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {!loading && (
          <DataTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'description', label: 'Description' },
              { key: 'category', label: 'Category' },
              {
                key: 'actions', label: 'Actions', render: (row: any) => (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(row); setIsEditModalOpen(true); }} className="text-sm text-primary-600">Edit</button>
                    <button onClick={() => viewContent(row.id)} className="text-sm text-gray-600">Content</button>
                    {isAdmin && <button onClick={() => deleteDataset(row.id)} className="text-sm text-red-600">Delete</button>}
                  </div>
                )
              }
            ]}
            data={datasets}
          />
        )}
      </div>

      <Modal isOpen={isEditModalOpen} title={editing ? 'Edit Dataset' : 'New Dataset'} onClose={() => setIsEditModalOpen(false)}>
        <DatasetEditor dataset={editing} onCancel={() => setIsEditModalOpen(false)} onSave={saveDataset} />
      </Modal>

      {/* JSON Viewer Modal for dataset cell values */}
      <Modal isOpen={jsonViewerOpen} onClose={() => { setJsonViewerOpen(false); setJsonViewerContent(null); }} title="JSON Viewer">
        <div>
          <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded" style={{ maxHeight: '60vh', overflow: 'auto' }}>{jsonViewerContent ? (typeof jsonViewerContent === 'string' ? jsonViewerContent : JSON.stringify(jsonViewerContent, null, 2)) : ''}</pre>
          <div className="flex justify-end mt-2">
            <Button onClick={() => { setJsonViewerOpen(false); setJsonViewerContent(null); }}>Close</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isContentModalOpen} title={contentDatasetName ? `Dataset: ${contentDatasetName}` : `Dataset Content${contentDatasetId ? ' — ' + contentDatasetId : ''}`} onClose={() => setIsContentModalOpen(false)} size="3xl">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">Total rows: {contentRows.length}</div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Upload Excel</label>
              <input type="file" accept=".xlsx" onChange={handleFileUpload} />
              <button className="ml-2 px-3 py-1 bg-white border rounded text-sm" onClick={async () => {
                try {
                  if (!contentDatasetId) { alert('No dataset selected'); return; }
                  // Collect column keys from existing rows (ignore metadata keys)
                  const keys = contentRows[0] ? Object.keys(contentRows[0]).filter(k => k !== '__dc_id' && k !== '__roles') : [];
                  if (keys.length === 0) {
                    // open modal allowing user to define columns and values
                    setManualRowFields([{ key: '', value: '' }]);
                    setIsAddRowModalOpen(true);
                    return;
                  }
                  // build empty fields for known keys
                  setManualRowFields(keys.map(k => ({ key: k, value: '' })));
                  setIsAddRowModalOpen(true);
                } catch (err) { console.error('Add row failed', err); alert('Add row failed'); }
              }}>Add Row</button>
              <button className="ml-2 px-3 py-1 bg-gray-100 rounded text-sm" onClick={() => {
                // export CSV of current contentRows
                try {
                  if (!contentRows || !contentRows.length) { alert('No data to export'); return; }
                  const keys = Object.keys(contentRows[0]);
                  const csv = [keys.join(',')].concat(contentRows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `${contentDatasetName || ('dataset_' + contentDatasetId)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                } catch (err) { console.error(err); alert('Export failed'); }
              }}>Export CSV</button>
              <button className="ml-2 px-3 py-1 bg-gray-100 rounded text-sm" onClick={() => {
                // print-friendly view for PDF export
                try {
                  const keys = contentRows[0] ? Object.keys(contentRows[0]) : [];
                  const html = `
                    <html><head><title>${contentDatasetName || 'Dataset'}</title>
                      <style>table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ccc;padding:6px;text-align:left;font-size:12px;}</style>
                    </head><body><h3>${contentDatasetName || 'Dataset'}</h3><table><thead><tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr></thead><tbody>${contentRows.map(r => `<tr>${keys.map(k => `<td>${String(r[k] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
                  const w = window.open('', '_blank'); if (!w) { alert('Unable to open print window'); return; } w.document.write(html); w.document.close(); w.focus(); w.print();
                } catch (err) { console.error(err); alert('Print failed'); }
              }}>Print / PDF</button>
            </div>
          </div>

          <div className="overflow-auto">
            {contentRows.length === 0 ? (
              <div className="text-sm text-gray-500">No data</div>
            ) : (
              <DataTable
                columns={(() => {
                  const keys = Object.keys(contentRows[0] || {}).filter(k => k !== '__dc_id' && k !== '__roles');
                  const sample = contentRows[0] || {};
                  const cols = keys.map(k => ({
                    key: k, label: k, editable: !(typeof sample[k] === 'object' && sample[k] !== null), render: (row: any) => {
                      const v = row[k];
                      if (v === null || typeof v === 'undefined') return '';
                      if (typeof v === 'object') {
                        const preview = Array.isArray(v) ? `[${v.length}]` : JSON.stringify(v).slice(0, 200);
                        return (
                          <div className="flex items-center gap-2">
                            <span className="truncate" style={{ maxWidth: 400 }}>{preview}</span>
                            <button className="text-xs text-blue-600" onClick={() => { setJsonViewerContent(v); setJsonViewerOpen(true); }}>View</button>
                          </div>
                        );
                      }
                      return String(v);
                    }
                  }));
                  cols.push({
                    key: '__actions', label: 'Actions', render: (row: any) => (
                      <div className="flex gap-2">
                        <button className="text-xs text-primary-600" onClick={async () => {
                          const roles = (row.__roles || []).join(',');
                          const edited = window.prompt('Edit roles (comma-separated)', roles);
                          if (edited === null) return;
                          const newRoles = edited.split(',').map((s: string) => s.trim()).filter(Boolean);
                          try {
                            const res = await fetch(`/api/admin/datasets/${contentDatasetId}/content/${row.__dc_id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataset_roles: newRoles }) });
                            if (res.ok) {
                              // refresh view
                              await viewContent(contentDatasetId!);
                            } else {
                              alert('Failed to update roles');
                            }
                          } catch (err) { console.error(err); alert('Failed to update roles'); }
                        }}>Roles</button>
                        {isAdmin && <button className="text-xs text-gray-600" onClick={async () => {
                          if (!confirm('Delete this row?')) return;
                          try { const res = await fetch(`/api/admin/datasets/${contentDatasetId}/content/${row.__dc_id}`, { method: 'DELETE' }); if (res.ok) await viewContent(contentDatasetId!); else alert('Delete failed'); } catch (err) { console.error(err); alert('Delete failed'); }
                        }}>Delete</button>}
                      </div>
                    )
                  });
                  return cols;
                })()}
                data={contentRows}
                persistKey={contentDatasetId ? `dataset_content_${contentDatasetId}` : undefined}
                pageSize={500}
                onCellEdit={async (rowIndex, key, newValue) => {
                  try {
                    const row = contentRows[rowIndex];
                    if (!row) return;
                    const contentId = row.__dc_id;
                    const updatedRow = { ...row, [key]: newValue };
                    // rebuild dataset_data object
                    const dataToSave: Record<string, any> = {};
                    for (const k of Object.keys(updatedRow)) {
                      if (k === '__dc_id' || k === '__roles') continue;
                      dataToSave[k] = updatedRow[k];
                    }
                    const res = await fetch(`/api/admin/datasets/${contentDatasetId}/content/${contentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataset_data: dataToSave }) });
                    if (!res.ok) { alert('Save failed'); return; }
                    // update local copy optimistically
                    const newRows = [...contentRows]; newRows[rowIndex] = { ...updatedRow }; setContentRows(newRows);
                  } catch (err) { console.error('Cell save failed', err); alert('Save failed'); }
                }}
              />
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={isAddRowModalOpen} title={contentDatasetName ? `Add Row — ${contentDatasetName}` : 'Add Row'} onClose={() => { setIsAddRowModalOpen(false); setManualRowFields([]); }}>
        <div className="space-y-3">
          <div className="text-sm text-gray-600">Enter values for the new row. Add or remove columns as needed.</div>
          <div className="space-y-2">
            {manualRowFields.map((f, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input placeholder="column name" value={f.key} onChange={e => setManualRowFields(prev => prev.map((p, i) => i === idx ? { ...p, key: e.target.value } : p))} className="p-2 border rounded w-1/3" />
                <input placeholder="value" value={f.value} onChange={e => setManualRowFields(prev => prev.map((p, i) => i === idx ? { ...p, value: e.target.value } : p))} className="p-2 border rounded flex-1" />
                <button className="text-red-500" onClick={() => setManualRowFields(prev => prev.filter((_, i) => i !== idx))}>Remove</button>
              </div>
            ))}
            <div>
              <button className="text-sm text-primary-600" onClick={() => setManualRowFields(prev => [...prev, { key: '', value: '' }])}>+ Add Column</button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setIsAddRowModalOpen(false); setManualRowFields([]); }}>Cancel</Button>
            <Button onClick={async () => {
              try {
                if (!contentDatasetId) return alert('No dataset selected');
                const dataToSave: Record<string, any> = {};
                for (const f of manualRowFields) {
                  if (f.key && f.key.trim()) dataToSave[f.key.trim()] = f.value;
                }
                const res = await fetch(`/api/admin/datasets/${contentDatasetId}/content`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSave) });
                if (!res.ok) { const txt = await res.text().catch(() => null); alert('Failed to add row: ' + (txt || res.statusText)); return; }
                setIsAddRowModalOpen(false); setManualRowFields([]);
                await viewContent(contentDatasetId);
              } catch (err) { console.error('Add row save failed', err); alert('Add row failed'); }
            }}>Save Row</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const DatasetEditor: React.FC<{ dataset?: any; onSave: (d: any) => void; onCancel: () => void }> = ({ dataset, onSave, onCancel }) => {
  const [name, setName] = useState(dataset?.name || '');
  const [description, setDescription] = useState(dataset?.description || '');
  const [category, setCategory] = useState(dataset?.category || '');
  const [fieldsText, setFieldsText] = useState((Array.isArray(dataset?.dataset_fields) ? dataset.dataset_fields.map((f: any) => f.name).join(',') : ''));
  const [showInMenu, setShowInMenu] = useState(!!dataset?.show_in_menu);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-gray-700">Name</label>
        <input value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border-gray-300 rounded" />
      </div>
      <div>
        <label className="block text-sm text-gray-700">Description</label>
        <input value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full border-gray-300 rounded" />
      </div>
      <div>
        <label className="block text-sm text-gray-700">Category</label>
        <input value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full border-gray-300 rounded" />
      </div>
      <div>
        <label className="block text-sm text-gray-700">Fields (comma-separated)</label>
        <input value={fieldsText} onChange={e => setFieldsText(e.target.value)} className="mt-1 block w-full border-gray-300 rounded" placeholder="code,label" />
        <div className="text-xs text-gray-500 mt-1">Provide field names to help mapping when using datasets as sources.</div>
      </div>
      <div className="flex items-center justify-between">
        <label className="inline-flex items-center text-sm">
          <input type="checkbox" className="mr-2" checked={showInMenu} onChange={e => setShowInMenu(e.target.checked)} />
          Show in sidebar menu
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave({ id: dataset?.id, name, description, category, dataset_fields: fieldsText.split(',').map(s => ({ name: s.trim() })).filter((f: any) => f.name), show_in_menu: showInMenu })}>Save</Button>
        </div>
      </div>
    </div>
  );
};

export default DatasetsPage;
