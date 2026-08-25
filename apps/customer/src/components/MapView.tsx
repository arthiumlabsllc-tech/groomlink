import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import Icon from './Icon';
import { useNavigate } from 'react-router-dom';

interface Salon {
  id: string;
  businessName: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  reviewCount: number;
  address: string;
  city: string;
  distance?: number;
  logo?: string | null;
  images?: string[];
}

interface MapViewProps {
  salons: Salon[];
  userLocation: { lat: number; lng: number } | null;
  defaultCenter?: { lat: number; lng: number };
}

interface MapInnerProps extends MapViewProps {
  apiKey: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '500px',
};

const defaultCenter = {
  lat: 5.6037, // Accra, Ghana
  lng: -0.1870,
};

const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
};

const formatCategoryLabel = (type: string): string => {
  const labels: Record<string, string> = {
    BARBERSHOP: 'Barbershop',
    HAIR_SALON: 'Hair Salon',
    NAIL_SALON: 'Nail Salon',
    PEDICURE_SALON: 'Pedicure Salon',
    SPA: 'Spa',
    BEAUTY_SALON: 'Beauty Salon',
  };
  return labels[type] || type;
};

const getSalonImage = (salon: Salon): string => {
  if (salon.images && salon.images.length > 0) {
    return salon.images[0];
  }
  if (salon.logo) {
    return salon.logo;
  }
  const defaultImages: Record<string, string> = {
    BARBERSHOP: 'https://images.unsplash.com/photo-1585747860715-2d3b4c7e3a23?w=100&h=100&fit=crop',
    HAIR_SALON: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100&h=100&fit=crop',
    NAIL_SALON: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=100&h=100&fit=crop',
    SPA: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=100&h=100&fit=crop',
  };
  return defaultImages[salon.type] || 'https://images.unsplash.com/photo-1522337360788-8b13ee0af107?w=100&h=100&fit=crop';
};

