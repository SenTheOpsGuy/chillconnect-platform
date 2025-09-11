'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Video, Calendar, User } from 'lucide-react';
import ChatInterface from '@/components/chat/ChatInterface';

interface BookingDetails {
  id: string;
  startTime: string;
  endTime: string;
  amount: number;
  status: string;
  meetUrl?: string;
  provider: {
    name: string;
  };
  seeker: {
    name: string;
  };
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const bookingId = params.bookingId as string;

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (bookingId) {
      fetchBookingDetails();
    }
  }, [session, status, router, bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/status`);
      const data = await response.json();

      if (response.ok) {
        setBooking(data);
      } else {
        setError(data.error || 'Failed to fetch booking details');
      }
    } catch (err) {
      setError('Failed to fetch booking details');
    } finally {
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

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Chat Not Found</h1>
          <p className="text-gray-900 mb-6">{error}</p>
          <Link
            href="/bookings"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
          >
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  const isProvider = booking.provider.name === session?.user?.name;
  const otherParty = isProvider ? booking.seeker : booking.provider;

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
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Chat with {otherParty.name}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-900">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(booking.startTime).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span>
                    {new Date(booking.startTime).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })} - {new Date(booking.endTime).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  booking.status === 'CONFIRMED' 
                    ? 'bg-green-100 text-green-800' 
                    : booking.status === 'COMPLETED'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {booking.status}
                </span>
              </div>
            </div>
            
            {booking.meetUrl && booking.status === 'CONFIRMED' && (
              <a
                href={booking.meetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
              >
                <Video className="w-4 h-4 mr-2" />
                Join Meeting
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <ChatInterface bookingId={bookingId} />
        </div>
      </div>
    </div>
  );
}