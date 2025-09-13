'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { 
  ArrowRight, 
  DollarSign, 
  BookOpen, 
  Clock, 
  Award,
  CheckCircle 
} from 'lucide-react';

const EXPERTISE_OPTIONS = [
  'Technology Consulting',
  'Business Strategy',
  'Career Coaching',
  'Financial Planning',
  'Marketing & Sales',
  'Legal Advice',
  'Health & Wellness',
  'Education & Training',
  'Design & Creative',
  'Real Estate',
  'Personal Development',
  'Data Analysis',
  'Software Development',
  'Product Management',
  'Human Resources'
];

export default function ProviderOnboarding() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    expertise: [] as string[],
    yearsExperience: '',
    hourlyRate: '',
    bio: ''
  });

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

    // Check if provider profile already exists
    checkExistingProfile();
  }, [session, status, router]);

  const checkExistingProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      const data = await response.json();
      
      if (response.ok && data.providerProfile) {
        // Provider profile exists and has required fields
        if (data.providerProfile.expertise?.length > 0 && 
            data.providerProfile.hourlyRate > 0 && 
            data.providerProfile.yearsExperience > 0) {
          router.push('/dashboard/provider');
          return;
        }
        
        // Populate form with existing data
        setFormData({
          expertise: data.providerProfile.expertise || [],
          yearsExperience: data.providerProfile.yearsExperience?.toString() || '',
          hourlyRate: data.providerProfile.hourlyRate?.toString() || '',
          bio: data.providerProfile.bio || ''
        });
      } else {
        // No provider profile exists, create one
        await createProviderProfile();
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    }
  };

  const createProviderProfile = async () => {
    try {
      await fetch('/api/provider/create-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error creating provider profile:', error);
    }
  };

  const handleExpertiseToggle = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      expertise: prev.expertise.includes(skill)
        ? prev.expertise.filter(s => s !== skill)
        : [...prev.expertise, skill]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.expertise.length === 0) {
      toast({
        type: 'error',
        title: 'Expertise Required',
        message: 'Please select at least one area of expertise'
      });
      return;
    }

    if (!formData.yearsExperience || parseInt(formData.yearsExperience) < 0) {
      toast({
        type: 'error',
        title: 'Experience Required',
        message: 'Please enter your years of experience'
      });
      return;
    }

    if (!formData.hourlyRate || parseFloat(formData.hourlyRate) <= 0) {
      toast({
        type: 'error',
        title: 'Rate Required',
        message: 'Please set your hourly rate'
      });
      return;
    }

    if (!formData.bio.trim()) {
      toast({
        type: 'error',
        title: 'Bio Required',
        message: 'Please write a brief bio about yourself'
      });
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expertise: formData.expertise,
          yearsExperience: parseInt(formData.yearsExperience),
          hourlyRate: parseFloat(formData.hourlyRate),
          bio: formData.bio
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          type: 'success',
          title: 'Profile Completed',
          message: 'Your provider profile has been set up successfully!'
        });
        router.push('/dashboard/provider');
      } else {
        console.error('Profile setup failed:', { status: response.status, data });
        toast({
          type: 'error',
          title: 'Setup Failed',
          message: data.details || data.error || 'Failed to complete profile setup'
        });
      }
    } catch (error) {
      toast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to save profile. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Provider Profile</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Set up your expertise, rates, and bio to start offering consultations on ChillConnect
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <span className="ml-2 text-sm font-medium text-green-600">Account Created</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">2</span>
              </div>
              <span className="ml-2 text-sm font-medium text-blue-600">Provider Setup</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-500 text-sm font-bold">3</span>
              </div>
              <span className="ml-2 text-sm font-medium text-gray-500">Start Consulting</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Expertise Selection */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                <BookOpen className="w-5 h-5 inline mr-2" />
                Areas of Expertise *
              </label>
              <p className="text-gray-600 mb-4">Select the areas where you can provide expert consultation</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {EXPERTISE_OPTIONS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleExpertiseToggle(skill)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      formData.expertise.includes(skill)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <span className="text-sm font-medium">{skill}</span>
                  </button>
                ))}
              </div>
              {formData.expertise.length > 0 && (
                <p className="mt-2 text-sm text-green-600">
                  {formData.expertise.length} area{formData.expertise.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Years of Experience */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                <Clock className="w-5 h-5 inline mr-2" />
                Years of Experience *
              </label>
              <p className="text-gray-600 mb-4">How many years of professional experience do you have?</p>
              <input
                type="number"
                min="0"
                max="50"
                value={formData.yearsExperience}
                onChange={(e) => setFormData({...formData, yearsExperience: e.target.value})}
                className="w-full md:w-48 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="e.g., 5"
              />
            </div>

            {/* Hourly Rate */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                <DollarSign className="w-5 h-5 inline mr-2" />
                Hourly Rate (₹) *
              </label>
              <p className="text-gray-600 mb-4">Set your consulting rate per hour</p>
              <div className="relative w-full md:w-48">
                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  step="50"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({...formData, hourlyRate: e.target.value})}
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="1500"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Recommended: ₹1000-₹5000 based on expertise level
              </p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                Professional Bio *
              </label>
              <p className="text-gray-600 mb-4">
                Write a brief description about your background, expertise, and what clients can expect
              </p>
              <textarea
                rows={5}
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="Tell potential clients about your background, expertise, and how you can help them..."
                maxLength={500}
              />
              <p className="mt-2 text-sm text-gray-500">
                {formData.bio.length}/500 characters
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Setting up...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Setup</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="text-center mt-8">
          <p className="text-gray-600">
            Need help? Contact our support team at{' '}
            <a href="mailto:support@chillconnect.com" className="text-blue-600 hover:underline">
              support@chillconnect.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}