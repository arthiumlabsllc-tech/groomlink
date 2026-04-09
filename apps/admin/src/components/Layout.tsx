import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Users,
  CreditCard,
  Gift,
  Headphones,
  UserPlus,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/salons', label: 'Salons', icon: Store },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/transactions', label: 'Transactions', icon: CreditCard },
  { path: '/promotions', label: 'Promotions', icon: Gift },
  { path: '/support', label: 'Support', icon: Headphones },
  { path: '/support-staff', label: 'Support Staff', icon: UserPlus },
];

export function Layout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

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

  const NavLinks = ({ onClick }: { onClick?: () => void }) => {
    return (
      <>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClick}
              className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-[#006B3F] text-white shadow-md'
                  : 'text-gray-300 hover:bg-[#FCD116]/20 hover:text-[#FCD116]'
              }`}
            >
              <Icon size={20} />
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
              <div className="w-8 h-8 bg-gradient-to-br from-[#006B3F] to-[#FCD116] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">GL</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">GroomLink</h1>
                <p className="text-[10px] text-[#FCD116] font-medium uppercase tracking-wider">Admin</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 mx-auto bg-gradient-to-br from-[#006B3F] to-[#FCD116] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">GL</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={!isSidebarOpen ? item.label : undefined}
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#006B3F] text-white shadow-md'
                    : 'text-gray-300 hover:bg-[#FCD116]/20 hover:text-[#FCD116]'
                }`}
              >
                <Icon size={20} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-[#FCD116]'}`} />
                {isSidebarOpen && <span className="ml-3">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

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
                <span className="inline-block px-2 py-0.5 bg-[#FCD116]/20 text-[#FCD116] text-[10px] font-semibold rounded uppercase tracking-wide">
                  Admin
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
            <LogOut size={20} />
            {isSidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#1a1a2e] text-white z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#006B3F] to-[#FCD116] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">GL</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">GroomLink</h1>
              <p className="text-[10px] text-[#FCD116] font-medium uppercase tracking-wider">Admin</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <NavLinks onClick={() => setIsMobileMenuOpen(false)} />
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
                <span className="inline-block px-2 py-0.5 bg-[#FCD116]/20 text-[#FCD116] text-[10px] font-semibold rounded uppercase tracking-wide">
                  Admin
                </span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-gray-300 hover:bg-[#CE1126] hover:text-white rounded-lg transition-all duration-200"
          >
            <LogOut size={20} />
            <span className="ml-3">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 md:px-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 md:hidden transition-colors"
            >
              <Menu size={20} className="text-gray-600" />
            </button>
            {/* Desktop sidebar toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 hidden md:flex items-center justify-center transition-colors"
            >
              {isSidebarOpen ? (
                <ChevronLeft size={20} className="text-gray-600" />
              ) : (
                <ChevronRight size={20} className="text-gray-600" />
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
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
