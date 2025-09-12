'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Star, MapPin, Clock, Filter, Search, ArrowLeft } from 'lucide-react';

interface Provider {
  id: string;
  expertise: string[];
  yearsExperience: number;
  hourlyRate: number;
  bio: string;
  rating: number;
  totalSessions: number;
  user: {
    profile: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
  availability: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
}

function SearchPageContent() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    minRate: '',
    maxRate: '',
    expertise: ''
  });

  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  useEffect(() => {
    searchProviders();
  }, [query]);

  const searchProviders = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (filters.expertise) params.append('expertise', filters.expertise);
      if (filters.minRate) params.append('minRate', filters.minRate);
      if (filters.maxRate) params.append('maxRate', filters.maxRate);

      const response = await fetch(`/api/providers/search?${params}`);
      const data = await response.json();

      if (response.ok) {
        setProviders(data.providers);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const applyFilters = () => {
    searchProviders();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-900 mt-4">Searching for experts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              ChillConnect
            </Link>
            <div className="text-gray-900">
              {providers.length} experts found for "{query}"
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Filter size={20} />
                Filters
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Expertise
                  </label>
                  <select
                    name="expertise"
                    value={filters.expertise}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  >
                    <option value="">All Categories</option>
                    <option value="Tax Consulting">Tax Consulting</option>
                    <option value="Legal Advisory">Legal Advisory</option>
                    <option value="Financial Planning">Financial Planning</option>
                    <option value="Business Consulting">Business Consulting</option>
                    <option value="Career Coaching">Career Coaching</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Price Range (₹/hour)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      name="minRate"
                      placeholder="Min"
                      value={filters.minRate}
                      onChange={handleFilterChange}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-slate-900"
                    />
                    <input
                      type="number"
                      name="maxRate"
                      placeholder="Max"
                      value={filters.maxRate}
                      onChange={handleFilterChange}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-slate-900"
                    />
                  </div>
                </div>

                <button
                  onClick={applyFilters}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {providers.length === 0 ? (
              <div className="bg-white p-12 rounded-lg shadow-sm text-center">
                <Search className="w-16 h-16 text-gray-900 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No experts found</h3>
                <p className="text-gray-900 mb-6">
                  We couldn't find any experts matching your search. Our team is working to find the right expert for you.
                </p>
                <Link
                  href="/"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
                >
                  Try Different Search
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {providers.map((provider) => (
                  <div key={provider.id} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                          {provider.user.profile?.avatar ? (
                            <img
                              src={provider.user.profile.avatar}
                              alt="Profile"
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-xl font-semibold text-gray-900">
                              {provider.user.profile?.firstName?.charAt(0)}
                              {provider.user.profile?.lastName?.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-1">
                            {provider.user.profile?.firstName} {provider.user.profile?.lastName}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-900 mb-2">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>{provider.rating.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{provider.yearsExperience} years exp</span>
                            </div>
                            <div>
                              {provider.totalSessions} sessions
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {provider.expertise.map((skill, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                          <p className="text-gray-900 mb-4">{provider.bio}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600 mb-2">
                          ₹{provider.hourlyRate}/hr
                        </div>
                        <Link
                          href={`/provider/${provider.id}`}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
                        >
                          Book Now
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}