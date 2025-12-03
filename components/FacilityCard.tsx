import React, { useEffect, useState } from 'react';
import { useMetadata } from '../contexts/MetadataContext';
import EvidenceAccordion from './EvidenceAccordion';
import { bandForIndicator } from '../utils/banding';
import { BAND_COLORS } from './MapControls';

type Facility = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tier: string;
  ownership: string;
  indicators: Record<string, any>;
};

const colorForBand = (band: string) => {
  if (!band) return BAND_COLORS['unknown'];
  const b = String(band).toLowerCase();
  if (BAND_COLORS[b]) return BAND_COLORS[b];
  // legacy color names
  if (b === 'green') return BAND_COLORS['high'];
  if (b === 'yellow') return BAND_COLORS['medium'];
  if (b === 'red') return BAND_COLORS['low'];
  return BAND_COLORS['unknown'];
}

const FacilityCard: React.FC<{ facility: Facility; visibleIndicators?: Record<string, boolean>; visibleActivities?: string[] }> = ({ facility, visibleIndicators, visibleActivities }) => {
  const { meta } = useMetadata();
  const [mapAnswers, setMapAnswers] = useState<any | null>(null);
  const [activityIndicators, setActivityIndicators] = useState<any[]>([]);
  const [activityIndicatorValues, setActivityIndicatorValues] = useState<Record<string, any>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fid = facility && (facility.id || facility.id === 0) ? facility.id : null;
        if (!fid) return;
        const resp = await fetch(`/api/public/facility_map_answers?facilityId=${encodeURIComponent(fid)}`);
        if (!resp.ok) return;
        const j = await resp.json();
        if (!cancelled) setMapAnswers(j);

        // Discover indicators attached to activities referenced by these reports
        try {
          const activityIds = Array.from(new Set((j.reports || []).map((r: any) => r.activityId).filter(Boolean)));
          if (activityIds.length > 0) {
            const indResp = await fetch('/api/indicators');
            if (indResp.ok) {
              const allInd = await indResp.json();
              // filter indicators tied to any of these activities
              let tied = (allInd || []).filter((ind: any) => activityIds.includes(ind.activity_id || ind.activityId || null));
              // If the map view provided a visibleActivities list, filter out indicators whose activity is unchecked
              try {
                // If visibleActivities is provided (even an empty array), treat it as the
                // whitelist of activities whose indicators should be shown. Previously we
                // only filtered when the array had length>0 which caused all indicators to
                // show when no activities were selected. This change ensures unchecked
                // activities' indicators are hidden when the prop is an explicit array.
                if (Array.isArray(visibleActivities)) {
                  const visSet = new Set(visibleActivities.map(String));
                  tied = tied.filter((ind: any) => visSet.has(String(ind.activity_id || ind.activityId || '')));
                }
              } catch (e) { /* ignore */ }
              if (tied.length > 0) {
                setActivityIndicators(tied);
                // compute these indicators for this facility (use compute_bulk)
                try {
                  const ids = tied.map((t: any) => Number(t.id));
                  const cb = await fetch('/api/indicators/compute_bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ indicatorIds: ids, facilityIds: [fid] }) });
                  if (cb.ok) {
                    const cbj = await cb.json();
                    const computed: Record<string, any> = {};
                    if (cbj && cbj.computed) {
                      for (const iid of Object.keys(cbj.computed)) {
                        const entry = cbj.computed[iid];
                        const resForFacility = entry.results && (entry.results[String(fid)] || entry.results[fid]) ? (entry.results[String(fid)] || entry.results[fid]) : null;
                        let value = null;
                        if (resForFacility) {
                          if (resForFacility.value !== undefined) value = resForFacility.value;
                          else if (resForFacility.rows && Array.isArray(resForFacility.rows) && resForFacility.rows.length > 0) {
                            const r0 = resForFacility.rows[0];
                            value = Object.values(r0)[0];
                          } else if (typeof resForFacility === 'number' || typeof resForFacility === 'string') value = resForFacility;
                        }
                        computed[iid] = value;
                      }
                    }
                    setActivityIndicatorValues(computed);
                  }
                } catch (e) { /* ignore compute errors */ }
              }
            }
          }
        } catch (e) { /* ignore indicator discovery errors */ }

      } catch (e) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [facility && facility.id, JSON.stringify(visibleActivities || [])]);

  const indicators = meta.indicators || [];

  return (
    <div style={{ border: '1px solid #ddd', padding: 10, borderRadius: 6, background: '#fff', minWidth: 220 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{facility.name}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{facility.tier} — {facility.ownership}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', maxWidth: 280 }}>
          {indicators.filter((ind: any) => (visibleIndicators ? (visibleIndicators[ind.id] ?? true) : true)).map((ind: any) => {
            const rawVal = facility.indicators?.[ind.id] ?? facility.indicators?.[ind.dataType];
            const band = ind.isBanded ? (rawVal && rawVal.band ? rawVal.band : rawVal) : (rawVal ?? null);
            const computed = ind.isBanded && (band === null || typeof band === 'undefined') ? bandForIndicator(ind.id, rawVal) : band;
            return (
              <div key={ind.id} title={ind.name} style={{ padding: '6px 10px', borderRadius: 18, background: '#f7f7f7', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: 8, background: ind.isBanded ? colorForBand(computed) : '#777', display: 'inline-block', boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.06)' }} />
                <div style={{ fontSize: 12, fontWeight: 600 }}>{ind.name}</div>
                <div style={{ fontSize: 12, color: '#444', marginLeft: 6 }}>{String(rawVal ?? '—')}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* extra activity/form fields set to show on map, if present on facility */}
      {(facility.formFields || facility.fields || facility.extraFields) && (
        <div style={{ marginTop: 10, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Additional Fields</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {Object.entries(facility.formFields || facility.fields || facility.extraFields || {}).map(([k, v]) => (
              <div key={k} style={{ fontSize: 12, color: '#333' }}>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{k}</div>
                <div style={{ fontWeight: 600 }}>{String(v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answers for questions marked show_on_map (fetched from server), grouped by section */}
      {mapAnswers && Array.isArray(mapAnswers.reports) && mapAnswers.reports.length > 0 && (
        <div style={{ marginTop: 10, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
          {/* <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Reported (recent)</div> */}
          {mapAnswers.reports.slice(0,3).map((r: any) => {
            const groups: Record<string, any[]> = {};
            const qlist = Array.isArray(r.showOnMapQuestions) ? r.showOnMapQuestions : [];
            for (const q of qlist) {
              const sec = q.sectionName || q.pageName || 'General';
              groups[sec] = groups[sec] || [];
              groups[sec].push(q);
            }
            return (
              <div key={r.reportId} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 8, color: '#6b7280', marginBottom: 4 }}>Report {r.reportId} — {r.submissionDate ? new Date(r.submissionDate).toLocaleString() : ''}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                  {Object.entries(groups).map(([section, qs]) => (
                    <div key={section}>
                      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>{section}</div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {qs.map((q: any) => {
                          const qid = String(q.id);
                          const label = q.questionText || qid;
                          const val = r.answers ? r.answers[qid] : undefined;
                          if (typeof val === 'undefined' || val === null) return null;
                          const displayVal = (typeof val === 'object') ? (val.value ?? JSON.stringify(val)) : String(val);
                          return (
                            <div key={qid} style={{ fontSize: 12, color: '#333' }}>
                              <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
                              <div style={{ fontWeight: 600 }}>{displayVal}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity-specific indicators (computed for this facility) */}
      {activityIndicators && activityIndicators.length > 0 && (
        <div style={{ marginTop: 10, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}> Indicators</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {activityIndicators.map((ind: any) => (
              <div key={ind.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderRadius: 6, background: '#fafafa' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{ind.title || ind.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{ind.unit_of_measurement ? `Unit: ${ind.unit_of_measurement}` : (ind.subtitle || '')}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{activityIndicatorValues[String(ind.id)] ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <EvidenceAccordion facility={facility} mapAnswers={mapAnswers} />
      </div>
    </div>
  );
};

export default FacilityCard;
