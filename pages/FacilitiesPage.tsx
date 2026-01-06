import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import { useMockData } from '../hooks/useMockData';
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import DynamicFormRenderer from '../components/DynamicFormRenderer';
import { PlusIcon, PencilIcon, TrashIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { Facility } from '../types';
import { FormSchema } from '../components/FormBuilder';
import * as ExcelJS from 'exceljs';

const FacilitiesPage: React.FC = () => {
  const { facilities, saveFacility, deleteFacility, currentUser } = useMockData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFacility, setCurrentFacility] = useState<Partial<Facility>>({});
  const [facilitySchema, setFacilitySchema] = useState<FormSchema | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importedData, setImportedData] = useState<Partial<Facility>[]>([]);
  const [importError, setImportError] = useState<string>('');

  const canEdit = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  const openModal = (fac?: Facility) => {
    const newFacility = fac || { name: '', state: '', lga: '', address: '', category: '' };
    setCurrentFacility(newFacility);
    // Initialize availableLgas if facility already has a state
    if (newFacility.state && lgasMap) {
      const mapped = (lgasMap as any)[newFacility.state] || [];
      if (mapped && mapped.length) {
        setAvailableLgas(mapped);
      }
    } else {
      setAvailableLgas([]);
    }
    setIsModalOpen(true);
  };

  const [statesList, setStatesList] = useState<string[]>([]);
  const [lgasMap, setLgasMap] = useState<Record<string, string[]>>({});
  const [availableLgas, setAvailableLgas] = useState<string[]>([]);

  useEffect(() => {
    // Load facility form schema
    loadFacilitySchema();

    // load states list
    fetch('/metadata/nigerian-states.json')
      .then(r => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data)) {
          console.log('States loaded:', data.length, 'states');
          setStatesList(data as string[]);
        }
      })
      .catch((e) => console.error('Failed to load states:', e));

    // load small lgas map (optional file)
    fetch('/metadata/lgas_by_state.json')
      .then(r => r.ok ? r.json() : {})
      .then((data) => {
        if (data && typeof data === 'object') {
          console.log('LGA map loaded:', Object.keys(data).length, 'states have LGAs');
          console.log('LGA map keys:', Object.keys(data));
          setLgasMap(data as Record<string, string[]>);
        }
      })
      .catch((e) => console.error('Failed to load LGA map:', e));
  }, []);

  const loadFacilitySchema = async () => {
    try {
      const response = await fetch('/api/form-schemas/facility', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        // Normalize fields to ensure showInList property exists
        const normalizedData = {
          ...data,
          fields: (data.fields || []).map((f: any) => ({
            ...f,
            showInList: f.showInList ?? false
          }))
        };
        setFacilitySchema(normalizedData);
      }
    } catch (error) {
      console.error('Failed to load facility form schema:', error);
    }
  };

  const handleSave = () => {
    if (currentFacility.name && currentFacility.state) {
      saveFacility(currentFacility as Facility);
      setIsModalOpen(false);
    } else {
      alert("Name and State are required.");
    }
  };

  // Generate Excel template for facilities
  const downloadTemplate = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Facilities');

      // Set headers
      ws.columns = [
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'State', key: 'state', width: 20 },
        { header: 'LGA', key: 'lga', width: 20 },
        { header: 'Address', key: 'address', width: 30 },
        { header: 'Contact Person', key: 'contactPerson', width: 20 },
        { header: 'Location (lat,lng)', key: 'location', width: 25 },
        { header: 'Remarks', key: 'remarks', width: 30 }
      ];

      // Add example row
      ws.addRow({
        name: 'Example Health Center',
        category: 'Primary Health Center',
        state: 'Lagos',
        lga: 'Ikoyi',
        address: '123 Health Street, Lagos',
        contactPerson: 'Dr. John Doe',
        location: '6.4628,3.3197',
        remarks: 'Sample facility'
      });

      // Style header row
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'facility_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error generating template:', e);
      alert('Failed to generate template');
    }
  };

  // Handle Excel file import
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setImportError('');
        const buffer = evt.target?.result;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as ArrayBuffer);

        const worksheet = workbook.worksheets[0];
        const facilities: Partial<Facility>[] = [];

        // Get headers from first row
        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell) => {
          headers.push((cell.value as string)?.toLowerCase().trim() || '');
        });

        // Parse data rows
        let rowCount = 0;
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header

          const facility: Partial<Facility> = {
            // Don't set ID - let server generate it
          };

          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            const value = cell.value;

            if (header === 'name') facility.name = String(value || '');
            else if (header === 'category') facility.category = String(value || '');
            else if (header === 'state') facility.state = String(value || '');
            else if (header === 'lga') facility.lga = String(value || '');
            else if (header === 'address') facility.address = String(value || '');
            else if (header === 'contact person') facility.contactPerson = String(value || '');
            else if (header === 'location (lat,lng)' || header === 'location') facility.location = String(value || '');
            else if (header === 'remarks') facility.remarks = String(value || '');
          });

          // Validate required fields
          if (facility.name && facility.state) {
            facilities.push(facility);
            rowCount++;
          }
        });

        if (facilities.length === 0) {
          setImportError('No valid facilities found. Please ensure each row has at least a Name and State.');
        } else {
          setImportedData(facilities);
          setIsImportModalOpen(true);
        }
      } catch (err) {
        console.error('Error parsing file:', err);
        setImportError('Failed to parse Excel file. Please check the format.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Import facilities
  const handleImportConfirm = () => {
    let successCount = 0;
    const errors: string[] = [];

    importedData.forEach((facility, idx) => {
      try {
        saveFacility(facility as Facility);
        successCount++;
      } catch (e) {
        errors.push(`Row ${idx + 2}: ${String(e)}`);
      }
    });

    setIsImportModalOpen(false);
    setImportedData([]);

    if (errors.length > 0) {
      alert(`Imported ${successCount} facilities successfully.\nErrors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''}`);
    } else {
      alert(`Successfully imported ${successCount} facilities!`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Facilities</h1>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button onClick={() => openModal()} leftIcon={<PlusIcon className="h-5 w-5" />}>New Facility</Button>
            <Button variant="secondary" onClick={downloadTemplate} leftIcon={<ArrowUpTrayIcon className="h-5 w-5" />}>Download Template</Button>
            <div className="relative inline-block">
              <input
                id="facility-import-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileImport}
                className="hidden"
              />
              <label htmlFor="facility-import-input">
                <button
                  type="button"
                  onClick={() => document.getElementById('facility-import-input')?.click()}
                  className="inline-flex items-center border border-transparent font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary-100 text-primary-700 hover:bg-primary-200 focus:ring-primary-500 px-4 py-2 text-sm"
                >
                  <ArrowUpTrayIcon className="h-5 w-5 mr-2 -ml-1" />
                  Import from Excel
                </button>
              </label>
            </div>
          </div>
        )}
      </div>
      <Card>
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'category', label: 'Category' },
            { key: 'location', label: 'Location', render: (row: any) => `${row.lga || ''}, ${row.state || ''}` },
            { key: 'address', label: 'Address' },
            {
              key: 'dashboard', label: 'Dashboard', render: (row: any) => (
                <a href={`#/facilities/${row.id}/dashboard`} className="text-primary-600 hover:underline">Open Dashboard</a>
              )
            },
            {
              key: 'actions', label: 'Actions', render: (row: any) => (
                <div className="flex gap-2">
                  <button onClick={() => openModal(row)} className="text-indigo-600 hover:text-indigo-900"><PencilIcon className="h-5 w-5" /></button>
                  {canEdit && <button onClick={() => { if (confirm('Delete?')) deleteFacility(row.id) }} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>}
                </div>
              )
            }
          ]}
          data={facilities}
          pageSize={20}
          persistKey="facilities_table"
        />
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
                console.log('State selected:', st);
                console.log('Available lgasMap keys:', Object.keys(lgasMap));
                setCurrentFacility({ ...currentFacility, state: st, lga: '' });

                // load LGAs from in-memory map if available
                const mapped = (lgasMap && (lgasMap as any)[st]) || [];
                console.log('LGAs for state:', st, '=', mapped);

                if (mapped && mapped.length) {
                  console.log('Setting availableLgas:', mapped);
                  setAvailableLgas(mapped);
                } else {
                  console.log('No LGAs found in map, attempting to fetch per-state file');
                  // attempt to fetch a per-state LGAs file (optional)
                  fetch(`/metadata/lgas/${encodeURIComponent(st)}.json`)
                    .then(r => {
                      if (!r.ok) {
                        console.log('Per-state LGA file not found for:', st);
                        return [];
                      }
                      return r.json();
                    })
                    .then((data) => {
                      if (Array.isArray(data)) {
                        console.log('Loaded LGAs from per-state file:', st, data);
                        setAvailableLgas(data as string[]);
                      } else {
                        setAvailableLgas([]);
                      }
                    })
                    .catch((e) => {
                      console.error('Error loading per-state LGAs:', e);
                      setAvailableLgas([]);
                    });
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

          {/* Render dynamic custom fields from form schema */}
          <DynamicFormRenderer
            formType="facility"
            formData={currentFacility}
            onChange={(fieldName, value) => {
              setCurrentFacility({ ...currentFacility, [fieldName]: value });
            }}
          />
        </div>
      </Modal>

      {/* Import Preview Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportedData([]);
          setImportError('');
        }}
        title={`Import Facilities (${importedData.length} records)`}
        size="3xl"
        footer={
          <>
            <Button onClick={handleImportConfirm} className="ml-3">Confirm Import</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setIsImportModalOpen(false);
                setImportedData([]);
                setImportError('');
              }}
            >
              Cancel
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {importError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {importError}
            </div>
          )}

          {importedData.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-3">Preview of facilities to be imported:</p>
              <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">State</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">LGA</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Address</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importedData.slice(0, 10).map((facility, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900">{facility.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{facility.category || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{facility.state}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{facility.lga || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 truncate">{facility.address || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importedData.length > 10 && (
                <p className="text-xs text-gray-500 mt-2">... and {importedData.length - 10} more facilities</p>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default FacilitiesPage;
