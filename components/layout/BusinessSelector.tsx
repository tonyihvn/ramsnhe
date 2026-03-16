import React, { useState, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface Business {
  id: number;
  name: string;
  email?: string;
}

interface BusinessSelectorProps {
  onBusinessChange?: (businessId: number) => void;
}

const BusinessSelector: React.FC<BusinessSelectorProps> = ({ onBusinessChange }) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null);
  const [selectedBusinessName, setSelectedBusinessName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Load businesses and persisted selection on mount
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await fetch('/api/super-admin/businesses');
        if (response.ok) {
          const data = await response.json();
          const businessesList = data.businesses || data;
          setBusinesses(businessesList);

          // Load persisted business selection
          const persistedBusinessId = localStorage.getItem('selectedBusinessId');
          if (persistedBusinessId) {
            const businessId = parseInt(persistedBusinessId);
            const business = businessesList.find((b: Business) => b.id === businessId);
            if (business) {
              setSelectedBusinessId(businessId);
              setSelectedBusinessName(business.name);
            } else {
              // If persisted business no longer exists, select first one
              if (businessesList.length > 0) {
                setSelectedBusinessId(businessesList[0].id);
                setSelectedBusinessName(businessesList[0].name);
                localStorage.setItem('selectedBusinessId', businessesList[0].id.toString());
              }
            }
          } else {
            // No persisted selection, select first business
            if (businessesList.length > 0) {
              setSelectedBusinessId(businessesList[0].id);
              setSelectedBusinessName(businessesList[0].name);
              localStorage.setItem('selectedBusinessId', businessesList[0].id.toString());
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch businesses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, []);

  const handleBusinessChange = async (businessId: number, businessName: string) => {
    setSelectedBusinessId(businessId);
    setSelectedBusinessName(businessName);
    setIsOpen(false);
    localStorage.setItem('selectedBusinessId', businessId.toString());
    
    if (onBusinessChange) {
      onBusinessChange(businessId);
    }

    // Update the business context on the server
    try {
      const response = await fetch(`/api/super-admin/set-business-context/${businessId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        // Reload page to refresh data for new business context
        window.location.reload();
      } else {
        console.error('Failed to set business context');
      }
    } catch (error) {
      console.error('Error setting business context:', error);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (businesses.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <div className="flex flex-col items-start">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Business</span>
            <span className="text-sm font-medium truncate">{selectedBusinessName}</span>
          </div>
          <ChevronDownIcon
            className={`w-4 h-4 text-gray-600 dark:text-gray-300 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50">
            <div className="max-h-48 overflow-y-auto">
              {businesses.map((business) => (
                <button
                  key={business.id}
                  onClick={() => handleBusinessChange(business.id, business.name)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    selectedBusinessId === business.id
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium">{business.name}</div>
                  {business.email && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{business.email}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessSelector;
