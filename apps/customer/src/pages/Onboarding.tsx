import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth';
import apiClient from '../lib/api';
import { findNearestGhanaLocation, isWithinGhana, isAccuracyAcceptable } from '../lib/ghanaLocations';

/* ────────────────────────────────────────────
   Category chip data
   ──────────────────────────────────────────── */
const CATEGORIES = [
  { id: 'Haircut', label: 'Haircut', icon: '💇‍♂️' },
  { id: 'Beard Trim', label: 'Beard Trim', icon: '🧔' },
  { id: 'Pedicure', label: 'Pedicure', icon: '🦶' },
  { id: 'Braiding', label: 'Braiding', icon: '🪢' },
  { id: 'Dreadlocks', label: 'Dreadlocks', icon: '🦁' },
  { id: 'Makeup', label: 'Makeup', icon: '💄' },
  { id: 'Massage', label: 'Massage', icon: '💆' },
  { id: 'Nails', label: 'Nails', icon: '💅' },
  { id: 'Facial', label: 'Facial', icon: '✨' },
] as const;

/* ────────────────────────────────────────────
   Recommended salon shape (from API)
   ──────────────────────────────────────────── */
interface RecommendedSalon {
  id: string;
  businessName: string;
  coverImage: string | null;
  city: string;
  rating: number;
  reviewCount: number;
  distance: number | null;
  services: { name: string; price: number }[];
}

/* ────────────────────────────────────────────
   Step indicator
   ──────────────────────────────────────────── */
function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === step
              ? 'w-8 bg-[#CE1126]'
              : i < step
              ? 'w-8 bg-[#006B3F]'
              : 'w-8 bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────
   Step 1- Category Selection
   ──────────────────────────────────────────── */
