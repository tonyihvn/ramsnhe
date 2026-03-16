import React, { useEffect, useState } from 'react';
import { useMetadata } from '../contexts/MetadataContext';
import { bandLabel } from '../utils/banding';

export const BAND_COLORS: Record<string, string> = {
  high: '#16a34a',
  medium: '#f59e0b',
  low: '#ef4444',
  pass: '#16a34a',
  fail: '#ef4444',
  unknown: '#6b7280'
};

const STORAGE_KEY = 'map_indicator_toggles_v1';

const MapControls: React.FC<{
  onChange?: (enabled: Record<string, boolean>) => void;
  onToggleOverlays?: (overlays: Record<string,boolean>) => void;
  onFilterChange?: (filters: { selectedPrograms: string[]; selectedActivities: string[] }) => void;
}> = ({ onChange, onToggleOverlays, onFilterChange }) => {
  const { meta } = useMetadata();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [overlays, setOverlays] = useState<Record<string,boolean>>({ programs: true, activities: true, facilities: true, users: false });
  const [programs, setPrograms] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEnabled(JSON.parse(raw));
      else {
        const def: Record<string, boolean> = {};
        (meta.indicators || []).forEach((i: any) => def[i.id] = true);
        setEnabled(def);
      }
    } catch (e) {
      // ignore
    }
  }, [meta.indicators]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled)); } catch (e) {}
    if (onChange) onChange(enabled);
  }, [enabled]);

  useEffect(() => {
    if (onToggleOverlays) onToggleOverlays(overlays);
  }, [overlays]);

  useEffect(() => {
    // fetch programs and activities for cascade UI
    let cancelled = false;
    (async () => {
      try {
        const [pRes, aRes] = await Promise.all([fetch('/api/programs'), fetch('/api/activities')]);
        if (!cancelled) {
          if (pRes.ok) setPrograms(await pRes.json());
          if (aRes.ok) setActivities(await aRes.json());
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (onFilterChange) onFilterChange({ selectedPrograms, selectedActivities });
  }, [selectedPrograms, selectedActivities]);

  return (
    <div style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', width: 320 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Map Controls</div>
        <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, marginBottom: 6 }}>Indicators</div>
        {(meta.indicators || []).map((ind: any) => (
          <label key={ind.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 }}>
            <input type="checkbox" checked={enabled[ind.id] ?? true} onChange={e => setEnabled(s => ({ ...s, [ind.id]: e.target.checked }))} />
            <span style={{ flex: 1 }}>{ind.name}</span>
          </label>
        ))}
      </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Overlays</div>
          <div style={{ fontSize: 12, color: '#444', marginBottom: 6 }}>Toggle map layers and filter by program/activity.</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 }}>
            <input type="checkbox" checked={overlays.programs} onChange={e => setOverlays(o => ({ ...o, programs: e.target.checked }))} />
            <span>Programs</span>
          </label>
          {/* Programs + activities cascade UI */}
          {overlays.programs && (
            <div style={{ marginLeft: 10, marginBottom: 8, maxHeight: 140, overflow: 'auto', borderLeft: '1px dashed #eee', paddingLeft: 8 }}>
              {(programs || []).map(p => (
                <div key={p.id} style={{ marginBottom: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <input type="checkbox" checked={selectedPrograms.includes(String(p.id))} onChange={e => {
                      const next = e.target.checked ? [...selectedPrograms, String(p.id)] : selectedPrograms.filter(x => x !== String(p.id));
                      // cascade: if unchecking program, also remove its activities
                      if (!e.target.checked) {
                        const actIds = (activities || []).filter(a => String(a.program_id) === String(p.id)).map(a => String(a.id));
                        setSelectedActivities(sa => sa.filter(x => !actIds.includes(x)));
                      }
                      setSelectedPrograms(next);
                    }} />
                    <span style={{ fontWeight: 600 }}>{p.name || p.title || `Program ${p.id}`}</span>
                  </label>
                  {/* child activities */}
                  <div style={{ marginLeft: 18, marginTop: 6 }}>
                    {(activities || []).filter(a => String(a.program_id) === String(p.id)).map(a => (
                      <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <input type="checkbox" checked={selectedActivities.includes(String(a.id))} onChange={e => {
                          const next = e.target.checked ? [...selectedActivities, String(a.id)] : selectedActivities.filter(x => x !== String(a.id));
                          setSelectedActivities(next);
                          // If selecting an activity, ensure its program is selected too
                          if (e.target.checked) setSelectedPrograms(sp => Array.from(new Set([...sp, String(a.program_id)])));
                        }} />
                        <span>{a.title || a.name || `Activity ${a.id}`}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 }}>
            <input type="checkbox" checked={overlays.activities} onChange={e => setOverlays(o => ({ ...o, activities: e.target.checked }))} />
            <span>Activities (standalone)</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 }}>
            <input type="checkbox" checked={overlays.facilities} onChange={e => setOverlays(o => ({ ...o, facilities: e.target.checked }))} />
            <span>Facilities</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 }}>
            <input type="checkbox" checked={overlays.users} onChange={e => setOverlays(o => ({ ...o, users: e.target.checked }))} />
            <span>Users</span>
          </label>
        </div>

      <div>
        <div style={{ fontSize: 13, marginBottom: 6 }}>Legend</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.keys(BAND_COLORS).map(k => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 14, height: 14, background: BAND_COLORS[k], borderRadius: 3 }} />
              <div style={{ fontSize: 12 }}>{bandLabel(k as any)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapControls;
