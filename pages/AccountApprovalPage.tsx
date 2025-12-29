import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface AccountRequest {
  id: string;
  business_name: string;
  contact_email: string;
  contact_person?: string;
  phone?: string;
  industry?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  notes?: string;
}

const AccountApprovalPage: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<AccountRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/super-admin/account-requests', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch account requests', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async () => {
    if (!selectedAccount) return;

    try {
      setProcessingId(selectedAccount.id);
      const res = await fetch(`/api/super-admin/account-requests/${selectedAccount.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: action,
          reject_reason: action === 'reject' ? rejectReason : undefined
        })
      });

      if (res.ok) {
        setAccounts(accounts.map(a => 
          a.id === selectedAccount.id ? { ...a, status: action } : a
        ));
        setIsModalOpen(false);
        setSelectedAccount(null);
        setRejectReason('');
      }
    } catch (err) {
      console.error('Failed to process account', err);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-50';
      case 'rejected':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5" />;
      default:
        return <ClockIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Account Approvals</h1>
        <Button onClick={fetchAccounts}>Refresh</Button>
      </div>

      {loading ? (
        <Card className="text-center text-gray-500">Loading account requests...</Card>
      ) : accounts.length === 0 ? (
        <Card className="text-center text-gray-500">No account requests found</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Business Name</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Contact Email</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Contact Person</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Industry</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Created</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{account.business_name}</td>
                    <td className="px-4 py-2 text-blue-600">{account.contact_email}</td>
                    <td className="px-4 py-2">{account.contact_person || '-'}</td>
                    <td className="px-4 py-2 text-gray-600">{account.industry || '-'}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {new Date(account.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit font-medium ${getStatusColor(account.status)}`}>
                        {getStatusIcon(account.status)}
                        <span className="capitalize">{account.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {account.status === 'pending' ? (
                        <button
                          onClick={() => {
                            setSelectedAccount(account);
                            setAction('approve');
                            setIsModalOpen(true);
                          }}
                          className="text-blue-600 hover:underline text-sm font-medium"
                        >
                          Review
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setRejectReason('');
        }}
        title="Review Account Request"
        size="lg"
      >
        {selectedAccount && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Name</label>
                <p className="text-lg font-semibold">{selectedAccount.business_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-blue-600">{selectedAccount.contact_email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                <p>{selectedAccount.contact_person || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p>{selectedAccount.phone || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Industry</label>
                <p>{selectedAccount.industry || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Requested</label>
                <p>{new Date(selectedAccount.created_at).toLocaleString()}</p>
              </div>
            </div>

            {selectedAccount.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <p className="mt-1 p-2 bg-gray-50 rounded text-sm">{selectedAccount.notes}</p>
              </div>
            )}

            {action === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this account request is being rejected..."
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
            )}

            <div className="flex gap-3 justify-end border-t pt-4">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setIsModalOpen(false);
                  setRejectReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setAction('reject');
                }}
                disabled={processingId === selectedAccount.id || action !== 'approve'}
              >
                Reject
              </Button>
              <Button
                onClick={() => {
                  if (action === 'reject' && !rejectReason.trim()) {
                    alert('Please provide a rejection reason');
                    return;
                  }
                  setAction('approve');
                  handleApproveReject();
                }}
                disabled={processingId === selectedAccount.id}
              >
                {action === 'approve' ? 'Approve' : 'Send Rejection'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AccountApprovalPage;
