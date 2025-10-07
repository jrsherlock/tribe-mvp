
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {Home, Target, PlusCircle, Users, Camera, BarChart3, Menu, X, LogOut, LucideIcon, ChevronsLeft, ChevronsRight, MoreHorizontal, UserCircle, Shield} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getOwnProfile } from '../lib/services/profiles';
import { useTenant } from '../lib/tenant';
import { useUserGroup } from '../hooks/useUserGroup';

// Type definition for navigation items
type NavColor = 'sage' | 'ocean' | 'sunrise' | 'lavender' | 'success';

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  color: NavColor;
}

interface UserProfileData {
  display_name: string;
  avatar_url?: string;
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { currentTenantId } = useTenant();
  const { group: userGroup } = useUserGroup();

  // Build navigation array - conditionally include "My Group" if user has a group
  const navigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/', icon: Home, color: 'ocean' },
    { name: 'Check-in', href: '/checkin', icon: PlusCircle, color: 'ocean' },
    { name: 'My Goals', href: '/profile', icon: Target, color: 'ocean' },
    // Conditionally add "My Group" if user is assigned to a group
    ...(userGroup ? [{ name: 'My Group', href: `/tribe/${userGroup.id}`, icon: Shield, color: 'ocean' as NavColor }] : []),
    { name: 'Tribe Feed', href: '/mytribe', icon: Users, color: 'ocean' },
    { name: 'Photo Albums', href: '/albums', icon: Camera, color: 'ocean' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, color: 'ocean' },
  ];

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedCollapsedState = localStorage.getItem('sidebar-collapsed');
    if (savedCollapsedState !== null) {
      setIsCollapsed(savedCollapsedState === 'true');
    }
  }, []);

  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Fetch user profile data for avatar and display name
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.userId) return;

      try {
        const { data, error } = await getOwnProfile(user.userId, currentTenantId || null);
        if (error) {
          console.warn('Failed to fetch user profile:', error);
          return;
        }

        if (data) {
          setUserProfile({
            display_name: data.display_name || user.email || 'User',
            avatar_url: data.avatar_url
          });
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };

    fetchUserProfile();
  }, [user, currentTenantId]);

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getNavItemClasses = (isActiveItem: boolean) => {
    // Modern, clean styling with subtle hover effects
    const baseClasses = 'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative';

    if (isActiveItem) {
      // Active state: light background, dark text, left border indicator
      return `${baseClasses} bg-slate-200 text-slate-900 font-semibold border-l-2 border-ocean-600`;
    }

    // Inactive state: subtle hover effect
    return `${baseClasses} text-slate-600 hover:bg-slate-200`;
  };

  return (
    <div className="min-h-screen bg-gradient-healing">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white p-3 rounded-lg shadow-soft hover:shadow-medium transition-all duration-200 hover:-translate-y-0.5 border border-sand-200"
        >
          {isMobileMenuOpen ? (
            <X size={24} className="text-sand-700" />
          ) : (
            <Menu size={24} className="text-sand-700" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 ${isCollapsed ? 'w-20' : 'w-64'} bg-slate-100 shadow-xl border-r border-slate-200 transform transition-all duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} h-20 px-4 bg-slate-100`}>
            {!isCollapsed && (
              <h1 className="text-slate-800 text-2xl font-bold tracking-wide">Tribe</h1>
            )}
            {isCollapsed && (
              <h1 className="text-slate-800 text-2xl font-bold">T</h1>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-8 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActiveItem = isActive(item.href);

              return (
                <div key={item.name} className="relative group">
                  <Link
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={getNavItemClasses(isActiveItem)}
                  >
                    <Icon size={20} className={isCollapsed ? '' : 'mr-3'} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Collapse Toggle Button */}
          <div className="px-4 pb-4">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-all duration-200"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronsRight size={20} />
              ) : (
                <>
                  <ChevronsLeft size={20} className="mr-2" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>

          {/* User Profile Block */}
          <div className="p-4 border-t border-slate-200 relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={`flex items-center w-full ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-all duration-200`}
            >
              <div className="flex items-center min-w-0">
                {userProfile?.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.display_name}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <UserCircle size={32} className="text-slate-400 flex-shrink-0" />
                )}
                {!isCollapsed && (
                  <span className="ml-3 truncate">{userProfile?.display_name || 'User'}</span>
                )}
              </div>
              {!isCollapsed && (
                <MoreHorizontal size={20} className="text-slate-400 flex-shrink-0" />
              )}
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className={`absolute ${isCollapsed ? 'left-full ml-2 bottom-4' : 'bottom-full mb-2 left-4 right-4'} bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50`}>
                <Link
                  to="/profile"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <UserCircle size={18} className="mr-3" />
                  My Profile
                </Link>
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={18} className="mr-3" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-secondary-900 bg-opacity-50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Profile menu overlay - close on click outside */}
      {isProfileMenuOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setIsProfileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <main className="min-h-screen bg-white">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
