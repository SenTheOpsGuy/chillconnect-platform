'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard, Lock, ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function PaymentForm() {
  const searchParams = useSearchParams();
  
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [bookingDetails, setBookingDetails] = useState<{
    id: string;
    amount: number;
    startTime: string;
    endTime: string;
    seeker: { name: string; email: string };
    provider: { name: string; email: string };
    paymentDeadline?: string;
    timeRemaining?: {
      hours: number;
      minutes: number;
      total: number;
    };
  } | null>(null);
  
  const bookingId = searchParams.get('booking');
  const errorParam = searchParams.get('error');
  const statusParam = searchParams.get('status');
  const messageParam = searchParams.get('message');

  useEffect(() => {
    if (errorParam) {
      setError(decodeURIComponent(messageParam || 'Payment failed'));
    }
    
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId, errorParam, messageParam]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/status`);
      const data = await response.json();
      
      if (response.ok) {
        setBookingDetails(data);
      } else if (response.status === 410) {
        // Booking expired
        setError(data.message || 'The payment deadline has passed. Please make a new booking.');
      }
    } catch (err) {
      console.error('Failed to fetch booking details:', err);
    }
  };

  const initiatePayment = async () => {
    if (!bookingDetails) return;

    try {
      setProcessing(true);
      setError('');

      // Create payment session for existing booking
      const response = await fetch(`/api/bookings/${bookingId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (response.ok && data.paymentUrl) {
        // Redirect to Cashfree payment page
        window.location.href = data.paymentUrl;
      } else {
        setError(data.error || 'Failed to initiate payment');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (!bookingDetails && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <Link
            href="/bookings"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bookings
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Complete Payment</h1>
            <p className="text-gray-600">Secure payment powered by Cashfree</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-semibold text-red-800">Payment Error</h3>
                  <p className="text-red-700 mt-1">{error}</p>
                  {error.includes('deadline') && (
                    <Link 
                      href="/search" 
                      className="inline-block mt-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Make a new booking →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {statusParam === 'processing' && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <Clock className="w-5 h-5 text-yellow-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-semibold text-yellow-800">Payment Processing</h3>
                  <p className="text-yellow-700 mt-1">
                    {messageParam || 'Your payment is being processed. Please wait or refresh this page.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {bookingDetails && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Booking Details</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Provider</span>
                  <span className="font-medium text-gray-900">{bookingDetails.provider.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Date & Time</span>
                  <span className="font-medium text-gray-900">
                    {new Date(bookingDetails.startTime).toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium text-gray-900">
                    {Math.ceil((new Date(bookingDetails.endTime).getTime() - new Date(bookingDetails.startTime).getTime()) / 60000)} minutes
                  </span>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Amount</span>
                    <span className="text-blue-600">₹{bookingDetails.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {bookingDetails.timeRemaining && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start">
                    <Clock className="w-5 h-5 text-amber-500 mt-0.5 mr-3" />
                    <div>
                      <h3 className="font-semibold text-amber-800">Payment Deadline</h3>
                      <p className="text-amber-700 mt-1">
                        Complete payment within {bookingDetails.timeRemaining.hours}h {bookingDetails.timeRemaining.minutes}m 
                        or your booking will be automatically cancelled.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="border rounded-lg p-4 mb-6">
                <div className="flex items-center mb-2">
                  <Lock className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-gray-900">Secure Payment</span>
                </div>
                <p className="text-sm text-gray-600">
                  Your payment is processed securely through Cashfree Payment Gateway. 
                  We support all major payment methods including cards, UPI, and net banking.
                </p>
              </div>

              <button
                onClick={initiatePayment}
                disabled={processing || !!error}
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                {processing ? 'Redirecting to Payment...' : `Pay ₹${bookingDetails.amount.toLocaleString()}`}
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                You'll be redirected to Cashfree's secure payment page
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PaymentForm />
    </Suspense>
  );
}