import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { useTheme } from '../../hooks/useTheme';

const defaultBands = [
  { id: 'b1', name: 'Low', min: 0, max: 33, color: '#ef4444' },
  { id: 'b2', name: 'Medium', min: 34, max: 66, color: '#f59e0b' },
  { id: 'b3', name: 'High', min: 67, max: 100, color: '#16a34a' }
];

const BandEditor: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { settings, setSettings } = useTheme();
  const [bands, setBands] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const s = (settings as any) || {};
    setBands(Array.isArray(s.bands) ? s.bands.slice() : defaultBands.slice());
  }, [isOpen]);

  const addBand = () => setBands(prev => [...prev, { id: `b_${Date.now()}`, name: 'New', min: 0, max: 0, color: '#cccccc' }]);
  const updateBand = (idx: number, patch: any) => setBands(prev => prev.map((b, i) => i === idx ? { ...b, ...patch } : b));
  const removeBand = (idx: number) => setBands(prev => prev.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    try {
      const nextSettings = { ...(settings as any), bands };
      setSettings(nextSettings);
      // persist to server settings (admin endpoint)
      const r = await fetch('/api/admin/settings', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nextSettings) });
      if (r.status === 401) {
        alert('Not authorized to persist bands to server. Changes applied locally.');
      } else if (!r.ok) {
        const txt = await r.text();
        alert('Failed to save bands: ' + txt);
      } else {
        alert('Bands saved');
      }
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to save bands: ' + String(e));
    }
    setSaving(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Band Editor">
      <div className="space-y-3">
        {bands.map((b, idx) => (
          <div key={b.id} className="p-3 border rounded bg-white">
            <div className="flex items-center justify-between">
              <div className="font-medium">{b.name || 'Band'}</div>
              <div className="flex gap-2">
                <button className="text-sm p-1 border rounded" onClick={() => removeBand(idx)}>Remove</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
              <input className="p-2 border rounded" value={b.name || ''} onChange={e => updateBand(idx, { name: e.target.value })} placeholder="Band name" />
              <input className="p-2 border rounded" value={b.min ?? ''} onChange={e => updateBand(idx, { min: Number(e.target.value || 0) })} placeholder="Min" type="number" />
              <input className="p-2 border rounded" value={b.max ?? ''} onChange={e => updateBand(idx, { max: Number(e.target.value || 0) })} placeholder="Max" type="number" />
              <input className="p-2 border rounded" value={b.color || '#cccccc'} onChange={e => updateBand(idx, { color: e.target.value })} placeholder="Color" type="color" />
            </div>
          </div>
        ))}

        <div className="flex gap-2">
          <Button onClick={addBand}>Add Band</Button>
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Bands'}</Button>
        </div>
      </div>
    </Modal>
  );
};

export default BandEditor;
