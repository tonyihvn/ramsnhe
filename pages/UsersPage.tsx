import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { useMockData } from '../hooks/useMockData';
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import MInput from '../components/ui/MInput';
import DynamicFormRenderer from '../components/DynamicFormRenderer';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { User } from '../types';
import { FormSchema } from '../components/FormBuilder';

const UsersPage: React.FC = () => {
  const { users, saveUser, deleteUser, currentUser, facilities } = useMockData();
  const [userSchema, setUserSchema] = useState<FormSchema | null>(null);
  const [allRoles, setAllRoles] = useState<{ id: number, name: string }[]>([]);
  const [allPermissions, setAllPermissions] = useState<{ id: number, name: string }[]>([]);
  useEffect(() => {
    // Load user form schema
    loadUserSchema();

    // Fetch roles and permissions from backend
    fetch('/api/admin/roles', { credentials: 'include' })
      .then(async (r) => { if (!r.ok) { setAllRoles([]); return; } const j = await r.json(); setAllRoles(Array.isArray(j) ? j : []); })
      .catch(() => setAllRoles([]));
    fetch('/api/admin/permissions', { credentials: 'include' })
      .then(async (r) => { if (!r.ok) { setAllPermissions([]); return; } const j = await r.json(); setAllPermissions(Array.isArray(j) ? j : []); })
      .catch(() => setAllPermissions([]));
  }, []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUserEdit, setCurrentUserEdit] = useState<Partial<User>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const canEdit = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  // Approval state
  const [approvalAction, setApprovalAction] = useState<{ userId: string | null; action: 'approve' | 'reject' }>({ userId: null, action: 'approve' });
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalLoading, setApprovalLoading] = useState(false);

  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; userId: string | null; userName: string }>({ isOpen: false, userId: null, userName: '' });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleApproveUser = async (userId: string, action: 'approve' | 'reject') => {
    setApprovalLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/approval`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: approvalNotes })
      });
      if (response.ok) {
        // Refresh users list
        const updatedUsers = users.map(u => 
          u.id === userId ? { ...u, approval_status: action === 'approve' ? 'approved' : 'rejected' } : u
        );
        // You may need to update the users context here
        setApprovalNotes('');
        setApprovalAction({ userId: null, action: 'approve' });
        alert(`User ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      } else {
        alert('Failed to update approval status');
      }
    } catch (e) {
      console.error('Approval error:', e);
      alert('Error processing approval');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmation.userId) return;
    
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${deleteConfirmation.userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        // Call the deleteUser function to update state
        deleteUser(deleteConfirmation.userId);
        setDeleteConfirmation({ isOpen: false, userId: null, userName: '' });
        alert(`User "${deleteConfirmation.userName}" has been deleted successfully.`);
      } else {
        const errorText = await response.text();
        alert(`Failed to delete user: ${errorText || 'Please try again.'}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Error deleting user: ' + String(error));
    } finally {
      setDeleteLoading(false);
    }
  };

  const loadUserSchema = async () => {
    try {
      const response = await fetch('/api/form-schemas/user', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        // Normalize fields to ensure showInList property exists
        const normalizedData = {
          ...data,
          fields: (data.fields || []).map((f: any) => ({
            ...f,
            showInList: f.showInList ?? false
          }))
        };
        setUserSchema(normalizedData);
      }
    } catch (error) {
      console.error('Failed to load user form schema:', error);
    }
  };

  const openModal = (u?: User) => {
    setAvatarFile(null);
    setAvatarPreview(u?.profileImage || null);
    setCurrentUserEdit(
      u
        ? {
          ...u,
          assignedRoles: (u as any).assignedRoles || [],
          assignedPermissions: (u as any).assignedPermissions || [],
        }
        : {
          firstName: '',
          lastName: '',
          email: '',
          role: 'Data Collector',
          status: 'Active',
          password: '',
          facilityId: undefined,
          assignedRoles: [],
          assignedPermissions: [],
        }
    );
    setIsModalOpen(true);
  };

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  const handleSave = async () => {
    if (!currentUserEdit.firstName || !currentUserEdit.email) {
      alert('Name and Email are required.');
      return;
    }

    const toSave = { ...currentUserEdit } as Partial<User>;
    
    // Only send password if it's not empty (preserve existing password if untouched)
    if (!toSave.password) {
      delete toSave.password;
    }
    
    if (avatarFile) {
      try {
        const dataUrl = await readFileAsDataUrl(avatarFile);
        toSave.profileImage = dataUrl;
      } catch (e) {
        console.error('Failed to read avatar file', e);
      }
    } else if (avatarPreview) {
      // if preview exists but no new file, keep existing
      toSave.profileImage = avatarPreview;
    }

    // Save roles/permissions assignments
    const { assignedRoles, assignedPermissions, ...userData } = toSave as any;
    saveUser(userData as User);
    // Assign roles
    if (assignedRoles && assignedRoles.length > 0) {
      fetch('/api/admin/roles/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: userData.id, roleIds: assignedRoles })
      });
    }
    // Assign permissions
    if (assignedPermissions && assignedPermissions.length > 0) {
      fetch('/api/admin/permissions/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: userData.id, permissionIds: assignedPermissions })
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Users</h1>
        {canEdit && <Button onClick={() => openModal()} leftIcon={<PlusIcon className="h-5 w-5" />}>New User</Button>}
      </div>
      <Card>
        <DataTable
          columns={[
            {
              key: 'name', label: 'Name', render: (row: any) => (
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    {row.profileImage ? (
                      <img className="h-10 w-10 rounded-full object-cover" src={row.profileImage} alt="avatar" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">No</div>
                    )}
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{row.firstName} {row.lastName}</div>
                    <div className="text-sm text-gray-500">{row.email}</div>
                  </div>
                </div>
              )
            },
            { key: 'role', label: 'Role' },
            {
              key: 'status', label: 'Status', render: (row: any) => (
                <>
                  {row.status === 'Active' && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                  )}
                  {row.status === 'Inactive' && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Inactive</span>
                  )}
                  {row.status === 'Suspended' && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">Suspended</span>
                  )}
                </>
              )
            },
            {
              key: 'approval_status', label: 'Approval', render: (row: any) => (
                <>
                  {!row.approval_status && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Approved</span>
                  )}
                  {row.approval_status === 'pending' && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                  )}
                  {row.approval_status === 'approved' && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Approved</span>
                  )}
                  {row.approval_status === 'rejected' && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Rejected</span>
                  )}
                </>
              )
            },
            {
              key: 'email_verified', label: 'Email', render: (row: any) => (
                <>
                  {row.email_verified && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Verified</span>
                  )}
                  {!row.email_verified && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">Pending</span>
                  )}
                </>
              )
            },
            {
              key: 'actions', label: 'Actions', render: (row: any) => {
                const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' || currentUser?.role === 'super-admin';
                const isPending = row.approval_status === 'pending';
                return (
                  <div className="flex gap-2">
                    <button onClick={() => openModal(row)} className="text-indigo-600 hover:text-indigo-900" title="Edit"><PencilIcon className="h-5 w-5" /></button>
                    {isAdmin && (
                      <>
                        {isPending && (
                          <>
                            <button 
                              onClick={() => handleApproveUser(row.id, 'approve')}
                              className="text-green-600 hover:text-green-900 text-xs font-semibold"
                              title="Approve"
                              disabled={approvalLoading}
                            >
                              ✓
                            </button>
                            <button 
                              onClick={() => handleApproveUser(row.id, 'reject')}
                              className="text-red-600 hover:text-red-900 text-xs font-semibold"
                              title="Reject"
                              disabled={approvalLoading}
                            >
                              ✗
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => setDeleteConfirmation({ isOpen: true, userId: String(row.id), userName: `${row.firstName} ${row.lastName}` })} 
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                );
              }
            }
          ]}
          data={users}
          pageSize={20}
          persistKey="users_table"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentUserEdit.id ? "Edit User" : "New User"}
        footer={
          <>
            <Button onClick={handleSave} className="ml-3">Save</Button>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <MInput label="First Name" type="text" value={currentUserEdit.firstName || ''} onChange={v => setCurrentUserEdit({ ...currentUserEdit, firstName: v })} />
            <MInput label="Last Name" type="text" value={currentUserEdit.lastName || ''} onChange={v => setCurrentUserEdit({ ...currentUserEdit, lastName: v })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image</label>
            {avatarPreview && (
              <div className="mb-2">
                <img src={avatarPreview} alt="avatar-preview" className="h-16 w-16 rounded-full object-cover" />
              </div>
            )}
            <MInput label="Upload Image" type="file" onChange={(files: FileList | string) => {
              // MInput returns FileList for file inputs
              if (files && typeof files !== 'string' && (files as FileList).length > 0) {
                const f = (files as FileList)[0];
                setAvatarFile(f);
                const reader = new FileReader();
                reader.onload = () => setAvatarPreview(String(reader.result));
                reader.readAsDataURL(f);
              } else {
                setAvatarFile(null);
                setAvatarPreview(null);
              }
            }} />
          </div>
          <div>
            <MInput label="Email" type="email" value={currentUserEdit.email || ''} onChange={v => setCurrentUserEdit({ ...currentUserEdit, email: v })} />
          </div>
          <div>
            <MInput label="Phone" type="text" value={currentUserEdit.phoneNumber || ''} onChange={v => setCurrentUserEdit({ ...currentUserEdit, phoneNumber: v })} />
          </div>
          <div>
            <MInput label="Password" type="password" value={currentUserEdit.password || ''} onChange={v => setCurrentUserEdit({ ...currentUserEdit, password: v })} />
          </div>
          <div>
            <MInput label="Role" type="select" value={currentUserEdit.role} onChange={v => setCurrentUserEdit({ ...currentUserEdit, role: v })}
              options={[{ value: 'Admin', label: 'Admin' }, { value: 'Form Builder', label: 'Form Builder' }, { value: 'Data Collector', label: 'Data Collector' }, { value: 'Viewer', label: 'Viewer' }, { value: 'Responder', label: 'Responder' }, { value: 'Controller', label: 'Controller' }, { value: 'Validator', label: 'Validator' }, { value: 'Reviewer', label: 'Reviewer' }, { value: 'Public', label: 'Public' }]} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign Roles</label>
            <div className="flex flex-wrap gap-2">
              {allRoles.map(r => (
                <label key={r.id} className="inline-flex items-center text-xs">
                  <input type="checkbox" checked={currentUserEdit.assignedRoles?.includes(r.id)}
                    onChange={e => {
                      const checked = e.target.checked;
                      setCurrentUserEdit((prev: any) => ({
                        ...prev,
                        assignedRoles: checked
                          ? [...(prev.assignedRoles || []), r.id]
                          : (prev.assignedRoles || []).filter((id: number) => id !== r.id)
                      }));
                    }}
                  />
                  <span className="ml-1">{r.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign Permissions</label>
            <div className="flex flex-wrap gap-2">
              {allPermissions.map(p => (
                <label key={p.id} className="inline-flex items-center text-xs">
                  <input type="checkbox" checked={currentUserEdit.assignedPermissions?.includes(p.id)}
                    onChange={e => {
                      const checked = e.target.checked;
                      setCurrentUserEdit((prev: any) => ({
                        ...prev,
                        assignedPermissions: checked
                          ? [...(prev.assignedPermissions || []), p.id]
                          : (prev.assignedPermissions || []).filter((id: number) => id !== p.id)
                      }));
                    }}
                  />
                  <span className="ml-1">{p.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <MInput label="Facility (optional)" type="select" value={currentUserEdit.facilityId || ''} onChange={v => setCurrentUserEdit({ ...currentUserEdit, facilityId: v ? Number(v) : undefined })}
              options={[{ value: '', label: 'None' }, ...(facilities.map(f => ({ value: f.id, label: f.name })))]} />
          </div>
          <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location (lat,lng)</label>
              <input type="text" placeholder="e.g. 9.0820,8.6753" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={currentUserEdit.location || ''} onChange={e => setCurrentUserEdit({ ...currentUserEdit, location: e.target.value })} />
            </div>
            <div className="flex items-center">
              <input id="user-show-map" type="checkbox" checked={currentUserEdit.show_on_map === undefined ? true : Boolean(currentUserEdit.show_on_map)}
                onChange={e => setCurrentUserEdit({ ...currentUserEdit, show_on_map: e.target.checked })} />
              <label htmlFor="user-show-map" className="ml-2 text-sm text-gray-700">Show on map</label>
            </div>
          </div>
          <div>
            <MInput label="Status" type="select" value={currentUserEdit.status} onChange={v => setCurrentUserEdit({ ...currentUserEdit, status: v })}
              options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }, { value: 'Suspended', label: 'Suspended' }]} />
          </div>

          {/* Render dynamic custom fields from form schema */}
          <DynamicFormRenderer
            formType="user"
            formData={currentUserEdit}
            onChange={(fieldName, value) => {
              setCurrentUserEdit({ ...currentUserEdit, [fieldName]: value });
            }}
          />
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={deleteConfirmation.isOpen} 
        onClose={() => setDeleteConfirmation({ isOpen: false, userId: null, userName: '' })}
        title="Delete User"
        size="lg"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button 
              onClick={() => setDeleteConfirmation({ isOpen: false, userId: null, userName: '' })}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button 
              onClick={handleDeleteUser}
              disabled={deleteLoading}
              className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
            >
              {deleteLoading ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 font-medium">⚠️ Warning: This action cannot be undone</p>
          </div>
          <div className="space-y-2">
            <p className="text-gray-700">
              Are you sure you want to permanently delete the following user?
            </p>
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <p className="font-semibold text-gray-900">{deleteConfirmation.userName}</p>
            </div>
            <p className="text-sm text-gray-600">
              This user's account and all associated data will be permanently removed from the system. This action cannot be reversed.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersPage;
