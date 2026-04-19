import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon'

const navItems = [
  { to: '/dashboard', icon: 'home', label: 'Home' },
  { to: '/explore', icon: 'search', label: 'Explore' },
  { to: '/bookings', icon: 'calendar_today', label: 'Bookings' },
  { to: '/favorites', icon: 'favorite', label: 'Favorites' },
  { to: '/profile', icon: 'person', label: 'Profile' },
]

export default function BottomNav() {
  const location = useLocation()

  // Check if current path matches the nav item (handle root/dashboard specially)
  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard'
    }
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-1px_3px_rgba(0,0,0,0.05)] z-50 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto md:max-w-none">
        {navItems.map((item) => {
          const active = isActive(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center justify-center flex-1 h-full min-w-0 transition-all duration-200"
            >
              {/* Active indicator dot */}
              {active && (
                <div className="absolute top-1 w-1 h-1 bg-[#CE1126] rounded-full" />
              )}
              <Icon
                name={item.icon}
                size={24}
                filled={active}
                className={`transition-all duration-200 ${
                  active ? 'text-[#CE1126]' : 'text-gray-400'
                }`}
              />
              <span
                className={`text-xs mt-1 font-medium transition-all duration-200 ${
                  active ? 'text-[#CE1126]' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
