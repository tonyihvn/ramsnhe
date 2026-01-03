import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useMockData } from '../hooks/useMockData';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ActivityRolePermission {
  activity_id: string;
  role_id: number;
  role_name: string;
  page_key: string;
  section_key?: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const ActivityPermissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activities, currentUser } = useMockData();
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<ActivityRolePermission[]>([]);
  const [allRoles, setAllRoles] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPermission, setCurrentPermission] = useState<Partial<ActivityRolePermission> | null>(null);

  // Check if user is admin
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';
  if (!isAdmin) {
    return (
      <Card className="m-6 bg-red-50 border border-red-200">
        <div className="p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-700">Only administrators can manage activity permissions.</p>
        </div>
      </Card>
    );
  }

  // Load all roles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const res = await fetch('/api/admin/roles', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setAllRoles(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to load roles:', e);
      }
    };
    loadRoles();
  }, []);

  // Load permissions for selected activity
  useEffect(() => {
    if (!selectedActivityId) {
      setPermissions([]);
      return;
    }

    const loadPermissions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/activities/${selectedActivityId}/role_permissions`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setPermissions(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to load permissions:', e);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [selectedActivityId]);

  const handleAddPermission = () => {
    setCurrentPermission({
      activity_id: selectedActivityId || '',
      role_id: 0,
      role_name: '',
      page_key: selectedActivityId ? `/activities/${selectedActivityId}` : '',
      section_key: null,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
    });
    setIsModalOpen(true);
  };

  const handleEditPermission = (perm: ActivityRolePermission) => {
    setCurrentPermission(perm);
    setIsModalOpen(true);
  };

  const handleSavePermission = async () => {
    if (!currentPermission || !currentPermission.activity_id || !currentPermission.role_id) {
      alert('Please select a role');
      return;
    }

    try {
      const res = await fetch(
        `/api/activities/${currentPermission.activity_id}/role_permissions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            roleId: currentPermission.role_id,
            pageKey: currentPermission.page_key,
            sectionKey: currentPermission.section_key || null,
            canView: currentPermission.can_view || false,
            canCreate: currentPermission.can_create || false,
            canEdit: currentPermission.can_edit || false,
            canDelete: currentPermission.can_delete || false,
          }),
        }
      );

      if (res.ok) {
        // Reload permissions
        const reloadRes = await fetch(`/api/activities/${currentPermission.activity_id}/role_permissions`, {
          credentials: 'include',
        });
        if (reloadRes.ok) {
          const data = await reloadRes.json();
          setPermissions(Array.isArray(data) ? data : []);
        }
        setIsModalOpen(false);
        setCurrentPermission(null);
      } else {
        alert('Failed to save permission');
      }
    } catch (e) {
      console.error('Failed to save permission:', e);
      alert('Error saving permission');
    }
  };

  const handleDeletePermission = async (perm: ActivityRolePermission) => {
    if (!window.confirm(`Remove ${perm.role_name}'s permissions for this activity?`)) {
      return;
    }

    try {
      const res = await fetch(
        `/api/activities/${perm.activity_id}/role_permissions/${perm.role_id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (res.ok) {
        // Reload permissions
        const reloadRes = await fetch(`/api/activities/${perm.activity_id}/role_permissions`, {
          credentials: 'include',
        });
        if (reloadRes.ok) {
          const data = await reloadRes.json();
          setPermissions(Array.isArray(data) ? data : []);
        }
      } else {
        alert('Failed to delete permission');
      }
    } catch (e) {
      console.error('Failed to delete permission:', e);
      alert('Error deleting permission');
    }
  };

  const PermissionIcon = ({ value }: { value: boolean }) =>
    value ? (
      <CheckIcon className="h-5 w-5 text-green-600" />
    ) : (
      <XMarkIcon className="h-5 w-5 text-gray-300" />
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Activity Role Permissions</h1>
      </div>

      <Card>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Activity</label>
          <select
            value={selectedActivityId || ''}
            onChange={(e) => setSelectedActivityId(e.target.value || null)}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">-- Select an Activity --</option>
            {activities.map((act) => (
              <option key={act.id} value={act.id}>
                {act.title}
              </option>
            ))}
          </select>
        </div>

        {selectedActivityId && (
          <>
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Role Permissions</h2>
              <Button onClick={handleAddPermission}>Add Permission</Button>
            </div>

            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : permissions.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No roles assigned to this activity yet. Click "Add Permission" to assign roles.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">View</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Create</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Edit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delete</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {permissions.map((perm) => (
                      <tr key={`${perm.role_id}-${perm.page_key}-${perm.section_key}`}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{perm.role_name}</td>
                        <td className="px-6 py-4 text-sm flex justify-center">
                          <PermissionIcon value={perm.can_view} />
                        </td>
                        <td className="px-6 py-4 text-sm flex justify-center">
                          <PermissionIcon value={perm.can_create} />
                        </td>
                        <td className="px-6 py-4 text-sm flex justify-center">
                          <PermissionIcon value={perm.can_edit} />
                        </td>
                        <td className="px-6 py-4 text-sm flex justify-center">
                          <PermissionIcon value={perm.can_delete} />
                        </td>
                        <td className="px-6 py-4 text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEditPermission(perm)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePermission(perm)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit Permission"
        footer={
          <>
            <Button onClick={handleSavePermission} variant="primary">
              Save
            </Button>
            <Button onClick={() => setIsModalOpen(false)} variant="secondary">
              Cancel
            </Button>
          </>
        }
      >
        {currentPermission && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={currentPermission.role_id || ''}
                onChange={(e) => {
                  const roleId = Number(e.target.value);
                  const role = allRoles.find((r) => r.id === roleId);
                  setCurrentPermission({
                    ...currentPermission,
                    role_id: roleId,
                    role_name: role?.name || '',
                  });
                }}
                className="block w-full border-gray-300 rounded-md shadow-sm"
              >
                <option value="">-- Select Role --</option>
                {allRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={currentPermission.can_view || false}
                  onChange={(e) =>
                    setCurrentPermission({ ...currentPermission, can_view: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Can View Activity Dashboard</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={currentPermission.can_create || false}
                  onChange={(e) =>
                    setCurrentPermission({ ...currentPermission, can_create: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Can Create Submissions</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={currentPermission.can_edit || false}
                  onChange={(e) =>
                    setCurrentPermission({ ...currentPermission, can_edit: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Can Edit Submissions</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={currentPermission.can_delete || false}
                  onChange={(e) =>
                    setCurrentPermission({ ...currentPermission, can_delete: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Can Delete Submissions</span>
              </label>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ActivityPermissionsPage;
