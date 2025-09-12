'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Search, Filter, MoreVertical, User, Shield, Ban, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SEEKER' | 'PROVIDER' | 'EMPLOYEE' | 'SUPER_ADMIN';
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  providerProfile?: {
    expertise: string[];
    hourlyRate: number;
    rating: number;
    totalSessions: number;
  };
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [error, setError] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login?role=employee');
      return;
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchUsers(1, '', 'ALL');
  }, [session, status, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openDropdown && !target.closest('.dropdown-menu') && !target.closest('.dropdown-trigger')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const fetchUsers = async (page = 1, search = '', role = 'ALL') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        role: role === 'ALL' ? '' : role
      });
      
      const response = await fetch(`/api/users?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users);
        setPagination(data.pagination);
      } else {
        setError(data.error || 'Failed to load users');
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load users');
      setLoading(false);
    }
  };

  // Handle search and filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers(1, searchTerm, roleFilter);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, roleFilter]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-red-100 text-red-800';
      case 'EMPLOYEE': return 'bg-purple-100 text-purple-800';
      case 'PROVIDER': return 'bg-green-100 text-green-800';
      case 'SEEKER': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'SUSPENDED': return <Ban className="w-4 h-4 text-red-500" />;
      default: return <Shield className="w-4 h-4 text-yellow-500" />;
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
    console.log('handleUserAction called:', { userId, action });
    
    // Close dropdown first
    setOpenDropdown(null);
    
    switch (action) {
      case 'view':
        console.log('Navigating to profile:', `/users/${userId}`);
        router.push(`/users/${userId}`);
        break;
      case 'suspend':
        console.log('Suspend action triggered');
        if (confirm('Are you sure you want to suspend this user?')) {
          try {
            const response = await fetch(`/api/users/${userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'suspend' })
            });
            
            if (response.ok) {
              setUsers(prev => prev.map(user => 
                user.id === userId ? { ...user, status: 'SUSPENDED' as const } : user
              ));
              console.log('User suspended successfully');
            } else {
              const data = await response.json();
              console.error(`Failed to suspend user: ${data.error}`);
            }
          } catch (err) {
            console.error('Failed to suspend user');
          }
        }
        break;
      case 'activate':
        console.log('Activate action triggered');
        try {
          const response = await fetch(`/api/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'activate' })
          });
          
          if (response.ok) {
            setUsers(prev => prev.map(user => 
              user.id === userId ? { ...user, status: 'ACTIVE' as const } : user
            ));
            console.log('User activated successfully');
          } else {
            const data = await response.json();
            console.error(`Failed to activate user: ${data.error}`);
          }
        } catch (err) {
          console.error('Failed to activate user');
        }
        break;
      case 'delete':
        console.log('Delete action triggered');
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
          try {
            const response = await fetch(`/api/users/${userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'delete' })
            });
            
            if (response.ok) {
              setUsers(prev => prev.filter(user => user.id !== userId));
              console.log('User deleted successfully');
            } else {
              const data = await response.json();
              console.error(`Failed to delete user: ${data.error}`);
              alert(`Failed to delete user: ${data.error}`);
            }
          } catch (err) {
            console.error('Failed to delete user');
            alert('Failed to delete user. Please try again.');
          }
        }
        break;
      default:
        console.log('Unknown action:', action);
        break;
    }
  };

  const toggleDropdown = (userId: string) => {
    setOpenDropdown(openDropdown === userId ? null : userId);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Users Unavailable</h3>
          <p className="text-gray-800">{error}</p>
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
            href="/dashboard/admin"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-800">Manage all platform users and their permissions</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Create Employee Button */}
              <Link
                href="/admin/create-employee"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <User className="w-4 h-4 mr-2" />
                Create Employee
              </Link>
              
              {/* User Count */}
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
                <p className="text-gray-800 text-sm">Total Users</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-800" size={16} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="text-gray-800" size={16} />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Roles</option>
                  <option value="SEEKER">Seekers</option>
                  <option value="PROVIDER">Providers</option>
                  <option value="EMPLOYEE">Employees</option>
                  <option value="SUPER_ADMIN">Super Admins</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Provider Info</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-800">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(user.status)}
                        <span className="text-sm text-gray-900">{user.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.providerProfile ? (
                        <div>
                          <div className="text-sm text-gray-900">₹{user.providerProfile.hourlyRate}/hr</div>
                          <div className="text-sm text-gray-800">{user.providerProfile.totalSessions} sessions</div>
                          <div className="text-sm text-gray-800">Rating: {user.providerProfile.rating}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-800">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {user.lastLoginAt 
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 relative">
                      <button 
                        onClick={() => toggleDropdown(user.id)}
                        className="dropdown-trigger text-gray-800 hover:text-gray-900 p-1 rounded"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {openDropdown === user.id && (
                        <div className="dropdown-menu absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          <div className="py-1">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleUserAction(user.id, 'view');
                              }}
                              className="flex items-center px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 w-full text-left"
                            >
                              <User className="w-4 h-4 mr-2" />
                              View Profile
                            </button>
                            
                            {user.status === 'ACTIVE' ? (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleUserAction(user.id, 'suspend');
                                }}
                                className="flex items-center px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 w-full text-left"
                              >
                                <Ban className="w-4 h-4 mr-2 text-red-500" />
                                Suspend User
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleUserAction(user.id, 'activate');
                                }}
                                className="flex items-center px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 w-full text-left"
                              >
                                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                Activate User
                              </button>
                            )}
                            
                            {/* Only show delete button for non-Super Admin users, and prevent self-deletion */}
                            {user.role !== 'SUPER_ADMIN' && user.id !== session?.user?.id && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleUserAction(user.id, 'delete');
                                }}
                                className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Delete User
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-b-lg">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => {
                  if (currentPage > 1) {
                    const newPage = currentPage - 1;
                    setCurrentPage(newPage);
                    fetchUsers(newPage, searchTerm, roleFilter);
                  }
                }}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  if (currentPage < pagination.pages) {
                    const newPage = currentPage + 1;
                    setCurrentPage(newPage);
                    fetchUsers(newPage, searchTerm, roleFilter);
                  }
                }}
                disabled={currentPage === pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium text-gray-900">{((currentPage - 1) * pagination.limit) + 1}</span>
                  {' '}to{' '}
                  <span className="font-medium text-gray-900">
                    {Math.min(currentPage * pagination.limit, pagination.total)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium text-gray-900">{pagination.total}</span>
                  {' '}results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => {
                      if (currentPage > 1) {
                        const newPage = currentPage - 1;
                        setCurrentPage(newPage);
                        fetchUsers(newPage, searchTerm, roleFilter);
                      }
                    }}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => {
                          setCurrentPage(pageNum);
                          fetchUsers(pageNum, searchTerm, roleFilter);
                        }}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => {
                      if (currentPage < pagination.pages) {
                        const newPage = currentPage + 1;
                        setCurrentPage(newPage);
                        fetchUsers(newPage, searchTerm, roleFilter);
                      }
                    }}
                    disabled={currentPage === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}