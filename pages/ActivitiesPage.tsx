import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMockData } from '../hooks/useMockData';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import RichTextEditor from '../components/ui/RichTextEditor';
import { PlusIcon, PencilIcon, TrashIcon, DocumentTextIcon, PlayIcon } from '@heroicons/react/24/outline';
import { Activity } from '../types';

const ActivitiesPage: React.FC = () => {
  const { activities, programs, saveActivity, deleteActivity, currentUser } = useMockData();
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<Partial<Activity>>({});

  const canEdit = currentUser?.role === 'Admin' || currentUser?.role === 'Form Builder';
  const canCollect = currentUser?.role === 'Admin' || currentUser?.role === 'Data Collector';

  const getProgramName = (programId: string) => {
    return programs.find(p => p.id === programId)?.name || 'N/A';
  };

  // Optional filter from query string: ?programId=...
  const search = new URLSearchParams(location.search);
  const filterProgramId = search.get('programId');
  const visibleActivities = filterProgramId ? activities.filter(a => String(a.programId) === String(filterProgramId)) : activities;

  const openModal = (activity?: Activity) => {
    setCurrentActivity(activity || { title: '', programId: programs[0]?.id || '', status: 'Draft', startDate: '', endDate: '', responseType: 'Facility' });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (currentActivity.title && currentActivity.programId) {
      saveActivity({
        ...currentActivity,
        createdBy: currentUser?.id || 'system'
      } as Activity);
      setIsModalOpen(false);
    } else {
      alert("Title and Program are required");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Activities</h1>
        {canEdit && <Button onClick={() => openModal()} leftIcon={<PlusIcon className="h-5 w-5" />}>
          New Activity
        </Button>}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {visibleActivities.map((activity) => (
                <tr key={activity.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{activity.title}</div>
                    <div className="text-sm text-gray-500">{activity.category}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getProgramName(activity.programId)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(activity as any).responseType || (activity as any).response_type || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${activity.status === 'Published' ? 'bg-green-100 text-green-800' : activity.status === 'Archived' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {activity.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{activity.startDate} - {activity.endDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {canEdit && (
                      <>
                        {(() => {
                          const hasForm = Boolean(activity.formDefinition && Array.isArray(activity.formDefinition.pages) && activity.formDefinition.pages.some(p => p.sections && p.sections.some(s => (s.questions || []).length > 0)));
                          return (
                            <button onClick={() => navigate(`/activities/build/${activity.id}`)} className="text-indigo-600 hover:text-indigo-900" title={hasForm ? 'Edit Form' : 'Build Form'}>
                              <DocumentTextIcon className="h-5 w-5" />
                            </button>
                          );
                        })()}
                        <button onClick={() => navigate(`/activities/dashboard/${activity.id}`)} className="text-blue-600 hover:text-blue-900 ml-2" title="View Collected Form Data">
                          <DocumentTextIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => openModal(activity)} className="text-yellow-600 hover:text-yellow-900" title="Edit Activity">
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => { if (confirm('Delete?')) deleteActivity(activity.id) }} className="text-red-600 hover:text-red-900" title="Delete Activity">
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    {canCollect && (
                      <button onClick={() => navigate(`/activities/fill/${activity.id}`)} className="text-green-600 hover:text-green-900" title="Start Data Collection">
                        <PlayIcon className="h-5 w-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentActivity.id ? "Edit Activity" : "New Activity"}
        footer={
          <>
            <Button onClick={handleSave} className="ml-3">Save</Button>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Program</label>
            <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={currentActivity.programId} onChange={(e) => setCurrentActivity({ ...currentActivity, programId: e.target.value })}>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Subtitle</label>
            <input type="text" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={currentActivity.subtitle || ''} onChange={(e) => setCurrentActivity({ ...currentActivity, subtitle: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input type="text" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={currentActivity.title || ''} onChange={(e) => setCurrentActivity({ ...currentActivity, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Details</label>
            <RichTextEditor value={currentActivity.details || ''} onChange={(html) => setCurrentActivity({ ...currentActivity, details: html })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input type="date" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={currentActivity.startDate || ''} onChange={(e) => setCurrentActivity({ ...currentActivity, startDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input type="date" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={currentActivity.endDate || ''} onChange={(e) => setCurrentActivity({ ...currentActivity, endDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={currentActivity.status} onChange={(e) => setCurrentActivity({ ...currentActivity, status: e.target.value as any })}>
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Response Type</label>
            <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={(currentActivity as any).responseType || ''} onChange={(e) => setCurrentActivity({ ...currentActivity, responseType: e.target.value as any })}>
              <option value="Facility">Facility</option>
              <option value="User">User</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ActivitiesPage;