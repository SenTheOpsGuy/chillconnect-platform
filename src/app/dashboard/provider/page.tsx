'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Calendar, Users, DollarSign, Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface ProviderStats {
  totalEarnings: number;
  totalSessions: number;
  averageRating: number;
  upcomingSessions: number;
  pendingBookings: number;
}

export default function ProviderDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<ProviderStats>({
    totalEarnings: 0,
    totalSessions: 0,
    averageRating: 0,
    upcomingSessions: 0,
    pendingBookings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'PROVIDER') {
      router.push('/dashboard');
      return;
    }

    // Fetch provider stats
    fetchProviderStats();
  }, [session, status, router]);

  const fetchProviderStats = async () => {
    try {
      const response = await fetch('/api/dashboard/provider-stats');
      const data = await response.json();
      
      if (response.ok) {
        setStats({
          totalEarnings: data.totalEarnings || 0,
          totalSessions: data.completedSessions || 0,
          averageRating: data.averageRating || 0,
          upcomingSessions: data.upcomingBookings || 0,
          pendingBookings: data.todaysSessions || 0
        });
      } else {
        console.error('Failed to fetch provider stats:', data.error);
        // Set default values on error
        setStats({
          totalEarnings: 0,
          totalSessions: 0,
          averageRating: 0,
          upcomingSessions: 0,
          pendingBookings: 0
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching provider stats:', error);
      // Set default values on error
      setStats({
        totalEarnings: 0,
        totalSessions: 0,
        averageRating: 0,
        upcomingSessions: 0,
        pendingBookings: 0
      });
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
        <h1 className="text-2xl font-bold text-gray-900">Provider Dashboard</h1>
        <p className="text-gray-900">Welcome back! Here's your consultation overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats.totalEarnings.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageRating}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Upcoming Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.upcomingSessions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link 
              href="/schedule"
              className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors block"
            >
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">Update Availability</div>
                  <div className="text-sm text-gray-800">Manage your consultation schedule</div>
                </div>
              </div>
            </Link>
            <Link 
              href="/earnings"
              className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors block"
            >
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">View Earnings</div>
                  <div className="text-sm text-gray-800">Check your income and payouts</div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-sm">New booking request</div>
                <div className="text-xs text-gray-800">2 hours ago</div>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">New</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-sm">Session completed</div>
                <div className="text-xs text-gray-800">5 hours ago</div>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Bookings Alert */}
      {stats.pendingBookings > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Calendar className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                You have {stats.pendingBookings} pending booking{stats.pendingBookings !== 1 ? 's' : ''}
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Review and respond to booking requests to confirm your sessions.
              </p>
              <div className="mt-2">
                <Link 
                  href="/bookings"
                  className="text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded inline-block"
                >
                  View Pending Bookings
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}