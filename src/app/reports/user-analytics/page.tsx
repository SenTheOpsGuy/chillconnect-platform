'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Download, Users, TrendingUp, UserCheck, UserPlus, Clock, Activity } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

interface UserAnalyticsData {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  retentionRate: number;
  userGrowth: Array<{ month: string; seekers: number; providers: number; total: number }>;
  userDistribution: Array<{ type: string; count: number; percentage: number }>;
  engagementMetrics: {
    dailyActive: number;
    weeklyActive: number;
    monthlyActive: number;
    avgSessionDuration: number;
  };
  acquisitionChannels: Array<{ channel: string; users: number; percentage: number }>;
  userRetention: Array<{ period: string; percentage: number }>;
  demographicData: Array<{ ageGroup: string; count: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function UserAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<UserAnalyticsData | null>(null);
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

    fetchUserAnalytics();
  }, [session, status, router]);

  const fetchUserAnalytics = async () => {
    try {
      const mockData: UserAnalyticsData = {
        totalUsers: 1247,
        activeUsers: 892,
        newUsers: 156,
        retentionRate: 68.5,
        userGrowth: [
          { month: 'Jan', seekers: 890, providers: 65, total: 955 },
          { month: 'Feb', seekers: 945, providers: 71, total: 1016 },
          { month: 'Mar', seekers: 1024, providers: 78, total: 1102 },
          { month: 'Apr', seekers: 1087, providers: 82, total: 1169 },
          { month: 'May', seekers: 1156, providers: 86, total: 1242 },
          { month: 'Jun', seekers: 1158, providers: 89, total: 1247 }
        ],
        userDistribution: [
          { type: 'Seekers', count: 1058, percentage: 85 },
          { type: 'Providers', count: 189, percentage: 15 }
        ],
        engagementMetrics: {
          dailyActive: 234,
          weeklyActive: 567,
          monthlyActive: 892,
          avgSessionDuration: 24.5
        },
        acquisitionChannels: [
          { channel: 'Organic Search', users: 523, percentage: 42 },
          { channel: 'Social Media', users: 374, percentage: 30 },
          { channel: 'Direct', users: 186, percentage: 15 },
          { channel: 'Referrals', users: 124, percentage: 10 },
          { channel: 'Paid Ads', users: 40, percentage: 3 }
        ],
        userRetention: [
          { period: 'Day 1', percentage: 85 },
          { period: 'Day 7', percentage: 72 },
          { period: 'Day 30', percentage: 68.5 },
          { period: 'Day 90', percentage: 45 },
          { period: 'Day 180', percentage: 32 }
        ],
        demographicData: [
          { ageGroup: '18-25', count: 187 },
          { ageGroup: '26-35', count: 498 },
          { ageGroup: '36-45', count: 374 },
          { ageGroup: '46-55', count: 142 },
          { ageGroup: '55+', count: 46 }
        ]
      };
      
      setData(mockData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load user analytics');
      setLoading(false);
    }
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">User Analytics Unavailable</h3>
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
              <h1 className="text-2xl font-bold text-gray-900">User Analytics</h1>
              <p className="text-gray-900">Growth, engagement, and user behavior insights</p>
            </div>
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/reports/export', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reportType: 'users' })
                  });
                  
                  if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `users_report_${new Date().toISOString().split('T')[0]}.csv`;
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
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Key User Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 mb-1">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalUsers.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+{data.newUsers} this month</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 mb-1">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{data.activeUsers.toLocaleString()}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-900">{((data.activeUsers/data.totalUsers)*100).toFixed(1)}% of total users</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 mb-1">New Users</p>
                <p className="text-2xl font-bold text-gray-900">{data.newUsers}</p>
              </div>
              <UserPlus className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-900">This month</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 mb-1">Retention Rate</p>
                <p className="text-2xl font-bold text-gray-900">{data.retentionRate}%</p>
              </div>
              <Activity className="w-8 h-8 text-orange-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-900">30-day retention</span>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* User Growth Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="seekers" stackId="1" stroke="#3B82F6" fill="#3B82F6" name="Seekers" />
                <Area type="monotone" dataKey="providers" stackId="1" stroke="#10B981" fill="#10B981" name="Providers" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* User Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.userDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, count }) => `${type}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.userDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Acquisition Channels */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Acquisition Channels</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.acquisitionChannels} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="channel" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="users" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* User Retention Curve */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Retention Curve</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.userRetention}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => `${value}%`} />
                <Line type="monotone" dataKey="percentage" stroke="#EF4444" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Engagement Metrics */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Metrics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <p className="font-medium text-blue-900">Daily Active Users</p>
                  <p className="text-sm text-blue-700">Users active in last 24h</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">{data.engagementMetrics.dailyActive}</p>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <p className="font-medium text-green-900">Weekly Active Users</p>
                  <p className="text-sm text-green-700">Users active in last 7 days</p>
                </div>
                <p className="text-2xl font-bold text-green-900">{data.engagementMetrics.weeklyActive}</p>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div>
                  <p className="font-medium text-purple-900">Monthly Active Users</p>
                  <p className="text-sm text-purple-700">Users active in last 30 days</p>
                </div>
                <p className="text-2xl font-bold text-purple-900">{data.engagementMetrics.monthlyActive}</p>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div>
                  <p className="font-medium text-orange-900">Avg Session Duration</p>
                  <p className="text-sm text-orange-700">Minutes per session</p>
                </div>
                <p className="text-2xl font-bold text-orange-900">{data.engagementMetrics.avgSessionDuration}m</p>
              </div>
            </div>
          </div>

          {/* Demographics */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Age Demographics</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.demographicData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ageGroup" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}