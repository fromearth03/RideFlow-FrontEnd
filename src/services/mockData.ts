import type { User, Ride, Driver, Vehicle, DashboardStats } from '@/types';

export const mockUsers: User[] = [
  { id: 'u1', email: 'customer@rideflow.co.uk', name: 'James Wilson', role: 'user', phone: '+44 7700 100001', createdAt: '2024-11-01' },
  { id: 'u2', email: 'driver@rideflow.co.uk', name: 'Sarah Mitchell', role: 'driver', phone: '+44 7700 100002', createdAt: '2024-10-15' },
  { id: 'u3', email: 'dispatch@rideflow.co.uk', name: 'Emily Clarke', role: 'dispatcher', phone: '+44 7700 100003', createdAt: '2024-09-01' },
  { id: 'u4', email: 'admin@rideflow.co.uk', name: 'Robert Taylor', role: 'admin', phone: '+44 7700 100004', createdAt: '2024-08-01' },
  { id: 'u5', email: 'tom.baker@email.com', name: 'Tom Baker', role: 'user', phone: '+44 7700 100005', createdAt: '2024-12-01' },
  { id: 'u6', email: 'lisa.jones@email.com', name: 'Lisa Jones', role: 'user', phone: '+44 7700 100006', createdAt: '2025-01-10' },
];

export const mockDrivers: Driver[] = [
  { id: 'd1', name: 'Sarah Mitchell', email: 'sarah@rideflow.co.uk', phone: '+44 7700 200001', licenseNumber: 'MITC901234SM9AB', vehicleId: 'v1', available: true, rating: 4.8, totalRides: 342, createdAt: '2024-06-01' },
  { id: 'd2', name: 'Mark Thompson', email: 'mark@rideflow.co.uk', phone: '+44 7700 200002', licenseNumber: 'THOM850617MT1CD', vehicleId: 'v2', available: true, rating: 4.6, totalRides: 215, createdAt: '2024-07-15' },
  { id: 'd3', name: 'David Patel', email: 'david@rideflow.co.uk', phone: '+44 7700 200003', licenseNumber: 'PATE880320DP2EF', vehicleId: 'v3', available: false, rating: 4.9, totalRides: 501, createdAt: '2024-03-01' },
  { id: 'd4', name: 'Karen White', email: 'karen@rideflow.co.uk', phone: '+44 7700 200004', licenseNumber: 'WHIT920105KW3GH', available: true, rating: 4.7, totalRides: 178, createdAt: '2024-09-20' },
  { id: 'd5', name: 'Chris Evans', email: 'chris@rideflow.co.uk', phone: '+44 7700 200005', licenseNumber: 'EVAN870712CE4IJ', vehicleId: 'v4', available: false, rating: 4.5, totalRides: 290, createdAt: '2024-05-10' },
];

export const mockVehicles: Vehicle[] = [
  { id: 'v1', make: 'Mercedes-Benz', model: 'E-Class', year: 2023, registration: 'AB23 CDE', color: 'Black', capacity: 4, assignedDriverId: 'd1', status: 'active' },
  { id: 'v2', make: 'BMW', model: '5 Series', year: 2022, registration: 'FG22 HIJ', color: 'Silver', capacity: 4, assignedDriverId: 'd2', status: 'active' },
  { id: 'v3', make: 'Audi', model: 'A6', year: 2023, registration: 'KL23 MNO', color: 'Grey', capacity: 4, assignedDriverId: 'd3', status: 'active' },
  { id: 'v4', make: 'Mercedes-Benz', model: 'V-Class', year: 2022, registration: 'PQ22 RST', color: 'Black', capacity: 7, assignedDriverId: 'd5', status: 'active' },
  { id: 'v5', make: 'Tesla', model: 'Model S', year: 2024, registration: 'UV24 WXY', color: 'White', capacity: 4, status: 'maintenance' },
];

export const mockRides: Ride[] = [
  { id: 'r1', customerId: 'u1', customerName: 'James Wilson', driverId: 'd1', driverName: 'Sarah Mitchell', pickup: 'London Heathrow Airport, T5', dropoff: 'Manchester City Centre', scheduledAt: '2025-04-14T08:00:00Z', status: 'in_progress', fare: 285, distance: 210, createdAt: '2025-04-13T14:00:00Z', updatedAt: '2025-04-14T08:05:00Z' },
  { id: 'r2', customerId: 'u5', customerName: 'Tom Baker', driverId: 'd2', driverName: 'Mark Thompson', pickup: 'Birmingham New Street Station', dropoff: 'London Paddington', scheduledAt: '2025-04-14T10:30:00Z', status: 'assigned', fare: 195, distance: 130, createdAt: '2025-04-13T16:00:00Z', updatedAt: '2025-04-13T16:30:00Z' },
  { id: 'r3', customerId: 'u6', customerName: 'Lisa Jones', pickup: 'Bristol Temple Meads', dropoff: 'Cardiff Central', scheduledAt: '2025-04-14T14:00:00Z', status: 'pending', fare: 85, distance: 45, createdAt: '2025-04-14T06:00:00Z', updatedAt: '2025-04-14T06:00:00Z' },
  { id: 'r4', customerId: 'u1', customerName: 'James Wilson', driverId: 'd3', driverName: 'David Patel', pickup: 'Leeds Bradford Airport', dropoff: 'Sheffield City Centre', scheduledAt: '2025-04-13T16:00:00Z', status: 'completed', fare: 75, distance: 50, createdAt: '2025-04-12T20:00:00Z', updatedAt: '2025-04-13T17:15:00Z' },
  { id: 'r5', customerId: 'u5', customerName: 'Tom Baker', driverId: 'd1', driverName: 'Sarah Mitchell', pickup: 'Edinburgh Waverley', dropoff: 'Glasgow Central', scheduledAt: '2025-04-12T09:00:00Z', status: 'completed', fare: 95, distance: 70, createdAt: '2025-04-11T12:00:00Z', updatedAt: '2025-04-12T10:20:00Z' },
  { id: 'r6', customerId: 'u6', customerName: 'Lisa Jones', pickup: 'Gatwick Airport', dropoff: 'Brighton', scheduledAt: '2025-04-15T07:00:00Z', status: 'pending', distance: 30, createdAt: '2025-04-14T09:00:00Z', updatedAt: '2025-04-14T09:00:00Z' },
  { id: 'r7', customerId: 'u1', customerName: 'James Wilson', driverId: 'd5', driverName: 'Chris Evans', pickup: 'Liverpool Lime Street', dropoff: 'Manchester Piccadilly', scheduledAt: '2025-04-13T11:00:00Z', status: 'completed', fare: 55, distance: 35, createdAt: '2025-04-12T18:00:00Z', updatedAt: '2025-04-13T12:00:00Z' },
  { id: 'r8', customerId: 'u5', customerName: 'Tom Baker', pickup: 'Oxford', dropoff: 'Cambridge', scheduledAt: '2025-04-15T13:00:00Z', status: 'pending', distance: 160, createdAt: '2025-04-14T10:00:00Z', updatedAt: '2025-04-14T10:00:00Z' },
];

export const mockStats: DashboardStats = {
  totalRides: 1247,
  activeRides: 23,
  completedToday: 18,
  availableDrivers: 12,
  totalRevenue: 89450,
};

export const demoCredentials = {
  user: { email: 'customer@rideflow.co.uk', password: 'demo' },
  driver: { email: 'driver@rideflow.co.uk', password: 'demo' },
  dispatcher: { email: 'dispatch@rideflow.co.uk', password: 'demo' },
  admin: { email: 'admin@rideflow.co.uk', password: 'demo' },
};
