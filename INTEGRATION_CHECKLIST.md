# RideFlow Frontend - Backend Integration Checklist

## ✅ COMPLETED ITEMS

### Core Configuration
- [x] **Vite Port Fixed** - Changed from 8080 to 5173
- [x] **Vite Proxy Added** - /api routes proxied to localhost:8080
- [x] **API Base URL** - Uses `/api` in development, full URL in production
- [x] **Authentication Context** - Full JWT auth flow with role-based redirects
- [x] **Types & Interfaces** - All DTOs properly defined
- [x] **Error Handling** - API error handler with 401 logout

### API Methods (Already Implemented)
- [x] **Auth API** - login, registerCustomer, registerDriver, registerDispatcher, registerAdmin
- [x] **Rides API** - getAll, create, assignDriver, updateStatus
- [x] **Drivers API** - getAll, create, toggleAvailability
- [x] **Dispatcher API** - createRide, assignDriver, autoAssign
- [x] **Admin API** - getVehicles, addVehicle, addMaintenance

### Components (Basic Structure)
- [x] **LoginPage** - Full login form with error handling
- [x] **RegisterPage** - Role selection and registration
- [x] **ProtectedRoute** - Redirects unauthenticated users
- [x] **AppLayout** - Main app layout with sidebar
- [x] **AppSidebar** - Navigation based on role

---

## 🚧 IN PROGRESS / TODO ITEMS

### High Priority - Core Features

#### 1. Admin Dashboard - User Management
**File**: `src/pages/admin/AdminUsersPage.tsx`

```typescript
// Features needed:
// - [ ] List all users (GET endpoint needed in backend)
// - [ ] Show user email, role, registration date
// - [ ] Approve/reject pending users (endpoints needed)
// - [ ] Delete user
// - [ ] Filter by role (CUSTOMER, DRIVER, DISPATCHER)
// - [ ] Search users by email

// Backend endpoints needed:
// GET /admin/users → List all users
// PATCH /admin/users/{userId}/approve → Approve user
// DELETE /admin/users/{userId} → Delete user
```

#### 2. Admin Dashboard - Driver Management
**File**: `src/pages/admin/AdminDriversPage.tsx`

**Features**:
- [ ] List all drivers with status
- [ ] Show driver: ID, license number, availability status
- [ ] Toggle driver availability
- [ ] View driver's current/past rides
- [ ] Delete driver profile

**API**:
```typescript
// Use existing endpoints:
driversApi.getAll()
driversApi.toggleAvailability(driverId, available)

// Also implement:
GET /drivers/{driverId} → Get single driver
DELETE /drivers/{driverId} → Delete driver
```

#### 3. Admin Dashboard - Vehicle Management
**File**: `src/pages/admin/AdminVehiclesPage.tsx`

**Features**:
- [ ] List all vehicles with status (ACTIVE, INACTIVE, MAINTENANCE)
- [ ] Add new vehicle (plateNumber, model, status)
- [ ] Edit vehicle details
- [ ] Delete vehicle
- [ ] View maintenance history
- [ ] Add maintenance record
- [ ] Update vehicle status

**API**:
```typescript
// Use existing:
adminApi.getVehicles()
adminApi.addVehicle(plateNumber, model, status)
adminApi.addMaintenance(vehicleId, description)

// Implement missing:
PATCH /admin/vehicles/{vehicleId} → Update vehicle
DELETE /admin/vehicles/{vehicleId} → Delete vehicle
```

#### 4. Admin Dashboard - Dispatcher Management
**File**: `src/pages/admin/AdminDispatchersPage.tsx`

**Features**:
- [ ] List all dispatchers
- [ ] Add new dispatcher
- [ ] Remove dispatcher
- [ ] View dispatcher's created rides
- [ ] View dispatcher's assignments

**API** (Backend needs to implement):
```
GET /admin/dispatchers → List all dispatchers
POST /admin/dispatchers → Create new dispatcher
DELETE /admin/dispatchers/{dispatcherId} → Delete dispatcher
GET /admin/dispatchers/{dispatcherId}/rides → Get dispatcher's rides
```

---

### High Priority - Ride Management

#### 5. Admin Dashboard - Rides Management
**File**: `src/pages/admin/AdminRidesPage.tsx`

**Features**:
- [ ] List all rides in the system
- [ ] Filter by status (PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED)
- [ ] Show: ride ID, pickup, dropoff, status, driver, customer
- [ ] Assign driver manually
- [ ] Update ride status
- [ ] Cancel ride
- [ ] View ride details

**API**:
```typescript
// Use existing:
ridesApi.getAll()
ridesApi.assignDriver(rideId, driverId)
ridesApi.updateStatus(rideId, status)

// Implement missing:
GET /rides/{rideId} → Get single ride details
DELETE /rides/{rideId} → Cancel ride
```

