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

// Use /api proxy in development, full URL in production
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.rideflow.com'
  : '/api';

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
  const vehicleModels = vehicleModelsFromDto.length > 0 ? vehicleModelsFromDto : derivedVehicleModels;

  return {
    id: Number(record.id ?? 0),
    userId,
    email: String((record.email ?? user.email ?? '') || '') || undefined,
    licenseNumber: String(record.licenseNumber ?? record.license_number ?? ''),
    isAvailable: Boolean(record.isAvailable ?? record.is_available ?? record.available ?? false),
    approved: Boolean(record.approved ?? record.isApproved ?? record.is_approved ?? false),
    vehicleIds,
    vehicleModels,
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

  return {
    token,
    role: role as AuthResponse['role'],
    approved,
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
    return normalizeAuthResponse(data);
  },

  registerCustomer: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse<unknown>(res);
    return normalizeAuthResponse(data);
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
    return normalizeAuthResponse(data);
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
    return normalizeAuthResponse(data);
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
    return normalizeAuthResponse(data);
  },
};

// ─── Rides API ────────────────────────────────────────────────────────────────
export const ridesApi = {
  getAll: async (): Promise<BackendRide[]> => {
    const res = await fetch(`${BASE_URL}/rides`, { headers: getAuthHeaders() });
    return handleResponse<BackendRide[]>(res);
  },

  create: async (pickupLocation: string, dropLocation: string, scheduledTime: string): Promise<BackendRide> => {
    const res = await fetch(`${BASE_URL}/rides`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ pickupLocation, dropLocation, scheduledTime }),
    });
    return handleResponse<BackendRide>(res);
  },

  assignDriver: async (rideId: number, driverId: number): Promise<BackendRide> => {
    const res = await fetch(`${BASE_URL}/rides/${rideId}/assign/${driverId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<BackendRide>(res);
  },

  updateStatus: async (rideId: number, status: string): Promise<BackendRide> => {
    const res = await fetch(`${BASE_URL}/rides/${rideId}/status?status=${encodeURIComponent(status)}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse<BackendRide>(res);
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
    return handleResponse<BackendDriver>(res);
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
  createRide: async (pickupLocation: string, dropLocation: string, scheduledTime: string): Promise<BackendRide> => {
    const res = await fetch(`${BASE_URL}/dispatcher/rides`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ pickupLocation, dropLocation, scheduledTime }),
    });
    return handleResponse<BackendRide>(res);
  },

  assignDriver: async (rideId: number, driverId: number): Promise<BackendRide> => {
    const res = await fetch(`${BASE_URL}/dispatcher/rides/${rideId}/assign/${driverId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<BackendRide>(res);
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
    return handleResponse<BackendUser[]>(res);
  },

  deleteUser: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/admin/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<void>(res);
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
    return handleResponse<void>(res);
  },

  approveDriver: async (id: number): Promise<BackendDriver> => {
    const res = await fetch(`${BASE_URL}/admin/drivers/${id}/approve`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<unknown>(res);
    return normalizeDriver(data);
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
    return handleResponse<void>(res);
  },

  approveDispatcher: async (id: number): Promise<BackendDispatcher> => {
    const res = await fetch(`${BASE_URL}/admin/dispatchers/${id}/approve`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse<BackendDispatcher>(res);
  },

  getCustomers: async (): Promise<BackendCustomer[]> => {
    const res = await fetch(`${BASE_URL}/admin/customers`, { headers: getAuthHeaders() });
    return handleResponse<BackendCustomer[]>(res);
  },

  deleteCustomer: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/admin/customers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<void>(res);
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
    return handleResponse<BackendVehicle>(res);
  },

  disableVehicle: async (vehicleId: number): Promise<BackendVehicle> => {
    const res = await fetch(`${BASE_URL}/admin/vehicles/${vehicleId}/disable`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<unknown>(res);
    return normalizeVehicle(data);
  },

  enableVehicle: async (vehicleId: number): Promise<BackendVehicle> => {
    const res = await fetch(`${BASE_URL}/admin/vehicles/${vehicleId}/enable`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<unknown>(res);
    return normalizeVehicle(data);
  },

  addMaintenance: async (vehicleId: number, description: string): Promise<BackendMaintenanceRecord> => {
    const res = await fetch(`${BASE_URL}/admin/vehicles/${vehicleId}/maintenance`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ description }),
    });
    return handleResponse<BackendMaintenanceRecord>(res);
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

    return normalizeVehicle(data);
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

    return data as void;
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
