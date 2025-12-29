import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SuperAdminNavProps {
  title: string;
  subtitle?: string;
}

const SuperAdminNav: React.FC<SuperAdminNavProps> = ({ title, subtitle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: '📊', path: '/super-admin' },
    { id: 'businesses', label: 'Businesses', icon: '🏢', path: '/super-admin/businesses' },
    { id: 'users', label: 'User Management', icon: '👥', path: '/super-admin/users' },
    { id: 'landing-page', label: 'Landing Page', icon: '🌐', path: '/super-admin/landing-page' },
    { id: 'feedback', label: 'Feedback', icon: '💬', path: '/super-admin/feedback' },
  ];

  const isActive = (path: string) => {
    // Special handling for root path
    if (path === '/super-admin' && location.pathname === '/super-admin') {
      return true;
    }
    // For other paths, check if location starts with the path
    if (path !== '/super-admin' && location.pathname.startsWith(path)) {
      return true;
    }
    return false;
  };

  return (
    <div>
      {/* Header with Back Button */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">{title}</h1>
            {subtitle && <p className="text-blue-100 mt-2">{subtitle}</p>}
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            ← Back to App
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto" role="tablist">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  isActive(item.path)
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                role="tab"
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminNav;
