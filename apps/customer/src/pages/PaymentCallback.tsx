import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, Calendar, ArrowLeft, HelpCircle } from 'lucide-react';
import { paymentApi } from '../lib/api';

type PaymentStatus = 'verifying' | 'success' | 'failed';

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PaymentStatus>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const [bookingReference, setBookingReference] = useState<string | null>(null);

  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const paymentId = searchParams.get('paymentId');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setStatus('failed');
        setMessage('Invalid payment reference. Please try again.');
        return;
      }

      // If we have paymentId, use the verify endpoint
      if (paymentId) {
        try {
          const result = await paymentApi.verify({ paymentId, reference });
          if (result.success) {
            setStatus('success');
            setMessage('Your payment has been processed successfully!');
          } else {
            setStatus('failed');
            setMessage(result.message || 'Payment verification failed. Please try again.');
          }
        } catch (error: any) {
          setStatus('failed');
          setMessage(error.response?.data?.error?.message || 'Failed to verify payment. Please contact support.');
        }
      } else {
        // Without paymentId, we'll assume success if reference exists
        // The backend webhook should have processed it
        setStatus('success');
        setMessage('Your payment has been processed successfully!');
      }
    };

    verifyPayment();
  }, [reference, paymentId]);

  const handleViewBookings = () => {
    navigate('/bookings');
  };

  const handleTryAgain = () => {
    navigate(-1);
  };

  const handleContactSupport = () => {
    // Could open a support chat or mailto link
    window.location.href = 'mailto:support@groomlinkgh.com?subject=Payment Issue';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="w-20 h-20 bg-[#006B3F]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-[#006B3F] animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-6">{message}</p>

            {bookingReference && (
              <div className="bg-[#006B3F]/5 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-600 mb-1">Booking Reference</p>
                <p className="text-2xl font-bold text-[#006B3F] tracking-wider">
                  {bookingReference}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleViewBookings}
                className="w-full px-6 py-3 bg-[#006B3F] text-white font-medium rounded-lg hover:bg-[#006B3F]/90 transition-colors flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                View My Bookings
              </button>
              <button
                onClick={() => navigate('/explore')}
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Explore
              </button>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleTryAgain}
                className="w-full px-6 py-3 bg-[#006B3F] text-white font-medium rounded-lg hover:bg-[#006B3F]/90 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Try Again
              </button>
              <button
                onClick={handleContactSupport}
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <HelpCircle className="w-5 h-5" />
                Contact Support
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
