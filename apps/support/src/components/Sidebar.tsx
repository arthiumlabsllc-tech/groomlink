import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Store, 
  Ticket, 
  LogOut,
  Menu,
  X,
  Headphones
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Salons', href: '/salons', icon: Store },
  { name: 'Tickets', href: '/tickets', icon: Ticket },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { logout, user } = useAuth();

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-support-600 rounded-lg text-white shadow-lg"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-300",
        "md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-support-600 rounded-lg flex items-center justify-center">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">GroomLink</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-support-100 text-support-700" 
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-support-100 rounded-full flex items-center justify-center">
              <span className="text-support-600 font-medium">
                {user?.firstName?.charAt(0) || 'S'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500">Support Agent</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
