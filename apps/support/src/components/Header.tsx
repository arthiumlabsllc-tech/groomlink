import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useImpersonation } from '../hooks/useImpersonation';
import Icon from './Icon';

export default function Header() {
  const { user, logout } = useAuth();
  const { isImpersonating, endImpersonation, isLoading: isEndingImpersonation } = useImpersonation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      {/* Left: Search - add left margin on mobile for sidebar toggle */}
      <div className="flex items-center gap-4 flex-1 ml-12 md:ml-0">
        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Icon name="search" size={16} className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search users, salons..."
              className="w-full pl-9 sm:pl-11 pr-4 py-2 sm:py-2.5 bg-gray-50/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 rounded-full text-xs sm:text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-support-600 focus:border-support-600 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder-gray-400 dark:placeholder-gray-500"
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
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
          >
            <Icon name="visibility" size={14} />
            {isEndingImpersonation ? 'Ending...' : 'End Impersonation'}
          </button>
        )}
        {/* Notifications */}
        <button className="relative p-2 sm:p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 rounded-full transition-all duration-200 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center">
          <Icon name="notifications" size={20} />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-ghana-red rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></span>
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-1.5 rounded-full hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200"
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-9 h-9 rounded-full object-cover border-2 border-ghana-green shadow-md"
              />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-ghana-green to-support-700 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-semibold text-sm">
                  {user?.firstName?.charAt(0) || 'S'}
                </span>
              </div>
            )}
            <div className="hidden md:block text-left pr-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Support</p>
            </div>
          </button>

          {showUserMenu && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl shadow-elevated border border-gray-100/60 dark:border-gray-700/60 py-2 z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email || 'support@groomlinkgh.com'}</p>
                </div>
                <a href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Profile Settings
                </a>
                <button
                  onClick={logout}
                  className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-ghana-red dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
