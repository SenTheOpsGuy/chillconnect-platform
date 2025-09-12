'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  AlertTriangle, 
  UserCheck, 
  MessageSquare, 
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar
} from 'lucide-react';

interface SystemIssue {
  id: string;
  type: 'verification' | 'dispute';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
  data: any; // Additional data specific to the issue type
}

export default function AdminIssuesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [issues, setIssues] = useState<SystemIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchIssues();
  }, [session, status, router]);

  const fetchIssues = async () => {
    try {
      const response = await fetch('/api/admin/issues');
      const data = await response.json();
      
      if (response.ok) {
        setIssues(data.issues || []);
      } else {
        setError(data.error || 'Failed to load issues');
      }
    } catch (err) {
      setError('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveVerification = async (providerId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/admin/verification/${providerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        // Refresh issues
        fetchIssues();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update verification');
      }
    } catch (err) {
      alert('Failed to update verification');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'medium': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'low': return <UserCheck className="w-5 h-5 text-blue-600" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Issues</h3>
          <p className="text-gray-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">System Issues</h1>
              <p className="text-gray-800">Review and resolve platform issues requiring attention</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{issues.length}</p>
              <p className="text-gray-800 text-sm">Total Issues</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {issues.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Issues Found</h3>
            <p className="text-gray-800">
              Great! All system issues have been resolved. The platform is running smoothly.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {issues.map((issue) => (
              <div key={issue.id} className={`bg-white rounded-lg shadow-sm border-l-4 ${
                issue.type === 'verification' ? 'border-l-blue-500' : 'border-l-red-500'
              }`}>
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        {getSeverityIcon(issue.severity)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{issue.title}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(issue.severity)}`}>
                            {issue.severity.toUpperCase()}
                          </span>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            {issue.type.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-800 mb-3">{issue.description}</p>
                        <div className="flex items-center text-sm text-gray-800">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>Created: {new Date(issue.createdAt).toLocaleString()}</span>
                        </div>
                        
                        {/* Issue-specific details */}
                        {issue.type === 'verification' && issue.data && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3 mb-3">
                              <User className="w-5 h-5 text-gray-600" />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {issue.data.firstName} {issue.data.lastName}
                                </p>
                                <p className="text-sm text-gray-800">{issue.data.email}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-900">Expertise:</span>
                                <p className="text-gray-800">{issue.data.expertise?.join(', ') || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-900">Experience:</span>
                                <p className="text-gray-800">{issue.data.yearsExperience} years</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-900">Hourly Rate:</span>
                                <p className="text-gray-800">₹{issue.data.hourlyRate}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-900">Status:</span>
                                <p className="text-gray-800">{issue.data.verificationStatus}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {issue.type === 'dispute' && issue.data && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <div className="text-sm">
                              <p><span className="font-medium">Booking ID:</span> {issue.data.bookingId}</p>
                              <p><span className="font-medium">Reason:</span> {issue.data.reason}</p>
                              <p><span className="font-medium">Status:</span> {issue.data.status}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex flex-col space-y-2 ml-4">
                      {issue.type === 'verification' && (
                        <>
                          <button
                            onClick={() => handleResolveVerification(issue.data.id, 'approve')}
                            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleResolveVerification(issue.data.id, 'reject')}
                            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                      
                      {issue.type === 'dispute' && (
                        <Link
                          href={`/disputes/${issue.id}`}
                          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>View Dispute</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}