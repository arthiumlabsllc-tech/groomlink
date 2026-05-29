import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import Icon from './Icon';
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks';

// Map of page IDs to their paths for permission checking
const pageIdToPath: Record<string, string> = {
  'dashboard': '/dashboard',
  'salons': '/salons',
  'users': '/users',
  'transactions': '/transactions',
  'promotions': '/promotions',
  'support': '/support',
  'support-staff': '/support-staff',
  'settings': '/settings',
  'policies': '/policies',
  'escrow': '/escrow',
  'cancellations': '/cancellations',
  'no-shows': '/no-shows',
};

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', pageId: 'dashboard' },
  { path: '/salons', label: 'Salons', icon: 'storefront', pageId: 'salons' },
  { path: '/users', label: 'Users', icon: 'group', pageId: 'users' },
  { path: '/transactions', label: 'Transactions', icon: 'credit_card', pageId: 'transactions' },
  { path: '/promotions', label: 'Promotions', icon: 'redeem', pageId: 'promotions' },
  { path: '/sponsored-salons', label: 'Sponsored Salons', icon: 'star', pageId: 'sponsored-salons' },
  { path: '/subscriptions', label: 'Subscriptions', icon: 'card_membership', pageId: 'subscriptions' },
  { path: '/feedback', label: 'Feedback', icon: 'feedback', pageId: 'feedback' },
  { path: '/support', label: 'Support', icon: 'headset', pageId: 'support' },
  { path: '/support-staff', label: 'Support Staff', icon: 'person_add', pageId: 'support-staff' },
];

// Trust & Safety nav items
const trustSafetyNavItems = [
  { path: '/escrow', label: 'Escrow', icon: 'account_balance_wallet', pageId: 'escrow' },
  { path: '/cancellations', label: 'Cancellations', icon: 'cancel', pageId: 'cancellations' },
  { path: '/no-shows', label: 'No-Shows', icon: 'person_remove', pageId: 'no-shows' },
  { path: '/security', label: 'Security', icon: 'shield', pageId: 'security' },
];

// Policy nav item
const policyNavItem = { path: '/policies', label: 'Policies', icon: 'description', pageId: 'policies' };

// Admin nav items (only for SUPER_ADMIN)
const adminNavItems = [
  { path: '/admins', label: 'Admins', icon: 'verified_user', pageId: 'admins' },
];

// Settings nav item (shown at bottom)
const settingsNavItem = { path: '/settings', label: 'Settings', icon: 'settings', pageId: 'settings' };

