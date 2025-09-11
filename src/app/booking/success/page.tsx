'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Calendar, Clock, Video, Mail, Copy, Check } from 'lucide-react';

interface BookingDetails {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  amount: number;
  meetUrl: string;
  provider: {
    name: string;
    email: string;
  };
  seeker: {
    name: string;
    email: string;
  };
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const bookingId = searchParams.get('booking');

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
        setBooking(data);
      }
    } catch (err) {
      console.error('Failed to fetch booking details:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyMeetUrl = async () => {
    if (booking?.meetUrl) {
      await navigator.clipboard.writeText(booking.meetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const addToCalendar = () => {
    if (!booking) return;

    const startDate = new Date(booking.startTime);
    const endDate = new Date(booking.endTime);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const details = encodeURIComponent(
      `Consultation session with ${booking.provider.name}\n\nMeeting URL: ${booking.meetUrl || 'Will be shared via email'}`
    );

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Consultation Session')}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${details}&location=${encodeURIComponent(booking.meetUrl || '')}`;
    
    window.open(googleCalendarUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h1>
          <Link
            href="/bookings"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
          >
            View All Bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-900">Your consultation has been successfully booked and paid for.</p>
          </div>

          {/* Booking Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Session Details</h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-gray-900 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(booking.startTime).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-gray-900">
                    {new Date(booking.startTime).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })} - {new Date(booking.endTime).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-gray-900 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Duration</p>
                  <p className="text-gray-900">
                    {Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (1000 * 60))} minutes
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Video className="w-5 h-5 text-gray-900 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-1">Meeting Link</p>
                  {booking.meetUrl ? (
                    <div className="flex items-center space-x-2">
                      <code className="bg-white px-3 py-2 rounded border text-sm text-gray-900 flex-1 break-all">
                        {booking.meetUrl}
                      </code>
                      <button
                        onClick={copyMeetUrl}
                        className="p-2 text-gray-900 hover:text-gray-900 transition-colors"
                        title="Copy link"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-900">Will be shared via email before the session</p>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-gray-900 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Provider</p>
                  <p className="text-gray-900">{booking.provider.name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Payment Summary</h2>
            <div className="flex justify-between items-center">
              <span className="text-gray-900">Amount Paid</span>
              <span className="font-bold text-green-600">₹{booking.amount}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-900">Status</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Paid
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={addToCalendar}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Add to Calendar
            </button>
            <Link
              href="/bookings"
              className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-700 flex items-center justify-center text-center"
            >
              View All Bookings
            </Link>
          </div>

          {/* Important Notes */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Important Notes:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• You will receive email confirmations and reminders</li>
              <li>• The meeting link will be active 15 minutes before your session</li>
              <li>• You can reschedule or cancel up to 24 hours before the session</li>
              <li>• A chat will be available for 24 hours after your session</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  );
}