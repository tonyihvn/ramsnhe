import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ActivityDashboardPage: React.FC = () => {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/activity_dashboard/${activityId}`, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          console.error('Failed to load dashboard', await res.text());
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchDashboard();
  }, [activityId]);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data available for this activity.</div>;

  const { activity, questions, reports, answersByQuestion, uploadedDocs } = data;

  // Utility to strip HTML tags
  function stripHtml(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  const handleDownloadPdf = () => {
    // Simple client-side PDF/print: open print dialog for the dashboard
    window.print();
  };

  const standaloneUrl = `${window.location.origin}/standalone-form/${activity.id}`;
  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{activity.title} — Collected Data</h1>
          <p className="text-sm text-gray-500">{stripHtml(activity.details)}</p>
          <div className="mt-2">
            <span className="text-xs text-gray-600">Shareable Form Link: </span>
            <a href={standaloneUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline break-all">{standaloneUrl}</a>
          </div>
        </div>
        <div className="space-x-2">
          <Button onClick={() => navigate('/activities')} variant="secondary">Back</Button>
          <Button onClick={handleDownloadPdf}>Download PDF</Button>
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Power BI</h2>
        <p className="text-sm text-gray-500">Embed your Power BI report here (iframe) or connect external dashboard.</p>
        <div className="mt-4">
          <iframe title="PowerBI" src={activity.powerbi_url || ''} style={{ width: '100%', height: 300, border: 'none' }} />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Interactive Charts</h2>
        <p className="text-sm text-gray-500">Charts are interactive. Use the charts to explore distribution of collected answers.</p>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {questions.map((q: any) => {
            const answersForQ = (answersByQuestion[q.id] || []).map((a: any) => {
              // answer_value may be JSON; normalize to string
              let v = a.answer_value;
              if (v && typeof v === 'object') v = v.value ?? JSON.stringify(v);
              return v === null || typeof v === 'undefined' ? '—' : String(v);
            });
            // tally
            const counts: Record<string, number> = {};
            for (const v of answersForQ) counts[v] = (counts[v] || 0) + 1;
            const labels = Object.keys(counts).slice(0, 10);
            const data = {
              labels,
              datasets: [
                {
                  label: 'Responses',
                  data: labels.map(l => counts[l] || 0),
                  backgroundColor: 'rgba(37,99,235,0.6)'
                }
              ]
            };

            return (
              <div key={q.id} className="bg-white p-4 rounded shadow">
                <div className="text-sm font-medium">{q.question_text}</div>
                <div className="text-xs text-gray-500">{q.question_helper}</div>
                <div className="mt-2">
                  <div className="text-sm">Responses: {(answersByQuestion[q.id] || []).length}</div>
                  <div className="mt-2 h-44"><Bar data={data} options={{ responsive: true, maintainAspectRatio: false }} /></div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">All Collected Reports</h2>
        {/* DataTable with column-level filter */}
        {(() => {
          const columns = [
            { key: 'id', label: 'Report ID' },
            { key: 'submission_date', label: 'Submitted' },
            { key: 'facility_id', label: 'Facility' },
            { key: 'user_id', label: 'User' },
            { key: 'status', label: 'Status' },
            { key: 'reviewers_report', label: "Reviewer's Report" },
          ];
          const data = reports.map((r: any) => ({
            id: r.id,
            submission_date: new Date(r.submission_date).toLocaleString(),
            facility_id: r.facility_id || '—',
            user_id: r.user_id || '—',
            status: r.status || '—',
            reviewers_report: stripHtml(r.reviewers_report),
          }));
          return <DataTable columns={columns} data={data} onCellEdit={undefined} />;
        })()}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Uploaded Excel Files</h2>
        {uploadedDocs.length === 0 && <div className="text-sm text-gray-500">No uploaded files.</div>}
        {uploadedDocs.map((d: any) => (
          <div key={d.id} className="mb-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">{d.filename || 'Uploaded file'}</div>
                <div className="text-xs text-gray-500">Uploaded: {new Date(d.created_at).toLocaleString()}</div>
              </div>
              <div>
                <Button variant="secondary" onClick={() => {
                  // show file content in new tab as JSON for now
                  const w = window.open();
                  w?.document.write('<pre>' + JSON.stringify(d.file_content, null, 2) + '</pre>');
                }}>View</Button>
              </div>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Data Quality Followups</h2>
        <p className="text-sm text-gray-500">Manage followups for questions created during data collection.</p>
        <div className="mt-4">
          <Button onClick={() => navigate(`/activities/${activityId}/followups`)}>Open Followups Page</Button>
        </div>
      </Card>
    </div>
  );
};

export default ActivityDashboardPage;
