import type {
  AuthResponse,
  BackendRide,
  BackendDriver,
  BackendVehicle,
  BackendMaintenanceRecord,
  BackendUser,
  BackendDispatcher,
  BackendCustomer,
} from '@/types';
import { safeRecordBlockchainEvent } from '@/services/blockchainAudit';

const configuredApiUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const BASE_URL = (configuredApiUrl && configuredApiUrl.length > 0
  ? configuredApiUrl
  : 'http://localhost:8080').replace(/\/$/, '');
const USER_ID_BY_EMAIL_STORAGE_KEY = 'rideflow:userIdByEmail';

function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase();
}

function readUserIdByEmailMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(USER_ID_BY_EMAIL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};

    const next: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const normalizedKey = normalizeEmailKey(key);
      const parsedId = Number(value);
      if (normalizedKey && Number.isFinite(parsedId) && parsedId > 0) {
        next[normalizedKey] = parsedId;
      }
    }
    return next;
  } catch {
    return {};
  }
}

function writeUserIdByEmailMap(map: Record<string, number>): void {
  try {
    localStorage.setItem(USER_ID_BY_EMAIL_STORAGE_KEY, JSON.stringify(map));
  } catch {
    return;
  }
}

function cacheUserIdByEmail(email: string, userId: number): void {
  const normalizedEmail = normalizeEmailKey(email);
  if (!normalizedEmail) return;
  if (!Number.isFinite(userId) || userId <= 0) return;

  const current = readUserIdByEmailMap();
  current[normalizedEmail] = userId;
  writeUserIdByEmailMap(current);
}

function cacheUserIdEntries(entries: Array<{ id: number; email: string }>): void {
  if (entries.length === 0) return;
  const current = readUserIdByEmailMap();

  for (const entry of entries) {
    const normalizedEmail = normalizeEmailKey(entry.email);
    if (!normalizedEmail) continue;
    if (!Number.isFinite(entry.id) || entry.id <= 0) continue;
    current[normalizedEmail] = entry.id;
  }

  writeUserIdByEmailMap(current);
}

export function resolveCachedUserIdByEmail(email: string | null | undefined): number | null {
  if (!email) return null;
  const normalizedEmail = normalizeEmailKey(email);
  if (!normalizedEmail) return null;

  const map = readUserIdByEmailMap();
  const mappedId = Number(map[normalizedEmail] ?? 0);
  return Number.isFinite(mappedId) && mappedId > 0 ? mappedId : null;
}

// ─── Auth Headers ─────────────────────────────────────────────────────────────
export function getAuthHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token') ?? ''}`,
  };
}

// ─── Error handling ───────────────────────────────────────────────────────────
async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // Clear stored credentials and trigger logout via event
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('approved');
    localStorage.removeItem('userId');
    window.dispatchEvent(new Event('auth:logout'));
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ status: res.status, message: `Error ${res.status}` }));
    if (!('status' in (err as Record<string, unknown>))) {
      (err as Record<string, unknown>).status = res.status;
    }
    // Preserve the full error object (may contain errors map or message)
    throw err;
  }
  // Handle empty 204 responses
  const text = await res.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

function extractList<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(record[key])) {
        return record[key] as T[];
      }
    }
  }
  return [];
}

function getNestedValue(record: Record<string, unknown>, paths: string[]): unknown {
  for (const path of paths) {
    const parts = path.split('.');
    let current: unknown = record;
    let exists = true;

    for (const part of parts) {
      if (!current || typeof current !== 'object' || !(part in (current as Record<string, unknown>))) {
        exists = false;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }

    if (exists && current !== undefined && current !== null) {
      return current;
    }
  }

  return undefined;
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => Number(item))
    .filter(item => Number.isFinite(item) && item > 0);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => String(item ?? '').trim())
    .filter(item => item.length > 0);
}

function toNullableStringArray(value: unknown): Array<string | null> {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    if (item === null || item === undefined) return null;
    const normalized = String(item).trim();
    return normalized.length > 0 ? normalized : null;
  });
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function extractEntityId(value: unknown): number | null {
  const direct = toPositiveNumber(value);
  if (direct) return direct;

  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;

  const nested = getNestedValue(record, [
    'id',
    'driverId',
    'driver_id',
    'userId',
    'user_id',
    'user.id',
    'user.userId',
    'driver.id',
    'driver.user.id',
  ]);

  return toPositiveNumber(nested);
}

