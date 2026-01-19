import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const EmailVerificationPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [accountId, setAccountId] = useState<string | null>(null);

    useEffect(() => {
        const accountId = searchParams.get('accountId');
        if (accountId) {
            setAccountId(accountId);
            setMessage('Email verification successful! Your account request is now pending review by our team.');
            setLoading(false);
            
            // Auto-redirect to login after 5 seconds
            const timer = setTimeout(() => {
                navigate('/login');
            }, 5000);
            
            return () => clearTimeout(timer);
        }
    }, [searchParams, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <Card className="w-full max-w-md text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Verifying your email...</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card className="w-full max-w-md">
                <div className="text-center">
                    <div className="mb-4">
                        {error ? (
                            <div className="text-red-600 text-5xl mb-4">✗</div>
                        ) : (
                            <div className="text-green-600 text-5xl mb-4">✓</div>
                        )}
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        {error ? 'Verification Failed' : 'Email Verified!'}
                    </h1>

                    {error ? (
                        <div className="mb-6">
                            <p className="text-gray-600 mb-4">{error}</p>
                        </div>
                    ) : (
                        <div className="mb-6">
                            <p className="text-gray-600 mb-4">{message}</p>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <p className="text-sm text-gray-700">
                                    A verification email has been sent to our admin team. You will receive a notification email once your account has been reviewed and approved.
                                </p>
                            </div>
                            <p className="text-sm text-gray-500">
                                Redirecting to login in a few seconds...
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3 justify-center">
                        <Button variant="secondary" onClick={() => navigate('/login')}>
                            Back to Login
                        </Button>
                        <Button onClick={() => navigate('/')}>
                            Go Home
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default EmailVerificationPage;
