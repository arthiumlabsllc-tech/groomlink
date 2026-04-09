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
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-ghana-green rounded-lg text-white shadow-lg hover:bg-support-700 transition-colors"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-ghana-dark z-40 transform transition-transform duration-300 flex flex-col",
        "md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ghana-green rounded-xl flex items-center justify-center shadow-lg shadow-ghana-green/20">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-lg">GroomLink</span>
              <p className="text-xs text-gray-400">Support</p>
            </div>
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
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-ghana-green text-white shadow-lg shadow-ghana-green/25" 
                    : "text-gray-400 hover:text-ghana-yellow hover:bg-gray-800/50"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-gray-400 group-hover:text-ghana-yellow")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-ghana-green to-support-700 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {user?.firstName?.charAt(0) || 'S'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400">Support Agent</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-400 hover:text-ghana-red hover:bg-ghana-red/10 rounded-xl transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
