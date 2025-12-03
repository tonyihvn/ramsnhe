import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import { useMockData } from '../hooks/useMockData';

const FacilityDashboardPage: React.FC = () => {
  const { facilityId } = useParams<{ facilityId: string }>();
  const navigate = useNavigate();
  const { facilities, reports, users, activities } = useMockData();
  const [facility, setFacility] = useState<any | null>(null);
  const [indicators, setIndicators] = useState<any[]>([]);
  const [computedIndicators, setComputedIndicators] = useState<any>({});
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    setFacility(facilities.find(f => String(f.id) === String(facilityId)) || null);
  }, [facilities, facilityId]);

  // load indicators and compute values for this facility
  useEffect(() => {
    (async () => {
      try {
        if (!facility) return;
        const ir = await fetch('/api/indicators');
        if (!ir.ok) return;
        const inds = await ir.json();
        setIndicators(inds || []);

        // choose relevant indicators: those with level Facility OR indicators tied to activities that have reports for this facility
        const relevant = (inds || []).filter((i: any) => {
          if (!i) return false;
          if ((i.indicator_level || '').toString().toLowerCase() === 'facility') return true;
          if (i.activity_id) {
            return (reports || []).some((r: any) => String(r.facility_id) === String(facility.id) && String(r.activity_id) === String(i.activity_id));
          }
          return false;
        }).map((i: any) => i.id).filter(Boolean);

        if (!relevant || relevant.length === 0) return;
        setComputing(true);
        const body = { indicatorIds: relevant, facilityIds: [Number(facility.id)] };
        const cr = await fetch('/api/indicators/compute_bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!cr.ok) { setComputing(false); return; }
        const cj = await cr.json();
        if (cj && cj.computed) setComputedIndicators(cj.computed || {});
        setComputing(false);
      } catch (e) { console.error('Failed to compute indicators for facility', e); setComputing(false); }
    })();
  }, [facility]);

  const rows = (reports || []).filter(r => String(r.facility_id) === String(facilityId)).map((r: any) => ({
    id: r.id,
    activity: activities.find((a: any) => String(a.id) === String(r.activity_id))?.title || r.activity_id,
    submitted: r.submission_date ? new Date(r.submission_date).toLocaleString() : '',
    user: r.user_id ? ((users || []).find((u: any) => String(u.id) === String(r.user_id))?.email || r.user_id) : '—',
    status: r.status || '—',
    __raw: r
  }));

  const columns = [
    { key: 'id', label: 'Report ID' },
    { key: 'activity', label: 'Activity' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'user', label: 'User' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', render: (row: any) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => navigate(`/reports/${row.__raw.id}`)}>View</Button>
      </div>
    ) }
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{facility ? facility.name : 'Facility'} — Dashboard</h1>
          <div className="text-sm text-gray-500">State: {facility?.state || '—'} · LGA: {facility?.lga || '—'}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/facilities')}>Back</Button>
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">Indicators</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          {computing && <div className="text-sm text-gray-500">Computing indicators...</div>}
          {!computing && indicators && indicators.length === 0 && <div className="text-sm text-gray-500">No indicators configured.</div>}
          {!computing && indicators && indicators.length > 0 && (
            (() => {
              // pick relevant indicators (same logic used when computing)
              const relevant = indicators.filter((i: any) => {
                if (!i) return false;
                if ((i.indicator_level || '').toString().toLowerCase() === 'facility') return true;
                if (i.activity_id) {
                  return (reports || []).some((r: any) => String(r.facility_id) === String(facility?.id) && String(r.activity_id) === String(i.activity_id));
                }
                return false;
              });
              if (!relevant || relevant.length === 0) return <div className="text-sm text-gray-500">No relevant indicators for this facility.</div>;
              return relevant.map((ind: any) => {
                const comp = computedIndicators && computedIndicators[ind.id] && computedIndicators[ind.id].results ? computedIndicators[ind.id].results[String(facility?.id) || facility?.id] : null;
                let display = '—';
                if (comp) {
                  if (comp.value !== undefined) display = String(comp.value);
                  else if (comp.rows && comp.rows.length) {
                    // try to show a sensible single-number field
                    const first = comp.rows[0];
                    const keys = Object.keys(first || {});
                    if (keys.length === 1) display = String(first[keys[0]]);
                    else display = JSON.stringify(first);
                  } else if (comp.rows) {
                    display = JSON.stringify(comp.rows || comp);
                  }
                }
                return (
                  <div key={ind.id} className="p-3 border rounded bg-white">
                    <div className="font-medium">{ind.title || ind.name}</div>
                    <div className="text-sm text-gray-600">{display} {ind.unit_of_measurement ? (<span className="text-xs text-gray-500">{ind.unit_of_measurement}</span>) : null}</div>
                  </div>
                );
              });
            })()
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Collected Reports</h2>
        <div className="mt-3">
          <DataTable columns={columns} data={rows} />
        </div>
      </Card>
    </div>
  );
};

export default FacilityDashboardPage;
