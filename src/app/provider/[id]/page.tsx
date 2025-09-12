'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/toast';
import { 
  Star, 
  Clock, 
  MapPin, 
  Calendar, 
  ArrowLeft, 
  User, 
  MessageCircle,
  CheckCircle,
  Award
} from 'lucide-react';

interface Provider {
  id: string;
  expertise: string[];
  yearsExperience: number;
  hourlyRate: number;
  bio: string;
  rating: number;
  totalSessions: number;
  verificationStatus: string;
  user: {
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar?: string;
      timezone: string;
    };
  };
  availability: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    giver: {
      name: string;
      avatar?: string;
    };
  }>;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ProviderProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    date: string;
    time: string;
    duration: number;
  } | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchProvider();
    }
  }, [params.id]);

  const fetchProvider = async () => {
    try {
      const response = await fetch(`/api/providers/${params.id}`);
      const data = await response.json();

      if (response.ok) {
        setProvider(data);
      } else {
        setError(data.error || 'Failed to fetch provider');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!session) {
      router.push('/login');
      return;
    }

    if (!selectedSlot) {
      toast({
        type: 'warning',
        title: 'No Time Slot Selected',
        message: 'Please select a time slot to continue with booking.'
      });
      return;
    }

    setBookingLoading(true);

    try {
      const startTime = new Date(`${selectedSlot.date}T${selectedSlot.time}`);
      
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: params.id,
          startTime: startTime.toISOString(),
          duration: selectedSlot.duration
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Handle different response types
        if (data.paypalOrderId && data.approvalUrl) {
          // Redirect to PayPal approval URL for payment
          window.location.href = data.approvalUrl;
        } else if (data.status === 'payment_required' && data.bookingId) {
          // Fallback: redirect to payment page
          router.push(`/booking/payment?booking=${data.bookingId}&paypal_order=${data.paypalOrderId}`);
        } else if (data.fallback || data.status === 'payment_pending') {
          // Payment integration unavailable - show success with message
          toast({
            type: 'warning',
            title: 'Booking Created',
            message: data.message || 'Booking created successfully. Payment will be handled separately.'
          });
          router.push(`/bookings`);
        } else {
          // Successful booking without payment issues
          router.push(`/bookings`);
        }
      } else {
        toast({
          type: 'error',
          title: 'Booking Failed',
          message: data.error || 'Unable to create booking. Please try again.'
        });
      }
    } catch (err) {
      toast({
        type: 'error',
        title: 'Network Error',
        message: 'Booking failed. Please check your connection and try again.'
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const generateTimeSlots = () => {
    if (!provider?.availability.length) return [];

    const slots = [];
    const today = new Date();
    
    // Generate slots for next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();
      
      const availability = provider.availability.find(a => a.dayOfWeek === dayOfWeek);
      if (availability) {
        const [startHour, startMinute] = availability.startTime.split(':').map(Number);
        const [endHour, endMinute] = availability.endTime.split(':').map(Number);
        
        for (let hour = startHour; hour < endHour; hour++) {
          const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
          slots.push({
            date: date.toISOString().split('T')[0],
            time: timeSlot,
            displayDate: date.toLocaleDateString('en-IN', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })
          });
        }
      }
    }
    
    return slots.slice(0, 12); // Show next 12 available slots
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Provider Not Found</h1>
          <p className="text-gray-900 mb-6">{error}</p>
          <Link
            href="/search"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
          >
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const timeSlots = generateTimeSlots();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <Link
            href="/search"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Profile */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-start space-x-6">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  {provider.user.profile?.avatar ? (
                    <img
                      src={provider.user.profile.avatar}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-semibold text-gray-900">
                      {provider.user.profile?.firstName?.charAt(0)}
                      {provider.user.profile?.lastName?.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {provider.user.profile?.firstName} {provider.user.profile?.lastName}
                      </h1>
                      <div className="flex items-center space-x-4 text-gray-900 mb-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold text-gray-900">{provider.rating.toFixed(1)}</span>
                          <span className="text-gray-900">({provider.reviews.length} reviews)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-900" />
                          <span className="text-gray-900">{provider.yearsExperience} years experience</span>
                        </div>
                        {provider.verificationStatus === 'VERIFIED' && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-green-600">Verified</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">
                        ₹{provider.hourlyRate}/hr
                      </div>
                      <p className="text-sm text-gray-900">{provider.totalSessions} sessions completed</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {provider.expertise.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* About */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
              <p className="text-gray-900 leading-relaxed">{provider.bio}</p>
            </div>

            {/* Availability */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Availability</h2>
              <div className="space-y-2">
                {provider.availability.map((slot, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <span className="font-medium text-gray-900">{dayNames[slot.dayOfWeek]}</span>
                    <span className="text-gray-900">{slot.startTime} - {slot.endTime}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Reviews ({provider.reviews.length})</h2>
              {provider.reviews.length > 0 ? (
                <div className="space-y-4">
                  {provider.reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {review.giver.avatar ? (
                            <img
                              src={review.giver.avatar}
                              alt="Reviewer"
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-gray-900" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900">{review.giver.name}</span>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-gray-900 text-sm">{review.comment}</p>
                          )}
                          <p className="text-xs text-gray-900 mt-1">
                            {new Date(review.createdAt).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-900">No reviews yet.</p>
              )}
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-sm sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Book a Session</h3>
              
              {/* Duration Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Duration
                </label>
                <select
                  value={selectedSlot?.duration || 60}
                  onChange={(e) => setSelectedSlot(prev => ({
                    ...prev!,
                    duration: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              {/* Time Slots */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Available Times
                </label>
                {timeSlots.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                    {timeSlots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedSlot({
                          date: slot.date,
                          time: slot.time,
                          duration: selectedSlot?.duration || 60
                        })}
                        className={`p-3 text-sm rounded-lg border text-left transition-colors ${
                          selectedSlot?.date === slot.date && selectedSlot?.time === slot.time
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{slot.displayDate}</div>
                        <div className="text-gray-900">{slot.time}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-900 text-sm">No available slots at the moment.</p>
                )}
              </div>

              {/* Price Calculation */}
              {selectedSlot && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm text-gray-900">
                    <span>Duration:</span>
                    <span>{selectedSlot.duration} minutes</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-900">
                    <span>Rate:</span>
                    <span>₹{provider.hourlyRate}/hour</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 border-t pt-2 mt-2">
                    <span>Total:</span>
                    <span>₹{Math.round((provider.hourlyRate * selectedSlot.duration) / 60)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleBooking}
                disabled={!selectedSlot || bookingLoading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bookingLoading ? 'Processing...' : 'Book Now'}
              </button>

              <div className="mt-4 text-xs text-gray-900 text-center">
                You'll be redirected to secure payment after booking
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}