import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Bookings from './pages/Bookings'
import Staff from './pages/Staff'
import Services from './pages/Services'
import Reviews from './pages/Reviews'
import Settings from './pages/Settings'
import Queue from './pages/Queue'
import { SalonProvider } from './store/SalonContext'

function App() {
  return (
    <SalonProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/services" element={<Services />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SalonProvider>
  )
}

export default App
