import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useMockData } from '../hooks/useMockData';

const ProfilePage: React.FC = () => {
    const { currentUser, saveUser } = useMockData();
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });

    useEffect(() => {
        if (currentUser) setForm({ firstName: currentUser.firstName || '', lastName: currentUser.lastName || '', email: currentUser.email || '', password: '' });
    }, [currentUser]);

    const handleSave = () => {
        if (!currentUser) return alert('No current user');
        const payload: any = { id: currentUser.id, firstName: form.firstName, lastName: form.lastName, email: form.email };
        if (form.password && form.password.length > 0) payload.password = form.password;
        saveUser(payload);
        alert('Profile updated');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">My Profile & Account</h1>
            </div>

            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">First Name</label>
                        <input className="mt-1 block w-full p-2 border rounded" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Last Name</label>
                        <input className="mt-1 block w-full p-2 border rounded" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input className="mt-1 block w-full p-2 border rounded" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">New Password</label>
                        <input type="password" className="mt-1 block w-full p-2 border rounded" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                    </div>
                </div>

                <div className="mt-4 flex space-x-3">
                    <Button onClick={handleSave}>Save Profile</Button>
                </div>
            </Card>
        </div>
    );
};

export default ProfilePage;
