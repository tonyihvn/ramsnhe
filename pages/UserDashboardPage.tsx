import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import { useMockData } from '../hooks/useMockData';

const UserDashboardPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { users, reports, activities, facilities, currentUser } = useMockData();
  const [user, setUser] = useState<any | null>(null);
  const [assignedActivities, setAssignedActivities] = useState<any[]>([]);
  const [availableActivities, setAvailableActivities] = useState<any[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const foundUser = users.find(u => String(u.id) === String(userId)) || null;
    setUser(foundUser);
    
    // Check if current user is admin/super-admin
    const userRole = String(currentUser?.role || '').toLowerCase().trim();
    const adminRole = userRole === 'admin' || userRole === 'super-admin' || userRole === 'super_admin';
    setIsAdmin(adminRole);

    // Load assigned activities for this user
    loadAssignedActivities(foundUser?.id);
  }, [users, userId, currentUser]);

  const loadAssignedActivities = async (uid: any) => {
    if (!uid) return;
    try {
      const res = await fetch(`/api/users/${uid}/assigned-activities`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const assigned = Array.isArray(data) ? data : (data.activities || []);
        setAssignedActivities(assigned);
      }
    } catch (e) {
      console.error('Failed to load assigned activities', e);
    }
  };

  useEffect(() => {
    // Available activities = all activities minus already assigned
    const published = Array.isArray(activities) ? activities.filter(a => String(a.status || '').toLowerCase() === 'published') : [];
    const assigned = assignedActivities.map((a: any) => String(a.id));
    const available = published.filter(a => !assigned.includes(String(a.id)));
    setAvailableActivities(available);
  }, [activities, assignedActivities]);

  const assignActivity = async (activityId: string) => {
    if (!user?.id) return;
    setAssignmentLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/assign-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ activityId })
      });
      if (res.ok) {
        await loadAssignedActivities(user.id);
      }
    } catch (e) {
      console.error('Failed to assign activity', e);
    } finally {
      setAssignmentLoading(false);
    }
  };

  const unassignActivity = async (activityId: string) => {
    if (!user?.id) return;
    setAssignmentLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/unassign-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ activityId })
      });
      if (res.ok) {
        await loadAssignedActivities(user.id);
      }
    } catch (e) {
      console.error('Failed to unassign activity', e);
    } finally {
      setAssignmentLoading(false);
    }
  };

  const filledFormsCount = (reports || []).filter(r => String(r.user_id) === String(userId)).length;

  const reportsData = (reports || []).filter(r => String(r.user_id) === String(userId)).map((r: any) => ({
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

  const assignmentColumns = [
    { key: 'id', label: 'Activity ID' },
    { key: 'title', label: 'Activity Name' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', render: (row: any) => (
      <Button
        size="sm"
        variant="danger"
        onClick={() => unassignActivity(String(row.id))}
        disabled={assignmentLoading}
      >
        Remove
      </Button>
    ) }
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{user ? `${user.firstName || ''} ${user.lastName || ''}` : 'User'} — Dashboard</h1>
          <div className="text-sm text-gray-500">Email: {user?.email || '—'} | Role: {user?.role || '—'}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/users')}>Back</Button>
        </div>
      </div>

      {/* User Indicators Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-600">{assignedActivities.length}</div>
            <div className="text-sm text-gray-500 mt-1">Assigned Activities</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{filledFormsCount}</div>
            <div className="text-sm text-gray-500 mt-1">Filled Forms</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{user?.status === 'Active' ? '✓' : '—'}</div>
            <div className="text-sm text-gray-500 mt-1">Account Status: {user?.status || '—'}</div>
          </div>
        </Card>
      </div>

      {/* Activity Assignment Section - Only for Admin/Super-Admin */}
      {isAdmin && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">Assign Activities</h2>
          
          <div className="space-y-4">
            {/* Currently Assigned Activities */}
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Assigned Activities ({assignedActivities.length})</h3>
              {assignedActivities.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No activities assigned yet</div>
              ) : (
                <div className="space-y-2">
                  {assignedActivities.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{a.title || a.name || `Activity ${a.id}`}</div>
                        <div className="text-xs text-gray-500">Status: {a.status || '—'}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => unassignActivity(String(a.id))}
                        disabled={assignmentLoading}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Activities to Assign */}
            {availableActivities.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Available Activities to Assign ({availableActivities.length})</h3>
                <div className="space-y-2">
                  {availableActivities.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <div>
                        <div className="font-medium">{a.title || a.name || `Activity ${a.id}`}</div>
                        <div className="text-xs text-gray-500">Status: {a.status || '—'}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => assignActivity(String(a.id))}
                        disabled={assignmentLoading}
                      >
                        Assign
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Filled Forms Table */}
      <Card>
        <h2 className="text-lg font-semibold">Submitted Reports ({filledFormsCount})</h2>
        <div className="mt-3">
          {reportsData.length === 0 ? (
            <div className="text-sm text-gray-500 italic">No reports submitted yet</div>
          ) : (
            <DataTable columns={columns} data={reportsData} />
          )}
        </div>
      </Card>
    </div>
  );
};

export default UserDashboardPage;
