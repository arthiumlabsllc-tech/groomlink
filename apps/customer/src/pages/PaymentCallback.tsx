import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { paymentApi, bookingApi } from '../lib/api';

type PaymentStatus = 'waiting' | 'verifying' | 'success' | 'failed' | 'timeout';

interface PaymentDetails {
  reference: string;
  amount: number;
  serviceAmount: number;
  platformFee: number;
  bookingReference: string;
  salonName: string;
  serviceName: string;
  isGroupBooking: boolean;
  totalPeople?: number;
}

const POLL_INTERVAL = 4000; // Poll every 4 seconds
const MAX_POLL_DURATION = 180000; // Timeout after 3 minutes

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PaymentStatus>('waiting');
  const [message, setMessage] = useState('Waiting for payment confirmation...');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reference = searchParams.get('reference');

  const handlePaymentResult = useCallback(async (result: any, ref: string) => {
    if (result.success) {
      setStatus('success');
      setMessage(result.message || 'Your payment has been processed successfully!');
      
      // Use the verify response data directly
      if (result.data) {
        const data = result.data;
        setPaymentDetails({
          reference: ref,
          amount: data.amountPaid || 0,
          serviceAmount: data.serviceAmount || data.amountPaid || 0,
          platformFee: data.platformFee || 0,
          bookingReference: data.bookingReference || 'N/A',
          salonName: data.salonName || 'Unknown Salon',
          serviceName: data.serviceName || 'Unknown Service',
          isGroupBooking: data.isGroupBooking || false,
          totalPeople: data.totalPeople,
        });
      } else {
        // Fallback: Try to fetch booking details
        try {
          const bookings = await bookingApi.getMyBookings('CONFIRMED');
          const matchingBooking = bookings.find(b => 
            b.payment?.status === 'COMPLETED' || 
            new Date(b.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
          );
          
          if (matchingBooking) {
            const finalAmount = matchingBooking.finalAmount || matchingBooking.totalAmount;
            const totalPaid = matchingBooking.escrow?.amountHeld 
              ? Number(matchingBooking.escrow.amountHeld) + Number(matchingBooking.escrow.platformFee)
              : finalAmount;
            const platformFee = matchingBooking.escrow?.platformFee 
              ? Number(matchingBooking.escrow.platformFee)
              : totalPaid - finalAmount;
            
            setPaymentDetails({
              reference: ref,
              amount: totalPaid,
              serviceAmount: finalAmount,
              platformFee: platformFee,
              bookingReference: matchingBooking.reference,
              salonName: matchingBooking.salon?.businessName || 'Unknown Salon',
              serviceName: matchingBooking.service?.name || 'Unknown Service',
              isGroupBooking: matchingBooking.isGroupBooking || false,
              totalPeople: matchingBooking.totalPeople,
            });
          } else {
            setPaymentDetails({
              reference: ref,
              amount: 0,
              serviceAmount: 0,
              platformFee: 0,
              bookingReference: 'N/A',
              salonName: 'Unknown Salon',
              serviceName: 'Unknown Service',
              isGroupBooking: false,
            });
          }
        } catch {
          setPaymentDetails({
            reference: ref,
            amount: 0,
            serviceAmount: 0,
            platformFee: 0,
            bookingReference: 'N/A',
            salonName: 'Unknown Salon',
            serviceName: 'Unknown Service',
            isGroupBooking: false,
          });
        }
      }
    } else if (result.status === 'FAILED') {
      setStatus('failed');
      setMessage(result.message || 'Payment failed. Please try again.');
    }
    // If result is not success and not failed, it's still pending — continue polling
  }, []);

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      setMessage('Invalid payment reference. Please try again.');
      return;
    }

    // Start elapsed time counter
    const startTime = Date.now();
    elapsedRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    // Poll for payment status
    const poll = async () => {
      try {
        setStatus(prev => prev === 'waiting' ? 'verifying' : prev);
        const result = await paymentApi.verify({ reference });
        
        if (result.success) {
          // Payment confirmed — stop polling
          clearAllTimers();
          handlePaymentResult(result, reference);
        } else if (result.status === 'FAILED') {
          clearAllTimers();
          setStatus('failed');
          setMessage(result.message || 'Payment failed. Please try again.');
        }
        // Otherwise still pending, continue polling
      } catch (error: any) {
        // If it's a 404 or similar, payment might not be processed yet — keep polling
        // Only stop on explicit failure
        if (error.response?.status === 400 || error.response?.status === 402) {
          clearAllTimers();
          setStatus('failed');
          setMessage(error.response?.data?.error?.message || 'Payment failed. Please try again.');
        }
        // Otherwise continue polling
      }
    };

    // Initial poll immediately, then at intervals
    poll();
    pollingRef.current = setInterval(poll, POLL_INTERVAL);

    // Set a timeout to stop polling after MAX_POLL_DURATION
    timeoutRef.current = setTimeout(() => {
      clearAllTimers();
      setStatus('timeout');
      setMessage('Payment confirmation is taking longer than expected. If you approved the payment on your phone, please check your bookings or try again.');
    }, MAX_POLL_DURATION);

    return () => {
      clearAllTimers();
    };
  }, [reference, handlePaymentResult]);

  const clearAllTimers = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
  };

  const handleViewBookings = () => {
    navigate('/bookings');
  };

  const handleTryAgain = () => {
    navigate(-1);
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@groomlinkgh.com?subject=Payment Issue';
  };

  const formatPrice = (amount: number) => {
    return `GH₵ ${Number(amount).toFixed(2)}`;
  };

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Waiting / Polling State */}
        {(status === 'waiting' || status === 'verifying') && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Waiting Header */}
            <div className="bg-gradient-to-br from-[#006B3F] to-[#005030] p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="call" size={40} className="text-white animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Check Your Phone</h2>
              <p className="text-green-100">A mobile money prompt has been sent to your phone</p>
            </div>

            {/* Instructions */}
            <div className="p-6 space-y-4">
              <div className="bg-[#006B3F]/5 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3">What to do:</h3>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-[#006B3F] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    <span>Look for a payment prompt on your phone</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-[#006B3F] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    <span>Enter your mobile money PIN to authorize the payment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-[#006B3F] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                    <span>Wait for the confirmation on this screen</span>
                  </li>
                </ol>
              </div>

              {/* Polling Indicator */}
              <div className="flex items-center justify-center gap-3 py-3">
                <Icon name="progress_activity" size={20} className="text-[#006B3F] animate-spin" />
                <span className="text-gray-600 font-medium">Waiting for payment confirmation...</span>
              </div>

              {/* Elapsed Timer */}
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Icon name="schedule" size={16} />
                <span>Elapsed: {formatElapsed(elapsed)}</span>
              </div>

              {/* Cancel / Go Back */}
              <button
                onClick={() => navigate('/bookings')}
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Icon name="arrow_back" size={20} />
                Cancel and Go to Bookings
              </button>

              <p className="text-xs text-gray-400 text-center">
                Reference: <span className="font-mono">{reference}</span>
              </p>
            </div>
          </div>
        )}

        {/* Timeout State */}
        {status === 'timeout' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="schedule" size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Still Waiting?</h2>
              <p className="text-amber-100">Payment confirmation is taking longer than expected</p>
            </div>

            <div className="p-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <p className="text-amber-800 text-center">
                  If you approved the payment on your phone, it may still be processing. 
                  Check your bookings to see if it went through.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleViewBookings}
                  className="w-full px-6 py-3 bg-[#006B3F] text-white font-medium rounded-xl hover:bg-[#006B3F]/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="calendar_today" size={20} />
                  Check My Bookings
                </button>
                <button
                  onClick={handleContactSupport}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="help" size={20} />
                  Contact Support
                </button>
              </div>

              <p className="text-center text-sm text-gray-500 mt-6">
                Reference: <span className="font-mono">{reference}</span>
              </p>
            </div>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="check_circle" size={48} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
              <p className="text-green-100">Your booking has been confirmed</p>
            </div>

            {/* Payment Details */}
            <div className="p-6 space-y-4">
              {paymentDetails && (
                <>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-500 mb-1">Total Amount Paid</p>
                    <p className="text-3xl font-bold text-[#006B3F]">{formatPrice(paymentDetails.amount)}</p>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Breakdown</h3>
                    
                    {/* Service Price */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-gray-600">Service: {paymentDetails.serviceName}</span>
                      <span className="font-medium text-gray-900">
                        {paymentDetails.isGroupBooking && paymentDetails.totalPeople && paymentDetails.totalPeople > 1 
                          ? `${formatPrice(paymentDetails.serviceAmount / paymentDetails.totalPeople)} each`
                          : formatPrice(paymentDetails.serviceAmount)}
                      </span>
                    </div>
                    
                    {/* Group Booking Line */}
                    {paymentDetails.isGroupBooking && paymentDetails.totalPeople && paymentDetails.totalPeople > 1 && (
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-600">Group ({paymentDetails.totalPeople} members)</span>
                        <span className="font-medium text-gray-900">
                          {formatPrice(paymentDetails.serviceAmount)}
                        </span>
                      </div>
                    )}
                    
                    {/* Platform Fee */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-gray-600">Platform Fee</span>
                      <span className="font-medium text-gray-900">{formatPrice(paymentDetails.platformFee)}</span>
                    </div>
                    
                    {/* Divider */}
                    <div className="border-t border-gray-300 my-2"></div>
                    
                    {/* Total */}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-gray-800">Total Paid</span>
                      <span className="font-bold text-[#006B3F]">{formatPrice(paymentDetails.amount)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Icon name="credit_card" size={16} />
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
                  <Icon name="calendar" size={20} />
                  View My Bookings
                </button>
                <button
                  onClick={() => navigate('/explore')}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="arrow_back" size={20} />
                  Book Another Appointment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Failed State */}
        {status === 'failed' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Error Header */}
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="cancel" size={48} className="text-white" />
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
                  <Icon name="arrow_back" size={20} />
                  Try Again
                </button>
                <button
                  onClick={handleContactSupport}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="help" size={20} />
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
