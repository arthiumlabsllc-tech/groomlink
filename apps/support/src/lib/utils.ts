import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  // Format Ghana phone numbers
  if (phone.startsWith('+233')) {
    return phone.replace('+233', '0').replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  return phone;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    INACTIVE: 'bg-gray-100 text-gray-700',
    SUSPENDED: 'bg-red-100 text-red-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    OPEN: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    RESOLVED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-700',
  };
  return statusColors[status] || 'bg-gray-100 text-gray-700';
}

export function getRoleColor(role: string): string {
  const roleColors: Record<string, string> = {
    CUSTOMER: 'bg-blue-100 text-blue-700',
    SALON_OWNER: 'bg-purple-100 text-purple-700',
    SUPPORT: 'bg-orange-100 text-orange-700',
    ADMIN: 'bg-red-100 text-red-700',
    SUPER_ADMIN: 'bg-red-200 text-red-800',
  };
  return roleColors[role] || 'bg-gray-100 text-gray-700';
}
