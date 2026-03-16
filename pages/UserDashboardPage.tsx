import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import { useMockData } from '../hooks/useMockData';

const UserDashboardPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { users, reports, activities, facilities } = useMockData();
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    setUser(users.find(u => String(u.id) === String(userId)) || null);
  }, [users, userId]);

  const rows = (reports || []).filter(r => String(r.user_id) === String(userId)).map((r: any) => ({
    id: r.id,
    activity: activities.find((a: any) => String(a.id) === String(r.activity_id))?.title || r.activity_id,
    facility: facilities.find((f: any) => String(f.id) === String(r.facility_id))?.name || r.facility_id || '—',
    submitted: r.submission_date ? new Date(r.submission_date).toLocaleString() : '',
    status: r.status || '—',
    __raw: r
  }));

  const columns = [
    { key: 'id', label: 'Report ID' },
    { key: 'activity', label: 'Activity' },
    { key: 'facility', label: 'Facility' },
    { key: 'submitted', label: 'Submitted' },
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
          <h1 className="text-2xl font-bold">{user ? `${user.firstName || ''} ${user.lastName || ''}` : 'User'} — Dashboard</h1>
          <div className="text-sm text-gray-500">Email: {user?.email || '—'}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/users')}>Back</Button>
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">Submitted Reports</h2>
        <div className="mt-3">
          <DataTable columns={columns} data={rows} />
        </div>
      </Card>
    </div>
  );
};

export default UserDashboardPage;
