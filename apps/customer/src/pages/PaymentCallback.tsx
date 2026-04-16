import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, Calendar, ArrowLeft, HelpCircle, CreditCard } from 'lucide-react';
import { paymentApi, bookingApi } from '../lib/api';

type PaymentStatus = 'verifying' | 'success' | 'failed';

interface PaymentDetails {
  reference: string;
  amount: number;
  bookingReference: string;
  salonName: string;
  serviceName: string;
}

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PaymentStatus>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);

  const reference = searchParams.get('reference') || searchParams.get('trxref');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setStatus('failed');
        setMessage('Invalid payment reference. Please try again.');
        return;
      }

      try {
        // Always verify the payment with the backend
        const result = await paymentApi.verify({ reference });
        
        if (result.success) {
          setStatus('success');
          setMessage(result.message || 'Your payment has been processed successfully!');
          
          // Try to fetch booking details using the reference
          try {
            // The reference from Paystack might be linked to a booking
            // Fetch recent bookings to find the one with this payment reference
            const bookings = await bookingApi.getMyBookings('CONFIRMED');
            const matchingBooking = bookings.find(b => 
              b.payment?.status === 'COMPLETED' || 
              new Date(b.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000 // Within last 24 hours
            );
            
            if (matchingBooking) {
              setPaymentDetails({
                reference: reference,
                amount: matchingBooking.finalAmount || matchingBooking.totalAmount,
                bookingReference: matchingBooking.reference,
                salonName: matchingBooking.salon?.businessName || 'Unknown Salon',
                serviceName: matchingBooking.service?.name || 'Unknown Service',
              });
            } else {
              // Set basic details if booking not found
              setPaymentDetails({
                reference: reference,
                amount: 0,
                bookingReference: 'N/A',
                salonName: 'Unknown Salon',
                serviceName: 'Unknown Service',
              });
            }
          } catch (err) {
            // If we can't fetch booking details, still show success with basic info
            setPaymentDetails({
              reference: reference,
              amount: 0,
              bookingReference: 'N/A',
              salonName: 'Unknown Salon',
              serviceName: 'Unknown Service',
            });
          }
        } else {
          setStatus('failed');
          setMessage(result.message || 'Payment verification failed. Please try again.');
        }
      } catch (error: any) {
        setStatus('failed');
        setMessage(error.response?.data?.error?.message || 'Failed to verify payment. Please contact support.');
      }
    };

    verifyPayment();
  }, [reference]);

  const handleViewBookings = () => {
    navigate('/bookings');
  };

  const handleTryAgain = () => {
    navigate('/bookings');
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@groomlinkgh.com?subject=Payment Issue';
  };

  const formatPrice = (amount: number) => {
    return `GH₵ ${Number(amount).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {status === 'verifying' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-24 h-24 bg-[#006B3F]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-12 h-12 text-[#006B3F] animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Verifying your payment...</h2>
            <p className="text-gray-600">Please wait while we confirm your payment with Paystack.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
              <p className="text-green-100">Your booking has been confirmed</p>
            </div>

            {/* Payment Details */}
            <div className="p-6 space-y-4">
              {paymentDetails && (
                <>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-500 mb-1">Amount Paid</p>
                    <p className="text-3xl font-bold text-[#006B3F]">{formatPrice(paymentDetails.amount)}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Transaction Ref
                      </span>
                      <span className="font-mono text-sm text-gray-900">{paymentDetails.reference}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Booking Reference</span>
                      <span className="font-mono font-semibold text-[#006B3F]">{paymentDetails.bookingReference}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Salon</span>
                      <span className="font-medium text-gray-900 text-right">{paymentDetails.salonName}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-500">Service</span>
                      <span className="font-medium text-gray-900 text-right">{paymentDetails.serviceName}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="pt-4 space-y-3">
                <button
                  onClick={handleViewBookings}
                  className="w-full px-6 py-3 bg-[#006B3F] text-white font-medium rounded-xl hover:bg-[#006B3F]/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Calendar className="w-5 h-5" />
                  View My Bookings
                </button>
                <button
                  onClick={() => navigate('/explore')}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Book Another Appointment
                </button>
              </div>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Error Header */}
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Payment Failed</h2>
              <p className="text-red-100">We couldn&apos;t process your payment</p>
            </div>

            {/* Error Details */}
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="text-red-800 text-center">{message}</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleTryAgain}
                  className="w-full px-6 py-3 bg-[#006B3F] text-white font-medium rounded-xl hover:bg-[#006B3F]/90 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Try Again
                </button>
                <button
                  onClick={handleContactSupport}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <HelpCircle className="w-5 h-5" />
                  Contact Support
                </button>
              </div>

              <p className="text-center text-sm text-gray-500 mt-6">
                Need help? Email us at{' '}
                <a href="mailto:support@groomlinkgh.com" className="text-[#006B3F] hover:underline">
                  support@groomlinkgh.com
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
