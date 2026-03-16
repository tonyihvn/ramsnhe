import React, { useState, useRef, useEffect } from 'react';
import { useMockData } from '../hooks/useMockData';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface Business {
  id: string;
  name: string;
}

const BusinessSwitcher: React.FC = () => {
  const { currentUser } = useMockData();
  const [open, setOpen] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Only show for super-admin
  const isSuperAdmin = currentUser && (String(currentUser.role || '').toLowerCase() === 'super-admin' || String(currentUser.role || '').toLowerCase() === 'super_admin');
  if (!isSuperAdmin || !currentUser?.canSwitchBusiness) {
    return null;
  }

  // Fetch available businesses
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const res = await fetch('/api/super-admin/businesses', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const businesses = data.businesses || [];
          setBusinesses(businesses);
          // Set current business
          const current = businesses.find((b: Business) => b.id === currentUser.business_id);
          setCurrentBusiness(current || businesses[0] || null);
        }
      } catch (err) {
        console.error('Failed to fetch businesses', err);
      }
    };
    fetchBusinesses();
  }, [currentUser.business_id]);

  // Close on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handle);
    return () => document.removeEventListener('click', handle);
  }, []);

  const handleSwitchBusiness = async (businessId: string) => {
    try {
      // Save the selected business to localStorage for persistence
      localStorage.setItem('lastSelectedBusiness', businessId);
      
      const res = await fetch(`/api/super-admin/set-business-context/${businessId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        // Reload page to refresh data with new business context
        window.location.href = '#/dashboard';
      } else {
        const err = await res.json();
        alert(`Failed to switch business: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to switch business', err);
      alert('Failed to switch business');
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition"
      >
        <span className="truncate max-w-xs">{currentBusiness?.name || 'Select Business'}</span>
        <ChevronDownIcon className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          {businesses.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No businesses available</div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {businesses.map((business) => (
                <button
                  key={business.id}
                  onClick={() => handleSwitchBusiness(business.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition ${
                    currentBusiness?.id === business.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700'
                  }`}
                >
                  {business.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BusinessSwitcher;
