/**
 * Ghana Location Database and Utilities for Web App
 * Provides accurate location detection and validation for Ghana
 */

export interface GhanaLocation {
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  accuracy: number; // radius in km
}

// Major cities and towns in Ghana with their approximate coordinates
export const GHANA_LOCATIONS: GhanaLocation[] = [
  // Greater Accra Region
  { city: 'Accra', region: 'Greater Accra', latitude: 5.6037, longitude: -0.1870, accuracy: 15 },
  { city: 'Tema', region: 'Greater Accra', latitude: 5.6698, longitude: -0.0166, accuracy: 10 },
  { city: 'Teshie', region: 'Greater Accra', latitude: 5.5947, longitude: -0.1067, accuracy: 5 },
  { city: 'Nungua', region: 'Greater Accra', latitude: 5.6050, longitude: -0.0833, accuracy: 5 },
  { city: 'Madina', region: 'Greater Accra', latitude: 5.6833, longitude: -0.1667, accuracy: 5 },
  { city: 'Legon', region: 'Greater Accra', latitude: 5.6511, longitude: -0.1870, accuracy: 3 },
  { city: 'Kasoa', region: 'Central', latitude: 5.5333, longitude: -0.4167, accuracy: 8 },
  
  // Eastern Region
  { city: 'Koforidua', region: 'Eastern', latitude: 6.0940, longitude: -0.2597, accuracy: 10 },
  { city: 'Akosombo', region: 'Eastern', latitude: 6.1167, longitude: 0.0500, accuracy: 8 },
  { city: 'Nsawam', region: 'Eastern', latitude: 5.8000, longitude: -0.3500, accuracy: 8 },
  { city: 'Suhum', region: 'Eastern', latitude: 6.0333, longitude: -0.4500, accuracy: 8 },
  
  // Ashanti Region
  { city: 'Kumasi', region: 'Ashanti', latitude: 6.6885, longitude: -1.6244, accuracy: 15 },
  { city: 'Obuasi', region: 'Ashanti', latitude: 6.2000, longitude: -1.6667, accuracy: 10 },
  { city: 'Ejisu', region: 'Ashanti', latitude: 6.7500, longitude: -1.3667, accuracy: 8 },
  { city: 'Konongo', region: 'Ashanti', latitude: 6.6167, longitude: -1.2167, accuracy: 8 },
  
  // Western Region
  { city: 'Takoradi', region: 'Western', latitude: 4.8845, longitude: -1.7554, accuracy: 10 },
  { city: 'Sekondi', region: 'Western', latitude: 4.9333, longitude: -1.7000, accuracy: 10 },
  { city: 'Tarkwa', region: 'Western', latitude: 5.3000, longitude: -1.9833, accuracy: 8 },
  
  // Central Region
  { city: 'Cape Coast', region: 'Central', latitude: 5.1053, longitude: -1.2466, accuracy: 10 },
  { city: 'Winneba', region: 'Central', latitude: 5.3500, longitude: -0.6167, accuracy: 8 },
  { city: 'Swedru', region: 'Central', latitude: 5.5333, longitude: -0.7000, accuracy: 8 },
  
  // Northern Region
  { city: 'Tamale', region: 'Northern', latitude: 9.4034, longitude: -0.8424, accuracy: 15 },
  { city: 'Yendi', region: 'Northern', latitude: 9.4427, longitude: -0.0093, accuracy: 10 },
  { city: 'Savelugu', region: 'Northern', latitude: 9.6333, longitude: -0.8333, accuracy: 8 },
  
  // Upper East Region
  { city: 'Bolgatanga', region: 'Upper East', latitude: 10.7856, longitude: -0.8514, accuracy: 10 },
  { city: 'Bawku', region: 'Upper East', latitude: 11.0500, longitude: -0.2333, accuracy: 10 },
  
  // Upper West Region
  { city: 'Wa', region: 'Upper West', latitude: 10.0601, longitude: -2.5097, accuracy: 12 },
  
  // Volta Region
  { city: 'Ho', region: 'Volta', latitude: 6.6000, longitude: 0.4700, accuracy: 10 },
  { city: 'Keta', region: 'Volta', latitude: 5.9167, longitude: 0.9833, accuracy: 8 },
  { city: 'Hohoe', region: 'Volta', latitude: 7.1500, longitude: 0.2833, accuracy: 8 },
  
  // Bono Region
  { city: 'Sunyani', region: 'Bono', latitude: 7.3392, longitude: -2.3265, accuracy: 10 },
  { city: 'Techiman', region: 'Bono East', latitude: 7.5833, longitude: -1.9333, accuracy: 10 },
  
  // Additional towns
  { city: 'Nkawkaw', region: 'Eastern', latitude: 6.5500, longitude: -0.7667, accuracy: 8 },
  { city: 'Begoro', region: 'Eastern', latitude: 6.3833, longitude: -0.3833, accuracy: 8 },
  { city: 'Kibi', region: 'Eastern', latitude: 6.1667, longitude: -0.5500, accuracy: 8 },
];

/**
 * Find the nearest Ghana location based on coordinates
 * @param latitude - User's latitude
 * @param longitude - User's longitude
 * @param maxDistanceKm - Maximum distance to consider (default: 20km)
 * @returns Nearest location or null if none found within range
 */
export function findNearestGhanaLocation(
  latitude: number,
  longitude: number,
  maxDistanceKm: number = 20
): GhanaLocation | null {
  let nearestLocation: GhanaLocation | null = null;
  let nearestDistance = Infinity;

  for (const location of GHANA_LOCATIONS) {
    const distance = calculateDistance(
      latitude,
      longitude,
      location.latitude,
      location.longitude
    );

    if (distance < nearestDistance && distance <= maxDistanceKm) {
      nearestDistance = distance;
      nearestLocation = location;
    }
  }

  return nearestLocation;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validate if coordinates are within Ghana's boundaries
 * @returns true if coordinates are within Ghana
 */
export function isWithinGhana(latitude: number, longitude: number): boolean {
  // Ghana boundaries (approximate)
  const minLat = 4.5;
  const maxLat = 11.2;
  const minLon = -3.3;
  const maxLon = 1.2;

  return (
    latitude >= minLat &&
    latitude <= maxLat &&
    longitude >= minLon &&
    longitude <= maxLon
  );
}

/**
 * Get GPS accuracy level description
 * @param accuracy - Accuracy in meters
 * @returns Accuracy level description
 */
export function getAccuracyLevel(accuracy: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (accuracy <= 10) return 'excellent';
  if (accuracy <= 50) return 'good';
  if (accuracy <= 100) return 'fair';
  return 'poor';
}

/**
 * Check if GPS accuracy is acceptable for location detection
 * @param accuracy - Accuracy in meters
 * @returns true if accuracy is acceptable
 */
export function isAccuracyAcceptable(accuracy: number): boolean {
  return accuracy <= 100; // Accept up to 100 meters
}
