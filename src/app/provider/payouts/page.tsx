'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CreditCard, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  Download,
  ArrowLeft
} from 'lucide-react';

interface BankAccount {
  id: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName?: string;
  accountType: string;
  verificationStatus: string;
  isActive: boolean;
  verifiedAt?: string;
  pennyTestAttempts: number;
  createdAt: string;
}

interface EarningsSummary {
  totalEarnings: number;
  totalSessions: number;
  availableBalance: number;
  pendingAmount: number;
  pendingSessions: number;
  paidOutAmount: number;
  paidOutSessions: number;
  minimumPayout: number;
  canRequestPayout: boolean;
}

interface Payout {
  id: string;
  requestedAmount: number;
  actualAmount?: number;
  status: string;
  requestedAt: string;
  approvedAt?: string;
  processedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  transactionFee?: number;
  bankAccount: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
  };
  recentLogs: Array<{
    action: string;
    details: string;
    createdAt: string;
  }>;
}

export default function ProviderPayoutsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Form states
  const [showBankForm, setShowBankForm] = useState(false);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [showPennyVerification, setShowPennyVerification] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [pennyAmount, setPennyAmount] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (status === 'authenticated' && session?.user?.role !== 'PROVIDER') {
      router.push('/unauthorized');
      return;
    }

    if (status === 'authenticated') {
      fetchData();
    }
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      const [bankResponse, earningsResponse, payoutsResponse] = await Promise.all([
        fetch('/api/provider/bank-account'),
        fetch('/api/provider/earnings'),
        fetch('/api/provider/payout/request')
      ]);

      const bankData = await bankResponse.json();
      const earningsData = await earningsResponse.json();
      const payoutsData = await payoutsResponse.json();

      setBankAccount(bankData.bankAccount);
      setEarnings(earningsData.summary);
      setPayouts(payoutsData.payouts || []);

      // Show penny verification if needed
      if (bankData.bankAccount?.verificationStatus === 'PENNY_TEST_SENT') {
        setShowPennyVerification(true);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    try {
      const response = await fetch('/api/provider/payout/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(payoutAmount) })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Payout request submitted successfully!');
        setShowPayoutForm(false);
        setPayoutAmount('');
        fetchData();
      } else {
        alert(data.error || 'Failed to request payout');
      }
    } catch (error) {
      alert('Error requesting payout');
    }
  };

  const handlePennyVerification = async () => {
    try {
      const response = await fetch('/api/provider/bank-account/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pennyAmount: parseFloat(pennyAmount) })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Bank account verified successfully!');
        setShowPennyVerification(false);
        setPennyAmount('');
        fetchData();
      } else {
        alert(data.error || 'Verification failed');
      }
    } catch (error) {
      alert('Error verifying bank account');
    }
  };

  const handleAddBankAccount = async (bankData: any) => {
    try {
      const response = await fetch('/api/provider/bank-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankData)
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Bank account added successfully! A penny test has been sent to verify your account.');
        setShowBankForm(false);
        fetchData();
      } else {
        alert(data.error || 'Failed to add bank account');
      }
    } catch (error) {
      alert('Error adding bank account');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'PENDING':
      case 'REQUESTED':
      case 'PROCESSING':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'REJECTED':
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
      case 'COMPLETED':
        return 'text-green-600 bg-green-100';
      case 'PENDING':
      case 'REQUESTED':
      case 'PROCESSING':
        return 'text-yellow-600 bg-yellow-100';
      case 'REJECTED':
      case 'FAILED':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard/provider"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Payouts & Earnings</h1>
          <p className="text-gray-600 mt-2">Manage your bank account and track your earnings</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: DollarSign },
                { id: 'bank-account', label: 'Bank Account', icon: CreditCard },
                { id: 'payouts', label: 'Payout History', icon: Download }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && earnings && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DollarSign className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">Available Balance</p>
                        <p className="text-2xl font-bold text-blue-900">₹{earnings.availableBalance.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-green-600">Total Earnings</p>
                        <p className="text-2xl font-bold text-green-900">₹{earnings.totalEarnings.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Clock className="h-8 w-8 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-yellow-600">Pending</p>
                        <p className="text-2xl font-bold text-yellow-900">₹{earnings.pendingAmount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Download className="h-8 w-8 text-gray-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Paid Out</p>
                        <p className="text-2xl font-bold text-gray-900">₹{earnings.paidOutAmount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Request Payout Button */}
                {bankAccount?.isActive && earnings.canRequestPayout && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-blue-900">Ready for Payout</h3>
                        <p className="text-blue-700">You have ₹{earnings.availableBalance.toLocaleString()} available for withdrawal</p>
                        <p className="text-sm text-blue-600 mt-1">Minimum payout amount: ₹{earnings.minimumPayout.toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => setShowPayoutForm(true)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
                      >
                        Request Payout
                      </button>
                    </div>
                  </div>
                )}

                {!bankAccount?.isActive && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-center">
                      <AlertCircle className="w-6 h-6 text-yellow-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-yellow-900">Bank Account Required</h3>
                        <p className="text-yellow-700">Please add and verify your bank account to request payouts</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bank Account Tab */}
            {activeTab === 'bank-account' && (
              <div className="space-y-6">
                {bankAccount ? (
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Bank Account Details</h3>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(bankAccount.verificationStatus)}
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bankAccount.verificationStatus)}`}>
                          {bankAccount.verificationStatus}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Account Holder Name</label>
                        <p className="mt-1 text-sm text-gray-900">{bankAccount.accountHolderName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                        <p className="mt-1 text-sm text-gray-900">{bankAccount.bankName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Account Number</label>
                        <p className="mt-1 text-sm text-gray-900">{bankAccount.accountNumber}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                        <p className="mt-1 text-sm text-gray-900">{bankAccount.ifscCode}</p>
                      </div>
                    </div>

                    {bankAccount.verificationStatus === 'PENNY_TEST_SENT' && (
                      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900">Verify Your Account</h4>
                        <p className="text-blue-700 text-sm mt-1">
                          We've sent a small amount to your account. Please check your bank statement and enter the exact amount received.
                        </p>
                        <p className="text-blue-600 text-xs mt-1">
                          Attempts remaining: {3 - bankAccount.pennyTestAttempts}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No bank account</h3>
                    <p className="mt-1 text-sm text-gray-500">Add your bank account to receive payouts</p>
                    <div className="mt-6">
                      <button
                        onClick={() => setShowBankForm(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Bank Account
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payouts Tab */}
            {activeTab === 'payouts' && (
              <div className="space-y-6">
                {payouts.length > 0 ? (
                  <div className="space-y-4">
                    {payouts.map((payout) => (
                      <div key={payout.id} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">₹{payout.requestedAmount.toLocaleString()}</h3>
                            <p className="text-sm text-gray-500">
                              Requested on {new Date(payout.requestedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(payout.status)}
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payout.status)}`}>
                              {payout.status}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Bank Account:</span>
                            <p className="font-medium">{payout.bankAccount.bankName}</p>
                            <p className="text-gray-600">{payout.bankAccount.accountNumber}</p>
                          </div>
                          {payout.actualAmount && (
                            <div>
                              <span className="text-gray-500">Final Amount:</span>
                              <p className="font-medium">₹{payout.actualAmount.toLocaleString()}</p>
                              {payout.transactionFee && (
                                <p className="text-gray-600">Fee: ₹{payout.transactionFee}</p>
                              )}
                            </div>
                          )}
                          {payout.rejectionReason && (
                            <div>
                              <span className="text-gray-500">Rejection Reason:</span>
                              <p className="text-red-600">{payout.rejectionReason}</p>
                            </div>
                          )}
                        </div>

                        {payout.recentLogs.length > 0 && (
                          <div className="mt-4 border-t pt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h4>
                            <div className="space-y-1">
                              {payout.recentLogs.slice(0, 3).map((log, index) => (
                                <div key={index} className="text-xs text-gray-600">
                                  <span className="font-medium">{log.action}</span> - {log.details}
                                  <span className="ml-2 text-gray-400">
                                    {new Date(log.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Download className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No payouts yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Your payout requests will appear here</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Penny Verification Modal */}
        {showPennyVerification && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Verify Your Bank Account</h3>
              <p className="text-sm text-gray-600 mb-4">
                We've sent a small amount to your bank account. Please enter the exact amount you received (including paise).
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Received (e.g., 1.23)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pennyAmount}
                  onChange={(e) => setPennyAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handlePennyVerification}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Verify
                </button>
                <button
                  onClick={() => setShowPennyVerification(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payout Request Modal */}
        {showPayoutForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Request Payout</h3>
              <p className="text-sm text-gray-600 mb-4">
                Available balance: ₹{earnings?.availableBalance.toLocaleString()}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payout Amount
                </label>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="1000"
                  min={earnings?.minimumPayout}
                  max={earnings?.availableBalance}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum: ₹{earnings?.minimumPayout.toLocaleString()}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleRequestPayout}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Request Payout
                </button>
                <button
                  onClick={() => setShowPayoutForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bank Account Form Modal */}
        {showBankForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Add Bank Account</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const bankData = {
                  accountHolderName: formData.get('accountHolderName') as string,
                  accountNumber: formData.get('accountNumber') as string,
                  ifscCode: formData.get('ifscCode') as string,
                  bankName: formData.get('bankName') as string,
                  branchName: formData.get('branchName') as string,
                  accountType: formData.get('accountType') as string
                };
                handleAddBankAccount(bankData);
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Holder Name *
                  </label>
                  <input
                    type="text"
                    name="accountHolderName"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter full name as per bank records"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    name="accountNumber"
                    required
                    minLength={9}
                    maxLength={18}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter account number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IFSC Code *
                  </label>
                  <input
                    type="text"
                    name="ifscCode"
                    required
                    pattern="^[A-Z]{4}0[A-Z0-9]{6}$"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., SBIN0001234"
                    style={{ textTransform: 'uppercase' }}
                  />
                  <p className="text-xs text-gray-500 mt-1">11-digit IFSC code (e.g., SBIN0001234)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., State Bank of India"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    name="branchName"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter branch name (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Type *
                  </label>
                  <select
                    name="accountType"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SAVINGS">Savings Account</option>
                    <option value="CURRENT">Current Account</option>
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 text-sm">What happens next?</h4>
                  <ul className="text-blue-700 text-sm mt-1 space-y-1">
                    <li>• We'll send a small verification amount (₹1-9) to your account</li>
                    <li>• Check your bank statement and enter the exact amount received</li>
                    <li>• Once verified, you can request payouts to this account</li>
                  </ul>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
                  >
                    Add Bank Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBankForm(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}