function normalizeDriver(payload: unknown): BackendDriver {
  const record = (payload ?? {}) as Record<string, unknown>;
  const user = (record.user ?? {}) as Record<string, unknown>;
  const parsedUserId = Number(record.userId ?? record.user_id ?? user.id ?? user.userId ?? 0);
  const userId = Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;
  const vehicleIdsFromDto = toNumberArray(
    record.vehicleIds ?? record.vehicle_ids ?? record.assignedVehicleIds ?? record.assigned_vehicle_ids,
  );
  const vehicleModelsFromDto = toNullableStringArray(
    record.vehicleModels ??
    record.vehicle_models ??
    record.assignedVehicleModels ??
    record.assigned_vehicle_models,
  );
  const vehicleStatusesFromDto = toNullableStringArray(
    record.vehicleStatuses ??
    record.vehicle_statuses ??
    record.assignedVehicleStatuses ??
    record.assigned_vehicle_statuses,
  );
  const assignedVehiclesRaw = getNestedValue(record, [
    'assignedVehicles',
    'assigned_vehicles',
    'assignedVehicle',
    'assigned_vehicle',
    'vehicles',
    'vehicle',
    'vehicleDTOs',
    'vehicleDtos',
    'assignedVehicleDTOs',
    'assignedVehicleDtos',
    'assignedVehicleDTO',
    'assignedVehicleDto',
    'data.assignedVehicles',
    'data.assigned_vehicles',
    'data.assignedVehicle',
    'data.vehicleDTOs',
    'data.vehicleDtos',
  ]);
  const assignedVehicleList = Array.isArray(assignedVehiclesRaw)
    ? assignedVehiclesRaw
    : assignedVehiclesRaw && typeof assignedVehiclesRaw === 'object'
      ? [assignedVehiclesRaw]
      : [];
  const assignedVehicles = assignedVehicleList.length > 0
    ? normalizeVehicles({ vehicles: assignedVehicleList })
    : [];
  const derivedVehicleIds = assignedVehicles
    .map(vehicle => vehicle.id)
    .filter(vehicleId => Number.isFinite(vehicleId) && vehicleId > 0);
  const vehicleIds = Array.from(new Set([...vehicleIdsFromDto, ...derivedVehicleIds]));

  const derivedVehicleModels = assignedVehicles.map(vehicle => {
    const model = vehicle.model?.trim();
    return model ? model : null;
  });
  const derivedVehicleStatuses = assignedVehicles.map(vehicle => {
    const status = vehicle.status?.trim();
    return status ? status : null;
  });
  const vehicleModels = vehicleModelsFromDto.length > 0 ? vehicleModelsFromDto : derivedVehicleModels;
  const vehicleStatuses = vehicleStatusesFromDto.length > 0 ? vehicleStatusesFromDto : derivedVehicleStatuses;

  return {
    id: Number(record.id ?? 0),
    userId,
    email: String((record.email ?? user.email ?? '') || '') || undefined,
    licenseNumber: String(record.licenseNumber ?? record.license_number ?? ''),
    isAvailable: Boolean(record.isAvailable ?? record.is_available ?? record.available ?? false),
    approved: Boolean(record.approved ?? record.isApproved ?? record.is_approved ?? false),
    vehicleIds,
    vehicleModels,
    vehicleStatuses,
  };
}

function normalizeDrivers(payload: unknown): BackendDriver[] {
  const list = extractList<unknown>(payload, ['drivers', 'data', 'content', 'items']);
  return list.map(normalizeDriver).filter(driver => driver.id > 0);
}

