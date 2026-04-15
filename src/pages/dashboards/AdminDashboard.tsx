import { useEffect, useState } from 'react';
import { Car, Users, Truck, Activity } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { ridesApi, driversApi, adminApi } from '@/services/api';
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
      try {
        const [r, d, v] = await Promise.all([
          ridesApi.getAll(),
          driversApi.getAll(),
          adminApi.getVehicles(),
        ]);
        setRides(r);
        setDrivers(d);
        setVehicles(v);
      } catch {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeRides = rides.filter(r => r.status === 'IN_PROGRESS' || r.status === 'ASSIGNED');
  const availableDrivers = drivers.filter(d => d.isAvailable);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (error) return <p className="text-destructive py-8">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">System overview and management.</p>
      </div>

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
                <th>Status</th>
                <th>Driver ID</th>
              </tr>
            </thead>
            <tbody>
              {rides.slice(0, 8).map(r => (
                <tr key={r.id}>
                  <td className="text-muted-foreground font-mono text-xs">#{r.id}</td>
                  <td className="font-medium">{r.pickupLocation}</td>
                  <td className="text-muted-foreground">{r.dropLocation}</td>
                  <td>
                    <span className={`status-badge status-${r.status.toLowerCase().replace('_', '-')}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="text-muted-foreground">{r.driverId ?? '—'}</td>
                </tr>
              ))}
              {rides.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-6">No rides yet.</td></tr>
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
