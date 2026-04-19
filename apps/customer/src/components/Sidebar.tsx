import { NavLink } from 'react-router-dom'
import Icon from './Icon'

interface SidebarProps {
  isMobileMenuOpen?: boolean
  onCloseMobileMenu?: () => void
}

const navItems = [
  { to: '/', icon: 'home', label: 'Dashboard' },
  { to: '/explore', icon: 'search', label: 'Explore' },
  { to: '/bookings', icon: 'calendar_today', label: 'Bookings' },
  { to: '/favorites', icon: 'favorite', label: 'Favorites' },
  { to: '/profile', icon: 'person', label: 'Profile' },
]

export default function Sidebar({ isMobileMenuOpen = false, onCloseMobileMenu }: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={onCloseMobileMenu}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:z-auto ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:w-64 md:flex md:flex-col`}
      >
        {/* Logo */}
        <div className="h-16 p-6 border-b border-gray-200 flex items-center justify-between">
          <a href="https://groomlinkgh.com" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-ghana-green via-ghana-gold to-ghana-red rounded-full flex items-center justify-center">
              <Icon name="content_cut" size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">GroomLink</span>
          </a>
          {/* Close button for mobile */}
          <button
            onClick={onCloseMobileMenu}
            className="p-2 rounded-lg hover:bg-gray-100 md:hidden transition-colors"
          >
            <Icon name="close" size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onCloseMobileMenu}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`
                  }
                >
                  <Icon name={item.icon} size={20} />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <Icon name="person" size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Welcome back</p>
              <p className="text-sm text-gray-500">Manage your bookings</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}