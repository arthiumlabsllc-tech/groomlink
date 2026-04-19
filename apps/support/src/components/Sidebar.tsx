import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib';

const navigation = [
  { name: 'Dashboard', href: '/', icon: 'home', group: 'Main' },
  { name: 'Customers', href: '/customers', icon: 'group', group: 'Management' },
  { name: 'Users', href: '/users', icon: 'group', group: 'Management' },
  { name: 'Salons', href: '/salons', icon: 'store', group: 'Management' },
  { name: 'Tickets', href: '/tickets', icon: 'confirmation_number', group: 'Support' },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { logout, user } = useAuth();

  // Group navigation items
  const groups = navigation.reduce<Record<string, typeof navigation>>((acc, item) => {
    const group = item.group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2.5 bg-ghana-green rounded-xl text-white shadow-lg hover:bg-support-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        {isOpen ? <Icon name="close" size={20} /> : <Icon name="menu" size={20} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-ghana-dark z-40 transform transition-transform duration-300 ease-in-out flex flex-col",
        "md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <img 
              src="/logo-white.png" 
              alt="GroomLink" 
              className="h-8 w-auto"
            />
            <span className="text-xs text-gray-400">Support</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              {/* Section grouping label */}
              <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                {group}
              </p>
              <div className="space-y-1">
                {items.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 min-h-[48px]",
                        isActive
                          ? "bg-ghana-green text-white shadow-lg shadow-ghana-green/25 rounded-lg"
                          : "text-gray-400 hover:text-ghana-yellow hover:bg-gray-800/50 hover:translate-x-1"
                      )}
                    >
                      <Icon name={item.icon} size={20} className={cn("flex-shrink-0", isActive ? "text-white" : "text-gray-400 group-hover:text-ghana-yellow")} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
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
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-400 hover:text-ghana-red hover:bg-ghana-red/10 rounded-lg transition-all duration-200 min-h-[48px] hover:translate-x-1"
          >
            <Icon name="logout" size={20} className="flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
