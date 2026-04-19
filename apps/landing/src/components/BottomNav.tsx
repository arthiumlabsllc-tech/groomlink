import { Link } from 'react-router-dom'
import Icon from './Icon'

interface BottomNavProps {
  activeTab: string
}

const navItems = [
  { id: 'home', label: 'Home', icon: 'favorite', href: '/' },
  { id: 'explore', label: 'Explore', icon: 'search', href: '/explore' },
  { id: 'appointments', label: 'Appointments', icon: 'calendar_today', href: 'https://my.groomlinkgh.com/bookings' },
  { id: 'profile', label: 'Profile', icon: 'person', href: 'https://my.groomlinkgh.com/profile' },
]

export default function BottomNav({ activeTab }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#CE1126]/20 z-50 safe-area-bottom">
      <div className="flex items-center justify-around py-2 pb-safe">
        {navItems.map((item) => {
          const isActive = activeTab === item.id
          const isInternal = item.href.startsWith('/')
          const className = `flex flex-col items-center justify-center py-2 px-4 min-w-[64px] transition-colors ${
            isActive ? 'text-[#CE1126]' : 'text-gray-500'
          }`

          if (isInternal) {
            return (
              <Link key={item.id} to={item.href} className={className}>
                <Icon name={item.icon} size={24} filled={isActive} />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </Link>
            )
          }

          return (
            <a key={item.id} href={item.href} className={className}>
              <Icon name={item.icon} size={24} filled={isActive} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
