import React, { useEffect, useMemo, useState } from 'react';
import { MapView } from './MapView';
import FloatingCard from '../components/FloatingCard';
import { useMetadata } from '../contexts/MetadataContext';
import { bandForIndicator, bandLabel } from '../utils/banding';

type Facility = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tier: string;
  ownership: string;
  indicators: Record<string, any>;
};

// Filters card content: a small presentational component with collapsible sections
const FiltersCardContent: React.FC<any> = ({
  programs, activities, facilities,
  selectedPrograms, setSelectedPrograms,
  selectedActivities, setSelectedActivities,
  selectedStates, setSelectedStates,
  selectedLgas, setSelectedLgas,
  selectedFacilities, setSelectedFacilities
}) => {
  const [openPrograms, setOpenPrograms] = React.useState(true);
  const [openActivities, setOpenActivities] = React.useState(true);
  const [openStates, setOpenStates] = React.useState(false);
  const [openLgas, setOpenLgas] = React.useState(false);
  const [openFacilities, setOpenFacilities] = React.useState(false);

  const uniqueStates = React.useMemo(() => Array.from(new Set((facilities || []).map((f:any)=>f.state).filter(Boolean))), [facilities]);
  const uniqueLgas = React.useMemo(() => Array.from(new Set((facilities || []).map((f:any)=>f.lga).filter(Boolean))), [facilities]);

  return (
    <div style={{ width: '100%' }}>
      {/* <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>Filters</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>Drag / Resize</div>
      </div> */}

      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpenPrograms(s => !s)}>
            <div style={{ fontWeight: 700 }}>Programs</div>
            <div style={{ fontSize: 12 }}>{openPrograms ? '▾' : '▸'}</div>
          </div>
          {openPrograms && (
            <div style={{ maxHeight: 140, overflow: 'auto', marginTop: 6 }}>
              {(programs || []).map((p:any) => (
                <label key={p.id} style={{ display: 'block', fontSize: 13 }}>
                  <input type="checkbox" checked={selectedPrograms.includes(String(p.id))} onChange={(e) => {
                    const next = e.target.checked ? [...selectedPrograms, String(p.id)] : selectedPrograms.filter((x:any) => x !== String(p.id));
                    setSelectedPrograms(next);
                  }} /> <span style={{ marginLeft: 8 }}>{p.name || p.title || `Program ${p.id}`}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpenActivities(s => !s)}>
            <div style={{ fontWeight: 700 }}>Activities</div>
            <div style={{ fontSize: 12 }}>{openActivities ? '▾' : '▸'}</div>
          </div>
          {openActivities && (
            <div style={{ maxHeight: 140, overflow: 'auto', marginTop: 6 }}>
              {(activities || []).map((a:any) => (
                <label key={a.id} style={{ display: 'block', fontSize: 13 }}>
                  <input type="checkbox" checked={selectedActivities.includes(String(a.id))} onChange={(e) => {
                    const next = e.target.checked ? [...selectedActivities, String(a.id)] : selectedActivities.filter((x:any) => x !== String(a.id));
                    setSelectedActivities(next);
                  }} /> <span style={{ marginLeft: 8 }}>{a.title || a.name || `Activity ${a.id}`}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpenStates(s => !s)}>
            <div style={{ fontWeight: 700 }}>States</div>
            <div style={{ fontSize: 12 }}>{openStates ? '▾' : '▸'}</div>
          </div>
          {openStates && (
            <div style={{ maxHeight: 140, overflow: 'auto', marginTop: 6 }}>
              {uniqueStates.map((s:any) => (
                <label key={s} style={{ display: 'block', fontSize: 13 }}>
                  <input type="checkbox" checked={selectedStates.includes(String(s))} onChange={(e) => {
                    const next = e.target.checked ? [...selectedStates, String(s)] : selectedStates.filter((x:any) => x !== String(s));
                    setSelectedStates(next);
                  }} /> <span style={{ marginLeft: 8 }}>{s}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpenLgas(s => !s)}>
            <div style={{ fontWeight: 700 }}>LGAs</div>
            <div style={{ fontSize: 12 }}>{openLgas ? '▾' : '▸'}</div>
          </div>
          {openLgas && (
            <div style={{ maxHeight: 140, overflow: 'auto', marginTop: 6 }}>
              {uniqueLgas.map((l:any) => (
                <label key={l} style={{ display: 'block', fontSize: 13 }}>
                  <input type="checkbox" checked={selectedLgas.includes(String(l))} onChange={(e) => {
                    const next = e.target.checked ? [...selectedLgas, String(l)] : selectedLgas.filter((x:any) => x !== String(l));
                    setSelectedLgas(next);
                  }} /> <span style={{ marginLeft: 8 }}>{l}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpenFacilities(s => !s)}>
            <div style={{ fontWeight: 700 }}>Facilities</div>
            <div style={{ fontSize: 12 }}>{openFacilities ? '▾' : '▸'}</div>
          </div>
          {openFacilities && (
            <div style={{ maxHeight: 140, overflow: 'auto', marginTop: 6 }}>
              {(facilities || []).map((f:any) => (
                <label key={f.id} style={{ display: 'block', fontSize: 13 }}>
                  <input type="checkbox" checked={selectedFacilities.includes(String(f.id))} onChange={(e) => {
                    const next = e.target.checked ? [...selectedFacilities, String(f.id)] : selectedFacilities.filter((x:any) => x !== String(f.id));
                    setSelectedFacilities(next);
                  }} /> <span style={{ marginLeft: 8 }}>{f.name || `Facility ${f.id}`}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MapDashboard: React.FC = () => {
  const { meta, loading } = useMetadata();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedLgas, setSelectedLgas] = useState<string[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filterTier, setFilterTier] = useState<string>('all');

  useEffect(() => {
    // Load facilities (public endpoint returns array or object)
    (async () => {
      try {
        const resp = await fetch('/api/public/facilities');
        if (resp.ok) {
          const j = await resp.json();
          const f = Array.isArray(j) ? j : (j.facilities || j || []);
          setFacilities(f || []);
        } else {
          const r = await fetch('/synthetic-facilities.json');
          const d = await r.json();
          setFacilities(d || []);
        }
      } catch (e) {
        console.error(e);
        try { const r = await fetch('/synthetic-facilities.json'); const d = await r.json(); setFacilities(d || []); } catch (e2) { console.error(e2); }
      }
    })();
  }, []);

  const filtered = facilities.filter(f => (filterTier === 'all' ? true : f.tier === filterTier));

  const indicatorSummaries = useMemo(() => {
    // placeholder while server-provided summary is fetched
    return [] as any[];
  }, [meta.indicators, filtered]);

  const [serverSummaries, setServerSummaries] = useState<any[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const q = '';
        const resp = await fetch('/api/public/indicator_summary');
        if (!resp.ok) return;
        const j = await resp.json();
        if (cancelled) return;
        setServerSummaries((j && j.indicators) ? j.indicators : []);
      } catch (e) { console.error('Failed to fetch indicator summary', e); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load programs, activities and users for filters
  useEffect(() => {
    (async () => {
      try {
        const [pRes, aRes, uRes] = await Promise.all([fetch('/api/programs'), fetch('/api/activities'), fetch('/api/users')]);
        if (pRes.ok) setPrograms(await pRes.json());
        if (aRes.ok) setActivities(await aRes.json());
        if (uRes.ok) setUsers(await uRes.json());
      } catch (e) { console.error('Failed to load filter lists', e); }
    })();
  }, []);

  // Helper: compute facility ids matching selected program/activity/user filters
  const computeFacilityIdsForFilters = async (progIds: string[], actIds: string[], userIds: string[]) => {
    try {
      const body = { programIds: progIds || [], activityIds: actIds || [], userIds: userIds || [] };
      const resp = await fetch('/api/public/facility_ids_for_filters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!resp.ok) return [];
      const j = await resp.json();
      return Array.isArray(j) ? j : (j.facilityIds || []);
    } catch (e) { console.error('Failed to compute facility ids', e); return []; }
  };

  // When program/activity/user selections change, recompute facility list automatically
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ids = await computeFacilityIdsForFilters(selectedPrograms, selectedActivities, selectedUsers);
        if (cancelled) return;
        setSelectedFacilities(ids.map(String));
      } catch (e) { console.error(e); }
    })();
    return () => { cancelled = true; };
  }, [selectedPrograms, selectedActivities, selectedUsers]);

  const exportCsv = () => {
    const rows: string[] = ['indicator,reported,low,medium,high,pass,fail,unknown'];
    indicatorSummaries.forEach(s => {
      const get = (k: string) => (s.bandCounts && s.bandCounts[k] ? s.bandCounts[k] : 0);
      rows.push([`"${s.name}"`, s.reported, get('low'), get('medium'), get('high'), get('pass'), get('fail'), get('unknown')].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'indicator_summary.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 12 }}>
      {loading ? (
        <div>Loading metadata...</div>
      ) : (
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            {/* Filter row above map */}
            {/* Single floating card with collapsible filter sections */}
            <FloatingCard storageKey="floating_card_filters" defaultLeft={24} defaultTop={80} defaultWidth={420} defaultHeight={520}>
              <FiltersCardContent
                programs={programs}
                activities={activities}
                facilities={facilities}
                selectedPrograms={selectedPrograms}
                setSelectedPrograms={setSelectedPrograms}
                selectedActivities={selectedActivities}
                setSelectedActivities={setSelectedActivities}
                selectedStates={selectedStates}
                setSelectedStates={setSelectedStates}
                selectedLgas={selectedLgas}
                setSelectedLgas={setSelectedLgas}
                selectedFacilities={selectedFacilities}
                setSelectedFacilities={setSelectedFacilities}
              />
            </FloatingCard>

            <MapView filters={{ selectedStates, selectedLgas, selectedFacilityIds: selectedFacilities }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MapDashboard;
