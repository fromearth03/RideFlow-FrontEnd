// Backend role strings as returned by the API
export type UserRole = 'ROLE_CUSTOMER' | 'ROLE_DRIVER' | 'ROLE_DISPATCHER' | 'ROLE_ADMIN';

// Backend ride status strings (uppercase)
export type RideStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// Auth state stored locally
export interface AuthUser {
  id?: number | null;
  email: string;
  role: UserRole;
  approved: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Backend DTO shapes
export interface BackendRide {
  id: number;
  pickupLocation: string;
  dropLocation: string;
  status: RideStatus;
  driverId: number | null;
  inter_city?: boolean;
  interCity?: boolean;
  fare?: number | null;
  scheduledTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendDriver {
  id: number;
  userId?: number | null;
  email?: string;
  licenseNumber: string;
  isAvailable: boolean;
  approved?: boolean;
  vehicleIds?: number[];
  vehicleModels?: Array<string | null>;
  vehicleStatuses?: Array<string | null>;
}

export interface BackendDispatcher {
  id: number;
  email: string;
  approved: boolean;
}

export interface BackendCustomer {
  id: number;
  userId?: number | null;
  email: string;
  phoneNumber?: string | null;
}

export interface BackendUser {
  id: number;
  email: string;
  role: UserRole;
}

export interface BackendVehicle {
  id: number;
  plateNumber: string;
  model: string;
  status: string; // ACTIVE | INACTIVE | MAINTENANCE
  driverId?: number | null;
  assignedDriverId?: number | null;
  driverEmail?: string | null;
  assignedDriverEmail?: string | null;
  driverName?: string | null;
  assignedDriverName?: string | null;
}

export interface BackendMaintenanceRecord {
  id: number;
  vehicle: BackendVehicle;
  description: string;
  date: string;
}

export interface AuthResponse {
  token: string;
  role: UserRole;
  approved?: boolean;
  userId?: number | null;
}

export interface ApiError {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  errors?: Record<string, string>;
}
