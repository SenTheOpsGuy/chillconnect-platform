'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { CreditCard, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function PaymentForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [bookingDetails, setBookingDetails] = useState<{
    id: string;
    amount: number;
    startTime: string;
    endTime: string;
    seeker: { name: string; email: string };
    provider: { name: string; email: string };
  } | null>(null);
  
  const bookingId = searchParams.get('booking');
  const paypalOrderId = searchParams.get('paypal_order_id');
  const cancelled = searchParams.get('cancelled');

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/status`);
      const data = await response.json();
      
      if (response.ok) {
        setBookingDetails(data);
      }
    } catch (err) {
      console.error('Failed to fetch booking details:', err);
    }
  };

  const createOrder = async () => {
    try {
      setProcessing(true);
      setError('');
      
      if (!bookingId) {
        throw new Error('Booking ID is required');
      }
      
      // Create booking and PayPal order
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: bookingDetails?.provider?.id || searchParams.get('provider'),
          startTime: bookingDetails?.startTime || searchParams.get('start_time'),
          duration: parseInt(searchParams.get('duration') || '60')
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }
      
      return data.paypalOrderId;
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
      throw err;
    } finally {
      setProcessing(false);
    }
  };

  const onApprove = async (data: any) => {
    try {
      setProcessing(true);
      // PayPal automatically captures the payment and triggers our webhook
      // Just redirect to success page
      router.push(`/booking/success?booking=${bookingId}&order_id=${data.orderID}`);
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const onError = (err: any) => {
    console.error('PayPal error:', err);
    setError('Payment failed. Please try again.');
    setProcessing(false);
  };

  if (!bookingDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <Link
          href="/bookings"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bookings
        </Link>

        <div className="bg-white rounded-lg shadow-sm p-8">
          {cancelled && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
              Payment was cancelled. You can try again below.
            </div>
          )}
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Payment</h1>
            <p className="text-gray-900">Secure payment powered by PayPal</p>
          </div>

          {/* Booking Summary */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Booking Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-900">Provider:</span>
                <span className="font-medium text-gray-900">{bookingDetails.provider?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-900">Date & Time:</span>
                <span className="font-medium text-gray-900">
                  {new Date(bookingDetails.startTime).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-900">Duration:</span>
                <span className="font-medium text-gray-900">
                  {Math.round((new Date(bookingDetails.endTime).getTime() - new Date(bookingDetails.startTime).getTime()) / (1000 * 60))} minutes
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-4">
                <span className="font-semibold text-gray-900">Total Amount:</span>
                <span className="font-bold text-blue-600">₹{bookingDetails.amount}</span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {processing && (
              <div className="bg-blue-50 border border-blue-200 text-blue-600 px-4 py-3 rounded-lg flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Processing payment...
              </div>
            )}

            <PayPalButtons
              createOrder={createOrder}
              onApprove={onApprove}
              onError={onError}
              style={{
                layout: 'vertical',
                color: 'blue',
                shape: 'rect',
                label: 'paypal'
              }}
              disabled={processing}
            />
          </div>

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center text-sm text-gray-900">
              <Lock className="w-4 h-4 mr-1" />
              <span>Secured by PayPal with 256-bit SSL encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const paypalOptions = {
  "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
  currency: "USD",
  intent: "capture"
};

export default function PaymentPage() {
  return (
    <PayPalScriptProvider options={paypalOptions}>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }>
        <PaymentForm />
      </Suspense>
    </PayPalScriptProvider>
  );
}