'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Download,
  CreditCard
} from 'lucide-react';

interface Earning {
  id: string;
  amount: number;
  sessionDate: string;
  seekerName: string;
  status: 'PENDING' | 'PAID' | 'PROCESSING';
  payoutDate?: string;
}

interface EarningsStats {
  totalEarnings: number;
  pendingPayouts: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
}

export default function EarningsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    pendingPayouts: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0
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

    fetchEarnings();
  }, [session, status, router]);

  const fetchEarnings = async () => {
    try {
      // This would be a real API call in production
      const mockEarnings: Earning[] = [
        {
          id: '1',
          amount: 2500,
          sessionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          seekerName: 'John Smith',
          status: 'PAID',
          payoutDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          amount: 1800,
          sessionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          seekerName: 'Sarah Johnson',
          status: 'PENDING'
        },
        {
          id: '3',
          amount: 3200,
          sessionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          seekerName: 'Mike Wilson',
          status: 'PROCESSING'
        }
      ];

      setEarnings(mockEarnings);
      
      const mockStats: EarningsStats = {
        totalEarnings: 45600,
        pendingPayouts: 5000,
        thisMonthEarnings: 12400,
        lastMonthEarnings: 8900
      };
      
      setStats(mockStats);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching earnings:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'text-green-600 bg-green-100';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100';
      case 'PROCESSING':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-900 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard/provider')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
            <p className="text-gray-900">Track your consultation income and payouts</p>
          </div>
        </div>
        <button 
          onClick={async () => {
            try {
              const response = await fetch('/api/reports/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportType: 'earnings' })
              });
              
              if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `earnings-report-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
              } else {
                console.error('Export failed');
                alert('Failed to export report');
              }
            } catch (error) {
              console.error('Export error:', error);
              alert('Failed to export report');
            }
          }}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
        >
          <Download className="w-4 h-4" />
          <span>Export Report</span>
        </button>
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
            <div className="p-3 rounded-full bg-yellow-100">
              <CreditCard className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Pending Payouts</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats.pendingPayouts.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">This Month</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats.thisMonthEarnings.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Growth</p>
              <p className="text-2xl font-bold text-gray-900">+{Math.round(((stats.thisMonthEarnings - stats.lastMonthEarnings) / stats.lastMonthEarnings) * 100)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Earnings</h2>
        </div>

        {earnings.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-900 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No earnings yet</h3>
            <p className="text-gray-900">Complete consultations to start earning</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {earnings.map((earning) => (
              <div key={earning.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-medium text-gray-900">{earning.seekerName}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(earning.status)}`}>
                        {earning.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-900">
                      <span>Session: {formatDate(earning.sessionDate)}</span>
                      {earning.payoutDate && (
                        <span>Paid: {formatDate(earning.payoutDate)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">₹{earning.amount.toLocaleString()}</div>
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