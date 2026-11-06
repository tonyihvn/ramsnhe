import { useEffect, useState, useCallback } from 'react';

/**
 * Hook for managing user preferences stored on the PostgreSQL server
 * Replaces localStorage with server-side storage
 * 
 * Usage:
 *   const { preferences, getPreference, setPreference, deletePreference } = useServerPreferences();
 *   
 *   // Get a specific preference
 *   const theme = await getPreference('theme');
 *   
 *   // Set a preference
 *   await setPreference('theme', 'dark');
 *   
 *   // Delete a preference
 *   await deletePreference('theme');
 *   
 *   // Get all preferences at once
 *   const allPrefs = preferences;
 */

const API_BASE = '/api/user-preferences';

interface PreferenceValue {
  [key: string]: any;
}

export interface ServerPreferences {
  [key: string]: any;
}

export const useServerPreferences = () => {
  const [preferences, setPreferences] = useState<ServerPreferences>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(API_BASE, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          if (response.status === 401) {
            console.warn('User not authenticated - preferences unavailable');
            setPreferences({});
          } else {
            throw new Error(`Failed to load preferences: ${response.statusText}`);
          }
        } else {
          const data = await response.json();
          setPreferences(data || {});
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('Error loading preferences:', errorMsg);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Get a single preference
  const getPreference = useCallback(
    async (key: string): Promise<any> => {
      try {
        const response = await fetch(`${API_BASE}/${encodeURIComponent(key)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          if (response.status === 401) {
            console.warn('User not authenticated - preference unavailable');
            return null;
          }
          throw new Error(`Failed to get preference: ${response.statusText}`);
        }
        const data = await response.json();
        return data.value !== null ? data.value : null;
      } catch (err) {
        console.error(`Error getting preference '${key}':`, err);
        return null;
      }
    },
    []
  );

  // Set a preference
  const setPreference = useCallback(
    async (key: string, value: any): Promise<boolean> => {
      try {
        const response = await fetch(`${API_BASE}/${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value }),
        });
        if (!response.ok) {
          if (response.status === 401) {
            console.warn('User not authenticated - cannot save preference');
            return false;
          }
          throw new Error(`Failed to set preference: ${response.statusText}`);
        }
        const data = await response.json();
        // Update local cache
        setPreferences(prev => ({ ...prev, [key]: data.value }));
        return true;
      } catch (err) {
        console.error(`Error setting preference '${key}':`, err);
        return false;
      }
    },
    []
  );

  // Delete a preference
  const deletePreference = useCallback(
    async (key: string): Promise<boolean> => {
      try {
        const response = await fetch(`${API_BASE}/${encodeURIComponent(key)}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          if (response.status === 401) {
            console.warn('User not authenticated - cannot delete preference');
            return false;
          }
          throw new Error(`Failed to delete preference: ${response.statusText}`);
        }
        // Update local cache
        setPreferences(prev => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
        return true;
      } catch (err) {
        console.error(`Error deleting preference '${key}':`, err);
        return false;
      }
    },
    []
  );

  return {
    preferences,
    isLoading,
    error,
    getPreference,
    setPreference,
    deletePreference,
  };
};

export default useServerPreferences;
