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
    const err = await res.json().catch(() => ({ message: `Error ${res.status}` }));
    // Preserve the full error object (may contain errors map or message)
    throw err;
  }
  // Handle empty 204 responses
  const text = await res.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthResponse>(res);
  },

  registerCustomer: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthResponse>(res);
  },

  registerDriver: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/register/driver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthResponse>(res);
  },

  registerDispatcher: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/register/dispatcher`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthResponse>(res);
  },

  registerAdmin: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/register/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthResponse>(res);
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
    return handleResponse<BackendDriver[]>(res);
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
    return handleResponse<BackendDriver>(res);
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
    return handleResponse<BackendDriver[]>(res);
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
    return handleResponse<BackendDriver>(res);
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
    return handleResponse<BackendVehicle[]>(res);
  },

  addVehicle: async (plateNumber: string, model: string, status: string): Promise<BackendVehicle> => {
    const res = await fetch(`${BASE_URL}/admin/vehicles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ plateNumber, model, status }),
    });
    return handleResponse<BackendVehicle>(res);
  },

  addMaintenance: async (vehicleId: number, description: string): Promise<BackendMaintenanceRecord> => {
    const res = await fetch(`${BASE_URL}/admin/vehicles/${vehicleId}/maintenance`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ description }),
    });
    return handleResponse<BackendMaintenanceRecord>(res);
  },
};