function CategoryStep({
  selected,
  onToggle,
  onContinue,
  isLoading,
}: {
  selected: string[];
  onToggle: (cat: string) => void;
  onContinue: () => void;
  isLoading: boolean;
}) {
  const canContinue = selected.length > 0;

  return (
    <div className="flex flex-col items-center text-center animate-fadeIn">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#CE1126] to-[#a80e1f] flex items-center justify-center shadow-lg mb-6">
        <Icon name="content_cut" size={32} className="text-white" />
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
        What's on your self-care radar?
      </h2>
      <p className="text-gray-500 mb-8 max-w-sm">
        Pick up to 5 categories so we can tailor your experience
      </p>

      {/* Chip grid */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-8">
        {CATEGORIES.map((cat) => {
          const isActive = selected.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onToggle(cat.id)}
              className={`relative flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-2xl border-2 transition-all duration-200 ${
                isActive
                  ? 'border-[#CE1126] bg-[#CE1126]/5 shadow-sm scale-[1.02]'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span
                className={`text-xs font-medium ${
                  isActive ? 'text-[#CE1126]' : 'text-gray-700'
                }`}
              >
                {cat.label}
              </span>
              {isActive && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#CE1126] flex items-center justify-center shadow">
                  <Icon name="check" size={12} className="text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-gray-400 mb-4">
        {selected.length}/5 selected
      </p>

      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue || isLoading}
        className="w-full max-w-sm py-3.5 px-6 bg-[#006B3F] hover:bg-[#005530] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#006B3F]/20"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            Continue
            <Icon name="arrow_forward" size={16} />
          </>
        )}
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────
   Step 2- Location Permission
   ──────────────────────────────────────────── */
function LocationStep({
  onEnable,
  onSkip,
  isLoading,
}: {
  onEnable: () => void;
  onSkip: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center animate-fadeIn">
      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#006B3F]/10 to-[#006B3F]/5 flex items-center justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#006B3F]/20 to-[#006B3F]/10 flex items-center justify-center">
          <Icon name="location_on" size={40} className="text-[#006B3F]" />
        </div>
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
        Enable location services
      </h2>
      <p className="text-gray-500 mb-8 max-w-sm">
        Get recommendations of great businesses near you!
      </p>

      <button
        type="button"
        onClick={onEnable}
        disabled={isLoading}
        className="w-full max-w-sm py-3.5 px-6 bg-[#006B3F] hover:bg-[#005530] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#006B3F]/20 disabled:opacity-50"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Icon name="near_me" size={16} />
            Enable Location
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onSkip}
        className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
      >
        I'll do this later
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────
   Step 3- Recommendations
   ──────────────────────────────────────────── */
function RecommendationsStep({
  salons,
  isLoading,
  onFinish,
  isFinishing,
}: {
  salons: RecommendedSalon[];
  isLoading: boolean;
  onFinish: () => void;
  isFinishing: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center animate-fadeIn w-full">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FCD116] to-[#e6bc14] flex items-center justify-center shadow-lg mb-6">
        <Icon name="auto_awesome" size={32} className="text-gray-900" />
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
        We think you'll love these
      </h2>
      <p className="text-gray-500 mb-6 max-w-sm">
        Based on your preferences, here are some top picks
      </p>

      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <div className="w-8 h-8 border-4 border-[#006B3F] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Finding great spots for you...</p>
        </div>
      ) : salons.length === 0 ? (
        <div className="py-8 text-gray-400">
          <p className="text-sm">No matching salons yet- but we're growing!</p>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-3 mb-6 max-h-[340px] overflow-y-auto pr-1">
          {salons.slice(0, 6).map((salon) => (
            <div
              key={salon.id}
              className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                {salon.coverImage ? (
                  <img
                    src={salon.coverImage}
                    alt={salon.businessName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#006B3F]/10 to-[#FCD116]/10">
                    <Icon name="content_cut" size={20} className="text-[#006B3F]/40" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-left">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {salon.businessName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Icon name="star" size={14} filled className="text-[#FCD116]" />
                  <span className="text-xs text-gray-600">
                    {salon.rating.toFixed(1)} ({salon.reviewCount})
                  </span>
                  {salon.distance !== null && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        {salon.distance < 1
                          ? `${Math.round(salon.distance * 1000)}m`
                          : `${salon.distance.toFixed(1)}km`}
                      </span>
                    </>
                  )}
                </div>
                {salon.services.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {salon.services.slice(0, 2).map((s) => s.name).join(' · ')}
                  </p>
                )}
              </div>

              <Icon name="chevron_right" size={16} className="text-gray-300 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onFinish}
        disabled={isFinishing}
        className="w-full max-w-sm py-3.5 px-6 bg-[#006B3F] hover:bg-[#005530] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#006B3F]/20 disabled:opacity-50"
      >
        {isFinishing ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            Go to GroomLink
            <Icon name="arrow_forward" size={16} />
          </>
        )}
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────
   Main Onboarding page
   ──────────────────────────────────────────── */
export default function Onboarding() {
  const navigate = useNavigate();
  const { user, fetchProfile } = useAuthStore();

  const [step, setStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    user?.preferredCategories ?? []
  );
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [recommendedSalons, setRecommendedSalons] = useState<RecommendedSalon[]>([]);
  const [isLoadingSalons, setIsLoadingSalons] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // If user already completed onboarding, redirect out
  useEffect(() => {
    if (user?.onboardingComplete) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) return prev.filter((c) => c !== cat);
      if (prev.length >= 5) {
        toast.error('You can select up to 5 categories');
        return prev;
      }
      return [...prev, cat];
    });
  }, []);

  /* Step 1- Save preferences and advance */
  const handleCategoryContinue = async () => {
    setIsSavingPrefs(true);
    try {
      await apiClient.put('/users/preferences', {
        categories: selectedCategories,
      });
      toast.success('Preferences saved!');
      setStep(1);
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to save preferences'
      );
    } finally {
      setIsSavingPrefs(false);
    }
  };

  /* Step 2- Geolocation */
  const handleEnableLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setStep(2);
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords;
          
          console.log(`[Onboarding] GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}, Accuracy: ${accuracy}m`);
          
          // Validate if coordinates are within Ghana
          if (!isWithinGhana(latitude, longitude)) {
            console.log('[Onboarding] Location outside Ghana');
            toast.error('Location appears to be outside Ghana. Please enable location services when in Ghana.');
            setIsGettingLocation(false);
            setStep(2);
            return;
          }
          
          // Check GPS accuracy
          if (!isAccuracyAcceptable(accuracy)) {
            console.log(`[Onboarding] Poor GPS accuracy: ${accuracy}m`);
            toast.error('GPS accuracy is too low. Please try again in an area with better signal.');
            setIsGettingLocation(false);
            setStep(2);
            return;
          }
          
          // Find nearest Ghana location from our database
          const nearestLocation = findNearestGhanaLocation(latitude, longitude, 20);
          
          if (nearestLocation) {
            console.log(`[Onboarding] Detected: ${nearestLocation.city}, ${nearestLocation.region}`);
            toast.success(`Location detected: ${nearestLocation.city}, ${nearestLocation.region}`);
          }
          
          // Send coordinates to backend
          await apiClient.put('/users/location', {
            latitude,
            longitude,
          });
          
          toast.success('Location updated!');
        } catch (error) {
          console.error('[Onboarding] Location update error:', error);
          // Non-critical- still advance
        } finally {
          setIsGettingLocation(false);
          setStep(2);
        }
      },
      (error) => {
        console.error('[Onboarding] Geolocation error:', error);
        // User denied or error- skip silently
        setIsGettingLocation(false);
        setStep(2);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  /* Step 2- Skip location */
  const handleSkipLocation = () => {
    setStep(2);
  };

  /* Step 3- Fetch recommendations when step becomes 2 */
  useEffect(() => {
    if (step !== 2) return;

    let cancelled = false;
    const fetchRecommended = async () => {
      setIsLoadingSalons(true);
      try {
        const res = await apiClient.get('/salons/recommended');
        const data = res.data.data ?? res.data ?? [];
        if (!cancelled) setRecommendedSalons(data);
      } catch {
        // Non-critical
      } finally {
        if (!cancelled) setIsLoadingSalons(false);
      }
    };
    fetchRecommended();
    return () => {
      cancelled = true;
    };
  }, [step]);

  /* Step 3- Complete onboarding */
  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      await apiClient.put('/users/onboarding-complete');
      // Refresh user profile so the guard sees onboardingComplete = true
      await fetchProfile();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Something went wrong'
      );
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-[#FCD116]/5 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#006B3F] to-[#005530] shadow-lg mb-3">
            <span className="text-lg font-bold text-white">G</span>
          </div>
        </div>

        {/* Step indicator */}
        <div className="mb-8">
          <StepIndicator step={step} total={3} />
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          {step === 0 && (
            <CategoryStep
              selected={selectedCategories}
              onToggle={toggleCategory}
              onContinue={handleCategoryContinue}
              isLoading={isSavingPrefs}
            />
          )}
          {step === 1 && (
            <LocationStep
              onEnable={handleEnableLocation}
              onSkip={handleSkipLocation}
              isLoading={isGettingLocation}
            />
          )}
          {step === 2 && (
            <RecommendationsStep
              salons={recommendedSalons}
              isLoading={isLoadingSalons}
              onFinish={handleFinish}
              isFinishing={isFinishing}
            />
          )}
        </div>

        {/* Ghana flag accent */}
        <div className="flex justify-center mt-6 gap-1">
          <div className="w-8 h-2 rounded-full bg-[#CE1126]" />
          <div className="w-8 h-2 rounded-full bg-[#FCD116]" />
          <div className="w-8 h-2 rounded-full bg-[#006B3F]" />
        </div>
      </div>
    </div>
  );
}