function normalizeVehicle(payload: unknown): BackendVehicle {
  const record = (payload ?? {}) as Record<string, unknown>;
  const driverId =
    extractEntityId(getNestedValue(record, [
      'driverId',
      'driver_id',
      'assignedDriverId',
      'assigned_driver_id',
      'assignedToDriverId',
      'assigned_to_driver_id',
    ])) ??
    extractEntityId(record.driver) ??
    extractEntityId(record.assignedDriver) ??
    extractEntityId(record.assigned_to) ??
    extractEntityId(record.assignedTo) ??
    extractEntityId(record.driverDTO) ??
    extractEntityId(record.driverDto) ??
    null;

  const driverEmail = String(
    getNestedValue(record, [
      'driverEmail',
      'assignedDriverEmail',
      'assigned_driver_email',
      'driver.email',
      'assignedDriver.email',
      'assignedTo.email',
      'assigned_to.email',
      'driver.user.email',
      'driverDTO.email',
      'driverDto.email',
      'driverDTO.user.email',
      'driverDto.user.email',
      'assignedDriver.user.email',
      'assignedTo.user.email',
      'assigned_to.user.email',
    ]) ?? '',
  ) || null;

  const driverName = String(
    getNestedValue(record, [
      'driverName',
      'assignedDriverName',
      'assigned_driver_name',
      'driver.name',
      'driver.fullName',
      'assignedDriver.name',
      'assignedDriver.fullName',
      'assignedTo.name',
      'assignedTo.fullName',
      'assigned_to.name',
      'assigned_to.fullName',
      'driver.user.name',
      'driver.user.fullName',
      'driverDTO.name',
      'driverDTO.fullName',
      'driverDto.name',
      'driverDto.fullName',
      'driverDTO.user.name',
      'driverDTO.user.fullName',
      'driverDto.user.name',
      'driverDto.user.fullName',
      'assignedDriver.user.name',
      'assignedDriver.user.fullName',
      'assignedTo.user.name',
      'assignedTo.user.fullName',
      'assigned_to.user.name',
      'assigned_to.user.fullName',
    ]) ?? '',
  ) || null;

  return {
    id: Number(record.id ?? 0),
    plateNumber: String(record.plateNumber ?? record.plate_number ?? ''),
    model: String(record.model ?? record.modelName ?? record.model_name ?? record.vehicleModel ?? record.vehicle_model ?? ''),
    status: String(record.status ?? 'INACTIVE'),
    driverId,
    assignedDriverId: driverId,
    driverEmail,
    assignedDriverEmail: driverEmail,
    driverName,
    assignedDriverName: driverName,
  };
}

function normalizeVehicles(payload: unknown): BackendVehicle[] {
  const list = extractList<unknown>(payload, ['vehicles', 'data', 'content', 'items']);
  return list.map(normalizeVehicle).filter(vehicle => vehicle.id > 0);
}

function normalizeCustomer(payload: unknown): BackendCustomer {
  const record = (payload ?? {}) as Record<string, unknown>;
  const user = (record.user ?? {}) as Record<string, unknown>;

  const parsedId = Number(record.id ?? 0);
  const id = Number.isFinite(parsedId) && parsedId > 0 ? parsedId : 0;

  const parsedUserId = Number(
    record.userId ??
    record.user_id ??
    user.id ??
    user.userId ??
    user.user_id ??
    record.customerId ??
    record.customer_id ??
    0,
  );
  const userId = Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;

  return {
    id,
    userId,
    email: String(record.email ?? user.email ?? ''),
    phoneNumber: (record.phoneNumber ?? record.phone_number ?? null) as string | null,
  };
}

function normalizeCustomers(payload: unknown): BackendCustomer[] {
  const list = extractList<unknown>(payload, ['customers', 'data', 'content', 'items']);
  return list.map(normalizeCustomer).filter(customer => customer.id > 0);
}

