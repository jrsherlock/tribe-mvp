
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {Home, User, PlusCircle, Users, Camera, BarChart3, Menu, X, LogOut} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home, color: 'ocean' },
    { name: 'Profile', href: '/profile', icon: User, color: 'ocean' },
    { name: 'Check-in', href: '/checkin', icon: PlusCircle, color: 'ocean' },
    { name: 'Tribe Feed', href: '/sangha', icon: Users, color: 'ocean' },
    { name: 'Photo Albums', href: '/albums', icon: Camera, color: 'ocean' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, color: 'ocean' },
  ];

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

  const getNavItemClasses = (item: any, isActiveItem: boolean) => {
    const colorMap = {
      sage: isActiveItem ? 'bg-sage-500 text-white shadow-sage' : 'text-sand-700 hover:bg-sage-50 hover:text-sage-700',
      ocean: isActiveItem ? 'bg-ocean-600 text-white shadow-ocean' : 'text-sand-700 hover:bg-ocean-50 hover:text-ocean-700',
      sunrise: isActiveItem ? 'bg-sunrise-500 text-white shadow-sunrise' : 'text-sand-700 hover:bg-sunrise-50 hover:text-sunrise-700',
      lavender: isActiveItem ? 'bg-lavender-500 text-white shadow-lavender' : 'text-sand-700 hover:bg-lavender-50 hover:text-lavender-700',
      success: isActiveItem ? 'bg-success-500 text-white shadow-medium' : 'text-sand-700 hover:bg-success-50 hover:text-success-700'
    };

    const baseClasses = 'flex items-center px-4 py-3 text-body-sm font-semibold rounded-lg transition-all duration-200 hover:transform hover:-translate-y-0.5';
    const colorClasses = colorMap[item.color as keyof typeof colorMap] || colorMap.sage;

    return `${baseClasses} ${colorClasses}`;
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
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl border-r border-secondary-200 transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-20 bg-secondary-800 shadow-lg">
            <h1 className="text-white text-3xl font-bold tracking-wide">Tribe</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-8 space-y-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActiveItem = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={getNavItemClasses(item, isActiveItem)}
                >
                  <Icon size={22} className="mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Sign out button */}
          <div className="p-4 border-t border-secondary-200">
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-4 text-sm font-semibold text-secondary-700 rounded-xl hover:bg-ocean-50 hover:text-ocean-700 transition-all duration-200 hover:transform hover:scale-105"
            >
              <LogOut size={22} className="mr-3" />
              Sign Out
            </button>
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

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="min-h-screen bg-white">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
