/**
 * Socket Provider Component
 * Connects to socket.io when a salon is available
 * Provides audible notifications for booking events
 */
import { useEffect, useState } from 'react';
import { useSalon } from '../store/SalonContext';
import { useSocket } from '../hooks/useSocket';
import { useNotificationStore } from '../store/notifications';

// Toast notification component
function ToastNotification({ 
  message, 
  type, 
  onClose 
}: { 
  message: string; 
  type: 'booking' | 'checkin' | 'completion';
  onClose: () => void;
}) {
  const bgColors = {
    booking: 'bg-blue-600',
    checkin: 'bg-green-600',
    completion: 'bg-purple-600',
  };

  const icons = {
    booking: '📅',
    checkin: '✅',
    completion: '🎉',
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 ${bgColors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in max-w-sm`}>
      <span className="text-2xl">{icons[type]}</span>
      <span className="flex-1">{message}</span>
      <button 
        onClick={onClose}
        className="text-white/80 hover:text-white ml-2"
      >
        ✕
      </button>
    </div>
  );
}

interface ToastState {
  id: number;
  message: string;
  type: 'booking' | 'checkin' | 'completion';
}

let toastId = 0;

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { salonId, hasSalon } = useSalon();
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const { fetchNotifications } = useNotificationStore();

  const addToast = (message: string, type: 'booking' | 'checkin' | 'completion') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Use the socket hook
  useSocket({
    salonId: hasSalon ? salonId : null,
    enabled: hasSalon === true,
    showBrowserNotifications: true,
    
    onBookingNew: (data) => {
      const customerName = `${data.booking.customer.firstName} ${data.booking.customer.lastName}`;
      addToast(`New booking from ${customerName} for ${data.booking.service.name}`, 'booking');
      // Refresh notification count
      fetchNotifications();
    },
    
    onBookingCheckin: (data) => {
      addToast(`${data.customerName} checked in for ${data.serviceName} (Position: ${data.queuePosition})`, 'checkin');
      // Refresh notification count
      fetchNotifications();
    },
    
    onBookingCompleted: (data) => {
      addToast(`Service completed for ${data.customerName} - GHS ${data.totalAmount}`, 'completion');
      // Refresh notification count
      fetchNotifications();
    },
    
    onQueueUpdated: () => {
      // Refresh notification count on queue updates
      fetchNotifications();
    },
  });

  return (
    <>
      {children}
      
      {/* Toast notifications */}
      {toasts.map(toast => (
        <ToastNotification
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
}
