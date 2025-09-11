'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Globe, Shield, Database, Bell, Server } from 'lucide-react';
import Link from 'next/link';

interface SystemSettings {
  platform: {
    name: string;
    description: string;
    maintenanceMode: boolean;
    allowRegistrations: boolean;
    requireEmailVerification: boolean;
  };
  payments: {
    commissionRate: number;
    minimumWithdrawal: number;
    paymentProcessors: {
      paypal: boolean;
      stripe: boolean;
    };
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    adminAlerts: boolean;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    requireTwoFactor: boolean;
    passwordMinLength: number;
  };
  features: {
    chatEnabled: boolean;
    videoCallsEnabled: boolean;
    fileUploadsEnabled: boolean;
    reportingEnabled: boolean;
  };
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings>({
    platform: {
      name: 'ChillConnect',
      description: 'Professional consultation platform',
      maintenanceMode: false,
      allowRegistrations: true,
      requireEmailVerification: true
    },
    payments: {
      commissionRate: 10,
      minimumWithdrawal: 1000,
      paymentProcessors: {
        paypal: true,
        stripe: false
      }
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      adminAlerts: true
    },
    security: {
      sessionTimeout: 3600,
      maxLoginAttempts: 5,
      requireTwoFactor: false,
      passwordMinLength: 8
    },
    features: {
      chatEnabled: true,
      videoCallsEnabled: true,
      fileUploadsEnabled: true,
      reportingEnabled: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchSettings();
  }, [session, status, router]);

  const fetchSettings = async () => {
    try {
      // For now, we'll use the default settings above
      // In production, you would fetch from an API endpoint
      setLoading(false);
    } catch (error) {
      console.error('Error fetching system settings:', error);
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // For now, we'll just simulate saving
      // In production, you would save to an API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveMessage('Settings saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link 
                href="/dashboard/admin"
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                <p className="text-gray-900">Configure platform-wide settings and preferences</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {saveMessage && (
                <span className={`text-sm ${saveMessage.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                  {saveMessage}
                </span>
              )}
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Platform Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <Globe className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Platform Settings</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Platform Name
                </label>
                <input
                  type="text"
                  value={settings.platform.name}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    platform: { ...prev.platform, name: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  value={settings.platform.description}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    platform: { ...prev.platform, description: e.target.value }
                  }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">Maintenance Mode</label>
                <input
                  type="checkbox"
                  checked={settings.platform.maintenanceMode}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    platform: { ...prev.platform, maintenanceMode: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">Allow Registrations</label>
                <input
                  type="checkbox"
                  checked={settings.platform.allowRegistrations}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    platform: { ...prev.platform, allowRegistrations: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">Require Email Verification</label>
                <input
                  type="checkbox"
                  checked={settings.platform.requireEmailVerification}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    platform: { ...prev.platform, requireEmailVerification: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <Database className="w-5 h-5 text-green-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Payment Settings</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={settings.payments.commissionRate}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    payments: { ...prev.payments, commissionRate: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Minimum Withdrawal (₹)
                </label>
                <input
                  type="number"
                  min="100"
                  value={settings.payments.minimumWithdrawal}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    payments: { ...prev.payments, minimumWithdrawal: parseFloat(e.target.value) || 100 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-900">Payment Processors</label>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">PayPal</label>
                  <input
                    type="checkbox"
                    checked={settings.payments.paymentProcessors.paypal}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      payments: { 
                        ...prev.payments, 
                        paymentProcessors: { 
                          ...prev.payments.paymentProcessors, 
                          paypal: e.target.checked 
                        }
                      }
                    }))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">Stripe</label>
                  <input
                    type="checkbox"
                    checked={settings.payments.paymentProcessors.stripe}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      payments: { 
                        ...prev.payments, 
                        paymentProcessors: { 
                          ...prev.payments.paymentProcessors, 
                          stripe: e.target.checked 
                        }
                      }
                    }))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <Shield className="w-5 h-5 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Session Timeout (seconds)
                </label>
                <input
                  type="number"
                  min="300"
                  max="86400"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, sessionTimeout: parseInt(e.target.value) || 3600 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Max Login Attempts
                </label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={settings.security.maxLoginAttempts}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, maxLoginAttempts: parseInt(e.target.value) || 5 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Minimum Password Length
                </label>
                <input
                  type="number"
                  min="6"
                  max="20"
                  value={settings.security.passwordMinLength}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, passwordMinLength: parseInt(e.target.value) || 8 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">Require Two-Factor Auth</label>
                <input
                  type="checkbox"
                  checked={settings.security.requireTwoFactor}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, requireTwoFactor: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Feature Toggles and Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Feature Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <Server className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Feature Settings</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">Chat Enabled</label>
                <input
                  type="checkbox"
                  checked={settings.features.chatEnabled}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    features: { ...prev.features, chatEnabled: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">Video Calls Enabled</label>
                <input
                  type="checkbox"
                  checked={settings.features.videoCallsEnabled}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    features: { ...prev.features, videoCallsEnabled: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">File Uploads Enabled</label>
                <input
                  type="checkbox"
                  checked={settings.features.fileUploadsEnabled}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    features: { ...prev.features, fileUploadsEnabled: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">Reporting Enabled</label>
                <input
                  type="checkbox"
                  checked={settings.features.reportingEnabled}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    features: { ...prev.features, reportingEnabled: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <Bell className="w-5 h-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">Email Notifications</label>
                <input
                  type="checkbox"
                  checked={settings.notifications.emailNotifications}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, emailNotifications: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">SMS Notifications</label>
                <input
                  type="checkbox"
                  checked={settings.notifications.smsNotifications}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, smsNotifications: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">Push Notifications</label>
                <input
                  type="checkbox"
                  checked={settings.notifications.pushNotifications}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, pushNotifications: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">Admin Alerts</label>
                <input
                  type="checkbox"
                  checked={settings.notifications.adminAlerts}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, adminAlerts: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}