#### 6. Dispatcher Dashboard
**File**: `src/pages/dashboards/DispatcherDashboard.tsx` (EXISTS, NEEDS IMPLEMENTATION)

**Features**:
- [ ] Dashboard overview with ride statistics
- [ ] Create new ride
- [ ] List pending rides
- [ ] Manual driver assignment with driver list
- [ ] Auto-assign to next available driver
- [ ] View ride status updates in real-time
- [ ] Update ride status

**Implementation**:
```typescript
import { dispatcherApi, ridesApi, driversApi } from '@/services/api';

export const DispatcherDashboard = () => {
  // 1. Fetch all rides
  const [rides, setRides] = useState<BackendRide[]>([]);
  
  // 2. Fetch all available drivers
  const [drivers, setDrivers] = useState<BackendDriver[]>([]);
  
  // 3. Show pending rides
  const pendingRides = rides.filter(r => r.status === 'PENDING');
  
  // 4. Handle manual assignment
  // 5. Handle auto-assign
};
```

#### 7. Driver Dashboard
**File**: `src/pages/dashboards/DriverDashboard.tsx` (EXISTS, NEEDS IMPLEMENTATION)

**Features**:
- [ ] Show driver profile (license, availability status)
- [ ] List assigned/in-progress rides
- [ ] Accept ride (update status to IN_PROGRESS)
- [ ] Complete ride (update status to COMPLETED)
- [ ] Toggle availability
- [ ] View ride history
- [ ] Earnings/stats

**Implementation**:
```typescript
export const DriverDashboard = () => {
  // Get authenticated driver's ID
  // Fetch rides where driverId = my ID
  // Filter by status (ASSIGNED, IN_PROGRESS, COMPLETED)
  // Allow driver to update ride status
  // Toggle own availability
};
```

#### 8. Customer/User Dashboard
**File**: `src/pages/dashboards/UserDashboard.tsx` (EXISTS, NEEDS IMPLEMENTATION)

**Features**:
- [ ] Create new ride (pickup, dropoff, scheduled time)
- [ ] List my rides (with status)
- [ ] Track ride in real-time
- [ ] Cancel pending ride
- [ ] Rate/review completed ride (optional)
- [ ] View ride history

**Implementation**:
```typescript
export const UserDashboard = () => {
  // 1. Form to create ride
  // 2. List user's rides
  // 3. Show ride details with status
  // 4. Update status or cancel
};
```

---

### Medium Priority - UI Components

#### 9. Ride Card Component
**Location**: `src/components/RideCard.tsx` (possibly exists)

**Features**:
- [ ] Display ride info: pickup, dropoff, status, driver
- [ ] Show date/time
- [ ] Status badge with color
- [ ] Action buttons based on user role

#### 10. Driver List Component
**Location**: `src/components/DriverList.tsx`

**Features**:
- [ ] Table of drivers
- [ ] License number, availability status
- [ ] Quick actions (assign, toggle, delete)
- [ ] Filter by availability

#### 11. Vehicle Table Component
**Location**: `src/components/VehicleTable.tsx`

**Features**:
- [ ] Table of vehicles
- [ ] Plate number, model, status
- [ ] Quick actions (edit, delete, add maintenance)
- [ ] Maintenance history expandable

---

### Low Priority - Polish & Optimization

#### 12. Real-time Updates (Socket.io or Polling)
- [ ] Subscribe to ride status changes
- [ ] Driver availability updates
- [ ] Vehicle maintenance notifications

#### 13. Authentication Enhancements
- [ ] Email verification (optional)
- [ ] Password reset (optional)
- [ ] Two-factor authentication (optional)
- [ ] User approval workflow for drivers

#### 14. Advanced Features
- [ ] Map integration for ride tracking
- [ ] Notifications (push/email)
- [ ] Analytics dashboard
- [ ] Export reports

---

## Implementation Priority Order

**Phase 1 (This Week)** - Get backend and frontend communicating:
1. Test login - DONE
2. Implement RideCard component
3. Implement AdminRidesPage
4. Implement DispatcherDashboard

**Phase 2 (Next Week)** - Core admin features:
5. AdminDriversPage
6. AdminVehiclesPage
7. AdminUsersPage (backend needs GET /admin/users)

**Phase 3 (Following Week)** - User-facing features:
8. UserDashboard (customer)
9. DriverDashboard
10. Create ride workflow

---

## Backend Endpoints Status

### ✅ Implemented & Ready
- POST /auth/login
- POST /auth/register (all roles)
- GET /rides
- POST /rides
- POST /rides/{rideId}/assign/{driverId}
- PATCH /rides/{rideId}/status
- GET /drivers
- POST /drivers
- PATCH /drivers/{driverId}/availability
- POST /dispatcher/rides
- POST /dispatcher/rides/{rideId}/assign/{driverId}
- POST /dispatcher/rides/{rideId}/auto-assign
- GET /admin/vehicles
- POST /admin/vehicles
- POST /admin/vehicles/{vehicleId}/maintenance

