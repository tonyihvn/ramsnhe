
import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import { useMockData } from '../hooks/useMockData';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Facility } from '../types';

const FacilitiesPage: React.FC = () => {
  const { facilities, saveFacility, deleteFacility, currentUser } = useMockData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFacility, setCurrentFacility] = useState<Partial<Facility>>({});

  const canEdit = currentUser?.role === 'Admin';

  const openModal = (fac?: Facility) => {
    setCurrentFacility(fac || { name: '', state: '', lga: '', address: '', category: '' });
    setIsModalOpen(true);
  };

  const [statesList, setStatesList] = useState<string[]>([]);
  const [lgasMap, setLgasMap] = useState<Record<string, string[]>>({});
  const [availableLgas, setAvailableLgas] = useState<string[]>([]);

  useEffect(() => {
    // load states list
    fetch('/metadata/nigerian-states.json').then(r => r.ok ? r.json() : []).then((data) => {
      if (Array.isArray(data)) setStatesList(data as string[]);
    }).catch(() => { });
    // load small lgas map (optional file)
    fetch('/metadata/lgas_by_state.json').then(r => r.ok ? r.json() : {}).then((data) => {
      if (data && typeof data === 'object') setLgasMap(data as Record<string, string[]>);
    }).catch(() => { });
  }, []);

  const handleSave = () => {
    if (currentFacility.name && currentFacility.state) {
      saveFacility(currentFacility as Facility);
      setIsModalOpen(false);
    } else {
      alert("Name and State are required.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Facilities</h1>
        {canEdit && <Button onClick={() => openModal()} leftIcon={<PlusIcon className="h-5 w-5" />}>New Facility</Button>}
      </div>
      <Card>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dashboard</th>
              {canEdit && <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {facilities.map((facility) => (
              <tr key={facility.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{facility.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{facility.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{facility.lga}, {facility.state}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{facility.address}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <a href={`#/facilities/${facility.id}/dashboard`} className="text-primary-600 hover:underline">Open Dashboard</a>
                </td>
                {canEdit && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onClick={() => openModal(facility)} className="text-indigo-600 hover:text-indigo-900"><PencilIcon className="h-5 w-5" /></button>
                    <button onClick={() => { if (confirm('Delete?')) deleteFacility(facility.id) }} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentFacility.id ? "Edit Facility" : "New Facility"}
        footer={
          <>
            <Button onClick={handleSave} className="ml-3">Save</Button>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Facility Name</label>
            <input type="text" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={currentFacility.name || ''} onChange={(e) => setCurrentFacility({ ...currentFacility, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <input type="text" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={currentFacility.category || ''} onChange={(e) => setCurrentFacility({ ...currentFacility, category: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">State</label>
              <select value={currentFacility.state || ''} onChange={(e) => {
                const st = e.target.value;
                setCurrentFacility({ ...currentFacility, state: st, lga: '' });
                // load LGAs from in-memory map if available
                const mapped = (lgasMap && (lgasMap as any)[st]) || [];
                if (mapped && mapped.length) {
                  setAvailableLgas(mapped);
                } else {
                  // attempt to fetch a per-state LGAs file (optional)
                  fetch(`/metadata/lgas/${encodeURIComponent(st)}.json`).then(r => {
                    if (!r.ok) return [];
                    return r.json();
                  }).then((data) => {
                    if (Array.isArray(data)) {
                      setAvailableLgas(data as string[]);
                    } else {
                      setAvailableLgas([]);
                    }
                  }).catch(() => setAvailableLgas([]));
                }
              }} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                <option value="">-- Select state --</option>
                {statesList.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">LGA</label>
              <select value={currentFacility.lga || ''} onChange={(e) => setCurrentFacility({ ...currentFacility, lga: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                disabled={!availableLgas || availableLgas.length === 0}>
                <option value="">{availableLgas && availableLgas.length ? '-- Select LGA --' : 'Select state to load LGAs'}</option>
                {(availableLgas || []).map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input type="text" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={currentFacility.address || ''} onChange={(e) => setCurrentFacility({ ...currentFacility, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700">Location (lat,lng)</label>
              <input type="text" placeholder="e.g. 9.0820,8.6753" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={currentFacility.location || ''} onChange={(e) => setCurrentFacility({ ...currentFacility, location: e.target.value })} />
            </div>
            <div className="flex items-center">
              <input id="fac-show-map" type="checkbox" checked={currentFacility.show_on_map === undefined ? true : Boolean(currentFacility.show_on_map)}
                onChange={(e) => setCurrentFacility({ ...currentFacility, show_on_map: e.target.checked })} />
              <label htmlFor="fac-show-map" className="ml-2 text-sm text-gray-700">Show on map</label>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FacilitiesPage;
