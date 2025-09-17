'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  User, 
  Calendar,
  AlertCircle,
  Eye,
  Filter,
  Download,
  ArrowLeft
} from 'lucide-react';

interface Payout {
  id: string;
  provider: {
    id: string;
    user: {
      profile: {
        fullName: string;
      } | null;
      email: string;
    };
  };
  requestedAmount: number;
  actualAmount?: number;
  status: string;
  requestedAt: string;
  approvedAt?: string;
  processedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  transactionFee?: number;
  bankAccount: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
  };
  logs: Array<{
    action: string;
    details: string;
    createdAt: string;
    performedBy: string;
  }>;
}

interface PayoutStats {
  totalRequested: number;
  totalApproved: number;
  totalProcessed: number;
  totalRejected: number;
  pendingAmount: number;
  processedAmount: number;
}

export default function AdminPayoutsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingPayout, setProcessingPayout] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (status === 'authenticated' && !['EMPLOYEE', 'SUPER_ADMIN'].includes(session?.user?.role || '')) {
      router.push('/unauthorized');
      return;
    }

    if (status === 'authenticated') {
      fetchPayouts();
      fetchStats();
    }
  }, [session, status, router, statusFilter]);

  const fetchPayouts = async () => {
    try {
      const url = statusFilter === 'all' ? 
        '/api/admin/payouts' : 
        `/api/admin/payouts?status=${statusFilter}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        setPayouts(data.payouts);
      } else {
        console.error('Failed to fetch payouts:', data.error);
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/payout-stats');
      const data = await response.json();
      
      if (response.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching payout stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutAction = async (payoutId: string, action: 'approve' | 'reject', rejectionReason?: string) => {
    setProcessingPayout(payoutId);
    
    try {
      const response = await fetch(`/api/admin/payouts/${payoutId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action, 
          rejectionReason: action === 'reject' ? rejectionReason : undefined 
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`Payout ${action}d successfully!`);
        fetchPayouts();
        fetchStats();
        setShowDetails(false);
      } else {
        alert(data.error || `Failed to ${action} payout`);
      }
    } catch (error) {
      alert(`Error ${action}ing payout`);
    } finally {
      setProcessingPayout(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'APPROVED':
      case 'PROCESSING':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'REQUESTED':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'REJECTED':
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 bg-green-100';
      case 'APPROVED':
      case 'PROCESSING':
        return 'text-blue-600 bg-blue-100';
      case 'REQUESTED':
        return 'text-yellow-600 bg-yellow-100';
      case 'REJECTED':
      case 'FAILED':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={session?.user?.role === 'SUPER_ADMIN' ? '/dashboard/admin' : '/dashboard/employee'}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Payout Management</h1>
        <p className="text-gray-900">Review and approve provider payout requests</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
              <div>
                <p className="text-sm text-gray-900">Requested</p>
                <p className="text-lg font-semibold">{stats.totalRequested}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-gray-900">Approved</p>
                <p className="text-lg font-semibold">{stats.totalApproved}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-gray-900">Processed</p>
                <p className="text-lg font-semibold">{stats.totalProcessed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              <div>
                <p className="text-sm text-gray-900">Rejected</p>
                <p className="text-lg font-semibold">{stats.totalRejected}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-orange-500 mr-2" />
              <div>
                <p className="text-sm text-gray-900">Pending Amount</p>
                <p className="text-lg font-semibold">{formatCurrency(stats.pendingAmount)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-gray-900">Processed Amount</p>
                <p className="text-lg font-semibold">{formatCurrency(stats.processedAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1"
          >
            <option value="all">All Status</option>
            <option value="REQUESTED">Requested</option>
            <option value="APPROVED">Approved</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Requested At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payouts.map((payout) => (
                <tr key={payout.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payout.provider.user.profile?.fullName || payout.provider.user.email}
                        </div>
                        <div className="text-sm text-gray-900">{payout.provider.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="font-medium">{formatCurrency(payout.requestedAmount)}</div>
                      {payout.actualAmount && payout.actualAmount !== payout.requestedAmount && (
                        <div className="text-xs text-gray-900">
                          Net: {formatCurrency(payout.actualAmount)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(payout.status)}
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(payout.status)}`}>
                        {payout.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(payout.requestedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedPayout(payout);
                          setShowDetails(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>
                      {payout.status === 'REQUESTED' && (
                        <>
                          <button
                            onClick={() => handlePayoutAction(payout.id, 'approve')}
                            disabled={processingPayout === payout.id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Enter rejection reason:');
                              if (reason) {
                                handlePayoutAction(payout.id, 'reject', reason);
                              }
                            }}
                            disabled={processingPayout === payout.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {payouts.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payouts found</h3>
            <p className="text-gray-900">No payout requests match your current filters.</p>
          </div>
        )}
      </div>

      {/* Payout Details Modal */}
      {showDetails && selectedPayout && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Payout Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Provider Info */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Provider Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Name:</strong> {selectedPayout.provider.user.profile?.fullName || 'N/A'}</p>
                  <p><strong>Email:</strong> {selectedPayout.provider.user.email}</p>
                </div>
              </div>

              {/* Bank Account Info */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Bank Account</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Account Holder:</strong> {selectedPayout.bankAccount.accountHolderName}</p>
                  <p><strong>Bank:</strong> {selectedPayout.bankAccount.bankName}</p>
                  <p><strong>Account Number:</strong> {selectedPayout.bankAccount.accountNumber}</p>
                </div>
              </div>

              {/* Payout Info */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Payout Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Requested Amount:</strong> {formatCurrency(selectedPayout.requestedAmount)}</p>
                  {selectedPayout.actualAmount && (
                    <p><strong>Net Amount:</strong> {formatCurrency(selectedPayout.actualAmount)}</p>
                  )}
                  {selectedPayout.transactionFee && (
                    <p><strong>Transaction Fee:</strong> {formatCurrency(selectedPayout.transactionFee)}</p>
                  )}
                  <p><strong>Status:</strong> 
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedPayout.status)}`}>
                      {selectedPayout.status}
                    </span>
                  </p>
                  <p><strong>Requested At:</strong> {formatDate(selectedPayout.requestedAt)}</p>
                  {selectedPayout.approvedAt && (
                    <p><strong>Approved At:</strong> {formatDate(selectedPayout.approvedAt)}</p>
                  )}
                  {selectedPayout.processedAt && (
                    <p><strong>Processed At:</strong> {formatDate(selectedPayout.processedAt)}</p>
                  )}
                  {selectedPayout.rejectedAt && (
                    <p><strong>Rejected At:</strong> {formatDate(selectedPayout.rejectedAt)}</p>
                  )}
                  {selectedPayout.rejectionReason && (
                    <p><strong>Rejection Reason:</strong> {selectedPayout.rejectionReason}</p>
                  )}
                </div>
              </div>

              {/* Activity Log */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Activity Log</h4>
                <div className="space-y-3">
                  {selectedPayout.logs.map((log, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{log.action}</p>
                          <p className="text-sm text-gray-900">{log.details}</p>
                        </div>
                        <span className="text-xs text-gray-900">{formatDate(log.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {selectedPayout.status === 'REQUESTED' && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => handlePayoutAction(selectedPayout.id, 'approve')}
                    disabled={processingPayout === selectedPayout.id}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve Payout
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Enter rejection reason:');
                      if (reason) {
                        handlePayoutAction(selectedPayout.id, 'reject', reason);
                      }
                    }}
                    disabled={processingPayout === selectedPayout.id}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject Payout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}