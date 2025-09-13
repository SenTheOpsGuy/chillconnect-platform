'use client';

import { SearchBar } from "@/components/ui/search-bar";
import { ArrowRight, Users, Clock, Shield } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (status === 'authenticated' && session?.user) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render landing page if user is authenticated (redirect is in progress)
  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-blue-600">ChillConnect</div>
        <div className="space-x-4">
          <Link href="/login" className="text-gray-800 hover:text-blue-600">
            Login
          </Link>
          <Link 
            href="/register" 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Connect with Expert
          <span className="text-blue-600"> Consultants</span>
        </h1>
        <p className="text-xl text-gray-800 mb-12 max-w-3xl mx-auto">
          Get professional consultation on tax, legal, financial, and business matters. 
          Book instantly, meet online, get expert guidance.
        </p>

        {/* Search Bar */}
        <div className="mb-16">
          <SearchBar />
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <Clock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Instant Booking</h3>
            <p className="text-gray-800">
              Find and book consultations instantly. No waiting, no back-and-forth emails.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Verified Experts</h3>
            <p className="text-gray-800">
              All consultants are thoroughly verified with proper credentials and experience.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Secure & Private</h3>
            <p className="text-gray-800">
              End-to-end encrypted meetings and secure payment processing.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-blue-600 text-white p-12 rounded-lg">
          <h2 className="text-3xl font-bold mb-4">Ready to get expert help?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of users who trust ChillConnect for their consultation needs.
          </p>
          <div className="space-x-4">
            <Link 
              href="/register?role=seeker" 
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 inline-flex items-center gap-2"
            >
              Find an Expert <ArrowRight size={20} />
            </Link>
            <Link 
              href="/register?role=provider" 
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 inline-flex items-center gap-2"
            >
              Become a Provider <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-6">
            <div className="text-2xl font-bold text-blue-400 mb-4">ChillConnect</div>
            <p className="text-gray-900">
              © 2025 ChillConnect. All rights reserved. Connecting you with experts.
            </p>
          </div>
          
          {/* Employee Login Section */}
          <div className="border-t border-gray-700 pt-6 text-center">
            <p className="text-gray-900 text-sm mb-3">ChillConnect Team Member?</p>
            <Link 
              href="/login?role=employee" 
              className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm font-medium bg-gray-800 px-4 py-2 rounded-lg border border-gray-600 hover:border-blue-400 transition-colors"
            >
              <Users className="w-4 h-4 mr-2" />
              Employee Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}