'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { 
  Calendar, 
  Clock, 
  User, 
  Video, 
  MessageCircle,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';

interface Booking {
  id: string;
  providerId: string;
  providerName: string;
  providerAvatar?: string;
  expertise: string;
  scheduledAt: string;
  duration: number;
  amount: number;
  status: 'PENDING' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  meetingLink?: string;
  notes?: string;
}

export default function BookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [cancellingBookings, setCancellingBookings] = useState<Set<string>>(new Set());
  const [paymentLoading, setPaymentLoading] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    fetchBookings();
  }, [session, status, router, filter]);

  const fetchBookings = async () => {
    try {
      const response = await fetch(`/api/bookings/list?status=${filter}`);
      const data = await response.json();
      
      if (response.ok) {
        setBookings(data.bookings);
      } else {
        console.error('Error fetching bookings:', data.error);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    // Add to cancelling set to show loading state
    setCancellingBookings(prev => new Set([...prev, bookingId]));

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        // Update the booking status locally
        setBookings(prev => 
          prev.map(booking => 
            booking.id === bookingId 
              ? { ...booking, status: 'CANCELLED' as const }
              : booking
          )
        );
        
        const message = data.refundAmount > 0 
          ? `Booking cancelled successfully. Refund of ₹${data.refundAmount} will be processed within 3-5 business days.`
          : 'Booking cancelled successfully.';
        
        toast({
          type: 'success',
          title: 'Booking Cancelled',
          message: data.refundAmount > 0 
            ? `Refund of ₹${data.refundAmount} will be processed within 3-5 business days.`
            : 'Your booking has been cancelled successfully.'
        });
      } else {
        const errorMessage = data.error || 'Failed to cancel booking';
        console.error(errorMessage);
        toast({
          type: 'error',
          title: 'Cancellation Failed',
          message: errorMessage
        });
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to cancel booking. Please check your connection and try again.'
      });
    } finally {
      // Remove from cancelling set
      setCancellingBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  const handleMakePayment = async (bookingId: string) => {
    setPaymentLoading(prev => new Set([...prev, bookingId]));
    
    try {
      const response = await fetch(`/api/bookings/${bookingId}/status`);
      const bookingData = await response.json();
      
      if (response.ok && bookingData.status === 'PAYMENT_PENDING') {
        // Redirect to payment page
        router.push(`/booking/payment-cashfree?booking=${bookingId}&gateway=cashfree`);
      } else if (response.status === 410) {
        // Payment deadline exceeded
        toast({
          type: 'error',
          title: 'Payment Deadline Exceeded',
          message: bookingData.message || 'The payment deadline has passed. Please make a new booking.'
        });
        // Refresh the bookings list to remove the expired booking
        fetchBookings();
      } else {
        toast({
          type: 'error',
          title: 'Payment Error',
          message: bookingData.error || 'Unable to process payment. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      toast({
        type: 'error',
        title: 'Network Error',
        message: 'Unable to initiate payment. Please check your connection and try again.'
      });
    } finally {
      setPaymentLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'PENDING':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'PAYMENT_PENDING':
        return <CreditCard className="w-4 h-4 text-orange-600" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-900" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PAYMENT_PENDING':
        return 'bg-orange-100 text-orange-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') {
      return ['PENDING', 'PAYMENT_PENDING', 'CONFIRMED'].includes(booking.status) && 
             new Date(booking.scheduledAt) > new Date();
    }
    if (filter === 'completed') return booking.status === 'COMPLETED';
    if (filter === 'cancelled') return booking.status === 'CANCELLED';
    return true;
  });

  if (status === 'loading' || loading) {
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
            href="/dashboard"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
            <p className="text-gray-900">Manage your consultation appointments</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'all', label: 'All Bookings' },
                { key: 'upcoming', label: 'Upcoming' },
                { key: 'completed', label: 'Completed' },
                { key: 'cancelled', label: 'Cancelled' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    filter === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-800 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-900 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-900 mb-6">
              {filter === 'all' 
                ? "You haven't made any bookings yet."
                : `No ${filter} bookings found.`}
            </p>
            <button
              onClick={() => router.push('/search')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
            >
              Find an Expert
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {/* Provider Avatar */}
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      {booking.providerAvatar ? (
                        <img
                          src={booking.providerAvatar}
                          alt={booking.providerName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-gray-900" />
                      )}
                    </div>

                    {/* Booking Details */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {booking.providerName}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                      
                      <p className="text-blue-600 font-medium mb-2">{booking.expertise}</p>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-900">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(booking.scheduledAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {new Date(booking.scheduledAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>{booking.duration} min</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CreditCard className="w-4 h-4" />
                          <span>₹{booking.amount}</span>
                        </div>
                      </div>

                      {booking.notes && (
                        <p className="text-sm text-gray-900 mt-2">
                          <strong>Notes:</strong> {booking.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2">
                    {booking.status === 'CONFIRMED' && booking.meetingLink && (
                      <a
                        href={booking.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                      >
                        <Video className="w-4 h-4" />
                        <span>Join Meeting</span>
                      </a>
                    )}
                    
                    {(booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') && (
                      <Link
                        href={`/chat/${booking.id}`}
                        className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-200"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Chat</span>
                      </Link>
                    )}

                    {booking.status === 'PAYMENT_PENDING' && (
                      <button 
                        onClick={() => handleMakePayment(booking.id)}
                        disabled={paymentLoading.has(booking.id)}
                        className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {paymentLoading.has(booking.id) ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            <span>Make Payment</span>
                          </>
                        )}
                      </button>
                    )}

                    {booking.status === 'PENDING' && (
                      <button 
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={cancellingBookings.has(booking.id)}
                        className="flex items-center space-x-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancellingBookings.has(booking.id) ? (
                          <>
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            <span>Cancelling...</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span>Cancel</span>
                          </>
                        )}
                      </button>
                    )}
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