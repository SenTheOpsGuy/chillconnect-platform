'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Download, TrendingUp, Star, Award, DollarSign, Clock, Users } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, RadialBarChart, RadialBar } from 'recharts';

interface PerformanceData {
  totalProviders: number;
  averageRating: number;
  totalEarnings: number;
  completionRate: number;
  topProviders: Array<{ 
    id: string;
    name: string; 
    rating: number; 
    totalSessions: number; 
    earnings: number; 
    expertise: string[];
    completionRate: number;
    responseTime: number;
  }>;
  ratingDistribution: Array<{ rating: string; count: number }>;
  earningsDistribution: Array<{ range: string; count: number; percentage: number }>;
  performanceMetrics: {
    avgResponseTime: number;
    customerSatisfaction: number;
    repeatBookings: number;
    avgSessionDuration: number;
  };
  categoryPerformance: Array<{ category: string; avgRating: number; totalSessions: number; revenue: number }>;
  monthlyPerformance: Array<{ month: string; avgRating: number; totalSessions: number; earnings: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function PerformanceReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<PerformanceData | null>(null);
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

    fetchPerformanceData();
  }, [session, status, router]);

  const fetchPerformanceData = async () => {
    try {
      const mockData: PerformanceData = {
        totalProviders: 189,
        averageRating: 4.6,
        totalEarnings: 2088263,
        completionRate: 84.1,
        topProviders: [
          {
            id: 'cmfdbauem0003vvgzl9l28naf',
            name: 'Tax Expert',
            rating: 4.8,
            totalSessions: 145,
            earnings: 362500,
            expertise: ['Tax Consulting', 'Financial Planning'],
            completionRate: 96,
            responseTime: 2.3
          },
          {
            id: 'cmfdbmmdk000dvvgzpncpwy72',
            name: 'Legal Advisor',
            rating: 4.7,
            totalSessions: 123,
            earnings: 430500,
            expertise: ['Legal Consulting', 'Business Law'],
            completionRate: 94,
            responseTime: 1.8
          },
          {
            id: 'provider3',
            name: 'Finance Pro',
            rating: 4.6,
            totalSessions: 108,
            earnings: 270000,
            expertise: ['Financial Planning', 'Investment'],
            completionRate: 92,
            responseTime: 3.1
          },
          {
            id: 'provider4',
            name: 'Business Coach',
            rating: 4.5,
            totalSessions: 89,
            earnings: 222500,
            expertise: ['Business Strategy', 'Consulting'],
            completionRate: 89,
            responseTime: 2.7
          },
          {
            id: 'provider5',
            name: 'Investment Guru',
            rating: 4.4,
            totalSessions: 76,
            earnings: 190000,
            expertise: ['Investment', 'Portfolio Management'],
            completionRate: 87,
            responseTime: 4.2
          }
        ],
        ratingDistribution: [
          { rating: '5 Stars', count: 89 },
          { rating: '4-5 Stars', count: 76 },
          { rating: '3-4 Stars', count: 18 },
          { rating: '2-3 Stars', count: 4 },
          { rating: '1-2 Stars', count: 2 }
        ],
        earningsDistribution: [
          { range: '₹0-50K', count: 45, percentage: 24 },
          { range: '₹50K-100K', count: 56, percentage: 30 },
          { range: '₹100K-200K', count: 38, percentage: 20 },
          { range: '₹200K-300K', count: 28, percentage: 15 },
          { range: '₹300K+', count: 22, percentage: 11 }
        ],
        performanceMetrics: {
          avgResponseTime: 2.8,
          customerSatisfaction: 92.5,
          repeatBookings: 68,
          avgSessionDuration: 75
        },
        categoryPerformance: [
          { category: 'Tax Consulting', avgRating: 4.7, totalSessions: 456, revenue: 1140000 },
          { category: 'Legal Advice', avgRating: 4.6, totalSessions: 312, revenue: 1092000 },
          { category: 'Financial Planning', avgRating: 4.5, totalSessions: 234, revenue: 585000 },
          { category: 'Business Strategy', avgRating: 4.4, totalSessions: 189, revenue: 472500 }
        ],
        monthlyPerformance: [
          { month: 'Jan', avgRating: 4.5, totalSessions: 423, earnings: 293250 },
          { month: 'Feb', avgRating: 4.6, totalSessions: 456, earnings: 330650 },
          { month: 'Mar', avgRating: 4.6, totalSessions: 512, earnings: 350200 },
          { month: 'Apr', avgRating: 4.7, totalSessions: 489, earnings: 378250 },
          { month: 'May', avgRating: 4.6, totalSessions: 534, earnings: 406300 },
          { month: 'Jun', avgRating: 4.6, totalSessions: 462, earnings: 329613 }
        ]
      };
      
      setData(mockData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load performance data');
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Performance Data Unavailable</h3>
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
              <h1 className="text-2xl font-bold text-gray-900">Provider Performance</h1>
              <p className="text-gray-900">Ratings, earnings, and performance metrics</p>
            </div>
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/reports/export', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reportType: 'performance' })
                  });
                  
                  if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `performance_report_${new Date().toISOString().split('T')[0]}.csv`;
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
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Key Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 mb-1">Total Providers</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalProviders}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+12 this month</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 mb-1">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900">{data.averageRating}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-900">Across all providers</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 mb-1">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalEarnings)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-900">Provider payouts</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 mb-1">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{data.completionRate}%</p>
              </div>
              <Award className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-900">Sessions completed</span>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Rating Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.ratingDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Earnings Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.earningsDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.range} (${entry.percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.earningsDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Performance Trend */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Performance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthlyPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value, name) => 
                  name === 'earnings' ? formatCurrency(Number(value)) : 
                  name === 'avgRating' ? Number(value).toFixed(1) : value
                } />
                <Line type="monotone" dataKey="avgRating" stroke="#F59E0B" name="Average Rating" strokeWidth={2} />
                <Line type="monotone" dataKey="totalSessions" stroke="#3B82F6" name="Total Sessions" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Category Performance */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.categoryPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value, name) => 
                  name === 'revenue' ? formatCurrency(Number(value)) : 
                  name === 'avgRating' ? Number(value).toFixed(1) : value
                } />
                <Bar dataKey="avgRating" fill="#10B981" name="Average Rating" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Response Time</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{data.performanceMetrics.avgResponseTime}h</p>
                <p className="text-sm text-blue-700">Average response</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Star className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">Satisfaction</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{data.performanceMetrics.customerSatisfaction}%</p>
                <p className="text-sm text-green-700">Customer satisfaction</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-900">Repeat Bookings</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">{data.performanceMetrics.repeatBookings}%</p>
                <p className="text-sm text-purple-700">Return customers</p>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <span className="font-medium text-orange-900">Session Duration</span>
                </div>
                <p className="text-2xl font-bold text-orange-900">{data.performanceMetrics.avgSessionDuration}m</p>
                <p className="text-sm text-orange-700">Average duration</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Revenue Breakdown</h3>
            <div className="space-y-3">
              {data.categoryPerformance.map((category) => (
                <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{category.category}</p>
                    <p className="text-sm text-gray-900">{category.totalSessions} sessions</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(category.revenue)}</p>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-1" />
                      <span className="text-sm text-gray-900">{category.avgRating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Providers Table */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Providers</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Sessions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Earnings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Completion</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Response Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.topProviders.map((provider, index) => (
                  <tr key={provider.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">#{index + 1}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{provider.name}</div>
                          <div className="text-sm text-gray-900">{provider.expertise.join(', ')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="text-sm text-gray-900">{provider.rating}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{provider.totalSessions}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(provider.earnings)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {provider.completionRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{provider.responseTime}h</td>
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