import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useImpersonation } from '../hooks/useImpersonation';
import Icon from './Icon';

export default function Header() {
  const { user, logout } = useAuth();
  const { isImpersonating, endImpersonation, isLoading: isEndingImpersonation } = useImpersonation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md shadow-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      {/* Left: Search - add left margin on mobile for sidebar toggle */}
      <div className="flex items-center gap-4 flex-1 ml-12 md:ml-0">
        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Icon name="search" size={16} className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users, salons..."
              className="w-full pl-9 sm:pl-11 pr-4 py-2 sm:py-2.5 bg-gray-50/80 border border-gray-200/60 rounded-full text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-support-600 focus:border-support-600 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 md:gap-4 ml-4">
        {/* Impersonation indicator */}
        {isImpersonating && (
          <button
            onClick={endImpersonation}
            disabled={isEndingImpersonation}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-medium hover:bg-amber-200 transition-colors"
          >
            <Icon name="visibility" size={14} />
            {isEndingImpersonation ? 'Ending...' : 'End Impersonation'}
          </button>
        )}
        {/* Notifications */}
        <button className="relative p-2 sm:p-2.5 text-gray-500 hover:bg-gray-100/80 rounded-full transition-all duration-200 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center">
          <Icon name="notifications" size={20} />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-ghana-red rounded-full border-2 border-white animate-pulse"></span>
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-1.5 rounded-full hover:bg-gray-100/80 transition-all duration-200"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-ghana-green to-support-700 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white font-semibold text-sm">
                {user?.firstName?.charAt(0) || 'S'}
              </span>
            </div>
            <div className="hidden md:block text-left pr-2">
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500">Support</p>
            </div>
          </button>

          {showUserMenu && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-xl shadow-elevated border border-gray-100/60 py-2 z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500">{user?.email || 'support@groomlinkgh.com'}</p>
                </div>
                <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  Profile Settings
                </a>
                <button
                  onClick={logout}
                  className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-ghana-red hover:bg-red-50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
