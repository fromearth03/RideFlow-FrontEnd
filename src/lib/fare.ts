type Coordinates = {
  lat: number;
  lng: number;
};

export const BASE_FARE_PKR = 200;
export const PER_KM_RATE_PKR = 50;
const EARTH_RADIUS_KM = 6371;
const MAPTILER_API_KEY = (import.meta.env.VITE_MAPTILER_API_KEY as string | undefined) || '8FutMwkM2PmTepBqT3d4';

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateHaversineDistanceKm(start: Coordinates, end: Coordinates): number {
  const lat1 = toRadians(start.lat);
  const lat2 = toRadians(end.lat);
  const deltaLat = toRadians(end.lat - start.lat);
  const deltaLng = toRadians(end.lng - start.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.asin(Math.sqrt(a));
  return roundToTwo(EARTH_RADIUS_KM * c);
}

export function calculateFarePkr(distanceKm: number, baseFare = BASE_FARE_PKR, perKmRate = PER_KM_RATE_PKR): number {
  return Math.round(baseFare + distanceKm * perKmRate);
}

async function geocodePlaceName(placeName: string): Promise<Coordinates | null> {
  const query = placeName.trim();
  if (!query) return null;

  const encoded = encodeURIComponent(query);
  const url = `https://api.maptiler.com/geocoding/${encoded}.json?key=${MAPTILER_API_KEY}&language=en&limit=1`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = (await response.json()) as { features?: Array<{ center?: [number, number] }> };
  const center = data.features?.[0]?.center;
  if (!center || center.length < 2) return null;

  return { lng: Number(center[0]), lat: Number(center[1]) };
}

export async function estimateFareFromLocations(
  pickupLocation: string,
  dropLocation: string,
): Promise<{ distanceKm: number; farePkr: number } | null> {
  const [pickupCoordinates, dropCoordinates] = await Promise.all([
    geocodePlaceName(pickupLocation),
    geocodePlaceName(dropLocation),
  ]);

  if (!pickupCoordinates || !dropCoordinates) return null;

  const distanceKm = calculateHaversineDistanceKm(pickupCoordinates, dropCoordinates);
  const farePkr = calculateFarePkr(distanceKm);

  return { distanceKm, farePkr };
}
