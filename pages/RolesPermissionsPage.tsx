import React, { useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

type Role = { id: number; name: string; description?: string };
type FormDefinition = { id: string; activityId: string; pages: any[] };

const RolesPermissionsPage: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
    const [pagePermissions, setPagePermissions] = useState<any[]>([]); // existing permissions from server
    const [localPerms, setLocalPerms] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const [rolesRes, actsRes, permsRes] = await Promise.all([
                    fetch('/api/admin/roles', { credentials: 'include' }).then(r => r.ok ? r.json() : []),
                    fetch('/api/activities', { credentials: 'include' }).then(r => r.ok ? r.json() : []),
                    fetch('/api/admin/page_permissions', { credentials: 'include' }).then(r => r.ok ? r.json() : [])
                ]);
                setRoles(Array.isArray(rolesRes) ? rolesRes : []);
                setActivities(Array.isArray(actsRes) ? actsRes : []);
                setPagePermissions(Array.isArray(permsRes) ? permsRes : []);
                if (Array.isArray(actsRes) && actsRes.length) setSelectedActivityId(String(actsRes[0].id));
            } catch (e) {
                setError('Failed to load roles/activities/permissions. Are you an admin?');
            }
            setLoading(false);
        }
        load();
    }, []);

    // Build a lookup map from pagePermissions for fast reads
    useEffect(() => {
        const map: Record<string, any> = {};
        for (const p of pagePermissions) {
            const key = `${p.page_key}||${p.section_key || ''}||${p.role_name}`;
            map[key] = { can_create: !!p.can_create, can_view: !!p.can_view, can_edit: !!p.can_edit, can_delete: !!p.can_delete };
        }
        setLocalPerms(map);
    }, [pagePermissions]);

    const selectedActivity = useMemo(() => activities.find(a => String(a.id) === String(selectedActivityId)), [activities, selectedActivityId]);

    function pageKeyForActivity(activityId: string) {
        return `/activities/fill/${activityId}`;
    }

    const handleToggle = (activityId: string, pageId: string, pageName: string, sectionId: string | null, roleName: string, field: 'can_create' | 'can_view' | 'can_edit' | 'can_delete') => {
        const pageKey = pageKeyForActivity(activityId);
        const key = `${pageKey}||${sectionId || ''}||${roleName}`;
        setLocalPerms(prev => ({ ...prev, [key]: { ...(prev[key] || { can_create: false, can_view: false, can_edit: false, can_delete: false }), [field]: !(prev[key] && prev[key][field]) } }));
    };

    const handleSave = async () => {
        if (!selectedActivity) return;
        setLoading(true);
        setError(null);
        try {
            const pageKey = pageKeyForActivity(selectedActivity.id);
            const toSave: any[] = [];
            for (const page of selectedActivity.formDefinition?.pages || []) {
                for (const section of page.sections || []) {
                    for (const role of roles) {
                        const key = `${pageKey}||${section.id || ''}||${role.name}`;
                        const vals = localPerms[key] || { can_create: false, can_view: false, can_edit: false, can_delete: false };
                        toSave.push({ page_key: pageKey, section_key: section.id || null, role_name: role.name, can_create: !!vals.can_create, can_view: !!vals.can_view, can_edit: !!vals.can_edit, can_delete: !!vals.can_delete });
                    }
                }
            }
            const res = await fetch('/api/admin/page_permissions', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permissions: toSave }) });
            if (!res.ok) throw new Error(await res.text());
            const updated = await res.json();
            setPagePermissions(Array.isArray(updated) ? updated : toSave);
            alert('Permissions saved');
        } catch (e: any) {
            setError(String(e?.message || e));
        }
        setLoading(false);
    };

    if (loading) return <div className="p-4">Loading...</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;

    return (
        <div className="p-4">
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Page & Section Role Permissions</h2>
                    <div className="flex items-center space-x-2">
                        <label className="text-sm">Activity</label>
                        <select value={selectedActivityId || ''} onChange={e => setSelectedActivityId(e.target.value)} className="border rounded px-2 py-1">
                            {activities.map(a => <option key={a.id} value={a.id}>{a.title || a.name || `Activity ${a.id}`}</option>)}
                        </select>
                    </div>
                </div>

                {!selectedActivity && <div>No activity selected</div>}

                {selectedActivity && (
                    <div className="space-y-4">
                        {(selectedActivity.formDefinition?.pages || []).map((page: any) => (
                            <div key={page.id} className="border rounded">
                                <div className="bg-gray-100 px-4 py-2 font-semibold">Page: {page.name}</div>
                                <div className="p-4 space-y-3">
                                    {(page.sections || []).map((section: any) => (
                                        <div key={section.id} className="border rounded">
                                            <div className="px-3 py-2 bg-white font-medium">Section: {section.name}</div>
                                            <div className="p-3 overflow-auto">
                                                <table className="w-full table-fixed text-sm">
                                                    <thead>
                                                        <tr>
                                                            <th className="w-2/5 text-left">Role</th>
                                                            <th className="w-1/6">Create</th>
                                                            <th className="w-1/6">View</th>
                                                            <th className="w-1/6">Edit</th>
                                                            <th className="w-1/6">Delete</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {roles.map(r => {
                                                            const key = `${pageKeyForActivity(selectedActivity.id)}||${section.id || ''}||${r.name}`;
                                                            const vals = localPerms[key] || { can_create: false, can_view: false, can_edit: false, can_delete: false };
                                                            return (
                                                                <tr key={r.name} className="border-t">
                                                                    <td className="py-2">{r.name}</td>
                                                                    <td className="text-center"><input type="checkbox" checked={!!vals.can_create} onChange={() => handleToggle(selectedActivity.id, page.id, page.name, section.id, r.name, 'can_create')} /></td>
                                                                    <td className="text-center"><input type="checkbox" checked={!!vals.can_view} onChange={() => handleToggle(selectedActivity.id, page.id, page.name, section.id, r.name, 'can_view')} /></td>
                                                                    <td className="text-center"><input type="checkbox" checked={!!vals.can_edit} onChange={() => handleToggle(selectedActivity.id, page.id, page.name, section.id, r.name, 'can_edit')} /></td>
                                                                    <td className="text-center"><input type="checkbox" checked={!!vals.can_delete} onChange={() => handleToggle(selectedActivity.id, page.id, page.name, section.id, r.name, 'can_delete')} /></td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-4 flex justify-end">
                    <Button onClick={handleSave}>Save changes</Button>
                </div>
            </Card>
        </div>
    );
};

export default RolesPermissionsPage;
