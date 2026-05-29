import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon'
import { useAuthStore } from '../store/auth'
import { useDarkMode } from '../hooks/useDarkMode'

const navItems = [
  { to: '/dashboard', icon: 'home', label: 'Home' },
  { to: '/explore', icon: 'search', label: 'Explore' },
  { to: '/bookings', icon: 'calendar_today', label: 'Bookings' },
  { to: '/favorites', icon: 'favorite', label: 'Favorites' },
  { to: '/profile', icon: 'person', label: 'Profile' },
]

/**
 * Desktop-only sidebar (lg:+). On mobile/tablet, BottomNav handles
 * navigation and this component is hidden. Mirrors the partners-app
 * pattern: fixed-position 256px (w-64) wide rail with logo at top,
 * nav in middle, user info pinned to bottom.
 */
export default function Sidebar() {
  const isDark = useDarkMode()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard'
    }
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const firstName = user?.firstName || ''
  const lastName = user?.lastName || ''
  const displayName = `${firstName} ${lastName}`.trim() || 'Welcome'

  return (
    <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-30 flex-col">
      {/* Logo */}
      <div className="h-14 px-6 border-b border-gray-100 flex items-center flex-shrink-0">
        <NavLink to="/dashboard" className="flex items-center transition-all duration-200 hover:opacity-80">
          <img
            src={isDark ? '/logo-full-white.png' : '/logo-full-black.png'}
            alt="GroomLink"
            className="h-8 w-auto"
          />
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.to)
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-[#CE1126]/10 text-[#CE1126]'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    name={item.icon}
                    size={20}
                    filled={active}
                    className={
                      active
                        ? 'text-[#CE1126]'
                        : 'text-gray-400 group-hover:text-gray-600'
                    }
                  />
                  <span>{item.label}</span>
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 bg-[#CE1126] rounded-full" />
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Info — clickable, links to /profile */}
      <div className="p-3 border-t border-gray-100 flex-shrink-0">
        <NavLink
          to="/profile"
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors group"
        >
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <Icon name="person" size={20} className="text-gray-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#CE1126] transition-colors">
              {displayName}
            </p>
            <p className="text-xs text-gray-500 truncate">View profile</p>
          </div>
        </NavLink>
      </div>
    </aside>
  )
}
