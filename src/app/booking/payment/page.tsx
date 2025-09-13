'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Clock, XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface PaymentStatus {
  status: 'loading' | 'success' | 'failed' | 'processing' | 'error';
  message: string;
  orderId?: string;
  bookingId?: string;
}

export default function PaymentResultPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'loading',
    message: 'Processing payment result...'
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    // Parse URL parameters
    const error = searchParams.get('error');
    const orderId = searchParams.get('order_id');
    const statusParam = searchParams.get('status');
    const message = searchParams.get('message');
    const bookingId = searchParams.get('booking_id');

    if (error) {
      handlePaymentError(error, message, orderId);
    } else if (statusParam === 'processing') {
      handleProcessingStatus(message, orderId);
    } else if (orderId) {
      // Check payment status via API
      checkPaymentStatus(orderId);
    } else {
      setPaymentStatus({
        status: 'error',
        message: 'Invalid payment result. Missing order information.'
      });
    }
  }, [session, status, searchParams, router]);

  const handlePaymentError = (error: string, message: string | null, orderId: string | null) => {
    let errorMessage = 'Payment failed. Please try again.';
    
    switch (error) {
      case 'missing_order_id':
        errorMessage = 'Payment reference missing. Please contact support.';
        break;
      case 'verification_failed':
        errorMessage = 'Payment verification failed. Please contact support.';
        break;
      case 'transaction_not_found':
        errorMessage = 'Transaction not found. Please contact support.';
        break;
      case 'payment_failed':
        errorMessage = message || 'Payment was cancelled or failed. Please try again.';
        break;
      case 'processing_failed':
        errorMessage = 'Payment processing error. Please contact support.';
        break;
      case 'unknown_status':
        errorMessage = message || 'Payment status unclear. Please contact support.';
        break;
    }

    setPaymentStatus({
      status: 'failed',
      message: errorMessage,
      orderId: orderId || undefined
    });
  };

  const handleProcessingStatus = (message: string | null, orderId: string | null) => {
    setPaymentStatus({
      status: 'processing',
      message: message || 'Payment is being processed. Please wait...',
      orderId: orderId || undefined
    });

    // Poll for status updates every 5 seconds
    if (orderId) {
      const interval = setInterval(() => {
        checkPaymentStatus(orderId);
      }, 5000);

      // Clear interval after 2 minutes
      setTimeout(() => clearInterval(interval), 120000);
    }
  };

  const checkPaymentStatus = async (orderId: string) => {
    try {
      const response = await fetch(`/api/payments/cashfree/status/${orderId}`);
      const data = await response.json();

      if (response.ok) {
        switch (data.status) {
          case 'PAID':
            setPaymentStatus({
              status: 'success',
              message: 'Payment successful! Your booking is confirmed.',
              orderId,
              bookingId: data.bookingId
            });
            break;
          case 'ACTIVE':
          case 'PARTIALLY_PAID':
            setPaymentStatus({
              status: 'processing',
              message: 'Payment is being processed. Please wait...',
              orderId
            });
            break;
          case 'EXPIRED':
          case 'CANCELLED':
          case 'TERMINALFAILED':
            setPaymentStatus({
              status: 'failed',
              message: 'Payment failed or was cancelled. Please try again.',
              orderId
            });
            break;
          default:
            setPaymentStatus({
              status: 'error',
              message: 'Unknown payment status. Please contact support.',
              orderId
            });
        }
      } else {
        throw new Error(data.error || 'Failed to check payment status');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setPaymentStatus({
        status: 'error',
        message: 'Unable to verify payment status. Please contact support.',
        orderId
      });
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus.status) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'failed':
        return <XCircle className="w-16 h-16 text-red-500" />;
      case 'processing':
        return <Clock className="w-16 h-16 text-blue-500" />;
      case 'loading':
        return <RefreshCw className="w-16 h-16 text-gray-500 animate-spin" />;
      default:
        return <AlertCircle className="w-16 h-16 text-orange-500" />;
    }
  };

  const getStatusColor = () => {
    switch (paymentStatus.status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      case 'processing':
        return 'border-blue-200 bg-blue-50';
      case 'loading':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-orange-200 bg-orange-50';
    }
  };

  const getActionButtons = () => {
    switch (paymentStatus.status) {
      case 'success':
        return (
          <div className="space-y-3">
            {paymentStatus.bookingId && (
              <Link
                href={`/bookings/${paymentStatus.bookingId}`}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 text-center block"
              >
                View Booking Details
              </Link>
            )}
            <Link
              href="/bookings"
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 text-center block"
            >
              View All Bookings
            </Link>
          </div>
        );
      
      case 'failed':
        return (
          <div className="space-y-3">
            <button
              onClick={() => router.back()}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              Try Payment Again
            </button>
            <Link
              href="/dashboard"
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 text-center block"
            >
              Back to Dashboard
            </Link>
          </div>
        );
      
      case 'processing':
        return (
          <div className="space-y-3">
            <button
              onClick={() => paymentStatus.orderId && checkPaymentStatus(paymentStatus.orderId)}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Check Status</span>
            </button>
            <Link
              href="/bookings"
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 text-center block"
            >
              View Bookings
            </Link>
          </div>
        );
      
      default:
        return (
          <Link
            href="/dashboard"
            className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 text-center block"
          >
            Back to Dashboard
          </Link>
        );
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-md">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        {/* Payment Result Card */}
        <div className={`bg-white rounded-lg shadow-lg border-2 ${getStatusColor()} p-8 text-center`}>
          {/* Status Icon */}
          <div className="mb-6 flex justify-center">
            {getStatusIcon()}
          </div>

          {/* Status Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {paymentStatus.status === 'success' && 'Payment Successful!'}
            {paymentStatus.status === 'failed' && 'Payment Failed'}
            {paymentStatus.status === 'processing' && 'Processing Payment'}
            {paymentStatus.status === 'loading' && 'Checking Payment'}
            {paymentStatus.status === 'error' && 'Payment Error'}
          </h1>

          {/* Status Message */}
          <p className="text-gray-600 mb-6">
            {paymentStatus.message}
          </p>

          {/* Order ID */}
          {paymentStatus.orderId && (
            <div className="mb-6 p-3 bg-gray-100 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Order ID</p>
              <p className="text-sm font-mono text-gray-700">{paymentStatus.orderId}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {getActionButtons()}
          </div>

          {/* Support Contact */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Need help? Contact us at{' '}
              <a href="mailto:support@chillconnect.com" className="text-blue-600 hover:underline">
                support@chillconnect.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}