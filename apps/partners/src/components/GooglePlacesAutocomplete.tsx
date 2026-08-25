import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Loader2, Search } from 'lucide-react'

interface GooglePlacesAutocompleteProps {
  value: string
  onChange: (address: string) => void
  onPlaceSelected: (details: PlaceDetails) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export interface PlaceDetails {
  address: string
  city: string
  region: string
  latitude: number
  longitude: number
  formattedAddress: string
}

// Map region names to Ghana's standard region names
const GHANA_REGIONS: Record<string, string> = {
  'Greater Accra': 'Greater Accra',
  'Ashanti': 'Ashanti',
  'Western': 'Western',
  'Central': 'Central',
  'Eastern': 'Eastern',
  'Northern': 'Northern',
  'Upper East': 'Upper East',
  'Upper West': 'Upper West',
  'Volta': 'Volta',
  'Oti': 'Oti',
  'Bono': 'Bono',
  'Bono East': 'Bono East',
  'Ahafo': 'Ahafo',
  'Savannah': 'Savannah',
  'North East': 'North East',
  'Western North': 'Western North',
}

let googleMapsScriptLoaded = false
let googleMapsLoadCallbacks: (() => void)[] = []

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (googleMapsScriptLoaded && window.google?.maps?.places) {
      resolve()
      return
    }

    googleMapsLoadCallbacks.push(resolve)

    if (document.querySelector('script[data-google-maps-places]')) {
      return
    }

    // Define the callback globally
    ;(window as any).__googleMapsCallback = () => {
      googleMapsScriptLoaded = true
      googleMapsLoadCallbacks.forEach(cb => cb())
      googleMapsLoadCallbacks = []
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=__googleMapsCallback`
    script.async = true
    script.defer = true
    script.setAttribute('data-google-maps-places', 'true')
    document.head.appendChild(script)
  })
}

export default function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder = 'Search for your address...',
  className = '',
  disabled = false,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null)

  // Fetch API key and load Google Maps script
  useEffect(() => {
    let cancelled = false

    const loadMaps = async () => {
      try {
        let apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

        if (!apiKey) {
          const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'https://api.groomlinkgh.com/api')
          const res = await fetch(`${API_BASE}/config`)
          if (res.ok) {
            const data = await res.json()
            apiKey = data.config?.googleMapsApiKey || ''
          }
        }

        if (!apiKey) {
          setLoadError(true)
          return
        }

        await loadGoogleMapsScript(apiKey)
        if (!cancelled) {
          setIsLoaded(true)
        }
      } catch {
        if (!cancelled) {
          setLoadError(true)
        }
      }
    }

    loadMaps()
    return () => { cancelled = true }
  }, [])

  // Initialize Autocomplete once the script is loaded and input is mounted
  useEffect(() => {
    if (!isLoaded || !inputRef.current) return

    try {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'gh' },
        fields: ['address_components', 'geometry', 'formatted_address'],
      })

      autocompleteRef.current = autocomplete

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (!place.geometry || !place.address_components) return

        const lat = place.geometry.location?.lat() ?? 0
        const lng = place.geometry.location?.lng() ?? 0

        // Extract address components
        let streetNumber = ''
        let route = ''
        let city = ''
        let region = ''

        for (const component of place.address_components) {
          const types = component.types
          if (types.includes('street_number')) {
            streetNumber = component.long_name
          } else if (types.includes('route')) {
            route = component.long_name
          } else if (types.includes('locality') || types.includes('sublocality_level_1')) {
            city = component.long_name
          } else if (types.includes('administrative_area_level_1')) {
            region = GHANA_REGIONS[component.long_name] || component.long_name
          }
        }

        const address = [streetNumber, route].filter(Boolean).join(' ')
        const fullAddress = place.formatted_address || address

        setSelectedPlace(fullAddress)
        onChange(fullAddress)

        onPlaceSelected({
          address: fullAddress,
          city,
          region,
          latitude: lat,
          longitude: lng,
          formattedAddress: fullAddress,
        })
      })
    } catch {
      setLoadError(true)
    }
  }, [isLoaded, onChange, onPlaceSelected])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setSelectedPlace(null)
  }, [onChange])

  return (
    <div className="relative">
      <div className="relative">
        {isLoaded ? (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ghana-green" />
        ) : !loadError ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
        ) : (
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        )}
        <input
          ref={inputRef}
          type="text"
          className={`input-field pl-10 ${className}`}
          placeholder={isLoaded ? placeholder : loadError ? 'Address (type manually)' : 'Loading address search...'}
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
        />
        {selectedPlace && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="text-ghana-green">✓</span>
          </div>
        )}
      </div>
      {isLoaded && (
        <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
          <Search className="w-3 h-3" />
          Start typing to search for your exact address on Google Maps
        </p>
      )}
      {loadError && (
        <p className="mt-1 text-xs text-gray-500">
          Address search unavailable — please enter your address manually
        </p>
      )}
    </div>
  )
}
