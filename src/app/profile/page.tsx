'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/components/ui/toast';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Edit3,
  Save,
  X,
  Camera,
  Star,
  Award,
  Clock,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  timezone: string;
  bio?: string;
  role: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}

interface ProviderProfile {
  expertise: string[];
  yearsExperience: number;
  hourlyRate: number;
  rating: number;
  totalSessions: number;
  bio: string;
  verificationStatus: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    timezone: '',
    bio: '',
    hourlyRate: ''
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    fetchProfile();
  }, [session, status, router]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      const data = await response.json();
      
      if (response.ok) {
        setProfile(data.profile);
        setProviderProfile(data.providerProfile);
        
        setFormData({
          firstName: data.profile.firstName || '',
          lastName: data.profile.lastName || '',
          phone: data.profile.phone || '',
          timezone: data.profile.timezone || 'Asia/Kolkata',
          bio: data.profile.bio || '',
          hourlyRate: data.providerProfile?.hourlyRate?.toString() || ''
        });
      } else {
        toast({
          type: 'error',
          title: 'Failed to load profile',
          message: data.error || 'Unable to fetch profile information'
        });
        // Set default form data on error
        setFormData({
          firstName: '',
          lastName: '',
          phone: '',
          timezone: 'Asia/Kolkata',
          bio: '',
          hourlyRate: ''
        });
      }
      
      setLoading(false);
    } catch (error) {
      toast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to connect to server. Please try again.'
      });
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const requestBody: any = { ...formData };
      
      // Convert hourlyRate to number if it's a provider and the field is filled
      if (providerProfile && formData.hourlyRate) {
        requestBody.hourlyRate = parseFloat(formData.hourlyRate);
      }
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Update local state with saved data
        setProfile(prev => prev ? {
          ...prev,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          timezone: formData.timezone,
          bio: formData.bio
        } : null);

        // Update provider profile if applicable
        if (providerProfile && formData.hourlyRate) {
          setProviderProfile(prev => prev ? {
            ...prev,
            hourlyRate: parseFloat(formData.hourlyRate)
          } : null);
        }
        
        setEditing(false);
        toast({
          type: 'success',
          title: 'Profile Updated',
          message: 'Your profile information has been saved successfully.'
        });
      } else {
        toast({
          type: 'error',
          title: 'Save Failed',
          message: data.error || 'Unable to save profile changes'
        });
      }
    } catch (error) {
      toast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to save profile. Please try again.'
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        type: 'error',
        title: 'Invalid File',
        message: 'Please select an image file'
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        type: 'error',
        title: 'File Too Large',
        message: 'Image must be smaller than 5MB'
      });
      return;
    }

    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/profile/upload-avatar', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setProfile(prev => prev ? {
          ...prev,
          avatar: data.avatarUrl
        } : null);
        
        toast({
          type: 'success',
          title: 'Avatar Updated',
          message: 'Your profile picture has been updated successfully'
        });
      } else {
        toast({
          type: 'error',
          title: 'Upload Failed',
          message: data.error || 'Failed to upload avatar'
        });
      }
    } catch (error) {
      toast({
        type: 'error',
        title: 'Upload Error',
        message: 'Failed to upload avatar. Please try again.'
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Profile not found</h3>
          <p className="text-gray-900">Unable to load profile information.</p>
        </div>
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
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            <p className="text-gray-900">Manage your account information</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center">
                {/* Avatar */}
                <div className="relative inline-block mb-4">
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-semibold text-gray-900">
                        {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {profile.firstName} {profile.lastName}
                </h2>
                <p className="text-blue-600 font-medium capitalize mb-2">
                  {profile.role.toLowerCase()}
                </p>
                <p className="text-gray-900 text-sm">
                  Member since {new Date(profile.createdAt).toLocaleDateString()}
                </p>

                {/* Hidden file input for avatar upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              {/* Provider Stats */}
              {providerProfile && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-gray-900">Rating</span>
                      </div>
                      <span className="font-semibold text-gray-900">{providerProfile.rating}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Award className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-900">Sessions</span>
                      </div>
                      <span className="font-semibold text-gray-900">{providerProfile.totalSessions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-900">Experience</span>
                      </div>
                      <span className="font-semibold text-gray-900">{providerProfile.yearsExperience} years</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditing(false);
                          setFormData({
                            firstName: profile.firstName,
                            lastName: profile.lastName,
                            phone: profile.phone || '',
                            timezone: profile.timezone,
                            bio: profile.bio || '',
                            hourlyRate: providerProfile?.hourlyRate?.toString() || ''
                          });
                        }}
                        className="flex items-center space-x-2 text-gray-900 hover:text-gray-900"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                {editing ? (
                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Timezone
                      </label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="Europe/London">Europe/London</option>
                        <option value="Asia/Singapore">Asia/Singapore</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Bio
                      </label>
                      <textarea
                        rows={4}
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                        placeholder="Tell us about yourself..."
                      />
                    </div>

                    {providerProfile && (
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Hourly Rate (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.hourlyRate}
                          onChange={(e) => setFormData({...formData, hourlyRate: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                          placeholder="1500"
                        />
                      </div>
                    )}
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center space-x-3">
                        <User className="w-5 h-5 text-gray-900" />
                        <div>
                          <p className="text-sm text-gray-900">Full Name</p>
                          <p className="font-medium text-gray-900">
                            {profile.firstName} {profile.lastName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Mail className="w-5 h-5 text-gray-900" />
                        <div>
                          <p className="text-sm text-gray-900">Email</p>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{profile.email}</p>
                            {profile.emailVerified && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-gray-900" />
                        <div>
                          <p className="text-sm text-gray-900">Phone</p>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">
                              {profile.phone || 'Not provided'}
                            </p>
                            {profile.phone && profile.phoneVerified && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <MapPin className="w-5 h-5 text-gray-900" />
                        <div>
                          <p className="text-sm text-gray-900">Timezone</p>
                          <p className="font-medium text-gray-900">{profile.timezone}</p>
                        </div>
                      </div>
                    </div>

                    {profile.bio && (
                      <div>
                        <p className="text-sm text-gray-900 mb-2">Bio</p>
                        <p className="text-gray-900">{profile.bio}</p>
                      </div>
                    )}

                    {providerProfile && (
                      <div className="pt-6 border-t border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Provider Information</h4>
                        
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-gray-900 mb-2">Expertise</p>
                            <div className="flex flex-wrap gap-2">
                              {providerProfile.expertise.map((skill, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-900">Hourly Rate</p>
                              <p className="font-semibold text-gray-900">₹{providerProfile.hourlyRate}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-900">Verification Status</p>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                providerProfile.verificationStatus === 'VERIFIED'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {providerProfile.verificationStatus}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}