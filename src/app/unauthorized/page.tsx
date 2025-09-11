'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p className="text-gray-900 mb-6">
          You don't have permission to access this page. This area is restricted to authorized users only.
        </p>

        {session ? (
          <div className="mb-6">
            <p className="text-sm text-gray-900 mb-2">
              Logged in as: <span className="font-medium text-gray-900">{session.user.email}</span>
            </p>
            <p className="text-sm text-gray-900">
              Role: <span className="font-medium text-gray-900">{session.user.role}</span>
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
          
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center space-x-2 bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </Link>

          {!session && (
            <Link
              href="/login"
              className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <span>Login</span>
            </Link>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-900">
            If you believe this is an error, please contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}