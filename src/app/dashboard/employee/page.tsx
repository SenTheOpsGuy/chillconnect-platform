'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  Search, 
  Users, 
  MessageCircle, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

interface EmployeeStats {
  unmatchedRequests: number;
  pendingVerifications: number;
  activeDisputes: number;
  resolvedToday: number;
  totalProcessed: number;
}

export default function EmployeeDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<EmployeeStats>({
    unmatchedRequests: 0,
    pendingVerifications: 0,
    activeDisputes: 0,
    resolvedToday: 0,
    totalProcessed: 0
  });
  const [loading, setLoading] = useState(true);

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

    // Fetch employee stats
    fetchEmployeeStats();
  }, [session, status, router]);

  const fetchEmployeeStats = async () => {
    try {
      const response = await fetch('/api/dashboard/employee-stats');
      const data = await response.json();
      
      if (response.ok) {
        setStats({
          unmatchedRequests: data.unmatchedRequests,
          pendingVerifications: data.pendingVerifications,
          activeDisputes: data.activeDisputes,
          resolvedToday: data.resolvedToday,
          totalProcessed: data.totalProcessed
        });
      } else {
        console.error('Error fetching employee stats:', data.error);
      }
    } catch (error) {
      console.error('Error fetching employee stats:', error);
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Employee Dashboard</h1>
        <p className="text-gray-900">Manage platform operations and user requests.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <Search className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Unmatched Requests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unmatchedRequests}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Pending Verifications</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingVerifications}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <MessageCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Active Disputes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeDisputes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Resolved Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.resolvedToday}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Tasks</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">High Priority Dispute</div>
                  <div className="text-sm text-gray-900">Payment issue - urgent</div>
                </div>
              </div>
              <Link 
                href="/disputes"
                className="px-3 py-1 bg-red-100 text-red-800 text-xs rounded-full inline-block"
              >
                Handle Now
              </Link>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-500 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">Provider Verification</div>
                  <div className="text-sm text-gray-900">Documents submitted 2 hours ago</div>
                </div>
              </div>
              <Link 
                href="/verifications"
                className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full inline-block"
              >
                Review
              </Link>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center">
                <Search className="w-5 h-5 text-orange-500 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">Unmatched Request</div>
                  <div className="text-sm text-gray-900">Tax consultation needed</div>
                </div>
              </div>
              <Link 
                href="/unmatched-requests"
                className="px-3 py-1 bg-orange-100 text-orange-800 text-xs rounded-full inline-block"
              >
                Match
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Requests processed</span>
              <span className="font-semibold text-gray-900">{stats.resolvedToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Verifications completed</span>
              <span className="font-semibold text-gray-900">7</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Disputes resolved</span>
              <span className="font-semibold text-gray-900">2</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Matches made</span>
              <span className="font-semibold text-gray-900">6</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>15% increase from yesterday</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link 
            href="/unmatched-requests"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors block text-center"
          >
            <Search className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Match Requests</div>
          </Link>
          <Link 
            href="/verifications"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors block text-center"
          >
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Verify Providers</div>
          </Link>
          <Link 
            href="/messages"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors block text-center"
          >
            <MessageCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Handle Disputes</div>
          </Link>
          <Link 
            href="/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors block text-center"
          >
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">View Reports</div>
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {stats.activeDisputes > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {stats.activeDisputes} active dispute{stats.activeDisputes !== 1 ? 's' : ''} require attention
              </h3>
              <p className="mt-1 text-sm text-red-700">
                Review and resolve disputes to maintain platform quality.
              </p>
              <div className="mt-2">
                <Link 
                  href="/disputes"
                  className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded inline-block"
                >
                  View All Disputes
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}