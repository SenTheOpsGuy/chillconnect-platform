'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Phone, CheckCircle, Clock } from 'lucide-react';

function VerifyRegistrationContent() {
  const [emailOTP, setEmailOTP] = useState('');
  const [phoneOTP, setPhoneOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [completedRegistration, setCompletedRegistration] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const phone = searchParams.get('phone') || '';

  useEffect(() => {
    if (!email || !phone) {
      router.push('/register');
    }
  }, [email, phone, router]);

  const handleEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailOTP.length !== 6) {
      setError('Email OTP must be 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp: emailOTP
        })
      });

      const data = await response.json();

      if (response.ok) {
        setEmailVerified(true);
        setEmailOTP('');
        
        if (data.userCreated) {
          setCompletedRegistration(true);
          setSuccess('Registration completed successfully! You can now login.');
        } else {
          setSuccess('Email verified! Please verify your phone number to complete registration.');
        }
      } else {
        setError(data.error || 'Email verification failed');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneOTP.length !== 6) {
      setError('Phone OTP must be 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/confirm-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: phoneOTP
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPhoneVerified(true);
        setPhoneOTP('');
        
        if (data.userCreated) {
          setCompletedRegistration(true);
          setSuccess('Registration completed successfully! You can now login.');
        } else {
          setSuccess('Phone verified! Please verify your email to complete registration.');
        }
      } else {
        setError(data.error || 'Phone verification failed');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (completedRegistration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Registration Complete!</h1>
          <p className="text-gray-900 mb-6">
            Your account has been successfully created and verified. You can now login to ChillConnect.
          </p>
          <Link
            href="/login"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 inline-block"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            ChillConnect
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Verify Your Account</h1>
          <p className="text-gray-900">
            Please verify both your email and phone number to complete registration
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center ${emailVerified ? 'text-green-600' : 'text-gray-900'}`}>
              {emailVerified ? <CheckCircle size={20} /> : <Mail size={20} />}
              <span className="ml-2 text-sm">Email</span>
            </div>
            <div className={`flex items-center ${phoneVerified ? 'text-green-600' : 'text-gray-900'}`}>
              {phoneVerified ? <CheckCircle size={20} /> : <Phone size={20} />}
              <span className="ml-2 text-sm">Phone</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(emailVerified ? 50 : 0) + (phoneVerified ? 50 : 0)}%` }}
            ></div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-900 mb-2">
            <strong>Email:</strong> {email}
          </p>
          <p className="text-sm text-gray-900">
            <strong>Phone:</strong> {phone}
          </p>
        </div>

        {/* Error/Success Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Email Verification */}
        {!emailVerified && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Verify Email
            </h3>
            <form onSubmit={handleEmailVerification} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Enter email verification code
                </label>
                <input
                  type="text"
                  value={emailOTP}
                  onChange={(e) => setEmailOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-center text-lg tracking-wider"
                  placeholder="123456"
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || emailOTP.length !== 6}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>
          </div>
        )}

        {/* Phone Verification */}
        {!phoneVerified && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Phone className="w-5 h-5 mr-2" />
              Verify Phone
            </h3>
            <form onSubmit={handlePhoneVerification} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Enter SMS verification code
                </label>
                <input
                  type="text"
                  value={phoneOTP}
                  onChange={(e) => setPhoneOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-center text-lg tracking-wider"
                  placeholder="123456"
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || phoneOTP.length !== 6}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify Phone'}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-800 text-sm">
            Didn't receive the codes?{' '}
            <Link href="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
              Try registering again
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyRegistrationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <VerifyRegistrationContent />
    </Suspense>
  );
}