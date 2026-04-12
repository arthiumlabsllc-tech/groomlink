import logger from '../config/logger';

export interface GeocodingResult {
  lat: number;
  lng: number;
}

interface GeocodingResponse {
  status: string;
  results: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }>;
  error_message?: string;
}

/**
 * Geocodes an address using Google Maps Geocoding API
 * @param address - The full address to geocode
 * @returns The latitude and longitude, or null if geocoding fails
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    logger.warn('Google Maps API key not configured, skipping geocoding');
    return null;
  }

  if (!address || address.trim() === '') {
    logger.warn('Empty address provided, skipping geocoding');
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    logger.debug(`Geocoding address: ${address}`);

    const response = await fetch(url);
    const data = (await response.json()) as GeocodingResponse;

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      logger.info(`Successfully geocoded address: ${address} -> lat: ${location.lat}, lng: ${location.lng}`);
      return {
        lat: location.lat,
        lng: location.lng,
      };
    }

    if (data.status === 'ZERO_RESULTS') {
      logger.warn(`No geocoding results found for address: ${address}`);
    } else {
      logger.warn(`Geocoding failed for address: ${address}, status: ${data.status}`, {
        error: data.error_message || 'No error message',
      });
    }

    return null;
  } catch (error) {
    logger.error(`Geocoding request failed for address: ${address}`, {
      error: (error as Error).message,
    });
    return null;
  }
}

/**
 * Formats a full address string from address components
 * @param address - Street address
 * @param city - City name
 * @param region - Region/state name
 * @returns Formatted address string
 */
export function formatAddressForGeocoding(address: string, city?: string, region?: string): string {
  const parts = [address];

  if (city && city.trim() !== '') {
    parts.push(city.trim());
  }

  if (region && region.trim() !== '') {
    parts.push(region.trim());
  }

  // Add Ghana as the country for better results
  parts.push('Ghana');

  return parts.filter(p => p && p.trim() !== '').join(', ');
}
