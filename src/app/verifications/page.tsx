'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Shield, 
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Eye,
  Calendar
} from 'lucide-react';

interface Verification {
  id: string;
  providerId: string;
  provider: {
    name: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      bio?: string;
    };
  };
  documentType: 'IDENTITY' | 'EDUCATION' | 'PROFESSIONAL' | 'CERTIFICATION';
  documentUrl: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REQUIRES_REVIEW';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  comments?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export default function VerificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [reviewComments, setReviewComments] = useState('');

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

    fetchVerifications();
  }, [session, status, router]);

  const fetchVerifications = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filterStatus && filterStatus !== 'all') {
        queryParams.append('status', filterStatus);
      }
      if (filterType && filterType !== 'all') {
        queryParams.append('type', filterType);
      }

      const response = await fetch(`/api/employee/verifications?${queryParams}`);
      const data = await response.json();
      
      if (response.ok) {
        setVerifications(data.verifications);
      } else {
        console.error('Failed to fetch verifications:', data.error);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching verifications:', error);
      setLoading(false);
    }
  };

  const handleApproveVerification = async (verificationId: string) => {
    try {
      const response = await fetch('/api/employee/verifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId,
          status: 'VERIFIED',
          comments: reviewComments || 'Verification approved'
        })
      });

      if (response.ok) {
        setVerifications(prev => 
          prev.map(verification => 
            verification.id === verificationId 
              ? { 
                  ...verification, 
                  status: 'VERIFIED' as const,
                  reviewedAt: new Date().toISOString(),
                  reviewedBy: session?.user?.email || '',
                  comments: reviewComments || 'Verification approved'
                }
              : verification
          )
        );
        setSelectedVerification(null);
        setReviewComments('');
      } else {
        const data = await response.json();
        console.error('Failed to approve verification:', data.error);
      }
    } catch (error) {
      console.error('Error approving verification:', error);
    }
  };

  const handleRejectVerification = async (verificationId: string) => {
    try {
      if (!reviewComments.trim()) {
        console.warn('Please provide comments for rejection');
        return;
      }
      
      const response = await fetch('/api/employee/verifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId,
          status: 'REJECTED',
          comments: reviewComments
        })
      });

      if (response.ok) {
        setVerifications(prev => 
          prev.map(verification => 
            verification.id === verificationId 
              ? { 
                  ...verification, 
                  status: 'REJECTED' as const,
                  reviewedAt: new Date().toISOString(),
                  reviewedBy: session?.user?.email || '',
                  comments: reviewComments
                }
            : verification
        )
      );
        setSelectedVerification(null);
        setReviewComments('');
      } else {
        const data = await response.json();
        console.error('Failed to reject verification:', data.error);
      }
    } catch (error) {
      console.error('Error rejecting verification:', error);
    }
  };

  const handleRequireReview = async (verificationId: string) => {
    try {
      if (!reviewComments.trim()) {
        console.warn('Please provide comments for review request');
        return;
      }
      
      const response = await fetch('/api/employee/verifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId,
          status: 'REQUIRES_REVIEW',
          comments: reviewComments
        })
      });

      if (response.ok) {
        setVerifications(prev => 
          prev.map(verification => 
            verification.id === verificationId 
              ? { 
                  ...verification, 
                  status: 'REQUIRES_REVIEW' as const,
                  reviewedAt: new Date().toISOString(),
                  reviewedBy: session?.user?.email || '',
                  comments: reviewComments
                }
              : verification
          )
        );
        setSelectedVerification(null);
        setReviewComments('');
      } else {
        const data = await response.json();
        console.error('Failed to request review:', data.error);
      }
    } catch (error) {
      console.error('Error requesting review:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'REQUIRES_REVIEW':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'IDENTITY':
        return 'Identity Proof';
      case 'EDUCATION':
        return 'Education Certificate';
      case 'PROFESSIONAL':
        return 'Professional License';
      case 'CERTIFICATION':
        return 'Professional Certification';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredVerifications = verifications.filter(verification => {
    const matchesSearch = 
      verification.provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      verification.provider.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      verification.documentType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || verification.status === filterStatus;
    const matchesType = filterType === 'all' || verification.documentType === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 text-gray-900 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Provider Verifications</h1>
                <p className="text-gray-900">Review and approve provider document submissions</p>
              </div>
            </div>
            <div className="text-sm text-gray-800">
              {filteredVerifications.length} of {verifications.length} verifications
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-900 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by provider name, email, or document type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="REQUIRES_REVIEW">Requires Review</option>
                </select>
                
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="all">All Types</option>
                  <option value="IDENTITY">Identity</option>
                  <option value="EDUCATION">Education</option>
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="CERTIFICATION">Certification</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {filteredVerifications.map((verification) => (
            <div key={verification.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {verification.provider.profile.firstName} {verification.provider.profile.lastName}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(verification.priority)}`}>
                      {verification.priority}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(verification.status)}`}>
                      {verification.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-900 mb-3">
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{verification.provider.email}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FileText className="w-4 h-4" />
                      <span>{getDocumentTypeLabel(verification.documentType)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Submitted: {formatDate(verification.submittedAt)}</span>
                    </div>
                  </div>

                  {verification.provider.profile.bio && (
                    <p className="text-gray-900 mb-3 text-sm">{verification.provider.profile.bio}</p>
                  )}

                  {verification.reviewedAt && (
                    <div className="text-sm text-gray-800 mb-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Reviewed: {formatDate(verification.reviewedAt)} by {verification.reviewedBy}</span>
                      </div>
                      {verification.comments && (
                        <div className="mt-1 text-gray-900">
                          <strong>Comments:</strong> {verification.comments}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700">
                    <Eye className="w-4 h-4" />
                    <span>View Document</span>
                  </button>
                  <button className="flex items-center space-x-2 text-gray-900 hover:text-gray-900">
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>

                {verification.status === 'PENDING' && (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedVerification(verification)}
                      className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Review</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredVerifications.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Shield className="w-12 h-12 text-gray-900 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No verifications found</h3>
              <p className="text-gray-900">
                {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'All provider verifications are up to date'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Review Verification</h3>
              <button
                onClick={() => {
                  setSelectedVerification(null);
                  setReviewComments('');
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-900 mb-2">
                Provider: {selectedVerification.provider.name}
              </p>
              <p className="text-sm text-gray-900 mb-4">
                Document: {getDocumentTypeLabel(selectedVerification.documentType)}
              </p>
              
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Review Comments
              </label>
              <textarea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="Add your review comments here..."
              />
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => handleRequireReview(selectedVerification.id)}
                className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Require Review</span>
              </button>
              <button
                onClick={() => handleRejectVerification(selectedVerification.id)}
                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>
              <button
                onClick={() => handleApproveVerification(selectedVerification.id)}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}