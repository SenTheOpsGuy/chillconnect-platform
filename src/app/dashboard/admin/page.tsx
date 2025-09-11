'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  TrendingUp,
  UserCheck,
  AlertCircle,
  Activity,
  Globe
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalProviders: number;
  totalSeekers: number;
  totalEmployees: number;
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  activeSessions: number;
  platformGrowth: number;
  revenueGrowth: number;
  pendingIssues: number;
  pendingVerifications: number;
  disputedBookings: number;
  systemHealth: string;
  todayBookings: number;
  platformBalance: number;
  bookingCompletionRate: number;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalProviders: 0,
    totalSeekers: 0,
    totalEmployees: 0,
    totalBookings: 0,
    completedBookings: 0,
    thisMonthRevenue: 0,
    lastMonthRevenue: 0,
    revenueGrowth: 0,
    pendingVerifications: 0,
    disputedBookings: 0,
    todayBookings: 0,
    platformBalance: 0,
    bookingCompletionRate: 0,
    totalRevenue: 0,
    activeSessions: 0,
    platformGrowth: 0,
    pendingIssues: 0,
    systemHealth: 'Good'
  });
  const [loading, setLoading] = useState(true);

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

    // Fetch admin stats
    fetchAdminStats();
  }, [session, status, router]);

  const fetchAdminStats = async () => {
    try {
      const response = await fetch('/api/dashboard/admin-stats');
      const data = await response.json();
      
      if (response.ok) {
        setStats(data.stats);
      } else {
        console.error('Failed to fetch admin stats:', data.error);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
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
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-900">Platform overview and system management.</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Active Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeSessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">User Growth (Monthly)</p>
              <p className={`text-2xl font-bold ${stats.platformGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.platformGrowth >= 0 ? '+' : ''}{stats.platformGrowth}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Providers</span>
              <span className="font-semibold text-gray-900">{stats.totalProviders}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Seekers</span>
              <span className="font-semibold text-gray-900">{stats.totalSeekers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Employees</span>
              <span className="font-semibold text-gray-900">{stats.totalEmployees}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Provider/Seeker Ratio</span>
              <span className="font-semibold text-gray-900">1:{Math.round(stats.totalSeekers / stats.totalProviders)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Status</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                stats.systemHealth === 'Good' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {stats.systemHealth}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Pending Issues</span>
              <span className="font-semibold text-gray-900">{stats.pendingIssues}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Platform Balance</span>
              <span className="font-semibold text-gray-900">₹{stats.platformBalance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Statistics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Total Bookings</span>
              <span className="font-semibold text-gray-900">{stats.totalBookings}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Completion Rate</span>
              <span className="font-semibold text-gray-900">{stats.bookingCompletionRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Today's Bookings</span>
              <span className="font-semibold text-gray-900">{stats.todayBookings}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Pending Verifications</span>
              <span className="font-semibold text-orange-600">{stats.pendingVerifications}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Disputed Bookings</span>
              <span className="font-semibold text-red-600">{stats.disputedBookings}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Management Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Management Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => router.push('/users')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Manage Users</div>
          </button>
          <button 
            onClick={() => router.push('/analytics')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Analytics</div>
          </button>
          <button 
            onClick={() => router.push('/verifications')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UserCheck className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Verifications</div>
          </button>
          <button 
            onClick={() => router.push('/admin/settings')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Globe className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">System Settings</div>
          </button>
        </div>
      </div>

      {/* Alerts and Notifications */}
      {stats.pendingIssues > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {stats.pendingIssues} system issue{stats.pendingIssues !== 1 ? 's' : ''} require attention
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Review and address these issues to maintain optimal platform performance.
              </p>
              <div className="mt-2">
                <button className="text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded">
                  View Issues
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent System Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <UserCheck className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-sm">New provider verified</div>
                <div className="text-xs text-gray-800">5 minutes ago</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-sm">User registration spike detected</div>
                <div className="text-xs text-gray-800">1 hour ago</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                <Activity className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <div className="font-medium text-sm">System backup completed</div>
                <div className="text-xs text-gray-800">2 hours ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}