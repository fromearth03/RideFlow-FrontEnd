const STORAGE_KEY = 'rideflow:assignment-requests';

type RideRequestsMap = Record<string, number[]>;

function readMap(): RideRequestsMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as RideRequestsMap;
  } catch {
    return {};
  }
}

function writeMap(map: RideRequestsMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getRideRequests(rideId: number): number[] {
  const map = readMap();
  const values = map[String(rideId)] ?? [];
  if (!Array.isArray(values)) return [];
  return values.filter((value): value is number => Number.isInteger(value));
}

export function addRideRequest(rideId: number, driverId: number): void {
  const map = readMap();
  const key = String(rideId);
  const existing = Array.isArray(map[key]) ? map[key] : [];
  if (!existing.includes(driverId)) {
    map[key] = [...existing, driverId];
    writeMap(map);
  }
}

export function hasRideRequest(rideId: number, driverId: number): boolean {
  return getRideRequests(rideId).includes(driverId);
}

export function clearRideRequests(rideId: number): void {
  const map = readMap();
  const key = String(rideId);
  if (key in map) {
    delete map[key];
    writeMap(map);
  }
}

export function getAllRideRequests(): Record<number, number[]> {
  const map = readMap();
  const output: Record<number, number[]> = {};
  for (const [rideId, driverIds] of Object.entries(map)) {
    const numericRideId = Number(rideId);
    if (!Number.isInteger(numericRideId) || !Array.isArray(driverIds)) continue;
    output[numericRideId] = driverIds.filter((value): value is number => Number.isInteger(value));
  }
  return output;
}
