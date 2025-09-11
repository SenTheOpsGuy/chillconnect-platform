'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Suspense } from 'react';

function AuthErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'CredentialsSignin':
        return {
          title: 'Invalid Credentials',
          description: 'The email or password you entered is incorrect. Please try again.',
        };
      case 'EmailNotVerified':
        return {
          title: 'Email Not Verified',
          description: 'Please verify your email address before signing in.',
        };
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          description: 'You do not have permission to access this resource.',
        };
      case 'Configuration':
        return {
          title: 'Configuration Error',
          description: 'There is a problem with the authentication configuration. Please contact support.',
        };
      case 'Verification':
        return {
          title: 'Verification Error',
          description: 'The verification link is invalid or has expired.',
        };
      case 'Default':
      default:
        return {
          title: 'Authentication Error',
          description: 'An error occurred during authentication. Please try again.',
        };
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{errorInfo.title}</h1>
        <p className="text-gray-900 mb-6">{errorInfo.description}</p>

        {error === 'EmailNotVerified' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Didn't receive the verification email? 
              <Link href="/verify-email" className="font-medium underline ml-1">
                Resend verification
              </Link>
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/login"
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </Link>
          
          <button
            onClick={() => router.back()}
            className="w-full flex items-center justify-center space-x-2 bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>

          <Link
            href="/"
            className="w-full flex items-center justify-center space-x-2 text-gray-900 hover:text-gray-800 transition-colors"
          >
            <span>Return to Home</span>
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-900">
            If you continue to experience issues, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}