### ⏳ Need to Implement in Backend
- GET /admin/users (list all users)
- PATCH /admin/users/{userId}/approve
- DELETE /admin/users/{userId}
- GET /admin/dispatchers
- POST /admin/dispatchers
- DELETE /admin/dispatchers/{dispatcherId}
- GET /rides/{rideId}
- DELETE /rides/{rideId}
- GET /drivers/{driverId}
- DELETE /drivers/{driverId}
- PATCH /admin/vehicles/{vehicleId}
- DELETE /admin/vehicles/{vehicleId}

---

## Testing Checklist

### Manual Testing (Each Feature)
- [ ] Login with different roles → correct dashboard redirect
- [ ] Create ride as customer → appears in ride list
- [ ] Dispatcher creates ride → appears in dispatcher list
- [ ] Assign driver → ride status changes to ASSIGNED
- [ ] Auto-assign → picks first available driver
- [ ] Toggle driver availability → affects assignment availability
- [ ] Update ride status → completes ride and frees driver
- [ ] Add vehicle → appears in vehicle list
- [ ] Add maintenance → appears in maintenance history

### Error Testing
- [ ] Login with wrong password → 401 error
- [ ] Create ride without auth token → 401 error
- [ ] Assign unavailable driver → 400 error
- [ ] Invalid status value → 400 error

---

## Code Templates Ready to Use

### Template 1: Admin Page with Buttons & Table
```typescript
// Copy to: src/pages/admin/AdminVehiclesPage.tsx
import { useState, useEffect } from 'react';
import { adminApi, driversApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { BackendVehicle } from '@/types';

export const AdminVehiclesPage = () => {
  const [vehicles, setVehicles] = useState<BackendVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const data = await adminApi.getVehicles();
      setVehicles(data);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Vehicle Management</h1>
      
      <div className="grid grid-cols-1 gap-4">
        {vehicles.map(vehicle => (
          <Card key={vehicle.id} className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{vehicle.model}</h3>
                <p className="text-sm text-muted-foreground">{vehicle.plateNumber}</p>
              </div>
              <span className="badge">{vehicle.status}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
```

### Template 2: Driver Assignment Component
```typescript
// In any dashboard where you need to assign drivers
const [drivers, setDrivers] = useState<BackendDriver[]>([]);
const [selectedDriver, setSelectedDriver] = useState<number | null>(null);

useEffect(() => {
  const loadAvailableDrivers = async () => {
    const allDrivers = await driversApi.getAll();
    // Filter available drivers
    const available = allDrivers.filter(d => d.isAvailable);
    setDrivers(available);
  };
  loadAvailableDrivers();
}, []);

const assignDriver = async (rideId: number) => {
  if (!selectedDriver) return;
  try {
    const updated = await ridesApi.assignDriver(rideId, selectedDriver);
    toast({ title: 'Success', description: 'Driver assigned' });
    // Update UI
  } catch (err: any) {
    toast({ title: 'Error', description: err.message, variant: 'destructive' });
  }
};
```

---

## Files to Create Next

1. **src/pages/admin/AdminUsersPage.tsx** - User management
2. **src/pages/admin/AdminDispatchersPage.tsx** - Dispatcher management
3. **src/components/RideCard.tsx** - Reusable ride card
4. **src/components/DriverTable.tsx** - Driver list table
5. Update **src/pages/dashboards/DispatcherDashboard.tsx**
6. Update **src/pages/dashboards/DriverDashboard.tsx**
7. Update **src/pages/dashboards/UserDashboard.tsx**

---

## Git Commit Message Template

```
[Feature] Implement {FeatureName}

- Add {Component} with {Functionality}
- Integrate {APIEndpoint} endpoint
- Add error handling and loading states
- Update UI with real data from backend

Closes: #{IssueNumber}
```

---

## Quick Commands

```bash
# Install dependencies
npm install

# Start dev servers
npm run dev              # Frontend on 5173
mvn spring-boot:run     # Backend on 8080

# Build for production
npm run build

# Type check
npm run lint

# Run tests
npm run test
```

---

## Questions / Issues?

1. **Backend endpoint missing?** → Add to Spring Boot controller
2. **Frontend type mismatch?** → Update DTOs in `src/types/index.ts`
3. **API call failing?** → Check Network tab in DevTools, verify endpoint path
4. **Authentication failing?** → Check token in localStorage, verify JWT is valid

---

**Status**: ✅ Ready to build features!  
**Last Updated**: April 15, 2026  
**Next Milestone**: Implement first admin page (AdminRidesPage)
