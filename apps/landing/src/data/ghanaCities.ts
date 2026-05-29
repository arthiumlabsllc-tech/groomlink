export interface CityArea {
  city: string
  image: string
  /** Approximate centroid coordinates for distance-based auto-detection */
  lat: number
  lng: number
  areas: string[]
}

export const GHANA_CITIES: CityArea[] = [
  {
    city: 'Accra',
    image: 'https://images.unsplash.com/photo-1576487503230-b6dc3ad12eea?w=300&h=200&fit=crop',
    lat: 5.6037,
    lng: -0.187,
    areas: [
      'East Legon', 'West Legon', 'Dansoman', 'Weija', 'Mallam', 'Madina', 'Adenta',
      'Teshie', 'Nungua', 'Labadi', 'Osu', 'Cantonments', 'Airport Residential',
      'Ridge', 'Achimota', 'Abelemkpe', 'Dzorwulu', 'North Kaneshie', 'Kaneshie',
      'Bubiashie', 'La', 'Sakumono', 'Ashaley Botwe', 'Ashongman', 'Adabraka',
      'Kokomlemle', 'Nima', 'Mamobi', 'Sabon Zongo', 'Laterbiokorshie',
      'Chorkor', 'Jamestown', 'Abossey Okai', 'Kanda', 'Tse Addo',
    ],
  },
  {
    city: 'Kumasi',
    image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=300&h=200&fit=crop',
    lat: 6.6885,
    lng: -1.6244,
    areas: [
      'Adum', 'Bantama', 'Asokwa', 'Suame', 'Manhyia', 'Tafo', 'Oforikrom',
      'Asawase', 'Kwadaso', 'Nhyiaeso', 'Ahodwo', 'Dichemso', 'Ashanti New Town',
      'Amakom', 'Asafo', 'Abuakwa', 'Ayigya', 'Atonsu', 'Bremang', 'Buokrom',
      'Ayeduase', 'Santasi', 'Bomso', 'Pankrono', 'Fankyenebra', 'Asabi',
      'Adukrom', 'Anloga Junction', 'Asenua', 'Emena', 'Apatrapa', 'Daban', 'Gyinyase',
    ],
  },
  {
    city: 'Takoradi',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&h=200&fit=crop',
    lat: 4.8845,
    lng: -1.7554,
    areas: [
      'Airport Ridge', 'Beach Road', 'Chapel Hill', 'New Takoradi', 'Anaji',
      'Effia', 'Kwesimintsim', 'Apowa', 'Apremdo', 'Mpatado', 'Fijai',
      'Nkotompo', 'Kojokrom', 'Essipon', 'Inchaban', 'Shama', 'Agona',
      'Aboadze', 'Sekondi', 'Axim Road',
    ],
  },
  {
    city: 'Tamale',
    image: 'https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=300&h=200&fit=crop',
    lat: 9.4035,
    lng: -0.8424,
    areas: [
      'Sagnarigu', 'Bangyili', 'Banvim', 'Barwah Barracks', 'Batanyili',
      'Belpiela', 'Bogkurugu', 'Bukpomo', 'Chaanshegu', 'Changnaayili',
      'Choggu', 'Dabokpaa', 'Dagbandabo Fong', 'Gbanbaya', 'Hausa Zong',
      'Jakarayili', 'Lamashegu', 'Malshegu', 'Nyohini', 'Sakasaka',
      'Savelugu Road', 'Tamale Central', 'Tamale South', 'Vittin', 'Zogbeli',
    ],
  },
  {
    city: 'Cape Coast',
    image: 'https://images.unsplash.com/photo-1544212281-43271b247165?w=300&h=200&fit=crop',
    lat: 5.1054,
    lng: -1.2466,
    areas: [
      'Kotokoraba', 'Adisadel', 'Pedu', 'Abura', 'Apewosika', 'Briscoe',
      'Effutu', 'Brofoyedur', 'Amamoma', 'Kwaprow', 'Duakor', 'Akotokyir',
      'Ola', 'Iture', 'Butua', 'Windy Ridge', 'London Bridge', 'Coronation',
      'Kingsway', 'Aboom', 'Efutu',
    ],
  },
  {
    city: 'Koforidua',
    image: 'https://images.unsplash.com/photo-1570168007204-dfb528c69551?w=300&h=200&fit=crop',
    lat: 6.0940,
    lng: -0.2597,
    areas: [
      'Galloway', 'Bomaa', 'Asokore', 'Adweso', 'Zongo', 'Aburi Road',
      'Asuom', 'Nsawam Road', 'Effiduase', 'Mpraeso', 'New Juaben',
      'Old Tafo', 'Suhyen', 'Apedwa', 'Bunso', 'Atipem',
    ],
  },
  {
    city: 'Tema',
    image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=300&h=200&fit=crop',
    lat: 5.6698,
    lng: -0.0166,
    areas: [
      'Community 1', 'Community 2', 'Community 3', 'Community 4', 'Community 5',
      'Community 6', 'Community 7', 'Community 8', 'Community 9', 'Community 10',
      'Community 11', 'Community 12', 'Community 13', 'Community 14', 'Community 15',
      'Community 16', 'Community 17', 'Community 18', 'Community 19', 'Community 20',
      'Community 21', 'Community 22', 'Community 23', 'Community 24', 'Community 25',
      'Ashaiman', 'Lashibi', 'Sakumono', 'Kpone', 'Michel Camp', 'Bediako',
    ],
  },
]

/** Find the nearest Ghana city to the given coordinates (Haversine distance). */
export function findNearestCity(
  lat: number,
  lng: number
): { city: CityArea; distanceKm: number } | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  let best: { city: CityArea; distanceKm: number } | null = null
  for (const city of GHANA_CITIES) {
    const d = haversineKm(lat, lng, city.lat, city.lng)
    if (!best || d < best.distanceKm) {
      best = { city, distanceKm: d }
    }
  }
  return best
}

/** All areas across all cities, paired with their parent city. */
export function flattenAreas(): Array<{ city: string; area: string }> {
  const out: Array<{ city: string; area: string }> = []
  for (const c of GHANA_CITIES) {
    for (const a of c.areas) {
      out.push({ city: c.city, area: a })
    }
  }
  return out
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Check if coordinates are within Ghana's boundaries
 * Ghana boundaries: Lat 4.5-11.2, Lon -3.3 to 1.2
 */
export function isWithinGhana(latitude: number, longitude: number): boolean {
  const minLat = 4.5
  const maxLat = 11.2
  const minLon = -3.3
  const maxLon = 1.2
  return (
    latitude >= minLat &&
    latitude <= maxLat &&
    longitude >= minLon &&
    longitude <= maxLon
  )
}

/**
 * Check if GPS accuracy is acceptable (≤100 meters)
 */
export function isAccuracyAcceptable(accuracy?: number): boolean {
  if (!accuracy || !isFinite(accuracy)) return false
  return accuracy <= 100
}

/**
 * Get accuracy level description for UI feedback
 */
export function getAccuracyLevel(accuracy?: number): string {
  if (!accuracy || !isFinite(accuracy)) return 'Unknown'
  if (accuracy <= 10) return 'Excellent'
  if (accuracy <= 50) return 'Good'
  if (accuracy <= 100) return 'Acceptable'
  if (accuracy <= 500) return 'Poor'
  return 'Very Poor'
}
