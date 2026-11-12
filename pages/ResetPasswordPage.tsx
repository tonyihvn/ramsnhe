import React, { useEffect, useState } from 'react';
import Button from '../components/ui/Button';
import MInput from '../components/ui/MInput';
import SimpleHeader from '../components/layout/SimpleHeader';
import { useLocation, useNavigate } from 'react-router-dom';

function useQuery() {
    const { search } = useLocation();
    return React.useMemo(() => new URLSearchParams(search), [search]);
}

const ResetPasswordPage: React.FC = () => {
    const query = useQuery();
    const navigate = useNavigate();
    const [token, setToken] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const t = query.get('token');
        if (!t) {
            setError('Invalid password reset link. Please request a new one.');
        } else {
            setToken(t);
        }
    }, [query]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        
        if (!token) {
            setError('Missing reset token. Please request a new password reset.');
            return;
        }
        
        if (!password) {
            setError('Please enter a new password');
            return;
        }
        
        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }
        
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const r = await fetch('/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password })
            });
            
            const j = await r.json();
            
            if (r.ok && j.ok) {
                setMessage(j.message || 'Password updated successfully! Redirecting to login...');
                // Redirect to login after a short delay
                setTimeout(() => {
                    window.location.hash = '#/login';
                }, 2000);
            } else {
                setError(j.error || j.message || 'Failed to reset password. Please try again.');
            }
        } catch (e: any) {
            setError('Failed to reset password: ' + String(e));
        }
        
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <SimpleHeader title="Reset Your Password" />
            <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
                    <div>
                        <h2 className="text-2xl font-bold text-center text-gray-900">Reset Your Password</h2>
                        <p className="mt-2 text-center text-sm text-gray-600">Enter a new password for your account</p>
                    </div>
                    
                    {!message ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <MInput
                                id="newpass"
                                name="newpass"
                                type="password"
                            label="New Password"
                            value={password}
                            onChange={v => setPassword(v)}
                            placeholder="Enter new password (min 6 characters)"
                        />
                        
                        <MInput
                            id="confirm"
                            name="confirm"
                            type="password"
                            label="Confirm Password"
                            value={confirm}
                            onChange={v => setConfirm(v)}
                            placeholder="Confirm your password"
                        />
                        
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}
                        
                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                disabled={loading || !token}
                            >
                                {loading ? 'Saving...' : 'Save New Password'}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => window.location.hash = '#/login'}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-md p-4">
                            <p className="text-sm font-medium text-green-800">{message}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => window.location.hash = '#/login'}
                                className="w-full"
                            >
                                Go to Login
                            </Button>
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