export function Layout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  // Check if user has permission for a specific page
  const hasPermission = (pageId: string): boolean => {
    // SUPER_ADMIN has access to everything
    if (user?.role === 'SUPER_ADMIN') return true;
    
    // If no permissions object or empty pages array, deny access
    if (!user?.permissions?.pages || user.permissions.pages.length === 0) {
      return false;
    }
    
    // Check if page is in user's allowed pages
    return user.permissions.pages.includes(pageId);
  };

  // Filter navigation items based on user permissions
  const filteredNavItems = navItems.filter(item => hasPermission(item.pageId));
  
  // Show admin management only to SUPER_ADMIN
  const showAdminNav = user?.role === 'SUPER_ADMIN' && hasPermission('admins');
  
  // Filter Trust & Safety items
  const filteredTrustSafetyItems = trustSafetyNavItems.filter(item => hasPermission(item.pageId));
  
  // Check individual permissions for policy and settings
  const showPolicy = hasPermission('policies');
  const showSettings = hasPermission('settings');

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout.mutate();
  };

  const NavLinks = ({ onClick, items }: { onClick?: () => void; items?: typeof navItems }) => {
    const navItemsToRender = items || filteredNavItems;
    return (
      <>
        {navItemsToRender.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClick}
              className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-[#006B3F] text-white shadow-md shadow-green-500/20 border-l-2 border-ghana-yellow'
                  : 'text-gray-300 hover:bg-[#FCD116]/20 hover:text-[#FCD116] hover:translate-x-0.5 border-l-2 border-transparent'
              }`}
            >
              <Icon name={item.icon} size={20} />
              <span className="ml-3">{item.label}</span>
            </Link>
          );
        })}
      </>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } hidden md:flex bg-[#1a1a2e] text-white transition-all duration-300 ease-in-out flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700/50">
          {isSidebarOpen ? (
            <div className="flex items-center gap-2">
              <img 
                src="/logo-white.png" 
                alt="GroomLink" 
                className="h-8 w-auto"
              />
              <div>
                <p className="text-[10px] text-[#FCD116] font-medium uppercase tracking-wider">Administrator</p>
              </div>
            </div>
          ) : (
            <img 
              src="/logo-white.png" 
              alt="GroomLink" 
              className="h-8 w-auto mx-auto"
            />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {isSidebarOpen && (
            <div className="px-4 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Main</p>
            </div>
          )}
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={!isSidebarOpen ? item.label : undefined}
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#006B3F] text-white shadow-md shadow-green-500/20 border-l-2 border-ghana-yellow'
                    : 'text-gray-300 hover:bg-[#FCD116]/20 hover:text-[#FCD116] hover:translate-x-0.5 border-l-2 border-transparent'
                }`}
              >
                <Icon name={item.icon} size={20} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-[#FCD116]'}`} />
                {isSidebarOpen && <span className="ml-3">{item.label}</span>}
              </Link>
            );
          })}
          
          {/* Admin Management - Only for SUPER_ADMIN */}
          {showAdminNav && adminNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={!isSidebarOpen ? item.label : undefined}
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#006B3F] text-white shadow-md shadow-green-500/20 border-l-2 border-ghana-yellow'
                    : 'text-gray-300 hover:bg-[#FCD116]/20 hover:text-[#FCD116] hover:translate-x-0.5 border-l-2 border-transparent'
                }`}
              >
                <Icon name={item.icon} size={20} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-[#FCD116]'}`} />
                {isSidebarOpen && <span className="ml-3">{item.label}</span>}
              </Link>
            );
          })}

          {/* Trust & Safety Section */}
          {isSidebarOpen && filteredTrustSafetyItems.length > 0 && (
            <div className="px-4 pt-6 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Trust & Safety</p>
            </div>
          )}
          {filteredTrustSafetyItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={!isSidebarOpen ? item.label : undefined}
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#006B3F] text-white shadow-md shadow-green-500/20 border-l-2 border-ghana-yellow'
                    : 'text-gray-300 hover:bg-[#FCD116]/20 hover:text-[#FCD116] hover:translate-x-0.5 border-l-2 border-transparent'
                }`}
              >
                <Icon name={item.icon} size={20} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-[#FCD116]'}`} />
                {isSidebarOpen && <span className="ml-3">{item.label}</span>}
              </Link>
            );
          })}

          {/* Policies Link */}
          {showPolicy && (() => {
            const isActive = location.pathname === policyNavItem.path;
            return (
              <Link
                to={policyNavItem.path}
                title={!isSidebarOpen ? policyNavItem.label : undefined}
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#006B3F] text-white shadow-md shadow-green-500/20 border-l-2 border-ghana-yellow'
                    : 'text-gray-300 hover:bg-[#FCD116]/20 hover:text-[#FCD116] hover:translate-x-0.5 border-l-2 border-transparent'
                }`}
              >
                <Icon name={policyNavItem.icon} size={20} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-[#FCD116]'}`} />
                {isSidebarOpen && <span className="ml-3">{policyNavItem.label}</span>}
              </Link>
            );
          })()}
        </nav>

        {/* Settings Link */}
        {showSettings && (
          <>
            {isSidebarOpen && (
              <div className="px-4 pt-2 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Configuration</p>
              </div>
            )}
            <div className="p-4 border-t border-gray-700/50">
          {(() => {
            const isActive = location.pathname === settingsNavItem.path;
            return (
              <Link
                to={settingsNavItem.path}
                title={!isSidebarOpen ? settingsNavItem.label : undefined}
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#006B3F] text-white shadow-md shadow-green-500/20 border-l-2 border-ghana-yellow'
                    : 'text-gray-300 hover:bg-[#FCD116]/20 hover:text-[#FCD116] hover:translate-x-0.5 border-l-2 border-transparent'
                }`}
              >
                <Icon name={settingsNavItem.icon} size={20} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-[#FCD116]'}`} />
                {isSidebarOpen && <span className="ml-3">{settingsNavItem.label}</span>}
              </Link>
            );
          })()}
          </div>
          </>
        )}

        {/* User Section & Logout */}
        <div className="p-4 border-t border-gray-700/50">
          {isSidebarOpen && user && (
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#006B3F] to-[#006B3F]/70 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-md">
                {user?.firstName?.[0] || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded uppercase tracking-wide ${
                  user?.role === 'SUPER_ADMIN' 
                    ? 'bg-purple-500/20 text-purple-300' 
                    : 'bg-[#FCD116]/20 text-[#FCD116]'
                }`}>
                  {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center w-full px-4 py-3 text-gray-300 hover:bg-[#CE1126] hover:text-white rounded-lg transition-all duration-200 ${
              !isSidebarOpen ? 'justify-center' : ''
            }`}
          >
            <Icon name="logout" size={20} />
            {isSidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#1a1a2e] text-white z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            <img 
              src="/logo-white.png" 
              alt="GroomLink" 
              className="h-8 w-auto"
            />
            <div>
              <p className="text-[10px] text-[#FCD116] font-medium uppercase tracking-wider">Administrator</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-4 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Main</p>
          </div>
          <NavLinks onClick={() => setIsMobileMenuOpen(false)} />
          
          {/* Admin Management - Only for SUPER_ADMIN */}
          {showAdminNav && adminNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-[#006B3F] text-white shadow-md shadow-green-500/20 border-l-2 border-ghana-yellow'
                    : 'text-gray-300 hover:bg-[#FCD116]/20 hover:text-[#FCD116] hover:translate-x-0.5 border-l-2 border-transparent'
                }`}
              >
                <Icon name={item.icon} size={20} />
                <span className="ml-3">{item.label}</span>
              </Link>
            );
          })}

          {/* Trust & Safety Section */}
          <div className="px-4 pt-6 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Trust & Safety</p>
          </div>
          {trustSafetyNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-[#006B3F] text-white shadow-md shadow-green-500/20 border-l-2 border-ghana-yellow'
                    : 'text-gray-300 hover:bg-[#FCD116]/20 hover:text-[#FCD116] hover:translate-x-0.5 border-l-2 border-transparent'
                }`}
              >
                <Icon name={item.icon} size={20} />
                <span className="ml-3">{item.label}</span>
              </Link>
            );
          })}

          {/* Policies Link */}
          {(() => {
            const isActive = location.pathname === policyNavItem.path;
            return (
              <Link
                to={policyNavItem.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-[#006B3F] text-white shadow-md shadow-green-500/20 border-l-2 border-ghana-yellow'
                    : 'text-gray-300 hover:bg-[#FCD116]/20 hover:text-[#FCD116] hover:translate-x-0.5 border-l-2 border-transparent'
                }`}
              >
                <Icon name={policyNavItem.icon} size={20} />
                <span className="ml-3">{policyNavItem.label}</span>
              </Link>
            );
          })()}
          
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Configuration</p>
          </div>
          {/* Settings Link */}
          {(() => {
            const isActive = location.pathname === settingsNavItem.path;
            return (
              <Link
                to={settingsNavItem.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-[#006B3F] text-white shadow-md shadow-green-500/20 border-l-2 border-ghana-yellow'
                    : 'text-gray-300 hover:bg-[#FCD116]/20 hover:text-[#FCD116] hover:translate-x-0.5 border-l-2 border-transparent'
                }`}
              >
                <Icon name={settingsNavItem.icon} size={20} />
                <span className="ml-3">{settingsNavItem.label}</span>
              </Link>
            );
          })()}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-700/50">
          {user && (
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#006B3F] to-[#006B3F]/70 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-md">
                {user?.firstName?.[0] || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded uppercase tracking-wide ${
                  user?.role === 'SUPER_ADMIN' 
                    ? 'bg-purple-500/20 text-purple-300' 
                    : 'bg-[#FCD116]/20 text-[#FCD116]'
                }`}>
                  {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-gray-300 hover:bg-[#CE1126] hover:text-white rounded-lg transition-all duration-200"
          >
            <Icon name="logout" size={20} />
            <span className="ml-3">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md shadow-card flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 md:hidden transition-colors"
            >
              <Icon name="menu" size={20} className="text-gray-600" />
            </button>
            {/* Desktop sidebar toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 hidden md:flex items-center justify-center transition-colors"
            >
              {isSidebarOpen ? (
                <Icon name="chevron_left" size={20} className="text-gray-600" />
              ) : (
                <Icon name="chevron_right" size={20} className="text-gray-600" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <span className="text-sm text-gray-600 hidden sm:inline font-medium">
              {user?.firstName} {user?.lastName}
            </span>
            <div className="w-9 h-9 bg-gradient-to-br from-[#006B3F] to-[#006B3F]/70 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
              {user?.firstName?.[0] || 'A'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-5 lg:p-8 pb-20 lg:pb-8 bg-gray-50">
          <div className="page-enter max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
        
        {/* Footer */}
        <footer className="py-3 text-center bg-white border-t border-gray-200">
          <a 
            href="#" 
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            An Arthium Labs Product
          </a>
        </footer>
      </div>
    </div>
  );
}
