'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Download, Calendar, Clock, TrendingUp, MapPin, Star, Users } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

interface BookingsData {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  avgBookingValue: number;
  monthlyBookings: Array<{ month: string; completed: number; cancelled: number; total: number }>;
  bookingsByCategory: Array<{ category: string; count: number; percentage: number }>;
  bookingsByTimeSlot: Array<{ timeSlot: string; bookings: number }>;
  seasonalTrends: Array<{ month: string; bookings: number; revenue: number }>;
  bookingStats: {
    avgDuration: number;
    peakHours: string;
    mostPopularDay: string;
    cancellationRate: number;
  };
  geographicData: Array<{ city: string; bookings: number; revenue: number }>;
  providerPerformance: Array<{ name: string; bookings: number; rating: number; completion: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B'];

export default function BookingsReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<BookingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login?role=employee');
      return;
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchBookingsData();
  }, [session, status, router]);

  const fetchBookingsData = async () => {
    try {
      const mockData: BookingsData = {
        totalBookings: 3420,
        completedBookings: 2876,
        cancelledBookings: 544,
        avgBookingValue: 718,
        monthlyBookings: [
          { month: 'Jan', completed: 423, cancelled: 67, total: 490 },
          { month: 'Feb', completed: 456, cancelled: 54, total: 510 },
          { month: 'Mar', completed: 512, cancelled: 88, total: 600 },
          { month: 'Apr', completed: 489, cancelled: 71, total: 560 },
          { month: 'May', completed: 534, cancelled: 86, total: 620 },
          { month: 'Jun', completed: 462, cancelled: 78, total: 540 }
        ],
        bookingsByCategory: [
          { category: 'Tax Consulting', count: 1435, percentage: 42 },
          { category: 'Legal Advice', count: 889, percentage: 26 },
          { category: 'Financial Planning', count: 684, percentage: 20 },
          { category: 'Business Strategy', count: 412, percentage: 12 }
        ],
        bookingsByTimeSlot: [
          { timeSlot: '09:00-11:00', bookings: 456 },
          { timeSlot: '11:00-13:00', bookings: 623 },
          { timeSlot: '13:00-15:00', bookings: 534 },
          { timeSlot: '15:00-17:00', bookings: 712 },
          { timeSlot: '17:00-19:00', bookings: 589 },
          { timeSlot: '19:00-21:00', bookings: 423 },
          { timeSlot: '21:00-23:00', bookings: 83 }
        ],
        seasonalTrends: [
          { month: 'Jan', bookings: 490, revenue: 351200 },
          { month: 'Feb', bookings: 510, revenue: 366180 },
          { month: 'Mar', bookings: 600, revenue: 430800 },
          { month: 'Apr', bookings: 560, revenue: 402080 },
          { month: 'May', bookings: 620, revenue: 445160 },
          { month: 'Jun', bookings: 540, revenue: 387720 }
        ],
        bookingStats: {
          avgDuration: 75,
          peakHours: '15:00-17:00',
          mostPopularDay: 'Wednesday',
          cancellationRate: 15.9
        },
        geographicData: [
          { city: 'Mumbai', bookings: 1025, revenue: 736950 },
          { city: 'Delhi', bookings: 856, revenue: 615008 },
          { city: 'Bangalore', bookings: 634, revenue: 455212 },
          { city: 'Chennai', bookings: 423, revenue: 303714 },
          { city: 'Pune', bookings: 312, revenue: 224016 },
          { city: 'Hyderabad', bookings: 170, revenue: 122060 }
        ],
        providerPerformance: [
          { name: 'Tax Expert', bookings: 145, rating: 4.8, completion: 96 },
          { name: 'Legal Advisor', bookings: 123, rating: 4.6, completion: 94 },
          { name: 'Finance Pro', bookings: 108, rating: 4.7, completion: 92 },
          { name: 'Business Coach', bookings: 89, rating: 4.5, completion: 89 },
          { name: 'Investment Guru', bookings: 76, rating: 4.4, completion: 87 }
        ]
      };
      
      setData(mockData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load bookings data');
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Bookings Data Unavailable</h3>
          <p className="text-gray-900">{error}</p>
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
            href="/reports"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bookings Reports</h1>
              <p className="text-gray-900">Trends, patterns, and booking analytics</p>
            </div>
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/reports/export', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reportType: 'bookings' })
                  });
                  
                  if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `bookings_report_${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  } else {
                    console.error('Export failed');
                  }
                } catch (error) {
                  console.error('Export error:', error);
                }
              }}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Key Booking Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 mb-1">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalBookings.toLocaleString()}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+8.2% from last period</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 mb-1">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{data.completedBookings.toLocaleString()}</p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-900">{((data.completedBookings/data.totalBookings)*100).toFixed(1)}% completion rate</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 mb-1">Cancelled</p>
                <p className="text-2xl font-bold text-gray-900">{data.cancelledBookings}</p>
              </div>
              <Users className="w-8 h-8 text-red-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-900">{data.bookingStats.cancellationRate}% cancellation rate</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 mb-1">Avg Booking Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.avgBookingValue)}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-900">Per session</span>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Bookings Trend */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Bookings Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.monthlyBookings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="completed" stackId="1" stroke="#10B981" fill="#10B981" name="Completed" />
                <Area type="monotone" dataKey="cancelled" stackId="1" stroke="#EF4444" fill="#EF4444" name="Cancelled" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bookings by Category */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bookings by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.bookingsByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.bookingsByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Time Slot Analysis */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bookings by Time Slot</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.bookingsByTimeSlot}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timeSlot" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Seasonal Revenue Trends */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Seasonal Revenue Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.seasonalTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value, name) => name === 'revenue' ? formatCurrency(Number(value)) : value} />
                <Line type="monotone" dataKey="bookings" stroke="#3B82F6" name="Bookings" strokeWidth={2} />
                <Line type="monotone" dataKey="revenue" stroke="#F59E0B" name="Revenue" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Additional Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Geographic Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Geographic Distribution</h3>
            <div className="space-y-3">
              {data.geographicData.map((city, index) => (
                <div key={city.city} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900">{city.city}</p>
                      <p className="text-sm text-gray-900">{city.bookings} bookings</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(city.revenue)}</p>
                    <p className="text-sm text-gray-900">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Statistics */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <p className="font-medium text-blue-900">Average Duration</p>
                  <p className="text-sm text-blue-700">Per session</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">{data.bookingStats.avgDuration}min</p>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <p className="font-medium text-green-900">Peak Hours</p>
                  <p className="text-sm text-green-700">Most bookings</p>
                </div>
                <p className="text-lg font-bold text-green-900">{data.bookingStats.peakHours}</p>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div>
                  <p className="font-medium text-purple-900">Popular Day</p>
                  <p className="text-sm text-purple-700">Highest bookings</p>
                </div>
                <p className="text-lg font-bold text-purple-900">{data.bookingStats.mostPopularDay}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Provider Performance */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Provider Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Bookings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.providerPerformance.map((provider, index) => (
                  <tr key={provider.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{provider.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{provider.bookings}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="text-sm text-gray-900">{provider.rating}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{provider.completion}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}