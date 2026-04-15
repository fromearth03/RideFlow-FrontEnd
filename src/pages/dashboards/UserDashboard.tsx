import { useEffect, useState } from 'react';
import { Car, MapPin, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ridesApi } from '@/services/api';
import type { BackendRide } from '@/types';

export const UserDashboard = () => {
  const [rides, setRides] = useState<BackendRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    ridesApi.getAll()
      .then(setRides)
      .catch(() => setError('Failed to load rides.'))
      .finally(() => setLoading(false));
  }, []);

  const activeRides = rides.filter(r => ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(r.status));
  const completedRides = rides.filter(r => r.status === 'COMPLETED');

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">My Dashboard</h1>
          <p className="text-sm text-muted-foreground">Here's an overview of your rides.</p>
        </div>
        <Button asChild>
          <Link to="/rides/new"><MapPin className="h-4 w-4 mr-1" /> Book a Ride</Link>
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Rides" value={rides.length} icon={Car} />
        <StatCard title="Active" value={activeRides.length} icon={MapPin} />
        <StatCard title="Completed" value={completedRides.length} icon={CheckCircle} />
        <StatCard title="Pending" value={rides.filter(r => r.status === 'PENDING').length} icon={Clock} />
      </div>

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
              </tr>
            </thead>
            <tbody>
              {rides.slice(0, 5).map(r => (
                <tr key={r.id}>
                  <td className="text-muted-foreground font-mono text-xs">#{r.id}</td>
                  <td className="font-medium">{r.pickupLocation}</td>
                  <td className="text-muted-foreground">{r.dropLocation}</td>
                  <td>
                    <span className={`status-badge status-${r.status.toLowerCase().replace('_', '-')}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {rides.length === 0 && (
                <tr><td colSpan={4} className="text-center text-muted-foreground py-6">No rides yet. <Link to="/rides/new" className="text-primary hover:underline">Book your first ride!</Link></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
