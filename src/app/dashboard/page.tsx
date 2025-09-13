'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    // Check if provider needs onboarding
    if (session.user.role === 'PROVIDER') {
      checkProviderProfile();
      return;
    }

    // Redirect to appropriate dashboard based on role
    switch (session.user.role) {
      case 'SEEKER':
        router.push('/dashboard/seeker');
        break;
      case 'EMPLOYEE':
        router.push('/dashboard/employee');
        break;
      case 'SUPER_ADMIN':
        router.push('/dashboard/admin');
        break;
      default:
        router.push('/dashboard/seeker');
        break;
    }
  }, [session, status, router]);

  const checkProviderProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      const data = await response.json();
      
      if (response.ok && data.providerProfile) {
        // Check if provider profile has required fields
        if (data.providerProfile.expertise?.length > 0 && 
            data.providerProfile.hourlyRate > 0 && 
            data.providerProfile.yearsExperience > 0 &&
            data.providerProfile.bio?.trim()) {
          router.push('/dashboard/provider');
          return;
        }
      }
      
      // Provider profile incomplete, redirect to onboarding
      router.push('/onboarding/provider');
    } catch (error) {
      console.error('Error checking provider profile:', error);
      // On error, redirect to onboarding to be safe
      router.push('/onboarding/provider');
    }
  };

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-900">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}