function toBooleanLike(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return undefined;
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const json = atob(padded);
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractUserIdFromJwt(token: string): number | null {
  const payload = parseJwtPayload(token);
  if (!payload) return null;

  const candidates = [
    payload.userId,
    payload.user_id,
    payload.id,
    payload.uid,
    payload.sub,
  ];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function normalizeAuthResponse(payload: unknown): AuthResponse {
  const record = (payload ?? {}) as Record<string, unknown>;
  const user = (record.user ?? {}) as Record<string, unknown>;

  const token = String(record.token ?? record.accessToken ?? record.jwt ?? '');
  const role = String(record.role ?? user.role ?? 'ROLE_CUSTOMER');
  const approved = toBooleanLike(
    record.approved ??
    record.isApproved ??
    record.is_approved ??
    user.approved ??
    user.isApproved ??
    user.is_approved,
  );

  const userIdCandidate = getNestedValue(record, [
    'userId',
    'user_id',
    'id',
    'user.id',
    'user.userId',
    'user.user_id',
    'data.userId',
    'data.user_id',
    'data.id',
    'data.user.id',
    'data.user.userId',
    'principal.id',
    'principal.userId',
    'account.id',
    'account.userId',
    'profile.id',
    'profile.userId',
  ]);
  const parsedUserId = Number(userIdCandidate ?? 0);
  const directUserId = Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;
  const tokenUserId = extractUserIdFromJwt(token);
  const userId = directUserId ?? tokenUserId;

  return {
    token,
    role: role as AuthResponse['role'],
    approved,
    userId,
  };
}

function getOptionalAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function requestWithFallback<T>(requests: (() => Promise<Response>)[]): Promise<T> {
  let lastError: unknown = null;
  for (let index = 0; index < requests.length; index += 1) {
    try {
      const response = await requests[index]();
      return await handleResponse<T>(response);
    } catch (error) {
      lastError = error;
      const status = Number((error as { status?: number })?.status ?? 0);
      const shouldTryNext = index < requests.length - 1 && (status === 404 || status === 405);
      if (!shouldTryNext) {
        throw error;
      }
    }
  }
  throw lastError;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse<unknown>(res);
    const normalized = normalizeAuthResponse(data);
    const tokenPayload = parseJwtPayload(normalized.token);
    const tokenEmailCandidate = String(
      tokenPayload?.email ?? tokenPayload?.username ?? tokenPayload?.preferred_username ?? tokenPayload?.sub ?? '',
    );
    const tokenEmail = tokenEmailCandidate.includes('@') ? tokenEmailCandidate : null;
    const resolvedUserId =
      normalized.userId ??
      resolveCachedUserIdByEmail(email) ??
      resolveCachedUserIdByEmail(tokenEmail);

    if (resolvedUserId) {
      cacheUserIdByEmail(email, resolvedUserId);
      if (tokenEmail) {
        cacheUserIdByEmail(tokenEmail, resolvedUserId);
      }
    }

    await safeRecordBlockchainEvent('USER_SIGN_IN', {
      email,
      role: normalized.role,
    });
    return {
      ...normalized,
      userId: resolvedUserId,
    };
  },

  registerCustomer: async (email: string, password: string, phone?: string): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, phone }),
    });
    const data = await handleResponse<unknown>(res);
    const normalized = normalizeAuthResponse(data);
    await safeRecordBlockchainEvent('USER_REGISTER', {
      email,
      role: normalized.role,
      phone: phone ?? null,
    });
    return normalized;
  },

  registerDriver: async (email: string, password: string, licenseNumber: string): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/register/driver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getOptionalAuthHeader(),
      },
      body: JSON.stringify({
        email,
        password,
        licenseNumber,
      }),
    });
    const data = await handleResponse<unknown>(res);
    const normalized = normalizeAuthResponse(data);
    await safeRecordBlockchainEvent('DRIVER_ADD', {
      email,
      role: normalized.role,
      licenseNumber,
    });
    return normalized;
  },

  registerDispatcher: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/register/dispatcher`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getOptionalAuthHeader(),
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse<unknown>(res);
    const normalized = normalizeAuthResponse(data);
    await safeRecordBlockchainEvent('DISPATCHER_ADD', {
      email,
      role: normalized.role,
    });
    return normalized;
  },

  registerAdmin: async (email: string, password: string, adminSecretKey: string): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/register/admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Secret-Key': adminSecretKey,
        ...getOptionalAuthHeader(),
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse<unknown>(res);
    const normalized = normalizeAuthResponse(data);
    await safeRecordBlockchainEvent('USER_REGISTER', {
      email,
      role: normalized.role,
      adminSecretKeyPresent: Boolean(adminSecretKey),
    });
    return normalized;
  },
};

// ─── Rides API ────────────────────────────────────────────────────────────────
export const ridesApi = {
  getAll: async (): Promise<BackendRide[]> => {
    const res = await fetch(`${BASE_URL}/rides`, { headers: getAuthHeaders() });
    return handleResponse<BackendRide[]>(res);
  },

  getByUserId: async (userId: number): Promise<BackendRide[]> => {
    const res = await fetch(`${BASE_URL}/rides/user/${userId}`, { headers: getAuthHeaders() });
    return handleResponse<BackendRide[]>(res);
  },

  create: async (pickupLocation: string, dropLocation: string, scheduledTime: string, inter_city?: boolean): Promise<BackendRide> => {
    const res = await fetch(`${BASE_URL}/rides`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ pickupLocation, dropLocation, scheduledTime, inter_city }),
    });
    const ride = await handleResponse<BackendRide>(res);
    await safeRecordBlockchainEvent('RIDE_CREATE', {
      rideId: ride.id,
      pickupLocation,
      dropLocation,
      scheduledTime,
      inter_city: inter_city ?? null,
    });
    return ride;
  },

  assignDriver: async (rideId: number, driverId: number): Promise<BackendRide> => {
    const res = await fetch(`${BASE_URL}/rides/${rideId}/assign/${driverId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const ride = await handleResponse<BackendRide>(res);
    await safeRecordBlockchainEvent('RIDE_ASSIGN_DRIVER', {
      rideId,
      driverId,
    });
    return ride;
  },

  updateStatus: async (rideId: number, status: string): Promise<BackendRide> => {
    const res = await fetch(`${BASE_URL}/rides/${rideId}/status?status=${encodeURIComponent(status)}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    const ride = await handleResponse<BackendRide>(res);
    const eventType = status === 'CANCELLED' ? 'RIDE_CANCEL' : 'RIDE_STATUS_UPDATE';
    await safeRecordBlockchainEvent(eventType, {
      rideId,
      status,
    });
    return ride;
  },
};

// ─── Drivers API ──────────────────────────────────────────────────────────────
export const driversApi = {
  getAll: async (): Promise<BackendDriver[]> => {
    const res = await fetch(`${BASE_URL}/drivers`, { headers: getAuthHeaders() });
    const data = await handleResponse<unknown>(res);
    const normalized = normalizeDrivers(data);
    if (normalized.length > 0) return normalized;
    return extractList<BackendDriver>(data, ['data', 'content', 'items']);
  },

  create: async (userId: number, licenseNumber: string): Promise<BackendDriver> => {
    const res = await fetch(`${BASE_URL}/drivers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, licenseNumber }),
    });
    const driver = await handleResponse<BackendDriver>(res);
    await safeRecordBlockchainEvent('DRIVER_PROFILE_CREATE', {
      driverId: driver.id,
      userId,
      licenseNumber,
    });
    return driver;
  },

  toggleAvailability: async (driverId: number, available: boolean): Promise<BackendDriver> => {
    const res = await fetch(`${BASE_URL}/drivers/${driverId}/availability?available=${available}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<unknown>(res);
    return normalizeDriver(data);
  },

  updateVehicleDetails: async (
    driverId: number,
    vehicleId: number,
    payload: { model?: string; status?: string },
  ): Promise<BackendDriver> => {
    const body = JSON.stringify({
      ...(payload.model ? { model: payload.model.trim() } : {}),
      ...(payload.status ? { status: payload.status } : {}),
    });

    const res = await fetch(`${BASE_URL}/drivers/${driverId}/vehicles/${vehicleId}/details`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body,
    });
    const data = await handleResponse<unknown>(res);
    return normalizeDriver(data);
  },

};

// ─── Dispatcher API ───────────────────────────────────────────────────────────
export const dispatcherApi = {
  getCustomers: async (): Promise<BackendCustomer[]> => {
    const res = await fetch(`${BASE_URL}/customers`, { headers: getAuthHeaders() });
    const data = await handleResponse<unknown>(res);
    return normalizeCustomers(data);
  },

  getCustomerUserIdByEmail: async (email: string): Promise<number> => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      throw new Error('Customer email is required to resolve user id.');
    }

    const res = await fetch(
      `${BASE_URL}/customers/user-id?email=${encodeURIComponent(normalizedEmail)}`,
      { headers: getAuthHeaders() },
    );
    const data = await handleResponse<unknown>(res);

    const userId = Number(
      typeof data === 'number'
        ? data
        : (data as Record<string, unknown> | null)?.userId,
    );

    if (!Number.isFinite(userId) || userId <= 0) {
      throw new Error('Could not resolve customer user id from email.');
    }

    return userId;
  },

  createRide: async (
    pickupLocation: string,
    dropLocation: string,
    scheduledTime: string,
    inter_city: boolean,
    customerUserId: number,
  ): Promise<BackendRide> => {
    const normalizedCustomerUserId = toPositiveNumber(customerUserId);
    if (!normalizedCustomerUserId) {
      throw new Error('A valid customer user id is required for dispatcher ride creation.');
    }

    const requestPayload = {
      pickupLocation,
      dropLocation,
      scheduledTime,
      interCity: inter_city,
      customerUserId: normalizedCustomerUserId,
    };

    console.log('[Dispatcher API createRide] payload', requestPayload);

    const res = await fetch(`${BASE_URL}/dispatcher/rides`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestPayload),
    });
    const ride = await handleResponse<BackendRide>(res);

    await safeRecordBlockchainEvent('RIDE_CREATE', {
      rideId: ride.id,
      pickupLocation,
      dropLocation,
      scheduledTime,
      inter_city,
      source: 'dispatcher',
      customerId: normalizedCustomerUserId,
    });
    return ride;
  },

  assignDriver: async (rideId: number, driverId: number): Promise<BackendRide> => {
    const res = await fetch(`${BASE_URL}/dispatcher/rides/${rideId}/assign/${driverId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const ride = await handleResponse<BackendRide>(res);
    await safeRecordBlockchainEvent('RIDE_ASSIGN_DRIVER', {
      rideId,
      driverId,
      source: 'dispatcher',
    });
    return ride;
  },

  autoAssign: async (rideId: number): Promise<BackendRide> => {
    const res = await fetch(`${BASE_URL}/dispatcher/rides/${rideId}/auto-assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<BackendRide>(res);
  },
};

// ─── Admin Vehicles API ───────────────────────────────────────────────────────
export const adminApi = {
  getUsers: async (): Promise<BackendUser[]> => {
    const res = await fetch(`${BASE_URL}/admin/users`, { headers: getAuthHeaders() });
    const users = await handleResponse<BackendUser[]>(res);
    cacheUserIdEntries(
      users
        .filter(user => Number.isFinite(user.id) && user.id > 0 && Boolean(user.email))
        .map(user => ({ id: user.id, email: user.email })),
    );
    return users;
  },

  deleteUser: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/admin/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const response = await handleResponse<void>(res);
    await safeRecordBlockchainEvent('USER_DELETE', {
      userId: id,
    });
    return response;
  },

  getDrivers: async (): Promise<BackendDriver[]> => {
    const res = await fetch(`${BASE_URL}/admin/drivers`, { headers: getAuthHeaders() });
    const data = await handleResponse<unknown>(res);
    const normalized = normalizeDrivers(data);
    if (normalized.length > 0) return normalized;
    return extractList<BackendDriver>(data, ['data', 'content', 'items']);
  },

  deleteDriver: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/admin/drivers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const response = await handleResponse<void>(res);
    await safeRecordBlockchainEvent('DRIVER_DELETE', {
      driverId: id,
    });
    return response;
  },

  approveDriver: async (id: number): Promise<BackendDriver> => {
    const res = await fetch(`${BASE_URL}/admin/drivers/${id}/approve`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<unknown>(res);
    const driver = normalizeDriver(data);
    await safeRecordBlockchainEvent('DRIVER_APPROVE', {
      driverId: id,
    });
    return driver;
  },

  getDispatchers: async (): Promise<BackendDispatcher[]> => {
    const res = await fetch(`${BASE_URL}/admin/dispatchers`, { headers: getAuthHeaders() });
    return handleResponse<BackendDispatcher[]>(res);
  },

  deleteDispatcher: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/admin/dispatchers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const response = await handleResponse<void>(res);
    await safeRecordBlockchainEvent('DISPATCHER_DELETE', {
      dispatcherId: id,
    });
    return response;
  },

  approveDispatcher: async (id: number): Promise<BackendDispatcher> => {
    const res = await fetch(`${BASE_URL}/admin/dispatchers/${id}/approve`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    const dispatcher = await handleResponse<BackendDispatcher>(res);
    await safeRecordBlockchainEvent('DISPATCHER_APPROVE', {
      dispatcherId: id,
    });
    return dispatcher;
  },

  getCustomers: async (): Promise<BackendCustomer[]> => {
    const res = await fetch(`${BASE_URL}/admin/customers`, { headers: getAuthHeaders() });
    const customers = await handleResponse<BackendCustomer[]>(res);
    cacheUserIdEntries(
      customers
        .filter(customer => Number.isFinite(customer.id) && customer.id > 0 && Boolean(customer.email))
        .map(customer => ({ id: customer.id, email: customer.email })),
    );
    return customers;
  },

  deleteCustomer: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/admin/customers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const response = await handleResponse<void>(res);
    await safeRecordBlockchainEvent('CUSTOMER_DELETE', {
      customerId: id,
    });
    return response;
  },

  getVehicles: async (): Promise<BackendVehicle[]> => {
    const res = await fetch(`${BASE_URL}/admin/vehicles`, { headers: getAuthHeaders() });
    const data = await handleResponse<unknown>(res);
    const normalized = normalizeVehicles(data);
    if (normalized.length > 0) return normalized;
    return extractList<BackendVehicle>(data, ['vehicles', 'data', 'content', 'items']);
  },

  addVehicle: async (plateNumber: string, model: string, status: string): Promise<BackendVehicle> => {
    const res = await fetch(`${BASE_URL}/admin/vehicles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ plateNumber, model, status }),
    });
    const vehicle = await handleResponse<BackendVehicle>(res);
    await safeRecordBlockchainEvent('VEHICLE_ADD', {
      vehicleId: vehicle.id,
      plateNumber,
      model,
      status,
    });
    return vehicle;
  },

  disableVehicle: async (vehicleId: number): Promise<BackendVehicle> => {
    const res = await fetch(`${BASE_URL}/admin/vehicles/${vehicleId}/disable`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<unknown>(res);
    const vehicle = normalizeVehicle(data);
    await safeRecordBlockchainEvent('VEHICLE_DISABLE', {
      vehicleId,
    });
    return vehicle;
  },

  enableVehicle: async (vehicleId: number): Promise<BackendVehicle> => {
    const res = await fetch(`${BASE_URL}/admin/vehicles/${vehicleId}/enable`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<unknown>(res);
    const vehicle = normalizeVehicle(data);
    await safeRecordBlockchainEvent('VEHICLE_ENABLE', {
      vehicleId,
    });
    return vehicle;
  },

  addMaintenance: async (vehicleId: number, description: string): Promise<BackendMaintenanceRecord> => {
    const res = await fetch(`${BASE_URL}/admin/vehicles/${vehicleId}/maintenance`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ description }),
    });
    const maintenance = await handleResponse<BackendMaintenanceRecord>(res);
    await safeRecordBlockchainEvent('VEHICLE_MAINTENANCE', {
      vehicleId,
      description,
      maintenanceId: maintenance.id,
    });
    return maintenance;
  },

  assignVehicleToDriver: async (driverId: number, vehicleId: number): Promise<BackendVehicle> => {
    const data = await requestWithFallback<unknown>([
      () => fetch(`${BASE_URL}/admin/drivers/${driverId}/vehicle/${vehicleId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      }),
      () => fetch(`${BASE_URL}/admin/drivers/${driverId}/vehicle/${vehicleId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      }),
    ]);

    const vehicle = normalizeVehicle(data);
    await safeRecordBlockchainEvent('VEHICLE_ASSIGN', {
      vehicleId,
      driverId,
    });
    return vehicle;
  },

  unassignVehicleFromDriver: async (driverId: number, vehicleId: number): Promise<void> => {
    const data = await requestWithFallback<void | unknown>([
      () => fetch(`${BASE_URL}/admin/drivers/${driverId}/vehicle/${vehicleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }),
      () => fetch(`${BASE_URL}/admin/vehicles/${vehicleId}/driver/${driverId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }),
    ]);

    await safeRecordBlockchainEvent('VEHICLE_UNASSIGN', {
      vehicleId,
      driverId,
    });
    return data as void;
  },

  deleteVehicle: async (vehicleId: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/admin/vehicles/${vehicleId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const response = await handleResponse<void>(res);
    await safeRecordBlockchainEvent('VEHICLE_DELETE', {
      vehicleId,
    });
    return response;
  },

  assignVehicleToDriverByPlate: async (plateNumber: string, driverId: number): Promise<BackendVehicle> => {
    const vehicles = await adminApi.getVehicles();
    const matchedVehicle = vehicles.find(
      vehicle => vehicle.plateNumber.trim().toLowerCase() === plateNumber.trim().toLowerCase(),
    );

    if (!matchedVehicle) {
      throw { status: 404, message: `Vehicle with plate ${plateNumber} was not found.` };
    }

    return adminApi.assignVehicleToDriver(driverId, matchedVehicle.id);
  },
};
