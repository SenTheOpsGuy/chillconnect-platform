'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Download, Calendar, FileText, TrendingUp, Users, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface Report {
  id: string;
  title: string;
  description: string;
  type: 'FINANCIAL' | 'USER' | 'BOOKING' | 'PERFORMANCE';
  generatedAt: string;
  period: string;
  size: string;
  status: 'READY' | 'GENERATING' | 'FAILED';
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
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

    fetchReports();
  }, [session, status, router]);

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports');
      const data = await response.json();
      
      if (response.ok) {
        setReports(data.reports);
      } else {
        console.error('Failed to fetch reports:', data.error);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setLoading(false);
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'FINANCIAL': return <DollarSign className="w-5 h-5 text-green-500" />;
      case 'USER': return <Users className="w-5 h-5 text-blue-500" />;
      case 'BOOKING': return <Calendar className="w-5 h-5 text-purple-500" />;
      case 'PERFORMANCE': return <TrendingUp className="w-5 h-5 text-orange-500" />;
      default: return <FileText className="w-5 h-5 text-gray-800" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY': return 'bg-green-100 text-green-800';
      case 'GENERATING': return 'bg-yellow-100 text-yellow-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const generateNewReport = () => {
    // Mock function - would normally trigger report generation
    console.log('Report generation would be triggered here');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Reports Unavailable</h3>
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
            href="/dashboard/admin"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Platform Reports</h1>
              <p className="text-gray-900">Download detailed reports and analytics</p>
            </div>
            <button
              onClick={generateNewReport}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Generate New Report</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Report Categories */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Link href="/reports/financial" className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <DollarSign className="w-8 h-8 text-green-500" />
              <div>
                <h3 className="font-semibold text-gray-900">Financial</h3>
                <p className="text-gray-900 text-sm">Revenue & Tax Reports</p>
              </div>
            </div>
          </Link>
          
          <Link href="/reports/user-analytics" className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <h3 className="font-semibold text-gray-900">User Analytics</h3>
                <p className="text-gray-900 text-sm">Growth & Engagement</p>
              </div>
            </div>
          </Link>
          
          <Link href="/reports/bookings" className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <Calendar className="w-8 h-8 text-purple-500" />
              <div>
                <h3 className="font-semibold text-gray-900">Bookings</h3>
                <p className="text-gray-900 text-sm">Trends & Patterns</p>
              </div>
            </div>
          </Link>
          
          <Link href="/reports/performance" className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-8 h-8 text-orange-500" />
              <div>
                <h3 className="font-semibold text-gray-900">Performance</h3>
                <p className="text-gray-900 text-sm">Provider Metrics</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Available Reports</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {reports.map((report) => (
              <div key={report.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4">
                    {getReportTypeIcon(report.type)}
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">{report.title}</h3>
                      <p className="text-gray-900 mb-2">{report.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-900">
                        <span>Period: {report.period}</span>
                        <span>Size: {report.size}</span>
                        <span>Generated: {new Date(report.generatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                    
                    {report.status === 'READY' && (
                      <button
                        className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
                        onClick={async () => {
                          try {
                            let reportType = 'financial';
                            if (report.type === 'USER') reportType = 'users';
                            else if (report.type === 'PERFORMANCE') reportType = 'performance';
                            else if (report.type === 'BOOKING') reportType = 'bookings';
                            
                            const response = await fetch('/api/reports/export', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ reportType })
                            });
                            
                            if (response.ok) {
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
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
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    )}
                    
                    {report.status === 'GENERATING' && (
                      <div className="flex items-center space-x-2 text-gray-900">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Generating...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}