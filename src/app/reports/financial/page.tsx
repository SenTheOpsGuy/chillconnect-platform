'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Download, TrendingUp, TrendingDown, DollarSign, Receipt, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface FinancialData {
  totalRevenue: number;
  platformCommission: number;
  providerPayouts: number;
  taxableAmount: number;
  monthlyRevenue: Array<{ month: string; revenue: number; commission: number; payouts: number }>;
  revenueByCategory: Array<{ category: string; amount: number; percentage: number }>;
  taxBreakdown: Array<{ category: string; amount: number; rate: number }>;
  transactionStats: {
    totalTransactions: number;
    averageTransaction: number;
    refunds: number;
    chargebacks: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function FinancialReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<FinancialData | null>(null);
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

    fetchFinancialData();
  }, [session, status, router]);

  const fetchFinancialData = async () => {
    try {
      const mockData: FinancialData = {
        totalRevenue: 2456780,
        platformCommission: 368517,
        providerPayouts: 2088263,
        taxableAmount: 368517,
        monthlyRevenue: [
          { month: 'Jan', revenue: 345000, commission: 51750, payouts: 293250 },
          { month: 'Feb', revenue: 389000, commission: 58350, payouts: 330650 },
          { month: 'Mar', revenue: 412000, commission: 61800, payouts: 350200 },
          { month: 'Apr', revenue: 445000, commission: 66750, payouts: 378250 },
          { month: 'May', revenue: 478000, commission: 71700, payouts: 406300 },
          { month: 'Jun', revenue: 387780, commission: 58167, payouts: 329613 }
        ],
        revenueByCategory: [
          { category: 'Tax Consulting', amount: 1032500, percentage: 42 },
          { category: 'Legal Advice', amount: 638600, percentage: 26 },
          { category: 'Financial Planning', amount: 491356, percentage: 20 },
          { category: 'Business Strategy', amount: 294324, percentage: 12 }
        ],
        taxBreakdown: [
          { category: 'Platform Commission (15%)', amount: 368517, rate: 15 },
          { category: 'GST on Commission (18%)', amount: 66329, rate: 18 },
          { category: 'TDS on Provider Payments (2%)', amount: 41765, rate: 2 }
        ],
        transactionStats: {
          totalTransactions: 3420,
          averageTransaction: 718,
          refunds: 23,
          chargebacks: 3
        }
      };
      
      setData(mockData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load financial data');
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Financial Data Unavailable</h3>
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
            href="/reports"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
              <p className="text-gray-900">Revenue, commissions, taxes, and financial analytics</p>
            </div>
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/reports/export', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reportType: 'financial' })
                  });
                  
                  if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `financial_report_${new Date().toISOString().split('T')[0]}.csv`;
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
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Key Financial Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalRevenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+12.5% from last quarter</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 mb-1">Platform Commission</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.platformCommission)}</p>
              </div>
              <Receipt className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-900">15% of total revenue</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 mb-1">Provider Payouts</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.providerPayouts)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-900">85% of total revenue</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 mb-1">Taxable Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.taxableAmount)}</p>
              </div>
              <FileText className="w-8 h-8 text-orange-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-900">Commission + applicable taxes</span>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Revenue Breakdown */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="revenue" fill="#3B82F6" name="Total Revenue" />
                <Bar dataKey="commission" fill="#10B981" name="Platform Commission" />
                <Bar dataKey="payouts" fill="#8B5CF6" name="Provider Payouts" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by Category */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.revenueByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {data.revenueByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tax Breakdown & Transaction Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tax Breakdown */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Breakdown</h3>
            <div className="space-y-4">
              {data.taxBreakdown.map((tax, index) => (
                <div key={tax.category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{tax.category}</p>
                    <p className="text-sm text-gray-900">Rate: {tax.rate}%</p>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(tax.amount)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction Statistics */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Total Transactions</p>
                  <p className="text-sm text-gray-900">This period</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{data.transactionStats.totalTransactions.toLocaleString()}</p>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Average Transaction</p>
                  <p className="text-sm text-gray-900">Per booking</p>
                </div>
                <p className="text-xl font-semibold text-gray-900">{formatCurrency(data.transactionStats.averageTransaction)}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="font-medium text-red-900">Refunds</p>
                  <p className="text-xl font-bold text-red-700">{data.transactionStats.refunds}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="font-medium text-orange-900">Chargebacks</p>
                  <p className="text-xl font-bold text-orange-700">{data.transactionStats.chargebacks}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}