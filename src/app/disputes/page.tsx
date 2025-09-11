'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { 
  ArrowLeft, 
  Search, 
  AlertTriangle, 
  Clock, 
  User, 
  DollarSign,
  MessageCircle,
  FileText,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

interface Dispute {
  id: string;
  reason: string;
  description?: string;
  status: string;
  priority: string;
  createdAt: string;
  booking: {
    id: string;
    startTime: string;
    endTime: string;
    amount: number;
    seeker: {
      email: string;
      profile: {
        firstName: string;
        lastName: string;
      };
    };
    provider: {
      email: string;
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  initiator: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  communications?: Array<{
    message: string;
    createdAt: string;
    from: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  }>;
}

export default function DisputesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'EMPLOYEE' && session.user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchDisputes();
  }, [session, status, router]);

  const fetchDisputes = async () => {
    try {
      const response = await fetch('/api/disputes');
      if (response.ok) {
        const data = await response.json();
        setDisputes(data.disputes || []);
      } else {
        console.error('Failed to fetch disputes');
        setDisputes([]);
      }
    } catch (error) {
      console.error('Error fetching disputes:', error);
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async (disputeId: string, resolution: 'REFUND_SEEKER' | 'FAVOR_PROVIDER' | 'PARTIAL_REFUND', amount?: number) => {
    setProcessingAction('resolve');
    try {
      const response = await fetch('/api/disputes/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disputeId,
          resolution,
          notes: resolutionNotes,
          amount
        })
      });

      if (response.ok) {
        setDisputes(disputes.filter(d => d.id !== disputeId));
        setSelectedDispute(null);
        setResolutionNotes('');
        toast({
          type: 'success',
          title: 'Dispute Resolved',
          message: 'The dispute has been resolved successfully.'
        });
      } else {
        const data = await response.json();
        toast({
          type: 'error',
          title: 'Resolution Failed',
          message: data.error || 'Failed to resolve dispute'
        });
      }
    } catch (error) {
      toast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to resolve dispute. Please try again.'
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const filteredDisputes = disputes.filter(dispute =>
    dispute.booking.seeker.profile.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispute.booking.seeker.profile.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispute.booking.provider.profile.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispute.booking.provider.profile.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispute.booking.seeker.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispute.booking.provider.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispute.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard/employee')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dispute Resolution</h1>
            <p className="text-gray-900">Handle booking disputes and conflicts</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-900" />
            <input
              type="text"
              placeholder="Search by user name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Disputes List */}
      <div className="bg-white rounded-lg shadow-sm">
        {filteredDisputes.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-gray-900 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Disputes</h3>
            <p className="text-gray-900">All disputes have been resolved or there are no pending disputes.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDisputes.map((dispute) => (
              <div key={dispute.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span className="font-medium text-gray-900">{dispute.reason}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        dispute.priority === 'high' ? 'bg-red-100 text-red-800' :
                        dispute.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {dispute.priority.toUpperCase()} PRIORITY
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {dispute.status}
                      </span>
                    </div>

                    {dispute.description && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{dispute.description}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Seeker</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-900">
                          <User className="w-4 h-4" />
                          <span>{dispute.booking.seeker.profile.firstName} {dispute.booking.seeker.profile.lastName}</span>
                        </div>
                        <div className="text-sm text-gray-900 mt-1">
                          {dispute.booking.seeker.email}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Provider</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-900">
                          <User className="w-4 h-4" />
                          <span>{dispute.booking.provider.profile.firstName} {dispute.booking.provider.profile.lastName}</span>
                        </div>
                        <div className="text-sm text-gray-900 mt-1">
                          {dispute.booking.provider.email}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-900" />
                        <span className="text-sm text-gray-900">Session: {formatDate(dispute.booking.startTime)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-gray-900" />
                        <span className="text-sm text-gray-900">Amount: ₹{dispute.booking.amount.toLocaleString()}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-900" />
                        <span className="text-sm text-gray-900">Reported: {formatDate(dispute.createdAt)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-900" />
                        <span className="text-sm text-gray-900">By: {dispute.initiator.profile.firstName} {dispute.initiator.profile.lastName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 ml-4">
                    <Link
                      href={`/chat/${dispute.booking.id}`}
                      className="flex items-center space-x-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-200"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Chat</span>
                    </Link>
                    <button
                      onClick={() => setSelectedDispute(dispute)}
                      className="flex items-center space-x-1 bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-green-200"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Resolve</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Resolve Dispute</h3>
              <p className="text-gray-900">Choose resolution for the booking dispute</p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Resolution Notes
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add notes about the resolution..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {/* Partial Refund Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Partial Refund Amount (if applicable)
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  min="0"
                  max={selectedDispute?.booking.amount || 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount for partial refund"
                />
                <p className="text-xs text-gray-900 mt-1">
                  Total booking amount: ₹{selectedDispute?.booking.amount.toLocaleString()}
                </p>
              </div>

              <div className="flex justify-between space-x-4">
                <button
                  onClick={() => {
                    setSelectedDispute(null);
                    setRefundAmount(0);
                    setResolutionNotes('');
                  }}
                  className="px-4 py-2 text-gray-900 hover:text-gray-700"
                >
                  Cancel
                </button>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleResolveDispute(selectedDispute.id, 'REFUND_SEEKER')}
                    disabled={processingAction === 'resolve'}
                    className="flex items-center space-x-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Full Refund</span>
                  </button>
                  
                  <button
                    onClick={() => handleResolveDispute(selectedDispute.id, 'PARTIAL_REFUND', refundAmount)}
                    disabled={processingAction === 'resolve' || !refundAmount || refundAmount <= 0}
                    className="flex items-center space-x-1 bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Partial Refund</span>
                  </button>
                  
                  <button
                    onClick={() => handleResolveDispute(selectedDispute.id, 'FAVOR_PROVIDER')}
                    disabled={processingAction === 'resolve'}
                    className="flex items-center space-x-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Favor Provider</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}