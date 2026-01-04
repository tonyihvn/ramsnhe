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
  const [documents, setDocuments] = useState<any[]>([]);

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

  // Load documents from all reports for this facility
  useEffect(() => {
    (async () => {
      try {
        if (!facility) return;
        
        // Get all reports for this facility
        const facilityReports = (reports || []).filter(r => String(r.facility_id) === String(facility.id));
        if (facilityReports.length === 0) {
          setDocuments([]);
          return;
        }

        // For each report, fetch its answers to extract file attachments
        const allDocuments: any[] = [];
        
        for (const report of facilityReports) {
          try {
            const resp = await fetch(`/api/reports/${report.id}`);
            if (!resp.ok) continue;
            const reportData = await resp.json();
            
            // Get the activity name
            const activity = activities.find((a: any) => String(a.id) === String(report.activity_id));
            const activityName = activity?.title || activity?.name || `Activity ${report.activity_id}`;
            
            // Fetch answers for this report to find file uploads
            const answersResp = await fetch(`/api/reports/${report.id}/answers`);
            if (answersResp.ok) {
              const answers = await answersResp.json();
              // Process answers to find file attachments
              (answers || []).forEach((answer: any) => {
                if (answer.answer_value) {
                  try {
                    const parsed = typeof answer.answer_value === 'string' ? JSON.parse(answer.answer_value) : answer.answer_value;
                    
                    // Check if it's a file or array of files
                    if (parsed && typeof parsed === 'object') {
                      let files = [];
                      if (Array.isArray(parsed)) {
                        files = parsed.filter((f: any) => f && f.fileName);
                      } else if (parsed.fileName) {
                        files = [parsed];
                      }
                      
                      files.forEach((file: any) => {
                        allDocuments.push({
                          fileName: file.fileName,
                          fileUrl: file.fileUrl,
                          activityName,
                          reportId: report.id,
                          submissionDate: report.submission_date
                        });
                      });
                    }
                  } catch (e) {
                    // Not a JSON object or file, skip
                  }
                }
              });
            }
          } catch (e) {
            console.error('Failed to fetch documents for report', report.id, e);
          }
        }
        
        setDocuments(allDocuments);
      } catch (e) { console.error('Failed to load documents', e); }
    })();
  }, [facility, reports, activities]);

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

      <Card>
        <h2 className="text-lg font-semibold">Uploaded Documents</h2>
        <div className="mt-3">
          {documents.length === 0 ? (
            <div className="text-sm text-gray-500">No documents uploaded yet.</div>
          ) : (
            <div className="space-y-4">
              {/* Group documents by activity */}
              {Array.from(new Set(documents.map(d => d.activityName))).map(activityName => {
                const activityDocs = documents.filter(d => d.activityName === activityName);
                return (
                  <div key={activityName} className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="font-semibold text-base mb-3">{activityName}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {activityDocs.map((doc: any, idx: number) => (
                        <div key={idx} className="flex items-start justify-between p-3 border rounded bg-white hover:shadow-sm transition-shadow">
                          <div className="flex-1 min-w-0">
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
                              title={doc.fileName}
                            >
                              📄 {doc.fileName}
                            </a>
                            <div className="text-xs text-gray-500 mt-1">
                              Report #{doc.reportId}
                            </div>
                            {doc.submissionDate && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                {new Date(doc.submissionDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <a
                            href={doc.fileUrl}
                            download
                            className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors whitespace-nowrap"
                            title="Download file"
                          >
                            ↓
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default FacilityDashboardPage;
