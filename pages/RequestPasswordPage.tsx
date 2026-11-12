import React, { useState } from 'react';
import Button from '../components/ui/Button';
import MInput from '../components/ui/MInput';
import SimpleHeader from '../components/layout/SimpleHeader';
import { useNavigate } from 'react-router-dom';

const RequestPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        
        if (!email) {
            setError('Please enter your email address');
            return;
        }
        
        if (!email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const r = await fetch('/auth/request-password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            const j = await r.json();
            
            if (r.ok || j.ok) {
                setMessage(j.message || 'If an account exists with this email, you will receive a password reset link shortly.');
                setDone(true);
            } else {
                setError(j.error || 'Failed to request password reset. Please contact support if the problem persists.');
            }
        } catch (e: any) {
            setError('Error: ' + String(e));
        }
        
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <SimpleHeader title="Reset Your Password" />
            <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
                <div>
                    <h2 className="text-2xl font-bold text-center text-gray-900">Forgot Your Password?</h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>
                
                {!done ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <MInput
                                id="email"
                                name="email"
                                type="email"
                                label="Email Address"
                                value={email}
                                onChange={v => setEmail(v)}
                                placeholder="your.email@example.com"
                            />
                        </div>
                        
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}
                        
                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full"
                            >
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </Button>
                        </div>
                        
                        <div className="text-center">
                            <Button
                                variant="secondary"
                                onClick={() => window.location.hash = '#/login'}
                                className="w-full"
                            >
                                Back to Login
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-md p-4">
                            <p className="text-sm font-medium text-green-800">
                                {message}
                            </p>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                            <p className="text-sm text-blue-800">
                                <strong>Tip:</strong> Check your spam/junk folder if you don't see the email in your inbox.
                            </p>
                        </div>
                        
                        <div className="flex gap-2">
                            <Button
                                onClick={() => window.location.hash = '#/login'}
                                className="w-full"
                            >
                                Return to Login
                            </Button>
                        </div>
                        
                        <div className="text-center">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setDone(false);
                                    setEmail('');
                                    setMessage(null);
                                    setError(null);
                                }}
                            >
                                Try Another Email
                            </Button>
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

export default RequestPasswordPage;
