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

    // Redirect to appropriate dashboard based on role
    switch (session.user.role) {
      case 'SEEKER':
        router.push('/dashboard/seeker');
        break;
      case 'PROVIDER':
        router.push('/dashboard/provider');
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