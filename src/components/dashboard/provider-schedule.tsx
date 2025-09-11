'use client';

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface Booking {
  id: string;
  startTime: string;
  seeker: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

export function ProviderSchedule() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchTodayBookings();
  }, []);
  
  const fetchTodayBookings = async () => {
    try {
      const res = await fetch('/api/bookings/today');
      const data = await res.json();
      setBookings(data.bookings || []);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div>Loading schedule...</div>;
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Calendar size={20} />
        Today's Schedule
      </h2>
      
      {bookings.length === 0 ? (
        <p className="text-gray-800">No bookings for today</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div key={booking.id} className="border-l-4 border-blue-500 pl-4 py-2">
              <div className="font-semibold text-gray-900">
                {new Date(booking.startTime).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div className="text-sm text-gray-900">
                {booking.seeker.profile.firstName} {booking.seeker.profile.lastName}
              </div>
              <button className="mt-2 text-sm text-blue-600 hover:underline">
                Join Session
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}