'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  MessageCircle, 
  User, 
  Search, 
  Settings, 
  LogOut,
  Home,
  Users,
  BarChart3,
  DollarSign
} from 'lucide-react';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    // Redirect to appropriate dashboard based on role
    const currentPath = window.location.pathname;
    if (currentPath === '/dashboard') {
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
      }
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const getNavItems = () => {
    const baseItems = [
      { href: '/dashboard', icon: Home, label: 'Dashboard' },
      { href: '/profile', icon: User, label: 'Profile' },
      { href: '/settings', icon: Settings, label: 'Settings' }
    ];

    switch (session.user.role) {
      case 'SEEKER':
        return [
          { href: '/dashboard/seeker', icon: Home, label: 'Dashboard' },
          { href: '/search', icon: Search, label: 'Find Experts' },
          { href: '/bookings', icon: Calendar, label: 'My Bookings' },
          { href: '/messages', icon: MessageCircle, label: 'Messages' },
          ...baseItems.slice(1)
        ];
      
      case 'PROVIDER':
        return [
          { href: '/dashboard/provider', icon: Home, label: 'Dashboard' },
          { href: '/schedule', icon: Calendar, label: 'Schedule' },
          { href: '/sessions', icon: Users, label: 'Sessions' },
          { href: '/messages', icon: MessageCircle, label: 'Messages' },
          { href: '/provider/payouts', icon: DollarSign, label: 'Payouts' },
          ...baseItems.slice(1)
        ];
      
      case 'EMPLOYEE':
        return [
          { href: '/dashboard/employee', icon: Home, label: 'Dashboard' },
          { href: '/unmatched-requests', icon: Search, label: 'Unmatched Requests' },
          { href: '/verifications', icon: Users, label: 'Verifications' },
          { href: '/disputes', icon: MessageCircle, label: 'Disputes' },
          { href: '/admin/payouts', icon: DollarSign, label: 'Payouts' },
          ...baseItems.slice(1)
        ];
      
      case 'SUPER_ADMIN':
        return [
          { href: '/dashboard/admin', icon: Home, label: 'Dashboard' },
          { href: '/analytics', icon: BarChart3, label: 'Analytics' },
          { href: '/users', icon: Users, label: 'Users' },
          { href: '/reports', icon: MessageCircle, label: 'Reports' },
          { href: '/admin/payouts', icon: DollarSign, label: 'Payouts' },
          ...baseItems.slice(1)
        ];
      
      default:
        return baseItems;
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm">
        <div className="p-6">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            ChillConnect
          </Link>
        </div>
        
        <nav className="mt-6">
          <div className="px-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center px-3 py-2 text-gray-900 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold text-gray-900">
              {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{session.user.name || session.user.email}</div>
              <div className="text-xs text-gray-900 capitalize">{session.user.role.toLowerCase()}</div>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center w-full px-3 py-2 text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}