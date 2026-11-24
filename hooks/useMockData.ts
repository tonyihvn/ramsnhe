
import React, { createContext, useContext, useState, useEffect, createElement, ReactNode, FC } from 'react';
import { addAuditEvent, flushAudit } from './useAudit';
import { error as swalError, toast as swalToast } from '../components/ui/swal';
import Swal from 'sweetalert2';
import { Program, Activity, Facility, User, ActivityReport, FormDefinition } from '../types';

// ==================== ROLE UTILITIES ====================
// Consistent role checking functions for frontend
function isAdminRole(role?: string | null) {
    if (!role) return false;
    const normalized = String(role).toLowerCase().trim();
    return normalized === 'admin' || normalized === 'super-admin' || normalized === 'super_admin' || normalized === 'super admin';
}
// ==================== END ROLE UTILITIES ====================

// Context Definition
interface DataContextType {
    currentUser: User | null;
    login: (email: string, password: string) => Promise<any>;
    logout: () => void;

    programs: Program[];
    activities: Activity[];
    facilities: Facility[];
    users: User[];
    reports: ActivityReport[];

    isDataLoading: boolean;
    loadingProgress: number; // 0-100

    getProgram: (id: string) => Program | undefined;
    saveProgram: (program: Program) => void;
    deleteProgram: (id: string) => void;

    getActivity: (id: string) => Activity | undefined;
    getActivitiesByProgram: (programId: string) => Activity[];
    saveActivity: (activity: Activity) => void;
    deleteActivity: (id: string) => void;

    getFacility: (id: string) => Facility | undefined;
    saveFacility: (facility: Facility) => void;
    deleteFacility: (id: string) => void;

    getUser: (id: string) => User | undefined;
    saveUser: (user: User) => void;
    deleteUser: (id: string) => void;

    saveFormDefinition: (activityId: string, formDef: FormDefinition) => void;
    getFormDefinition: (activityId: string) => FormDefinition | undefined;

