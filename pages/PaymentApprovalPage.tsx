import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface PaymentRequest {
  id: string;
  business_id: string;
  business_name: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  created_by: string;
  description?: string;
  reference?: string;
}

const PaymentApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/super-admin/payment-requests', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPayments(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch payment requests', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async () => {
    if (!selectedPayment) return;

    try {
      setProcessingId(selectedPayment.id);
      const res = await fetch(`/api/super-admin/payment-requests/${selectedPayment.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action })
      });

      if (res.ok) {
        setPayments(payments.map(p => 
          p.id === selectedPayment.id ? { ...p, status: action } : p
        ));
        setIsModalOpen(false);
        setSelectedPayment(null);
      }
    } catch (err) {
      console.error('Failed to process payment', err);
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
        <h1 className="text-3xl font-bold text-gray-900">Payment Approvals</h1>
        <Button onClick={fetchPayments}>Refresh</Button>
      </div>

      {loading ? (
        <Card className="text-center text-gray-500">Loading payment requests...</Card>
      ) : payments.length === 0 ? (
        <Card className="text-center text-gray-500">No payment requests found</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Business</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Amount</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Description</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Created</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{payment.business_name}</td>
                    <td className="px-4 py-2">
                      {payment.amount.toLocaleString()} {payment.currency}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{payment.description || '-'}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit font-medium ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        <span className="capitalize">{payment.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {payment.status === 'pending' ? (
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setAction('approve');
                            setIsModalOpen(true);
                          }}
                          className="text-blue-600 hover:underline text-sm font-medium mr-2"
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
        onClose={() => setIsModalOpen(false)}
        title="Review Payment Request"
        size="lg"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Business</label>
                <p className="text-lg font-semibold">{selectedPayment.business_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <p className="text-lg font-semibold">
                  {selectedPayment.amount.toLocaleString()} {selectedPayment.currency}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reference</label>
                <p>{selectedPayment.reference || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p>{new Date(selectedPayment.created_at).toLocaleString()}</p>
              </div>
            </div>
            {selectedPayment.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 p-2 bg-gray-50 rounded text-sm">{selectedPayment.description}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end border-t pt-4">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setAction('reject');
                  handleApproveReject();
                }}
                disabled={processingId === selectedPayment.id}
              >
                Reject
              </Button>
              <Button
                onClick={() => {
                  setAction('approve');
                  handleApproveReject();
                }}
                disabled={processingId === selectedPayment.id}
              >
                Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PaymentApprovalPage;
