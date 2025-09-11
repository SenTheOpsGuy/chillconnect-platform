'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Clock, 
  User, 
  DollarSign,
  CheckCircle,
  XCircle,
  Calendar,
  MessageCircle,
  X
} from 'lucide-react';

interface UnmatchedRequest {
  id: string;
  seekerEmail: string;
  expertise: string;
  budget?: number;
  preferredTime?: string;
  status: string;
  createdAt: string;
}

interface Provider {
  id: string;
  hourlyRate: number;
  yearsExperience: number;
  rating: number;
  user: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  expertise: string[];
}

export default function UnmatchedRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<UnmatchedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<UnmatchedRequest | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

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

    fetchUnmatchedRequests();
  }, [session, status, router]);

  const fetchUnmatchedRequests = async () => {
    try {
      const response = await fetch('/api/employee/unmatched-requests');
      const data = await response.json();
      
      if (response.ok) {
        setRequests(data.requests);
      } else {
        console.error('Error fetching requests:', data.error);
      }
    } catch (error) {
      console.error('Error fetching unmatched requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async (expertise: string) => {
    setLoadingProviders(true);
    try {
      const response = await fetch(`/api/providers/search?expertise=${encodeURIComponent(expertise)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      } else {
        console.error('Failed to fetch providers');
        setProviders([]);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
      setProviders([]);
    } finally {
      setLoadingProviders(false);
    }
  };

  const fetchAllProviders = async () => {
    setLoadingProviders(true);
    try {
      const response = await fetch('/api/providers/search?limit=50');
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      } else {
        console.error('Failed to fetch all providers');
      }
    } catch (error) {
      console.error('Error fetching all providers:', error);
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleAssignRequest = async (request: UnmatchedRequest) => {
    setSelectedRequest(request);
    setShowAssignModal(true);
    await fetchProviders(request.expertise);
  };

  const handleAssignToProvider = async (providerId: string) => {
    if (!selectedRequest) return;
    
    setProcessingAction('assign');
    try {
      const response = await fetch('/api/employee/unmatched-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: 'assign_provider',
          providerId
        })
      });

      if (response.ok) {
        // Remove the assigned request from the list
        setRequests(requests.filter(r => r.id !== selectedRequest.id));
        setShowAssignModal(false);
        setSelectedRequest(null);
        alert('Request assigned successfully!');
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error assigning request:', error);
      alert('Failed to assign request');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to reject this request? The seeker will be notified.')) {
      return;
    }
    
    setProcessingAction('reject');
    try {
      const response = await fetch('/api/employee/unmatched-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action: 'reject'
        })
      });

      if (response.ok) {
        // Remove the rejected request from the list
        setRequests(requests.filter(r => r.id !== requestId));
        alert('Request rejected successfully!');
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
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

  const filteredRequests = requests.filter(request =>
    request.expertise.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.seekerEmail.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unmatched Requests</h1>
          <p className="text-gray-900">Handle seeker requests that need manual matching</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/employee')}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-900" />
            <input
              type="text"
              placeholder="Search by expertise or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-lg shadow-sm">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="w-16 h-16 text-gray-900 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Unmatched Requests</h3>
            <p className="text-gray-900">All requests have been processed or there are no pending requests.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRequests.map((request) => (
              <div key={request.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <User className="w-5 h-5 text-gray-900" />
                      <span className="font-medium text-gray-900">{request.seekerEmail}</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {request.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Search className="w-4 h-4 text-gray-900" />
                        <span className="text-sm text-gray-900">Expertise:</span>
                        <span className="text-sm font-medium text-gray-900">{request.expertise}</span>
                      </div>
                      
                      {request.budget && (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-gray-900" />
                          <span className="text-sm text-gray-900">Budget:</span>
                          <span className="text-sm font-medium text-gray-900">₹{request.budget}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-900" />
                        <span className="text-sm text-gray-900">Created:</span>
                        <span className="text-sm font-medium text-gray-900">{formatDate(request.createdAt)}</span>
                      </div>
                    </div>

                    {request.preferredTime && (
                      <div className="flex items-center space-x-2 mb-4">
                        <Calendar className="w-4 h-4 text-gray-900" />
                        <span className="text-sm text-gray-900">Preferred Time:</span>
                        <span className="text-sm font-medium text-gray-900">{formatDate(request.preferredTime)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleAssignRequest(request)}
                      disabled={processingAction === 'assign'}
                      className="flex items-center space-x-1 bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{processingAction === 'assign' ? 'Assigning...' : 'Assign'}</span>
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      disabled={processingAction === 'reject'}
                      className="flex items-center space-x-1 bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{processingAction === 'reject' ? 'Rejecting...' : 'Reject'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Provider Modal */}
      {showAssignModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Assign Provider</h3>
                <p className="text-gray-900">Select a provider for {selectedRequest.expertise} consultation</p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedRequest(null);
                  setProviders([]);
                }}
                className="text-gray-900 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-80">
              {/* Action buttons */}
              <div className="flex gap-3 mb-4 pb-4 border-b border-gray-200">
                <button
                  onClick={() => router.push(`/provider/create?expertise=${encodeURIComponent(selectedRequest.expertise)}&redirect=unmatched-requests`)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Create New Provider
                </button>
                <button
                  onClick={async () => {
                    await fetchAllProviders();
                  }}
                  disabled={loadingProviders}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  View All Providers
                </button>
                <button
                  onClick={async () => {
                    await fetchProviders(selectedRequest.expertise);
                  }}
                  disabled={loadingProviders}
                  className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 disabled:opacity-50"
                >
                  Search by Expertise
                </button>
              </div>

              {loadingProviders ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : providers.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-900 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Providers Found</h4>
                  <p className="text-gray-900">Use the options above to create a new provider or view all available providers.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {providers.map((provider) => (
                    <div key={provider.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {provider.user.profile.firstName} {provider.user.profile.lastName}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-900 mt-2">
                            <span>₹{provider.hourlyRate}/hour</span>
                            <span>{provider.yearsExperience} years experience</span>
                            <span>⭐ {provider.rating}</span>
                          </div>
                          <div className="flex gap-1 mt-2">
                            {provider.expertise.slice(0, 3).map((skill, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAssignToProvider(provider.id)}
                          disabled={processingAction === 'assign'}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingAction === 'assign' ? 'Assigning...' : 'Assign'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}