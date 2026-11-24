import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';

const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const token = searchParams.get('token');
        if (!token) {
          setStatus('error');
          setMessage('No verification token provided. Please check the link in your email.');
          return;
        }

        const response = await fetch('/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token })
        });

        if (response.ok) {
          const data = await response.json();
          setStatus('success');
          setMessage(data.message || 'Your email has been verified successfully! You can now log in.');
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          const errorData = await response.text();
          setStatus('error');
          setMessage(errorData || 'Email verification failed. Please try again or contact support.');
        }
      } catch (e) {
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
        console.error('Email verification error:', e);
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying Email</h1>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <ExclamationCircleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => navigate('/login')}>Back to Login</Button>
              <Button className="flex-1" variant="secondary" onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailVerificationPage;
