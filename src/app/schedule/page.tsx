'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit3, 
  Trash2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface TimeSlot {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface ProviderSchedule {
  timeSlots: TimeSlot[];
  timezone: string;
  bufferTime: number; // minutes between sessions
  maxAdvanceBooking: number; // days in advance
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export default function SchedulePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [schedule, setSchedule] = useState<ProviderSchedule>({
    timeSlots: [],
    timezone: 'Asia/Kolkata',
    bufferTime: 15,
    maxAdvanceBooking: 30
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  const [newSlot, setNewSlot] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00'
  });
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'PROVIDER') {
      router.push('/dashboard');
      return;
    }

    fetchSchedule();
  }, [session, status, router]);

  const fetchSchedule = async () => {
    try {
      const response = await fetch('/api/schedule');
      const data = await response.json();
      
      if (response.ok) {
        setSchedule(data.schedule);
      } else {
        console.error('Error fetching schedule:', data.error);
        // Set default empty schedule if fetch fails
        setSchedule({
          timeSlots: [],
          timezone: 'Asia/Kolkata',
          bufferTime: 15,
          maxAdvanceBooking: 30
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      // Set default empty schedule if fetch fails
      setSchedule({
        timeSlots: [],
        timezone: 'Asia/Kolkata',
        bufferTime: 15,
        maxAdvanceBooking: 30
      });
      setLoading(false);
    }
  };

  const saveSchedule = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/schedule', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(schedule),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Schedule saved successfully');
        // Optionally show success message to user
      } else {
        console.error('Error saving schedule:', data.error);
        // Optionally show error message to user
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      // Optionally show error message to user
    } finally {
      setSaving(false);
    }
  };

  const addTimeSlot = () => {
    // Clear any previous validation errors
    setValidationError('');

    // Validate time order
    if (newSlot.startTime >= newSlot.endTime) {
      setValidationError('Start time must be before end time');
      return;
    }

    // Convert times to minutes for easier comparison
    const newStartMinutes = timeToMinutes(newSlot.startTime);
    const newEndMinutes = timeToMinutes(newSlot.endTime);

    // Check for duplicates and overlaps on the same day
    const existingSlots = schedule.timeSlots.filter(slot => slot.dayOfWeek === newSlot.dayOfWeek);
    
    for (const existingSlot of existingSlots) {
      const existingStartMinutes = timeToMinutes(existingSlot.startTime);
      const existingEndMinutes = timeToMinutes(existingSlot.endTime);

      // Check for exact duplicate
      if (existingSlot.startTime === newSlot.startTime && existingSlot.endTime === newSlot.endTime) {
        setValidationError('This exact time slot already exists for the selected day');
        return;
      }

      // Check for overlapping time slots
      if (
        (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes)
      ) {
        setValidationError(`Time slot overlaps with existing slot: ${existingSlot.startTime} - ${existingSlot.endTime}`);
        return;
      }
    }

    // If validation passes, create the time slot
    const newTimeSlot: TimeSlot = {
      id: Date.now().toString(),
      dayOfWeek: newSlot.dayOfWeek,
      startTime: newSlot.startTime,
      endTime: newSlot.endTime,
      isActive: true
    };

    setSchedule(prev => ({
      ...prev,
      timeSlots: [...prev.timeSlots, newTimeSlot]
    }));

    setNewSlot({
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00'
    });
    setShowAddForm(false);
  };

  // Helper function to convert time string to minutes
  const timeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const deleteTimeSlot = (id: string) => {
    setSchedule(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter(slot => slot.id !== id)
    }));
  };

  const toggleSlotActive = (id: string) => {
    setSchedule(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.map(slot =>
        slot.id === id ? { ...slot, isActive: !slot.isActive } : slot
      )
    }));
  };

  const getWeekDates = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Start from Sunday
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const weekDates = getWeekDates(currentWeek);

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
              <p className="text-gray-900">Manage your availability for consultations</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Time Slot</span>
              </button>
              <button
                onClick={saveSchedule}
                disabled={saving}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Settings Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Timezone
                  </label>
                  <select
                    value={schedule.timezone}
                    onChange={(e) => setSchedule(prev => ({...prev, timezone: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/London">Europe/London</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Buffer Time (minutes)
                  </label>
                  <select
                    value={schedule.bufferTime}
                    onChange={(e) => setSchedule(prev => ({...prev, bufferTime: parseInt(e.target.value)}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  >
                    <option value={0}>No buffer</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Max Advance Booking (days)
                  </label>
                  <select
                    value={schedule.maxAdvanceBooking}
                    onChange={(e) => setSchedule(prev => ({...prev, maxAdvanceBooking: parseInt(e.target.value)}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  >
                    <option value={7}>1 week</option>
                    <option value={14}>2 weeks</option>
                    <option value={30}>1 month</option>
                    <option value={60}>2 months</option>
                    <option value={90}>3 months</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="lg:col-span-3">
            {/* Week Navigation */}
            <div className="bg-white rounded-lg shadow-sm mb-6">
              <div className="p-6 flex items-center justify-between">
                <button
                  onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <h3 className="text-lg font-semibold text-gray-900">
                  {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
                </h3>
                
                <button
                  onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Time Slots */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Schedule</h3>
                
                <div className="space-y-4">
                  {DAYS_OF_WEEK.map((dayName, dayIndex) => {
                    const daySlots = schedule.timeSlots.filter(slot => slot.dayOfWeek === dayIndex);
                    
                    return (
                      <div key={dayIndex} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">{dayName}</h4>
                        
                        {daySlots.length === 0 ? (
                          <p className="text-gray-800 text-sm">No availability set</p>
                        ) : (
                          <div className="space-y-2">
                            {daySlots.map((slot) => (
                              <div
                                key={slot.id}
                                className={`flex items-center justify-between p-3 border rounded-lg ${
                                  slot.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <Clock className="w-4 h-4 text-gray-800" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {slot.startTime} - {slot.endTime}
                                  </span>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    slot.isActive 
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {slot.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => toggleSlotActive(slot.id)}
                                    className="text-blue-600 hover:text-blue-700 text-sm"
                                  >
                                    {slot.isActive ? 'Deactivate' : 'Activate'}
                                  </button>
                                  <button
                                    onClick={() => setEditingSlot(slot)}
                                    className="p-1 hover:bg-gray-200 rounded"
                                  >
                                    <Edit3 className="w-4 h-4 text-gray-800" />
                                  </button>
                                  <button
                                    onClick={() => deleteTimeSlot(slot.id)}
                                    className="p-1 hover:bg-red-100 rounded"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Time Slot Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Time Slot</h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setValidationError('');
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {validationError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {validationError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Day of Week
                </label>
                <select
                  value={newSlot.dayOfWeek}
                  onChange={(e) => {
                    setNewSlot({...newSlot, dayOfWeek: parseInt(e.target.value)});
                    setValidationError('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  {DAYS_OF_WEEK.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newSlot.startTime}
                    onChange={(e) => {
                      setNewSlot({...newSlot, startTime: e.target.value});
                      setValidationError('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newSlot.endTime}
                    onChange={(e) => {
                      setNewSlot({...newSlot, endTime: e.target.value});
                      setValidationError('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setValidationError('');
                }}
                className="px-4 py-2 text-gray-900 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={addTimeSlot}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Time Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}