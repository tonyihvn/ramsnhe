import React, { useState, useEffect } from 'react';
import { useMockData } from '../hooks/useMockData';
import { useMetadata } from '../contexts/MetadataContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/ui/Button';
import MInput from '../components/ui/MInput';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../hooks/useTheme';
import Modal from '../components/ui/Modal';

const Typewriter: React.FC<{ text?: string }> = ({ text }) => {
  const [pos, setPos] = useState(0);
  useEffect(() => {
    setPos(0);
    if (!text) return;
    const id = setInterval(() => {
      setPos(p => {
        if (p >= (text || '').length) { clearInterval(id); return p; }
        return p + 1;
      });
    }, 60);
    return () => clearInterval(id);
  }, [text]);
  return <div className="text-center text-lg font-semibold" aria-hidden>{text ? text.slice(0, pos) : ''}</div>;
};

const LoginPage: React.FC = () => {
  const { login } = useMockData();
  const { meta } = useMetadata();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { settings } = useTheme();
  const [regOpen, setRegOpen] = useState(false);
  const [regFirst, setRegFirst] = useState('');
  const [regLast, setRegLast] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regOrg, setRegOrg] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [allowNewRegistrations, setAllowNewRegistrations] = useState(true);
  const [lockedOrgId, setLockedOrgId] = useState<number | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [regMessage, setRegMessage] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [landingConfig, setLandingConfig] = useState<any>(null);
  const [regFacility, setRegFacility] = useState<string>('');
  const [facilities, setFacilities] = useState<any[]>([]);
  const [resendLoading, setResendLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const user = await login(email, password);
    // perform role-based redirect using metadata
    if (user) {
      try {
        // Check if there's a returnTo location in the state
        const returnTo = (location.state as any)?.from;
        if (returnTo) {
          navigate(returnTo);
          return;
        }

        // For super admin, try to restore the last selected business
        const isSuperAdmin = user.role === 'super-admin' || user.role === 'super_admin';
        if (isSuperAdmin) {
          const lastBusiness = localStorage.getItem('lastSelectedBusiness');
          if (lastBusiness) {
            try {
              // Set the business context to the previously selected one
              const contextRes = await fetch(`/api/super-admin/set-business-context/${lastBusiness}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
              });
              if (contextRes.ok) {
                navigate('/dashboard');
                return;
              }
            } catch (e) {
              console.warn('Failed to restore last business context', e);
            }
          }
        }

        const roleMeta = meta.roles?.find((r: any) => r.id === user.role) || meta.roles?.find((r: any) => String(r.name).toLowerCase() === String(user.role).toLowerCase());
        const route = roleMeta?.defaultRoute || '/dashboard';
        navigate(route);
      } catch (e) {
        navigate('/dashboard');
      }
    }
  };

  const doRegister = async () => {
    setRegLoading(true);
    setRegError(null);
    setRegMessage(null);

    // Validate facility selection
    if (!regFacility) {
      setRegError('Please select a facility');
      setRegLoading(false);
      return;
    }

    try {
      const r = await fetch('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName: regFirst, lastName: regLast, email: regEmail, password: regPassword, organizationName: regOrg || undefined, phoneNumber: regPhone || undefined, facilityId: regFacility }) });
      if (!r.ok) {
        let txt = '';
        try { txt = await r.text(); } catch (e) { txt = String(e); }
        // try parse json
        try {
          const j = JSON.parse(txt);
          txt = j.error || j.message || JSON.stringify(j);
        } catch (e) { /* not json */ }
        setRegError(txt || 'Registration failed');
        setRegLoading(false);
        return;
      }
      const j = await r.json();
      setRegMessage(j.message || 'Registration successful!');
      // Keep registration data visible so resend works if needed
      // Clear the form fields for next registration only after close
      setTimeout(() => {
        setRegFirst('');
        setRegLast('');
        setRegEmail('');
        setRegPassword('');
        setRegOrg('');
        setRegPhone('');
        setRegFacility('');
      }, 5000);
    } catch (e) {
      setRegError(String(e));
    }
    setRegLoading(false);
  };

  const resendVerificationEmail = async () => {
    if (!regEmail) {
      setRegError('Email address not found');
      return;
    }
    
    setResendLoading(true);
    try {
      const response = await fetch('/auth/resend-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail })
      });
      
      if (response.ok) {
        setRegMessage('Verification email resent! Please check your inbox and spam folder.');
      } else {
        const errorText = await response.text();
        setRegError(errorText || 'Failed to resend verification email. Please try again.');
      }
    } catch (error) {
      setRegError('Error resending verification email: ' + String(error));
    } finally {
      setResendLoading(false);
    }
  };

  // Fetch landing page config to check if registrations are allowed and get styling
  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/landing-page-config');
        if (response.ok) {
          const data = await response.json();
          const config = data.config || data;
          setLandingConfig(config);
          setAllowNewRegistrations(config.allowNewRegistrations !== false);
          setLockedOrgId(config.lockedOrganizationId || config.locked_organization_id || null);
        }
      } catch (e) {
        // Default to allowing registrations if fetch fails
        setAllowNewRegistrations(true);
      }
    };
    fetchConfig();
  }, []);

  // Fetch facilities when registration modal opens
  React.useEffect(() => {
    const fetchFacilities = async () => {
      try {
        // Fetch facilities for the organization
        // If lockedOrgId is set, fetch facilities for that org; otherwise fetch all
        const url = lockedOrgId ? `/api/facilities?organizationId=${lockedOrgId}` : '/api/facilities';
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setFacilities(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to fetch facilities:', e);
        setFacilities([]);
      }
    };
    
    if (regOpen) {
      fetchFacilities();
    }
  }, [regOpen, lockedOrgId]);

  // Determine background image and app name
  const heroFeaturedImages = landingConfig?.heroFeaturedImages || landingConfig?.hero_featured_images || [];
  const backgroundImage = (heroFeaturedImages && heroFeaturedImages.length > 0) ? heroFeaturedImages[0] : settings?.backgroundImage;
  const appName = landingConfig?.appName || 'DQAi';
  const logoUrl = landingConfig?.logoUrl;
  const navBackgroundColor = landingConfig?.navBackgroundColor || landingConfig?.nav_background_color || '#ffffff';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="max-w-md w-full space-y-8 bg-white bg-opacity-90 p-10 rounded-lg shadow-md" style={{ boxShadow: '0 6px 18px rgba(0,0,0,0.15)', backdropFilter: 'blur(4px)' }}>
        <div>
          <div className="mx-auto h-12 w-12 text-primary-600 flex justify-center">
            {logoUrl ? <img src={logoUrl} alt="logo" className="w-12 h-12 object-contain" /> : (settings?.logoDataUrl ? <img src={settings.logoDataUrl!} alt="logo" className="w-12 h-12 object-contain" /> : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            ))}
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in</h2>
        <div className="mt-2 text-center">
          <div className="text-sm text-gray-600">{settings?.logoText || ''}</div>
          <div className="mt-1"><Typewriter text={appName} /></div>
        </div>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email and password to sign in.
        </p>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <MInput id="email" name="email" type="email" label="Email" value={email} onChange={v => setEmail(v)} placeholder="Email address" class="active" />
            <MInput id="password" name="password" type="password" label="Password" value={password} onChange={v => setPassword(v)} placeholder="Password" class="active" />
          </div>

          <div>
            <Button type="submit" className="w-full justify-center flex items-center">
              <UserCircleIcon className="h-5 w-5 mr-2" />
              Sign In
            </Button>
          </div>
        </form>
        <div className="flex items-center justify-between mt-2">
          {allowNewRegistrations && (
            <button className="text-sm text-primary-600 hover:underline" onClick={() => setRegOpen(true)}>Register</button>
          )}
          <a className="text-sm text-primary-600 hover:underline" href="#/request-reset">Forgot password?</a>
        </div>

        <Modal isOpen={regOpen} onClose={() => { setRegOpen(false); setRegFacility(''); setRegMessage(null); setRegError(null); }} title="Register">
          <div className="space-y-3">
            {!allowNewRegistrations ? (
              <div className="p-3 text-blue-700 bg-blue-100 rounded">
                <p className="font-medium">New organization registration is currently disabled.</p>
                <p className="text-sm mt-1">If you belong to an existing organization, please contact your organization administrator to add you as a user.</p>
              </div>
            ) : (
              <>
                {regMessage ? (
                  <div className="space-y-4">
                    <div className="p-4 text-green-700 bg-green-50 rounded border border-green-200">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-green-900 mb-2">Registration Successful!</h3>
                          <p className="text-sm text-green-800 mb-3">We've sent a verification email to <strong>{regEmail}</strong></p>
                          <div className="bg-white bg-opacity-50 p-3 rounded text-sm text-green-800 space-y-2">
                            <p>✓ Check your email for a verification link</p>
                            <p>✓ Click the link to confirm your email address</p>
                            <p>✓ An admin will review and approve your account</p>
                            <p>✓ You'll be able to log in once everything is verified and approved</p>
                          </div>
                          <p className="text-xs text-green-700 mt-3">Didn't receive the email? Check your spam folder or click the resend button below.</p>
                          <div className="flex gap-2 mt-4">
                            <Button 
                              size="sm"
                              onClick={resendVerificationEmail}
                              disabled={resendLoading}
                              variant="secondary"
                            >
                              {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => { setRegOpen(false); setRegMessage(null); }}
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {regError ? <div className="p-2 text-red-700 bg-red-100 rounded">{regError}</div> : null}
                    <input className="p-2 border rounded w-full" placeholder="First name" value={regFirst} onChange={e => setRegFirst(e.target.value)} disabled={!!regMessage} />
                    <input className="p-2 border rounded w-full" placeholder="Last name" value={regLast} onChange={e => setRegLast(e.target.value)} disabled={!!regMessage} />
                    <input className="p-2 border rounded w-full" placeholder="Email" value={regEmail} onChange={e => setRegEmail(e.target.value)} disabled={!!regMessage} />
                
                {/* Facility Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Facility *</label>
                  <select className="p-2 border rounded w-full" value={regFacility} onChange={e => setRegFacility(e.target.value)} disabled={!!regMessage}>
                    <option value="">-- Choose a facility --</option>
                    {facilities.map(f => (
                      <option key={f.id} value={f.id}>{f.name || f.facility_name || f.id}</option>
                    ))}
                  </select>
                  {facilities.length === 0 && regOpen && (
                    <p className="text-sm text-gray-500 mt-1">Loading facilities...</p>
                  )}
                </div>

                {!lockedOrgId ? (
                  <input className="p-2 border rounded w-full" placeholder="Organization name (optional)" value={regOrg} onChange={e => setRegOrg(e.target.value)} disabled={!!regMessage} />
                ) : null}
                <input className="p-2 border rounded w-full" placeholder="Phone number (optional)" value={regPhone} onChange={e => setRegPhone(e.target.value)} disabled={!!regMessage} />
                <input className="p-2 border rounded w-full" placeholder="Password" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} disabled={!!regMessage} />
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="secondary" onClick={() => setRegOpen(false)}>Cancel</Button>
                      <Button onClick={doRegister} disabled={regLoading}>{regLoading ? 'Registering...' : 'Register'}</Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default LoginPage;