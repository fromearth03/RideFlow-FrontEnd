import { useEffect, useState } from 'react';
import { Car, Users, Truck, Activity } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { ridesApi, adminApi } from '@/services/api';
import type { BackendRide, BackendDriver, BackendVehicle } from '@/types';
import { Loader2 } from 'lucide-react';

export const AdminDashboard = () => {
  const [rides, setRides] = useState<BackendRide[]>([]);
  const [drivers, setDrivers] = useState<BackendDriver[]>([]);
  const [vehicles, setVehicles] = useState<BackendVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const [ridesResult, driversResult, vehiclesResult] = await Promise.allSettled([
        ridesApi.getAll(),
        adminApi.getDrivers(),
        adminApi.getVehicles(),
      ]);

      if (ridesResult.status === 'fulfilled') {
        setRides(ridesResult.value);
      }

      if (driversResult.status === 'fulfilled') {
        setDrivers(driversResult.value);
      }

      if (vehiclesResult.status === 'fulfilled') {
        setVehicles(vehiclesResult.value);
      }

      const failures = [ridesResult, driversResult, vehiclesResult].filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        const firstFailure = failures[0] as PromiseRejectedResult;
        const reason = firstFailure.reason as { message?: string };
        setError(reason?.message || 'Some dashboard data failed to load.');
      } else {
        setError('');
      }

      setLoading(false);
    };
    load();
  }, []);

  const activeRides = rides.filter(r => r.status === 'IN_PROGRESS' || r.status === 'ASSIGNED');
  const availableDrivers = drivers.filter(d => d.isAvailable);
  const recentRides = [...rides]
    .sort((left, right) => {
      const leftRide = left as BackendRide & { timestamp?: string; createdAt?: string; scheduledTime?: string };
      const rightRide = right as BackendRide & { timestamp?: string; createdAt?: string; scheduledTime?: string };

      const leftTime = new Date(leftRide.timestamp ?? leftRide.createdAt ?? leftRide.scheduledTime ?? 0).getTime();
      const rightTime = new Date(rightRide.timestamp ?? rightRide.createdAt ?? rightRide.scheduledTime ?? 0).getTime();

      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }

      return right.id - left.id;
    })
    .slice(0, 8);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">System overview and management.</p>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Rides" value={rides.length} icon={Car} />
        <StatCard title="Active Now" value={activeRides.length} icon={Activity} />
        <StatCard title="Available Drivers" value={availableDrivers.length} icon={Users} />
        <StatCard title="Vehicles" value={vehicles.length} icon={Truck} />
      </div>

      {/* Recent rides */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Recent Rides</h2>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Pickup</th>
                <th>Drop-off</th>
                <th>Fare (PKR)</th>
                <th>Status</th>
                <th>Driver ID</th>
              </tr>
            </thead>
            <tbody>
              {recentRides.map(r => (
                <tr key={r.id}>
                  <td className="text-muted-foreground font-mono text-xs">#{r.id}</td>
                  <td className="font-medium">{r.pickupLocation}</td>
                  <td className="text-muted-foreground">{r.dropLocation}</td>
                  <td className="text-muted-foreground">{r.fare !== undefined && r.fare !== null ? `PKR ${Number(r.fare).toLocaleString()}` : '—'}</td>
                  <td>
                    <span className={`status-badge status-${r.status.toLowerCase().replace('_', '-')}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="text-muted-foreground">{r.driverId ?? '—'}</td>
                </tr>
              ))}
              {recentRides.length === 0 && (
                <tr><td colSpan={6} className="text-center text-muted-foreground py-6">No rides yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drivers overview */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Driver Overview</h2>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver ID</th>
                <th>License Number</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(d => (
                <tr key={d.id}>
                  <td className="text-muted-foreground font-mono text-xs">#{d.id}</td>
                  <td className="font-medium font-mono text-sm">{d.licenseNumber}</td>
                  <td>
                    <span className={`status-badge ${d.isAvailable ? 'status-completed' : 'status-pending'}`}>
                      {d.isAvailable ? 'Available' : 'Busy'}
                    </span>
                  </td>
                </tr>
              ))}
              {drivers.length === 0 && (
                <tr><td colSpan={3} className="text-center text-muted-foreground py-6">No drivers yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