    saveReport: (report: ActivityReport) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Prefer environment-configured API base (Vite `VITE_API_URL`) to avoid hardcoding
// `localhost:3000` which can cause CORS when the frontend is served from another host.
// Fall back to relative paths so Vite's dev-server proxy (or same-origin production setup)
// can route requests to the backend without CORS issues.
const API_URL = ((import.meta as any)?.env?.VITE_API_URL) || '/api';
const AUTH_URL = ((import.meta as any)?.env?.VITE_AUTH_URL) || '/auth';

// No mock data: app must use backend Postgres for all data

export const DataProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const raw = localStorage.getItem('intelliform_current_user');
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    });
    const [programs, setPrograms] = useState<Program[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [reports, setReports] = useState<ActivityReport[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(currentUser ? true : false);
    const [loadingProgress, setLoadingProgress] = useState(currentUser ? 0 : 100);

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Attempt to fetch User
                async function safeJson(res: Response) {
                    try {
                        // Read text first to avoid json() throwing on empty body
                        const txt = await res.text();
                        if (!txt) return null;
                        return JSON.parse(txt);
                    } catch (e) {
                        console.warn('Failed to parse JSON response', e);
                        return null;
                    }
                }

                const userRes = await fetch(`${API_URL}/current_user`, { credentials: 'include' });
                if (userRes.ok) {
                    const user = await safeJson(userRes);
                    if (user) {
                        setCurrentUser(user);
                        try { localStorage.setItem('intelliform_current_user', JSON.stringify(user)); } catch (e) { }
                    }
                }

            } catch (error) {
                console.error("Backend unreachable. All data must come from PostgreSQL.", error);
                // Clear state to avoid displaying stale mock data
                setPrograms([]);
                setActivities([]);
                setFacilities([]);
                setUsers([]);
                setReports([]);
                setCurrentUser(null);
                try { swalError('Backend unreachable', 'Please ensure the server is running and .env is configured.'); } catch (e) { }
            }
        };
        fetchData();
    }, []);

    // Fetch business-scoped data when currentUser changes
    useEffect(() => {
        const fetchBusinessData = async () => {
            if (!currentUser) {
                setPrograms([]);
                setActivities([]);
                setFacilities([]);
                setUsers([]);
                setReports([]);
                setIsDataLoading(false);
                return;
            }

            setIsDataLoading(true);
            setLoadingProgress(10);

        // Async handler to ensure minimum loading time for visibility on all connections
        const executeWithMinimumTime = async () => {
            const startTime = Date.now();
            
            try {
                async function safeJson(res: Response) {
                    try {
                        const txt = await res.text();
                        if (!txt) return null;
                        return JSON.parse(txt);
                    } catch (e) {
                        console.warn('Failed to parse JSON response', e);
                        return null;
                    }
                }

                // Add cache-busting parameter to force fresh data from server
                const cacheBust = `?t=${Date.now()}`;

                // Parallelize all data fetches for faster loading
                const [progRes, actRes, facRes, usersRes, reportsRes] = await Promise.all([
                    fetch(`${API_URL}/programs${cacheBust}`, { credentials: 'include' }),
                    fetch(`${API_URL}/activities${cacheBust}`, { credentials: 'include' }),
                    fetch(`${API_URL}/facilities${cacheBust}`, { credentials: 'include' }),
                    fetch(`${API_URL}/users${cacheBust}`, { credentials: 'include' }),
                    fetch(`${API_URL}/reports${cacheBust}`, { credentials: 'include' })
                ]);

                setLoadingProgress(30);

                // Process responses in parallel
                const [progData, actData, facData, usersData, reportsData] = await Promise.all([
                    progRes.ok ? safeJson(progRes) : null,
                    actRes.ok ? safeJson(actRes) : null,
                    facRes.ok ? safeJson(facRes) : null,
                    usersRes.ok ? safeJson(usersRes) : null,
                    reportsRes.ok ? safeJson(reportsRes) : null
                ]);

                setLoadingProgress(60);

                // Update state with loaded data
                if (progData) setPrograms(progData);
                else setPrograms([]);

                setLoadingProgress(70);

                if (actData) setActivities(actData);
                else setActivities([]);

                setLoadingProgress(80);

                if (facData) setFacilities(facData);
                else setFacilities([]);

                setLoadingProgress(90);

                if (usersData) setUsers(usersData);
                else setUsers([]);

                if (reportsData) setReports(reportsData);
                else setReports([]);

                setLoadingProgress(100);
                
                // Ensure loading overlay is visible for at least 1 second even on fast connections
                const elapsed = Date.now() - startTime;
                if (elapsed < 1000) {
                    await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
                }
                
                setIsDataLoading(false);

            } catch (error) {
                console.error("Failed to fetch business-scoped data.", error);
                // Clear state on error to avoid stale data
                setPrograms([]);
                setActivities([]);
                setFacilities([]);
                setUsers([]);
                setReports([]);
                setIsDataLoading(false);
            }
        };
        
        executeWithMinimumTime();
        };
        fetchBusinessData();
    }, [currentUser?.id]);

    const login = async (email: string, password: string) => {
        try {
            const res = await fetch(`${AUTH_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });
            if (res.ok) {
                const user = await res.json();
                
                // Check if user is Super Admin or Admin (exempt from email verification and approval checks)
                // Use centralized role checking function for consistency
                const isAdminOrSuperAdmin = isAdminRole(user.role);
                
                // Check email verification status (must be explicitly true, not just undefined)
                // Only enforce if email_verified field exists (new registrations should have it)
                // Exempt Admin and Super-Admin users
                if (!isAdminOrSuperAdmin && 'email_verified' in user && user.email_verified === false) {
                    console.warn('Login blocked: email not verified', user.email);
                    try { swalError('Email Not Verified', 'Please verify your email address before logging in. Check your email for the verification link.'); } catch (e) { }
                    return null;
                }
                
                // Check admin approval status - must be approved or not set (for legacy accounts)
                // Exempt Admin and Super-Admin users
                if (!isAdminOrSuperAdmin && 'approval_status' in user && (user.approval_status === 'pending' || user.approval_status === 'rejected')) {
                    const message = user.approval_status === 'rejected' 
                        ? 'Your account has been rejected. Please contact the administrator.'
                        : 'Your account is pending admin approval. You will be able to log in once approved.';
                    console.warn('Login blocked: approval status', user.approval_status, user.email);
                    try { swalError('Account Pending Approval', message); } catch (e) { }
                    return null;
                }
                
                setCurrentUser(user);
                try { localStorage.setItem('intelliform_current_user', JSON.stringify(user)); } catch (e) { }
                // record login event locally and try to flush
                try { addAuditEvent({ type: 'login', userId: user.id, email: user.email, method: 'password' }); await flushAudit(user.id); } catch (e) { /* ignore */ }
                return user;
            } else if (res.status === 200) {
                // Special case: 200 response but with error field (validation errors from backend)
                const userData = await res.json();
                
                if (userData.error) {
                    if (userData.error === 'email_not_verified') {
                        // Show custom dialog with resend button for email verification errors
                        try {
                            const userEmail = userData.email || email;
                            Swal.fire({
                                icon: 'warning',
                                title: 'Email Not Verified',
                                html: `<div style="text-align: left; line-height: 1.6;">
                                    <p>${userData.message || 'Please verify your email address before logging in.'}</p>
                                    <p style="margin-top: 1rem; color: #666; font-size: 0.9rem;">We've sent a verification link to: <strong>${userEmail}</strong></p>
                                    <p style="margin-top: 0.5rem; color: #666; font-size: 0.9rem;">Check your email (and spam folder) for the verification link.</p>
                                </div>`,
                                showDenyButton: true,
                                confirmButtonText: 'Resend Verification Email',
                                denyButtonText: 'Back to Login',
                                confirmButtonColor: '#3498db',
                                denyButtonColor: '#6c757d'
                            }).then(async (result) => {
                                if (result.isConfirmed) {
                                    // Handle resend verification email
                                    try {
                                        const resendResponse = await fetch('/auth/resend-verification-email', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ email: userEmail })
                                        });
                                        if (resendResponse.ok) {
                                            Swal.fire({
                                                icon: 'success',
                                                title: 'Email Resent',
                                                text: `Verification email has been sent to ${userEmail}. Please check your inbox and spam folder.`,
                                                timer: 3000,
                                                showConfirmButton: false
                                            });
                                        } else {
                                            const errorText = await resendResponse.text();
                                            Swal.fire({
                                                icon: 'error',
                                                title: 'Resend Failed',
                                                text: errorText || 'Failed to resend verification email. Please try again.'
                                            });
                                        }
                                    } catch (resendError) {
                                        Swal.fire({
                                            icon: 'error',
                                            title: 'Resend Failed',
                                            text: 'Error resending verification email: ' + String(resendError)
                                        });
                                    }
                                }
                            });
                        } catch (e) {
                            swalError('Email Not Verified', userData.message || 'Please verify your email address before logging in. Check your email for the verification link.');
                        }
                    } else if (userData.error === 'account_pending_approval') {
                        try { swalError('Account Pending Approval', userData.message || 'Your account is pending admin approval. You will be able to log in once approved.'); } catch (e) { }
                    } else if (userData.error === 'account_rejected') {
                        try { swalError('Account Rejected', userData.message || 'Your account registration was rejected. Please contact the administrator.'); } catch (e) { }
                    } else {
                        try { swalError('Login Failed', userData.message || 'Invalid credentials'); } catch (e) { }
                    }
                }
                return null;
            } else {
                let errorMessage = 'Invalid credentials';
                const txt = await res.text();
                
                // Try to parse JSON error response for specific status messages
                try {
                    const errorJson = JSON.parse(txt);
                    
                    // Check for specific error codes/messages
                    if (errorJson.error || errorJson.message) {
                        const err = errorJson.error || errorJson.message;
                        
                        // Email not verified
                        if (err.toLowerCase().includes('email') && err.toLowerCase().includes('not verified')) {
                            try { swalError('Email Not Verified', 'Please verify your email address before logging in. Check your email for the verification link.'); } catch (e) { }
                            return null;
                        }
                        
                        // Email not confirmed
                        if (err.toLowerCase().includes('email') && (err.toLowerCase().includes('confirm') || err.toLowerCase().includes('unconfirmed'))) {
                            try { swalError('Email Not Verified', 'Please verify your email address before logging in. Check your email for the verification link.'); } catch (e) { }
                            return null;
                        }
                        
                        // Account pending approval
                        if (err.toLowerCase().includes('approval') || err.toLowerCase().includes('pending')) {
                            try { swalError('Account Pending Approval', 'Your account is pending admin approval. You will be able to log in once approved.'); } catch (e) { }
                            return null;
                        }
                        
                        // Account rejected
                        if (err.toLowerCase().includes('reject')) {
                            try { swalError('Account Rejected', 'Your account registration was rejected. Please contact the administrator.'); } catch (e) { }
                            return null;
                        }
                        
                        // Use the error message directly if it's not a generic "Invalid credentials"
                        if (err && err !== 'Invalid credentials') {
                            errorMessage = err;
                        }
                    }
                } catch (parseErr) {
                    // Not JSON, use the text as is
                    if (txt && txt !== 'Invalid credentials') {
                        errorMessage = txt;
                    }
                }
                
                try { swalError('Login failed', errorMessage); } catch (e) { }
            }
        } catch (e) {
            console.error(e);
            try { swalError('Login failed', 'Backend unreachable'); } catch (er) { }
        }
    };

    const logout = async () => {
        await fetch(`${API_URL}/logout`, { credentials: 'include' });
        setCurrentUser(null);
        setPrograms([]);
        setActivities([]);
        setFacilities([]);
        setUsers([]);
        setReports([]);
        setIsDataLoading(false);
        setLoadingProgress(100);
        try { localStorage.removeItem('intelliform_current_user'); } catch (e) { }
    };

    // Generic CRUD Helpers
    const handleSave = async (url: string, data: any, setter: React.Dispatch<React.SetStateAction<any[]>>, idField = 'id') => {
        try {
            // Automatically include business_id from currentUser if not already present
            const dataToSave = {
                ...data,
                business_id: data.business_id || currentUser?.business_id
            };
            
            const res = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave)
            });
            if (res.ok) {
                const saved = await res.json();
                setter(prev => {
                    const exists = prev.some(p => p[idField] === saved[idField]);
                    if (exists) return prev.map(p => p[idField] === saved[idField] ? saved : p);
                    return [...prev, saved];
                });
                try {
                    addAuditEvent({ type: 'crud', action: 'save', resource: url, id: saved[idField], userId: currentUser?.id || null });
                    // best-effort flush
                    await flushAudit(currentUser?.id);
                } catch (e) { /* ignore */ }
            } else {
                console.error('Save failed', await res.text());
            }
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (url: string, id: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
        try {
            await fetch(`${url}/${id}`, { method: 'DELETE', credentials: 'include' });
            setter(prev => prev.filter(p => String(p.id) !== String(id)));
            try { addAuditEvent({ type: 'crud', action: 'delete', resource: url, id, userId: currentUser?.id || null }); await flushAudit(currentUser?.id); } catch (e) { }
        } catch (e) { console.error(e); }
    };

    // Program CRUD
    const getProgram = (id: string) => programs.find(p => String(p.id) === String(id));
    const saveProgram = (program: Program) => handleSave(`${API_URL}/programs`, program, setPrograms);
    const deleteProgram = (id: string) => handleDelete(`${API_URL}/programs`, id, setPrograms);

    // Activity CRUD
    const getActivity = (id: string) => activities.find(a => String(a.id) === String(id));
    const getActivitiesByProgram = (programId: string) => activities.filter(a => String(a.programId) === String(programId));
    const saveActivity = (activity: Activity) => handleSave(`${API_URL}/activities`, activity, setActivities);
    const deleteActivity = (id: string) => handleDelete(`${API_URL}/activities`, id, setActivities);

    // Facility CRUD
    const getFacility = (id: string) => facilities.find(f => String(f.id) === String(id));
    const saveFacility = (facility: Facility) => handleSave(`${API_URL}/facilities`, facility, setFacilities);
    const deleteFacility = (id: string) => handleDelete(`${API_URL}/facilities`, id, setFacilities);

    // User CRUD
    const getUser = (id: string) => users.find(u => String(u.id) === String(id));
    const saveUser = (user: User) => {
        // Call backend to create/update user
        (async () => {
            try {
                // Automatically include business_id from currentUser if not already present
                const userToSave = {
                    ...user,
                    business_id: user.business_id || currentUser?.business_id
                };
                
                const res = await fetch(`${API_URL}/users`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userToSave)
                });
                if (res.ok) {
                    const saved = await res.json();
                    setUsers(prev => {
                        const exists = prev.some(u => String(u.id) === String(saved.id));
                        if (exists) return prev.map(p => String(p.id) === String(saved.id) ? saved : p);
                        return [saved, ...prev];
                    });
                } else {
                    console.error('Failed to save user', await res.text());
                    try { swalError('Save failed', 'Failed to save user'); } catch (er) { }
                }
            } catch (e) { console.error(e); try { swalError('Save failed', 'Failed to save user'); } catch (er) { } }
        })();
    };
    const deleteUser = (id: string) => handleDelete(`${API_URL}/users`, id, setUsers);

    // Form Def
    const saveFormDefinition = async (activityId: string, formDef: FormDefinition) => {
        try {
                // Flatten questions and also send the full form definition so section-level
                // settings (e.g., isRepeatable and groupName) are persisted to the activity.
                const questionsArray: any[] = [];
                for (const p of formDef.pages || []) {
                    for (const s of p.sections || []) {
                        for (const q of s.questions || []) {
                            // include section-level repeat group info on each question so the server
                            // can persist question_group consistently
                            questionsArray.push({ ...q, pageName: p.name, sectionName: s.name, questionGroup: q.questionGroup || s.groupName || null });
                        }
                    }
                }
                await fetch(`${API_URL}/activities/${activityId}/form`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ questions: questionsArray, formDefinition: formDef })
                });
            // Refresh activities list with business_id filter
            const businessIdParam = currentUser?.business_id ? `?business_id=${encodeURIComponent(currentUser.business_id)}` : '';
            const actRes = await fetch(`${API_URL}/activities${businessIdParam}`, { credentials: 'include' });
            if (actRes.ok) setActivities(await actRes.json());
        } catch (e) { console.error(e); }
    };

    const getFormDefinition = (activityId: string) => {
        return activities.find(a => String(a.id) === String(activityId))?.formDefinition;
    };

    // Report CRUD
    const saveReport = async (report: ActivityReport) => {
        try {
            // Automatically include business_id from currentUser if not already present
            const reportToSave = {
                ...report,
                business_id: report.business_id || currentUser?.business_id
            };

            // If report exists locally (was loaded from server), use PUT to update
            const existsOnClient = reports.some(r => String(r.id) === String(report.id));
            if (report.id && existsOnClient) {
                const res = await fetch(`${API_URL}/reports/${report.id}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reportToSave)
                });
                if (res.ok) {
                    const saved = await res.json();
                    setReports(prev => prev.map(p => String(p.id) === String(saved.id) ? saved : p));
                    try { addAuditEvent({ type: 'crud', action: 'update', resource: `${API_URL}/reports`, id: saved.id, userId: currentUser?.id || null }); await flushAudit(currentUser?.id); } catch (e) { /* ignore */ }
                    return;
                } else {
                    console.error('Failed to update report', await res.text());
                    return;
                }
            }
            // Otherwise POST to create
            await handleSave(`${API_URL}/reports`, reportToSave, setReports);
        } catch (e) { console.error('saveReport error', e); }
    };

    const value = {
        currentUser, login, logout,
        programs, activities, facilities, users, reports,
        isDataLoading, loadingProgress,
        getProgram, saveProgram, deleteProgram,
        getActivity, getActivitiesByProgram, saveActivity, deleteActivity,
        getFacility, saveFacility, deleteFacility,
        getUser, saveUser, deleteUser,
        saveFormDefinition, getFormDefinition,
        saveReport
    };

    return createElement(DataContext.Provider, { value: value }, children);
};

export const useMockData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useMockData must be used within a DataProvider');
    }
    return context;
};
