import React, { useEffect, useState } from 'react';
import { useMetadata } from '../contexts/MetadataContext';
import FacilityCard from '../components/FacilityCard';
import ClusterLayer from '../components/ClusterLayer';
import MapControls from '../components/MapControls';
import FloatingCard from '../components/FloatingCard';
import { DataProvider } from '../hooks/useMockData';
import { MetadataProvider } from '../contexts/MetadataContext';

import { MapContainer, TileLayer, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../hooks/useTheme';

type Facility = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tier: string;
  ownership: string;
  indicators: Record<string, any>;
};

// Fix default icon paths for Leaflet when bundled by Vite
const iconUrl = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href;
const iconRetinaUrl = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href;
const shadowUrl = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href;

const DefaultIcon = L.icon({
  iconUrl: iconUrl as unknown as string,
  iconRetinaUrl: iconRetinaUrl as unknown as string,
  shadowUrl: shadowUrl as unknown as string,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && (bounds as any).isValid) {
      try {
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40] });
      } catch (e) {
        // fallback: setView
        if (Array.isArray(bounds) && bounds.length > 0) {
          const b = bounds as any;
          map.setView([b[0][0], b[0][1]], 6);
        }
      }
    }
  }, [map, bounds]);
  return null;
}

export const MapView = ({ fullScreen = false, filters = {} }: { fullScreen?: boolean, filters?: any }) => {
  const { meta, loading } = useMetadata();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterOwnership, setFilterOwnership] = useState<string>('all');
  const [overlays, setOverlays] = useState<Record<string, boolean>>({ programs: true, activities: true, facilities: true, users: false });
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [computedFacilityIds, setComputedFacilityIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingFacilities(true);
      try {
        // Try server-backed facilities first
        const resp = await fetch('/api/public/facilities');
        if (resp.ok) {
          const json = await resp.json();
          if (!cancelled) {
            setFacilities(Array.isArray(json) ? json : (json.facilities || []));
            setServerAvailable(true);
            setLoadingFacilities(false);
            return;
          }
        }
      } catch (e) {
        // ignore - fallback to synthetic
      }

      // fallback: synthetic local file
      try {
        const r2 = await fetch('/synthetic-facilities.json');
        const d = await r2.json();
        if (!cancelled) {
          setFacilities(d || []);
          setServerAvailable(false);
        }
      } catch (e) {
        console.error('Failed to load facilities (server and synthetic)', e);
        if (!cancelled) setFacilities([]);
      } finally {
        if (!cancelled) setLoadingFacilities(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = facilities.filter(f => {
    // respect overlay toggles: if facilities overlay is turned off, hide all facilities
    if (!overlays.facilities) return false;
    // apply local controls (tier/ownership) first
    if (filterTier !== 'all' && f.tier !== filterTier) return false;
    if (filterOwnership !== 'all' && f.ownership !== filterOwnership) return false;

    // apply external filters passed from MapDashboard via props
    try {
      const selStates: string[] = Array.isArray(filters.selectedStates) ? filters.selectedStates : [];
      const selLgas: string[] = Array.isArray(filters.selectedLgas) ? filters.selectedLgas : [];
      const selFacilityIds: (string|number)[] = Array.isArray(filters.selectedFacilityIds) ? filters.selectedFacilityIds : [];
      const selFacilityIdsFromControls: (string|number)[] = Array.isArray(computedFacilityIds) ? computedFacilityIds : [];
      // state filter
      if (selStates.length > 0 && (!f.state || !selStates.includes(String(f.state)))) return false;
      // lga filter
      if (selLgas.length > 0 && (!f.lga || !selLgas.includes(String(f.lga)))) return false;
      // facility id filter (superset of program/activity filter results)
      if (selFacilityIds.length > 0 && !selFacilityIds.map(String).includes(String(f.id))) return false;
      // controls-provided facility ids (from program/activity selections) further restrict
      if (selFacilityIdsFromControls.length > 0 && !selFacilityIdsFromControls.map(String).includes(String(f.id))) return false;
    } catch (e) { /* ignore filter errors */ }

    return true;
  });

  // Only consider facilities with valid numeric coordinates for mapping and bounds
  const validLocations = filtered.filter(f => {
    const lat = (f && (f.lat !== undefined && f.lat !== null)) ? Number(f.lat) : NaN;
    const lng = (f && (f.lng !== undefined && f.lng !== null)) ? Number(f.lng) : NaN;
    return Number.isFinite(lat) && Number.isFinite(lng);
  });

  const bounds = validLocations.length
    ? L.latLngBounds(validLocations.map(f => [Number(f.lat), Number(f.lng)] as [number, number]))
    : null;

  const [enabledIndicators, setEnabledIndicators] = useState<Record<string, boolean>>({});

  const { settings } = useTheme();

  // When facilities load, compute indicators configured to show on map and attach values
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!facilities || facilities.length === 0) return;
        const mapIndicators = (meta.indicators || []).filter((i: any) => i.show_on_map).map((i: any) => i.id);
        if (!mapIndicators || mapIndicators.length === 0) return;
        const facilityIds = facilities.map(f => f.id).filter(Boolean);
        if (!facilityIds.length) return;
        const resp = await fetch('/api/indicators/compute_bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ indicatorIds: mapIndicators, facilityIds }) });
        if (!resp.ok) return;
        const j = await resp.json();
        if (cancelled) return;
        const computed = j && j.computed ? j.computed : {};
        // attach results to facilities
        const byId: Record<string, any> = {};
        for (const f of facilities) { byId[String(f.id)] = { ...f, indicators: f.indicators ? { ...f.indicators } : {} }; }
        for (const iid of Object.keys(computed)) {
          const item = computed[iid];
          const results = item.results || {};
          for (const fid of Object.keys(results)) {
            const r = results[fid];
            let val = null;
            if (r && typeof r === 'object') {
              if (r.value !== undefined) val = r.value;
              else if (r.value === undefined && Array.isArray(r.rows) && r.rows.length > 0) {
                // pick first column of first row if available
                const row0 = r.rows[0];
                const keys = Object.keys(row0 || {});
                if (keys.length > 0) val = row0[keys[0]];
              } else if (r.value === undefined && r.rowCount !== undefined) {
                // fallback to rowCount
                val = r.rowCount;
              }
            }
            if (byId[fid]) byId[fid].indicators[iid] = val;
          }
        }
        const updated = Object.keys(byId).map(k => byId[k]);
        setFacilities(updated as Facility[]);
      } catch (e) { /* ignore compute errors */ }
    })();
    return () => { cancelled = true; };
  }, [facilities && facilities.length, meta.indicators]);

  useEffect(() => {
    // initialize enabled indicators from MapControls localStorage default
    const def: Record<string, boolean> = {};
    (meta.indicators || []).forEach((i: any) => def[i.id] = true);
    setEnabledIndicators(def);
  }, [meta.indicators]);

  // Compute facility ids when programs/activities selections change
  const computeFacilityIdsForFilters = async (progIds: string[], actIds: string[], userIds: string[]) => {
    try {
      const body = { programIds: progIds || [], activityIds: actIds || [], userIds: userIds || [] };
      const resp = await fetch('/api/public/facility_ids_for_filters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!resp.ok) return [];
      const j = await resp.json();
      return Array.isArray(j) ? j : (j.facilityIds || []);
    } catch (e) { console.error('Failed to compute facility ids', e); return []; }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if ((!selectedPrograms || selectedPrograms.length === 0) && (!selectedActivities || selectedActivities.length === 0)) {
          if (!cancelled) setComputedFacilityIds([]);
          return;
        }
        const ids = await computeFacilityIdsForFilters(selectedPrograms, selectedActivities, []);
        if (!cancelled) setComputedFacilityIds((ids || []).map(String));
      } catch (e) { if (!cancelled) setComputedFacilityIds([]); }
    })();
    return () => { cancelled = true; };
  }, [selectedPrograms, selectedActivities]);

  // primary indicator (first enabled in metadata order)
  const primaryIndicatorId = (meta.indicators || []).find((i: any) => enabledIndicators[i.id])?.id || (meta.indicators && meta.indicators[0] && meta.indicators[0].id) || null;

  const getColorForBandString = (band: string | null | undefined) => {
    if (!band) return '#6b7280';
    const b = String(band).toLowerCase();
    // direct mapping for common words
    if (b === 'green') return '#16a34a';
    if (b === 'yellow') return '#f59e0b';
    if (b === 'red') return '#ef4444';
    // map our BAND_COLORS aliases
    const { BAND_COLORS } = require('../components/MapControls');
    if (BAND_COLORS[b]) return BAND_COLORS[b];
    return '#6b7280';
  };

  const getMarkerIcon = (loc: any) => {
    try {
      const f = loc.payload as any;
      if (!primaryIndicatorId) return undefined;
      const indMeta = (meta.indicators || []).find((x: any) => x.id === primaryIndicatorId);
      const rawVal = f.indicators?.[primaryIndicatorId] ?? f.indicators?.[indMeta?.dataType];
      const band = rawVal && rawVal.band ? rawVal.band : rawVal;
      const color = getColorForBandString(band);
      const html = `<div style="width:28px;height:28px;border-radius:14px;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`;
      return L.divIcon({ html, className: 'nherams-marker', iconSize: [28, 28], iconAnchor: [14, 14] });
    } catch (e) {
      return undefined;
    }
  };

  // Inline indicator summary component (fetches server-provided summary)
  function IndicatorSummary() {
    const [serverSummaries, setServerSummaries] = useState<any[] | null>(null);
    useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          const resp = await fetch('/api/public/indicator_summary');
          if (!resp.ok) return;
          const j = await resp.json();
          if (cancelled) return;
          setServerSummaries((j && j.indicators) ? j.indicators : []);
        } catch (e) { /* ignore */ }
      })();
      return () => { cancelled = true; };
    }, []);

    const indicatorSummaries = serverSummaries || [];
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
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Indicator Summary</strong>
          <div><button onClick={exportCsv} style={{ padding: '6px 8px', fontSize: 13 }}>Export CSV</button></div>
        </div>
        <div style={{ marginTop: 8 }}>
          {serverSummaries === null ? (
            <div style={{ color: '#6b7280' }}>Loading summaries…</div>
          ) : indicatorSummaries.length === 0 ? (
            <div style={{ color: '#6b7280' }}>No indicator summaries available.</div>
          ) : (
            indicatorSummaries.map((s: any) => (
              <div key={s.id} style={{ padding: '8px 6px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div><strong>{s.name}</strong></div>
                  <div style={{ color: '#555' }}>{s.reported}/{filtered.length}</div>
                </div>
                {s.bandCounts && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.keys(s.bandCounts).map(k => (
                      <div key={k} style={{ fontSize: 12, color: '#444' }}>
                        <strong>{k}</strong>: {s.bandCounts![k]}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Build telemetry sparkline using only finite numeric telemetry_uptime values
  const telemetryVals = filtered.map(f => {
    const raw = f && f.indicators ? f.indicators.telemetry_uptime : undefined;
    const n = (raw === undefined || raw === null) ? NaN : Number(raw);
    return Number.isFinite(n) ? n : NaN;
  }).filter(v => Number.isFinite(v));
  const avgTelemetry = telemetryVals.length ? Math.round(telemetryVals.reduce((a, b) => a + b, 0) / telemetryVals.length) : null;
  const sparklinePoints = (telemetryVals.length > 0)
    ? telemetryVals.map((v, i) => {
      const x = (i / (Math.max(1, telemetryVals.length - 1))) * 220;
      const y = 40 - (Math.max(0, Math.min(100, v)) / 100) * 36;
      // guard against NaN just in case
      const sx = Number.isFinite(x) ? x : 0;
      const sy = Number.isFinite(y) ? y : 20;
      return `${sx},${sy}`;
    }).join(' ')
    : '';

  

  // small header row with organization name and aggregates mode selector
  const [aggregatesMode, setAggregatesMode] = useState<'public'|'validator'|'controller'>('public');
  const orgName = (settings && (settings as any).organizationName) ? (settings as any).organizationName : 'Federal Ministry of Health and Social Welfare (FMOH&SW)';
  const headerLine = (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginTop: 0, marginBottom: 0, flexWrap: 'nowrap' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>{orgName}</div>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ color: serverAvailable ? '#059669' : '#a00', fontStyle: 'italic' }}>
          {serverAvailable === null ? 'Determining data source…' : (serverAvailable ? 'Live DB aggregates' : 'Synthetic data — not real/production')}
        </div>
        <div style={{ paddingLeft: 8, borderLeft: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={aggregatesMode} onChange={e => setAggregatesMode((e.target.value as any))} style={{ padding: 6, borderRadius: 6 }}>
            <option value="public">Public Lite Aggregates</option>
            <option value="validator">Validator</option>
            <option value="controller">Controller</option>
          </select>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Facilities shown: {filtered.length} / {facilities.length}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 12 }}>
      {headerLine}

      {loading && <div style={{ color: '#6b7280', marginBottom: 8 }}>Loading metadata… (base map will load below)</div>}

      <div style={{ display: 'flex', gap: 12 }}>
        {/* Main content area (map/form) */}
        <div style={{ flex: 1, position: 'relative' }}>
            <FloatingCard storageKey="floating_card_mapview" defaultLeft={32} defaultTop={48} defaultWidth={420} defaultHeight={520}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>Controls</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Drag / Resize card</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Tier</div>
                  <select value={filterTier} onChange={e => setFilterTier(e.target.value)} style={{ width: '100%', padding: 6, borderRadius: 6 }}>
                    <option value="all">All</option>
                    {meta.care_levels.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Primary Indicator</div>
                  <div style={{ fontWeight: 700 }}>{primaryIndicatorId || '—'}</div>
                </div>

                <div style={{ minWidth: 160 }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Avg Telemetry</div>
                  <div style={{ fontWeight: 700 }}>{avgTelemetry !== null ? `${avgTelemetry}%` : '—'}</div>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <svg width={280} height={40} viewBox="0 0 220 40" preserveAspectRatio="none">
                  <polyline fill="none" stroke="#0ea5a4" strokeWidth={2} points={sparklinePoints} />
                </svg>
              </div>

              <div style={{ marginTop: 12 }}>
                <MapControls
                  onChange={(e) => { setEnabledIndicators(e); }}
                  onToggleOverlays={(o) => setOverlays(o)}
                  onFilterChange={(f) => { setSelectedPrograms(f.selectedPrograms || []); setSelectedActivities(f.selectedActivities || []); }}
                />
              </div>

              {/* Indicator summary: fetch server-provided summaries if available */}
              <div style={{ marginTop: 12 }}>
                <IndicatorSummary />
              </div>
            </FloatingCard>

            <div className="nherams-map" style={{ height: '100vh' }}>
              <MapContainer
                center={filtered.length ? [filtered[0].lat, filtered[0].lng] : [9.0820, 8.6753]}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                {/* Use configured map provider from theme settings (defaults to OSM) */}
                {(() => {
                  const provider = (settings && (settings as any).defaultMapProvider) ? (settings as any).defaultMapProvider : 'leaflet';
                  const hereKey = (settings && (settings as any).hereApiKey) ? (settings as any).hereApiKey : null;
                  const googleKey = (settings && (settings as any).googleMapsApiKey) ? (settings as any).googleMapsApiKey : null;

                  const providers: any = {
                    leaflet: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors', subdomains: ['a','b','c'] },
                    osmand: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors (OsmAnd)', subdomains: ['a','b','c'] },
                    organic: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors (Organic Maps)', subdomains: ['a','b','c'] },
                    herewego: { url: hereKey ? `https://{s}.base.maps.ls.hereapi.com/maptile/2.1/maptile/newest/normal.day/{z}/{x}/{y}/256/png8?apiKey=${hereKey}` : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© HERE', subdomains: ['1','2','3','4'] },
                    google: { url: googleKey ? `https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${googleKey}` : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© Google', subdomains: ['mt0','mt1','mt2','mt3'] }
                  };
                  const cfg = providers[provider] || providers.leaflet;
                  return <TileLayer attribution={cfg.attribution} url={cfg.url} {...(cfg.subdomains ? { subdomains: cfg.subdomains } : {})} />;
                })()}
                <ClusterLayer
                  locations={validLocations.map(f => ({ id: f.id, lat: Number(f.lat), lng: Number(f.lng), payload: f }))}
                  getIcon={getMarkerIcon}
                  popupRenderer={(loc) => {
                    const f = loc.payload as any;
                    return (
                      <DataProvider>
                        <MetadataProvider>
                          <div style={{ padding: 8 }}>
                            <FacilityCard facility={f} visibleIndicators={enabledIndicators} visibleActivities={selectedActivities} />
                          </div>
                        </MetadataProvider>
                      </DataProvider>
                    );
                  }}
                />

                {/* Controls moved into the FloatingCard */}
                <FitBounds bounds={bounds} />
              </MapContainer>
            </div>

            {/* Form area below the map (takes remaining space) */}
            <div style={{ marginTop: 12, padding: 8, background: '#fff', borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
              <strong>Activity Form (placeholder)</strong>
              <div style={{ marginTop: 8, color: '#6b7280' }}>
                Test Program, Activity, Forms for the activity and validation forms.
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default MapView;
