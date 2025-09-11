'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  Star, 
  MessageCircle, 
  Search,
  TrendingUp,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Booking {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  amount: number;
  meetUrl?: string;
  provider: {
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
    expertise: string[];
  };
}

interface Stats {
  totalBookings: number;
  completedSessions: number;
  totalSpent: number;
  averageRating: number;
}

export default function SeekerDashboard() {
  const { data: session } = useSession();
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalBookings: 0,
    completedSessions: 0,
    totalSpent: 0,
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch recent bookings
      const bookingsResponse = await fetch('/api/bookings/recent');
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json();
        setRecentBookings(bookingsData.bookings);
      }

      // Fetch stats
      const statsResponse = await fetch('/api/dashboard/seeker-stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'text-green-600 bg-green-100';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100';
      case 'COMPLETED':
        return 'text-blue-600 bg-blue-100';
      case 'CANCELLED':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-900 bg-gray-100';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session?.user?.name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-gray-900">Here's your consultation overview</p>
        </div>
        <Link
          href="/search"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2"
        >
          <Search size={20} />
          Find Expert
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-800">Total Bookings</p>
              <p className="text-2xl font-bold">{stats.totalBookings}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-800">Completed Sessions</p>
              <p className="text-2xl font-bold">{stats.completedSessions}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-800">Total Spent</p>
              <p className="text-2xl font-bold">₹{stats.totalSpent.toLocaleString()}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-800">Average Rating</p>
              <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
            </div>
            <Star className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
            <Link href="/bookings" className="text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
        </div>

        {recentBookings.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-900 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings yet</h3>
            <p className="text-gray-900 mb-6">Start by finding an expert for your needs</p>
            <Link
              href="/search"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
            >
              Find Expert
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {booking.provider.user.profile.firstName} {booking.provider.user.profile.lastName}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-900 mt-1">
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            {formatDate(booking.startTime)}
                          </div>
                          <div>₹{booking.amount}</div>
                          <div className="flex gap-1">
                            {booking.provider.expertise.slice(0, 2).map((skill, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                        {booking.status === 'CONFIRMED' && booking.meetUrl && (
                          <a
                            href={booking.meetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
                          >
                            Join Meeting
                          </a>
                        )}
                        {booking.status === 'COMPLETED' && (
                          <Link
                            href={`/chat/${booking.id}`}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center gap-1"
                          >
                            <MessageCircle size={16} />
                            Chat
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/search"
          className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-lg p-6 text-center hover:border-blue-300 hover:bg-blue-100 transition-colors"
        >
          <Search className="w-8 h-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold text-blue-900 mb-2">Find New Expert</h3>
          <p className="text-blue-700 text-sm">Search for consultation services</p>
        </Link>

        <Link
          href="/bookings"
          className="bg-green-50 border-2 border-dashed border-green-200 rounded-lg p-6 text-center hover:border-green-300 hover:bg-green-100 transition-colors"
        >
          <Calendar className="w-8 h-8 text-green-600 mx-auto mb-3" />
          <h3 className="font-semibold text-green-900 mb-2">Manage Bookings</h3>
          <p className="text-green-700 text-sm">View and manage your consultations</p>
        </Link>

        <Link
          href="/profile"
          className="bg-purple-50 border-2 border-dashed border-purple-200 rounded-lg p-6 text-center hover:border-purple-300 hover:bg-purple-100 transition-colors"
        >
          <AlertCircle className="w-8 h-8 text-purple-600 mx-auto mb-3" />
          <h3 className="font-semibold text-purple-900 mb-2">Update Profile</h3>
          <p className="text-purple-700 text-sm">Keep your information current</p>
        </Link>
      </div>
    </div>
  );
}