function MapFallback({ salons, message }: { salons: Salon[]; message?: string }) {
  return (
    <div className="flex flex-col h-[500px] bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex flex-col items-center justify-center py-8 px-4 border-b border-gray-200">
        <Icon name="location_on" size={48} className="text-gray-400 mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Map unavailable</h3>
        <p className="text-gray-600 text-center max-w-md">
          {message || 'Unable to load Google Maps. Browse salons from the list instead.'}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {salons.length === 0 && (
          <p className="text-center text-gray-500 py-8">No salons available.</p>
        )}
        {salons.map((salon) => (
          <div key={salon.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm truncate">{salon.businessName}</h4>
              <p className="text-xs text-gray-500 truncate mt-0.5">{salon.address || 'Address not available'}</p>
            </div>
            <a
              href={
                salon.latitude && salon.longitude
                  ? `https://www.google.com/maps/dir/?api=1&destination=${salon.latitude},${salon.longitude}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.address || salon.businessName)}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ghana-green text-white text-xs font-medium rounded-lg hover:bg-ghana-green/90 transition-colors whitespace-nowrap"
            >
              <Icon name="directions" size={14} />
              Get Directions
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function MapInner({ salons, userLocation, defaultCenter: propCenter, apiKey }: MapInnerProps) {
  const navigate = useNavigate();
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  const onMarkerClick = useCallback((salon: Salon) => {
    setSelectedSalon(salon);
  }, []);

  const onInfoWindowClose = useCallback(() => {
    setSelectedSalon(null);
  }, []);

  const handleViewDetails = useCallback((salonId: string) => {
    navigate(`/salon/${salonId}`);
  }, [navigate]);

  const mapCenter = userLocation || propCenter || defaultCenter;

  // Filter salons with valid coordinates
  const salonsWithCoords = salons.filter(
    (salon) => salon.latitude !== null && salon.longitude !== null
  );

  if (loadError) {
    return <MapFallback salons={salons} />;
  }

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-gray-50 rounded-xl border border-gray-200">
        <div className="w-12 h-12 border-4 border-ghana-green border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] md:h-[600px] rounded-xl overflow-hidden border border-gray-200">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={userLocation ? 13 : 12}
        options={{
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: 'cooperative',
        }}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0066CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" fill="#0066CC" fill-opacity="0.3"/><circle cx="12" cy="12" r="4" fill="#0066CC"/></svg>`
              ),
              scaledSize: new google.maps.Size(24, 24),
              anchor: new google.maps.Point(12, 12),
            }}
            title="Your location"
          />
        )}

        {/* Salon markers */}
        {salonsWithCoords.map((salon) => (
          <Marker
            key={salon.id}
            position={{ lat: salon.latitude!, lng: salon.longitude! }}
            onClick={() => onMarkerClick(salon)}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#006B3C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="#006B3C" fill-opacity="0.9"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`
              ),
              scaledSize: new google.maps.Size(36, 36),
              anchor: new google.maps.Point(18, 36),
            }}
            title={salon.businessName}
          />
        ))}

        {/* InfoWindow for selected salon */}
        {selectedSalon && selectedSalon.latitude && selectedSalon.longitude && (
          <InfoWindow
            position={{ lat: selectedSalon.latitude, lng: selectedSalon.longitude }}
            onCloseClick={onInfoWindowClose}
          >
            <div className="p-2 min-w-[240px]">
              <div className="flex items-start gap-3">
                <img
                  src={getSalonImage(selectedSalon)}
                  alt={selectedSalon.businessName}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://images.unsplash.com/photo-1522337360788-8b13ee0af107?w=100&h=100&fit=crop';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">
                    {selectedSalon.businessName}
                  </h3>
                  <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-ghana-gold/20 text-ghana-green mt-1">
                    {formatCategoryLabel(selectedSalon.type)}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {/* Rating */}
                <div className="flex items-center gap-1">
                  <Icon name="star" size={16} filled className="text-ghana-gold" />
                  <span className="text-sm font-medium">{selectedSalon.rating?.toFixed(1) || '0.0'}</span>
                  <span className="text-sm text-gray-500">({selectedSalon.reviewCount || 0} reviews)</span>
                </div>

                {/* Address */}
                <div className="flex items-start gap-1 text-sm text-gray-600">
                  <Icon name="location_on" size={16} className="flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{selectedSalon.address || 'Address not available'}</span>
                </div>

                {/* Distance */}
                {selectedSalon.distance !== undefined && (
                  <div className="flex items-center gap-1 text-sm font-medium text-ghana-green">
                    <Icon name="near_me" size={16} />
                    <span>{formatDistance(selectedSalon.distance)} away</span>
                  </div>
                )}

                {/* View Details Button */}
                <button
                  onClick={() => handleViewDetails(selectedSalon.id)}
                  className="w-full mt-3 px-4 py-2 bg-ghana-green text-white text-sm font-medium rounded-lg hover:bg-ghana-green/90 transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Results count overlay */}
      <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg shadow-md border border-gray-200">
        <span className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{salonsWithCoords.length}</span> salons on map
        </span>
      </div>
    </div>
  );
}

// Wrapper component that fetches API key at runtime if not provided via build-time env var
export default function MapView(props: MapViewProps) {
  const [apiKey, setApiKey] = useState<string>(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');
  const [isLoadingKey, setIsLoadingKey] = useState<boolean>(!import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

  useEffect(() => {
    if (!apiKey) {
      const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'https://api.groomlinkgh.com/api');

      // Try /api/config first (dedicated config endpoint)
      fetch(`${API_BASE}/config`)
        .then(res => {
          if (!res.ok) throw new Error(`Config returned ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data.config?.googleMapsApiKey) {
            setApiKey(data.config.googleMapsApiKey);
          }
        })
        .catch(() => {
          // Fallback: try public-settings which may include googleMapsApiKey
          return fetch(`${API_BASE}/admin/public-settings`)
            .then(res => {
              if (!res.ok) throw new Error(`Public settings returned ${res.status}`);
              return res.json();
            })
            .then(data => {
              const key = data.data?.googleMapsApiKey || data.googleMapsApiKey;
              if (key) {
                setApiKey(key);
              }
            })
            .catch(() => {
              // Silent fail - env var is primary, this is just a fallback
            });
        })
        .finally(() => {
          setIsLoadingKey(false);
        });
    }
  }, []);

  if (isLoadingKey) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-gray-50 rounded-xl border border-gray-200">
        <div className="w-12 h-12 border-4 border-ghana-green border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600">Loading map...</p>
      </div>
    );
  }

  if (!apiKey) {
    return <MapFallback salons={props.salons} message="Google Maps API key is not configured. Browse salons from the list instead." />;
  }

  return <MapInner {...props} apiKey={apiKey} />;
}
