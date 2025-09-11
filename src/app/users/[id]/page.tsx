'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  ArrowLeft,
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Star,
  Award,
  Clock,
  Shield,
  CheckCircle,
  Ban,
  DollarSign,
  MessageCircle
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
  role: 'SEEKER' | 'PROVIDER' | 'EMPLOYEE' | 'SUPER_ADMIN';
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  providerProfile?: {
    expertise: string[];
    yearsExperience: number;
    hourlyRate: number;
    rating: number;
    totalSessions: number;
    bio: string;
    verificationStatus: string;
  };
}

export default function UserProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      router.push('/unauthorized');
      return;
    }

    fetchUserProfile();
  }, [session, status, router, userId]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      
      if (response.ok) {
        setProfile(data.user);
      } else {
        setError(data.error || 'User not found');
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load user profile');
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-red-100 text-red-800';
      case 'EMPLOYEE': return 'bg-purple-100 text-purple-800';
      case 'PROVIDER': return 'bg-green-100 text-green-800';
      case 'SEEKER': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'SUSPENDED': return <Ban className="w-4 h-4 text-red-500" />;
      default: return <Shield className="w-4 h-4 text-yellow-500" />;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Unavailable</h3>
          <p className="text-gray-900 mb-4">{error || 'User not found'}</p>
          <Link
            href="/users"
            className="inline-flex items-center text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Link>
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
            href="/users"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
              <p className="text-gray-900">Detailed view of user account and activity</p>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(profile.status)}
              <span className="text-sm text-gray-900">{profile.status}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(profile.role)}`}>
                    {profile.role}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-900" />
                  <div>
                    <p className="text-sm text-gray-900">Email</p>
                    <p className="font-medium text-gray-900">{profile.email}</p>
                    {profile.emailVerified ? (
                      <p className="text-xs text-green-600">Verified</p>
                    ) : (
                      <p className="text-xs text-red-600">Not verified</p>
                    )}
                  </div>
                </div>

                {profile.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-900" />
                    <div>
                      <p className="text-sm text-gray-900">Phone</p>
                      <p className="font-medium text-gray-900">{profile.phone}</p>
                      {profile.phoneVerified ? (
                        <p className="text-xs text-green-600">Verified</p>
                      ) : (
                        <p className="text-xs text-red-600">Not verified</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-900" />
                  <div>
                    <p className="text-sm text-gray-900">Member Since</p>
                    <p className="font-medium text-gray-900">
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {profile.lastLoginAt && (
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-gray-900" />
                    <div>
                      <p className="text-sm text-gray-900">Last Login</p>
                      <p className="font-medium text-gray-900">
                        {new Date(profile.lastLoginAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {profile.bio && (
                <div className="mt-6">
                  <p className="text-sm text-gray-900 mb-2">Bio</p>
                  <p className="text-gray-900">{profile.bio}</p>
                </div>
              )}
            </div>

            {/* Provider Profile */}
            {profile.providerProfile && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Provider Profile</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-5 h-5 text-gray-900" />
                    <div>
                      <p className="text-sm text-gray-900">Hourly Rate</p>
                      <p className="font-medium text-gray-900">₹{profile.providerProfile.hourlyRate}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Star className="w-5 h-5 text-gray-900" />
                    <div>
                      <p className="text-sm text-gray-900">Rating</p>
                      <p className="font-medium text-gray-900">{profile.providerProfile.rating}/5</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <MessageCircle className="w-5 h-5 text-gray-900" />
                    <div>
                      <p className="text-sm text-gray-900">Total Sessions</p>
                      <p className="font-medium text-gray-900">{profile.providerProfile.totalSessions}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Award className="w-5 h-5 text-gray-900" />
                    <div>
                      <p className="text-sm text-gray-900">Experience</p>
                      <p className="font-medium text-gray-900">{profile.providerProfile.yearsExperience} years</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-900 mb-2">Expertise</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.providerProfile.expertise.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-900 mb-2">Professional Bio</p>
                  <p className="text-gray-900">{profile.providerProfile.bio}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Actions</h3>
              <div className="space-y-3">
                {profile.status === 'ACTIVE' ? (
                  <button className="w-full flex items-center justify-center space-x-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg hover:bg-red-200">
                    <Ban className="w-4 h-4" />
                    <span>Suspend User</span>
                  </button>
                ) : (
                  <button className="w-full flex items-center justify-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg hover:bg-green-200">
                    <CheckCircle className="w-4 h-4" />
                    <span>Activate User</span>
                  </button>
                )}
                
                <button className="w-full flex items-center justify-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-200">
                  <Mail className="w-4 h-4" />
                  <span>Send Message</span>
                </button>
                
                <button className="w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200">
                  <User className="w-4 h-4" />
                  <span>View Sessions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}