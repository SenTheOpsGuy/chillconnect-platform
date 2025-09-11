'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface CreateDisputeModalProps {
  booking: {
    id: string;
    startTime: string;
    amount: number;
    provider: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
    seeker: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const disputeReasons = [
  'Provider no-show',
  'Seeker no-show',
  'Technical issues during session',
  'Poor service quality',
  'Billing/payment dispute',
  'Inappropriate behavior',
  'Session ended early',
  'Misleading service description',
  'Other'
];

export default function CreateDisputeModal({ 
  booking, 
  isOpen, 
  onClose, 
  onSuccess 
}: CreateDisputeModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/disputes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          reason,
          description,
          priority
        })
      });

      if (response.ok) {
        onSuccess();
        onClose();
        setReason('');
        setDescription('');
        setPriority('medium');
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating dispute:', error);
      alert('Failed to create dispute');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create Dispute</h3>
                <p className="text-gray-900">Report an issue with this booking</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-900 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Booking Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Booking Details</h4>
            <div className="text-sm space-y-1">
              <p><strong>Date:</strong> {new Date(booking.startTime).toLocaleDateString()}</p>
              <p><strong>Provider:</strong> {booking.provider.profile.firstName} {booking.provider.profile.lastName}</p>
              <p><strong>Seeker:</strong> {booking.seeker.profile.firstName} {booking.seeker.profile.lastName}</p>
              <p><strong>Amount:</strong> ₹{booking.amount.toLocaleString()}</p>
            </div>
          </div>

          {/* Dispute Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Reason for Dispute *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a reason</option>
              {disputeReasons.map((reasonOption) => (
                <option key={reasonOption} value={reasonOption}>
                  {reasonOption}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional details about the issue..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Priority Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <label
                  key={level}
                  className={`relative flex items-center justify-center p-3 border rounded-lg cursor-pointer ${
                    priority === level
                      ? level === 'high'
                        ? 'border-red-500 bg-red-50'
                        : level === 'medium'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={level}
                    checked={priority === level}
                    onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="font-medium text-gray-900 capitalize">{level}</div>
                    <div className="text-xs text-gray-900">
                      {level === 'high' && 'Urgent issue'}
                      {level === 'medium' && 'Standard priority'}
                      {level === 'low' && 'Minor issue'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Important Notice</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Creating a dispute will notify both parties and our support team. 
                  Please ensure you have tried to resolve the issue directly with the other party first.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-900 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason || submitting}
              className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}