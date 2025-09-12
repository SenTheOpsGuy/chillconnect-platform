'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Calendar, Clock, Video, User, Star, MessageCircle, FileText } from 'lucide-react';
import Link from 'next/link';

interface SessionData {
  id: string;
  bookingId: string;
  startedAt: string | null;
  endedAt: string | null;
  duration: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED';
  recordingUrl: string | null;
  provider: {
    name: string;
    expertise: string[];
    rating: number;
  };
  seeker: {
    name: string;
    email: string;
  };
  booking: {
    amount: number;
    startTime: string;
    endTime: string;
    meetUrl: string | null;
  };
}

export default function SessionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'all'>('upcoming');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    fetchSessions();
  }, [session, status, router]);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      
      if (response.ok) {
        // Ensure sessions is an array and has proper structure
        const sessionsData = Array.isArray(data.sessions) ? data.sessions : [];
        // Add null checks for each session item
        const validSessions = sessionsData.map(session => ({
          ...session,
          provider: session.provider || { name: 'Unknown Provider', expertise: [], rating: 0 },
          seeker: session.seeker || { name: 'Unknown User', email: '' },
          booking: session.booking || { amount: 0, startTime: new Date().toISOString(), endTime: new Date().toISOString(), meetUrl: null }
        }));
        setSessions(validSessions);
      } else {
        console.error('Failed to fetch sessions:', data.error);
        setSessions([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      // Fall back to empty array with proper structure
      setSessions([]);
      setLoading(false);
    }
  };

  // Keep the old mock data as fallback for now
  const fetchSessionsOld = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockSessions: SessionData[] = [
        {
          id: 'session_1',
          bookingId: 'booking_1',
          startedAt: null,
          endedAt: null,
          duration: 0,
          status: 'SCHEDULED',
          recordingUrl: null,
          provider: {
            name: 'Tax Expert',
            expertise: ['Tax Consulting', 'Financial Planning'],
            rating: 4.8
          },
          seeker: {
            name: 'John Doe',
            email: 'john@example.com'
          },
          booking: {
            amount: 2500,
            startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(), // Tomorrow + 1 hour
            meetUrl: 'https://meet.google.com/abc-defg-hij'
          }
        },
        {
          id: 'session_2',
          bookingId: 'booking_2',
          startedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          endedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          duration: 60,
          status: 'COMPLETED',
          recordingUrl: 'https://example.com/recording/session_2',
          provider: {
            name: 'Legal Advisor',
            expertise: ['Legal Consulting', 'Business Law'],
            rating: 4.6
          },
          seeker: {
            name: 'Jane Smith',
            email: 'jane@example.com'
          },
          booking: {
            amount: 3500,
            startTime: new Date(Date.now() - 7200000).toISOString(),
            endTime: new Date(Date.now() - 3600000).toISOString(),
            meetUrl: null
          }
        }
      ];
      
      setSessions(mockSessions);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      setLoading(false);
    }
  };

  const filteredSessions = (Array.isArray(sessions) ? sessions : []).filter(sessionItem => {
    if (!sessionItem || !sessionItem.status) return false;
    
    switch (activeTab) {
      case 'upcoming':
        return sessionItem.status === 'SCHEDULED' || sessionItem.status === 'IN_PROGRESS';
      case 'completed':
        return sessionItem.status === 'COMPLETED';
      default:
        return true;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-900';
      case 'MISSED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-900';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Sessions</h1>
          <p className="text-gray-900">View and manage your consultation sessions</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { key: 'upcoming', label: 'Upcoming', count: (Array.isArray(sessions) ? sessions : []).filter(s => s && (s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS')).length },
                { key: 'completed', label: 'Completed', count: (Array.isArray(sessions) ? sessions : []).filter(s => s && s.status === 'COMPLETED').length },
                { key: 'all', label: 'All Sessions', count: Array.isArray(sessions) ? sessions.length : 0 }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-900 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === tab.key ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-900'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-900 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
            <p className="text-gray-900 mb-6">
              {activeTab === 'upcoming' ? 'You have no upcoming sessions.' : 
               activeTab === 'completed' ? 'You have no completed sessions yet.' : 
               'You have no sessions yet.'}
            </p>
            <Link
              href="/search"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Find Experts
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((sessionItem) => (
              <div key={sessionItem.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {session?.user?.role === 'PROVIDER' 
                              ? sessionItem.seeker?.name || 'Unknown User'
                              : sessionItem.provider?.name || 'Unknown Provider'
                            }
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sessionItem.status)}`}>
                              {sessionItem.status.replace('_', ' ')}
                            </span>
                            {session?.user?.role !== 'PROVIDER' && (
                              <div className="flex items-center space-x-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="text-sm text-gray-900">{sessionItem.provider?.rating || 'N/A'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">₹{sessionItem.booking.amount.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Session Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-gray-900" />
                        <div>
                          <p className="text-sm text-gray-900">Scheduled Time</p>
                          <p className="font-medium text-gray-900">{formatDateTime(sessionItem.booking.startTime)}</p>
                        </div>
                      </div>

                      {sessionItem.status === 'COMPLETED' && sessionItem.startedAt && sessionItem.endedAt && (
                        <div className="flex items-center space-x-3">
                          <Clock className="w-5 h-5 text-gray-900" />
                          <div>
                            <p className="text-sm text-gray-900">Duration</p>
                            <p className="font-medium text-gray-900">{sessionItem.duration} minutes</p>
                          </div>
                        </div>
                      )}

                      {session?.user?.role !== 'PROVIDER' && (
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-gray-900" />
                          <div>
                            <p className="text-sm text-gray-900">Expertise</p>
                            <p className="font-medium text-gray-900">{sessionItem.provider?.expertise?.join(', ') || 'N/A'}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-4">
                      {sessionItem.status === 'SCHEDULED' && sessionItem.booking.meetUrl && (
                        <Link
                          href={sessionItem.booking.meetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Join Meeting
                        </Link>
                      )}

                      {sessionItem.status === 'IN_PROGRESS' && (
                        <Link
                          href={`/chat/${sessionItem.bookingId}`}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Open Chat
                        </Link>
                      )}

                      {sessionItem.status === 'COMPLETED' && (
                        <>
                          {sessionItem.recordingUrl && (
                            <Link
                              href={sessionItem.recordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                              <Video className="w-4 h-4 mr-2" />
                              View Recording
                            </Link>
                          )}
                          <Link
                            href={`/feedback/${sessionItem.bookingId}`}
                            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                          >
                            <Star className="w-4 h-4 mr-2" />
                            Leave Feedback
                          </Link>
                        </>
                      )}

                      <Link
                        href={`/bookings?booking_id=${sessionItem.bookingId}`}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50"
                      >
                        View Booking Details
                      </Link>
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