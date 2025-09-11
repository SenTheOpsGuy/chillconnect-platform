'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Smartphone, Shield, Check, AlertCircle } from 'lucide-react';

interface PhoneVerificationProps {
  initialPhone?: string;
  isVerified?: boolean;
  onVerificationSuccess?: () => void;
}

export default function PhoneVerification({ 
  initialPhone = '', 
  isVerified = false, 
  onVerificationSuccess 
}: PhoneVerificationProps) {
  const { data: session, update: updateSession } = useSession();
  
  const [step, setStep] = useState(isVerified ? 0 : 1); // 0: Verified, 1: Enter phone, 2: Enter OTP
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep(2);
        setSuccess(data.message);
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/confirm-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: otp }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep(0);
        setSuccess('Phone number verified successfully!');
        setOTP('');
        
        // Update session to reflect phone verification
        await updateSession();
        
        if (onVerificationSuccess) {
          onVerificationSuccess();
        }
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhone = () => {
    setStep(1);
    setOTP('');
    setError('');
    setSuccess('');
  };

  if (step === 0 && isVerified) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <Check className="w-5 h-5 text-green-600 mr-2" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Phone Verified</p>
            <p className="text-sm text-green-700">{phone}</p>
          </div>
          <button
            onClick={handleChangePhone}
            className="text-sm text-green-700 hover:text-green-800 font-medium"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <Smartphone className="w-5 h-5 text-gray-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">
          {step === 1 ? 'Add Phone Number' : 'Verify Phone Number'}
        </h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <Check className="w-4 h-4 text-green-600 mr-2" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use international format (e.g., +91 for India)
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <Shield className="w-12 h-12 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              Enter the 6-digit code sent to <strong>{phone}</strong>
            </p>
          </div>

          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                Verification Code
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-wider text-gray-900 bg-white"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleChangePhone}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium"
              >
                Change Number
              </button>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>

          <div className="text-center">
            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resend Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}