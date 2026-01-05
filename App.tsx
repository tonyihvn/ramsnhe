import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { MetadataProvider } from './contexts/MetadataContext';
import MapDashboard from './pages/MapDashboard';
import DashboardPage from './pages/DashboardPage';
import ActivitiesPage from './pages/ActivitiesPage';
import BuildFormPage from './pages/BuildFormPage';
import FillFormPage from './pages/FillFormPage';
import ActivityDashboardPage from './pages/ActivityDashboardPage';
import ActivitySubmittedAnswersPage from './pages/ActivitySubmittedAnswersPage';
import ActivityExcelTablesPage from './pages/ActivityExcelTablesPage';
import QuestionFollowupPage from './pages/QuestionFollowupPage';
import FacilityDashboardPage from './pages/FacilityDashboardPage';
import UserDashboardPage from './pages/UserDashboardPage';
import ReportsPage from './pages/ReportsPage';
import ReportViewPage from './pages/ReportViewPage';
import ReportBuilderPage from './pages/ReportBuilderPage';
import UsersPage from './pages/UsersPage';
import FacilitiesPage from './pages/FacilitiesPage';
import ProgramsPage from './pages/ProgramsPage';
import IndicatorsPage from './pages/IndicatorsPage';
import RolePermissionsPage from './pages/RolePermissionsPage';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import CustomPage from './pages/CustomPage';
import SettingsPage from './pages/SettingsPage';
import RequestPasswordPage from './pages/RequestPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import DocsPage from './pages/DocsPage';
import ApiConnectorsPage from './pages/ApiConnectorsPage';
import DatasetsPage from './pages/DatasetsPage';
import DatasetContentPage from './pages/DatasetContentPage';
import SuperAdminConsole from './pages/SuperAdminConsole';
import SuperAdminUserManagement from './pages/SuperAdminUserManagement';
import SuperAdminLandingPageConfig from './pages/SuperAdminLandingPageConfig';
import SuperAdminBusinesses from './pages/SuperAdminBusinesses';
import SuperAdminFeedback from './pages/SuperAdminFeedback';
import PaymentApprovalPage from './pages/PaymentApprovalPage';
import AccountApprovalPage from './pages/AccountApprovalPage';
import { DataProvider, useMockData } from './hooks/useMockData';
import { ThemeProvider } from './hooks/useTheme';
import ErrorBoundary from './components/ErrorBoundary';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useMockData();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useMockData();
  const isAdmin = currentUser && (
    String(currentUser.role || '').toLowerCase() === 'admin' ||
    String(currentUser.role || '').toLowerCase() === 'super-admin' ||
    String(currentUser.role || '').toLowerCase() === 'super_admin'
  );
  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useMockData();
  const isSuperAdmin = currentUser && (String(currentUser.role || '').toLowerCase() === 'super-admin' || String(currentUser.role || '').toLowerCase() === 'super_admin');
  if (!isSuperAdmin) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/map-dashboard" element={<ProtectedRoute><Layout><MapDashboard /></Layout></ProtectedRoute>} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/request-reset" element={<RequestPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route path="/dashboard" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />

      <Route path="/programs" element={<ProtectedRoute><Layout><ProgramsPage /></Layout></ProtectedRoute>} />

      <Route path="/activities/build/:activityId" element={<ProtectedRoute><Layout><BuildFormPage /></Layout></ProtectedRoute>} />

      <Route path="/activities/fill/:activityId" element={<ProtectedRoute><Layout><FillFormPage /></Layout></ProtectedRoute>} />
      {/* Standalone form (no layout) for sharing/embedded use */}
      <Route path="/standalone/fill/:activityId" element={<FillFormPage standaloneMode={true} />} />

      <Route path="/activities/dashboard/:activityId" element={<ProtectedRoute><Layout><ActivityDashboardPage /></Layout></ProtectedRoute>} />
      <Route path="/facilities/:facilityId/dashboard" element={<ProtectedRoute><Layout><FacilityDashboardPage /></Layout></ProtectedRoute>} />
      <Route path="/users/:userId/dashboard" element={<ProtectedRoute><Layout><UserDashboardPage /></Layout></ProtectedRoute>} />
      <Route path="/activities/:activityId/submitted-answers" element={<ProtectedRoute><Layout><ActivitySubmittedAnswersPage /></Layout></ProtectedRoute>} />
      <Route path="/activities/:activityId/excel-tables" element={<ProtectedRoute><Layout><ActivityExcelTablesPage /></Layout></ProtectedRoute>} />
      <Route path="/activities/:activityId/followups" element={<ProtectedRoute><Layout><QuestionFollowupPage /></Layout></ProtectedRoute>} />

      <Route path="/activities" element={<ProtectedRoute><Layout><ActivitiesPage /></Layout></ProtectedRoute>} />

      <Route path="/reports" element={<ProtectedRoute><Layout><ReportsPage /></Layout></ProtectedRoute>} />
      <Route path="/reports/builder" element={<ProtectedRoute><Layout><ReportBuilderPage /></Layout></ProtectedRoute>} />
      <Route path="/reports/:reportId" element={<ProtectedRoute><Layout><ReportViewPage /></Layout></ProtectedRoute>} />

      <Route path="/settings" element={<AdminRoute><Layout><SettingsPage /></Layout></AdminRoute>} />
      <Route path="/role-permissions" element={<AdminRoute><Layout><RolePermissionsPage /></Layout></AdminRoute>} />
      <Route path="/indicators" element={<ProtectedRoute><Layout><IndicatorsPage /></Layout></ProtectedRoute>} />
      <Route path="/connectors" element={<ProtectedRoute><Layout><ApiConnectorsPage /></Layout></ProtectedRoute>} />
      <Route path="/datasets" element={<ProtectedRoute><Layout><DatasetsPage /></Layout></ProtectedRoute>} />
      <Route path="/datasets/:id" element={<ProtectedRoute><Layout><DatasetContentPage /></Layout></ProtectedRoute>} />
      <Route path="/docs" element={<Layout><DocsPage /></Layout>} />
      <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />

      <Route path="/users" element={<AdminRoute><Layout><UsersPage /></Layout></AdminRoute>} />

      <Route path="/facilities" element={<ProtectedRoute><Layout><FacilitiesPage /></Layout></ProtectedRoute>} />

      {/* Super Admin Routes */}
      <Route path="/super-admin" element={<SuperAdminRoute><SuperAdminConsole /></SuperAdminRoute>} />
      <Route path="/super-admin/users" element={<SuperAdminRoute><SuperAdminUserManagement /></SuperAdminRoute>} />
      <Route path="/super-admin/businesses" element={<SuperAdminRoute><SuperAdminBusinesses /></SuperAdminRoute>} />
      <Route path="/super-admin/landing-page" element={<SuperAdminRoute><SuperAdminLandingPageConfig /></SuperAdminRoute>} />
      <Route path="/super-admin/feedback" element={<SuperAdminRoute><SuperAdminFeedback /></SuperAdminRoute>} />
      <Route path="/super-admin/payment-approvals" element={<SuperAdminRoute><Layout><PaymentApprovalPage /></Layout></SuperAdminRoute>} />
      <Route path="/super-admin/account-approvals" element={<SuperAdminRoute><Layout><AccountApprovalPage /></Layout></SuperAdminRoute>} />

      {/* Dedicated custom page route for guest-accessible pages */}
      <Route path="/page/:slug" element={<CustomPage />} />

      <Route path="/" element={<LandingPage />} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

const App: React.FC = () => {
  // Materialize removed: no longer needed
  useEffect(() => {
    const loadTitle = async () => {
      try {
        const resp = await fetch('/api/landing-page-config');
        if (!resp.ok) return;
        const j = await resp.json();
        const cfg = j.config || j;
        const name = cfg?.appName || cfg?.app_name || (cfg?.logoText) || 'DQAi';
        if (name) document.title = name;
      } catch (e) {
        // ignore
      }
    };
    loadTitle();
  }, []);

  return (
    <DataProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <MetadataProvider>
            <HashRouter>
              <AppRoutes />
            </HashRouter>
          </MetadataProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </DataProvider>
  );
};

export default App;