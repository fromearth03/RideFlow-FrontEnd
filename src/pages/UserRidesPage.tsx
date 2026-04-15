import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { ridesApi } from '@/services/api';
import type { BackendRide } from '@/types';

const UserRidesPage = () => {
  const [rides, setRides] = useState<BackendRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await ridesApi.getAll();
      setRides(data);
    } catch {
      setError('Failed to load rides.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">My Rides</h1>
            <p className="text-sm text-muted-foreground">View all your ride bookings.</p>
          </div>
          <Button asChild>
            <Link to="/rides/new"><Plus className="h-4 w-4 mr-1" /> Book a Ride</Link>
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {error && <p className="text-destructive text-sm">{error}</p>}

        {!loading && !error && (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Pickup</th>
                  <th>Drop-off</th>
                  <th>Status</th>
                  <th>Driver</th>
                </tr>
              </thead>
              <tbody>
                {rides.map(r => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs text-muted-foreground">#{r.id}</td>
                    <td className="font-medium">{r.pickupLocation}</td>
                    <td className="text-muted-foreground">{r.dropLocation}</td>
                    <td>
                      <span className={`status-badge status-${r.status.toLowerCase().replace('_', '-')}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="text-muted-foreground">{r.driverId ? `#${r.driverId}` : '—'}</td>
                  </tr>
                ))}
                {rides.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted-foreground py-6">
                      No rides yet.{' '}
                      <Link to="/rides/new" className="text-primary hover:underline">Book your first ride!</Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default UserRidesPage;
