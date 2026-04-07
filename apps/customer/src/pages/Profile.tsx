import { User, Mail, Phone, MapPin, Camera, Bell, Shield, CreditCard, HelpCircle, LogOut, ChevronRight, Edit2 } from 'lucide-react'

const userData = {
  name: "Kofi Mensah", email: "kofi.mensah@email.com", phone: "+233 24 123 4567",
  location: "Accra, Ghana", memberSince: "January 2026", totalBookings: 12, totalSpent: "GH₵ 980", favoriteSalons: 3
}

const menuItems = [
  { icon: Bell, label: 'Notifications', description: 'Manage your notification preferences' },
  { icon: Shield, label: 'Privacy & Security', description: 'Password, 2FA, and data settings' },
  { icon: CreditCard, label: 'Payment Methods', description: 'Manage your payment options' },
  { icon: HelpCircle, label: 'Help & Support', description: 'Get help or contact us' },
]

export default function Profile() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">Manage your account settings</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-primary-500" />
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{userData.name}</h2>
              <button className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4" /><span>{userData.email}</span></div>
              <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4" /><span>{userData.phone}</span></div>
              <div className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4" /><span>{userData.location}</span></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Member since {userData.memberSince}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="text-center"><p className="text-2xl font-bold text-gray-900">{userData.totalBookings}</p><p className="text-sm text-gray-500">Bookings</p></div>
          <div className="text-center"><p className="text-2xl font-bold text-gray-900">{userData.totalSpent}</p><p className="text-sm text-gray-500">Total Spent</p></div>
          <div className="text-center"><p className="text-2xl font-bold text-gray-900">{userData.favoriteSalons}</p><p className="text-sm text-gray-500">Favorites</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {menuItems.map((item, index) => (
          <button key={item.label} className={'w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ' + (index !== menuItems.length - 1 ? 'border-b border-gray-100' : '')}>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><item.icon className="w-5 h-5 text-gray-600" /></div>
            <div className="flex-1 text-left"><p className="font-medium text-gray-900">{item.label}</p><p className="text-sm text-gray-500">{item.description}</p></div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        ))}
      </div>

      <button className="w-full flex items-center justify-center gap-2 p-4 bg-white rounded-xl shadow-sm border border-gray-100 text-red-600 hover:bg-red-50 transition-colors font-medium">
        <LogOut className="w-5 h-5" />Sign Out
      </button>

      <div className="text-center text-sm text-gray-500">
        <p>GroomLink Customer App v1.0.0</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <a href="https://groomlinkgh.com/privacy" className="hover:text-primary-600">Privacy Policy</a>
          <span>•</span>
          <a href="https://groomlinkgh.com/terms" className="hover:text-primary-600">Terms of Service</a>
        </div>
      </div>
    </div>
  )
}
