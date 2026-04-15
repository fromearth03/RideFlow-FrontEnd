import { useEffect, useState, useCallback } from 'react';
import { Car, CheckCircle, Clock, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { ridesApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import type { BackendRide } from '@/types';

export const DriverDashboard = () => {
  const { toast } = useToast();
  const [rides, setRides] = useState<BackendRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRides = useCallback(async () => {
    try {
      const all = await ridesApi.getAll();
      setRides(all);
    } catch {
      setError('Failed to load rides.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRides(); }, [loadRides]);

  const updateStatus = async (rideId: number, status: string) => {
    try {
      const updated = await ridesApi.updateStatus(rideId, status);
      setRides(prev => prev.map(r => r.id === updated.id ? updated : r));
      toast({ title: 'Ride updated', description: `Ride #${rideId} marked as ${status.replace('_', ' ')}.` });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Update failed', description: e?.message || 'Could not update ride.', variant: 'destructive' });
    }
  };

  const activeRides = rides.filter(r => ['ASSIGNED', 'IN_PROGRESS'].includes(r.status));
  const completed = rides.filter(r => r.status === 'COMPLETED');

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (error) return <p className="text-destructive py-8">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Driver Dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage your rides and status updates.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Active Rides" value={activeRides.length} icon={Car} />
        <StatCard title="Completed" value={completed.length} icon={CheckCircle} />
        <StatCard title="Total Assigned" value={rides.filter(r => r.status !== 'PENDING').length} icon={Clock} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Assigned Rides</h2>
        <div className="space-y-3">
          {rides.length === 0 && (
            <p className="text-muted-foreground text-sm py-6 text-center">No rides assigned yet.</p>
          )}
          {rides.map(ride => (
            <div key={ride.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-card-foreground">Ride #{ride.id}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Driver ID: {ride.driverId ?? 'Unassigned'}</p>
                </div>
                <span className={`status-badge status-${ride.status.toLowerCase().replace('_', '-')}`}>
                  {ride.status}
                </span>
              </div>
              <div className="text-sm space-y-1 mb-3">
                <p className="text-muted-foreground"><span className="font-medium text-card-foreground">From:</span> {ride.pickupLocation}</p>
                <p className="text-muted-foreground"><span className="font-medium text-card-foreground">To:</span> {ride.dropLocation}</p>
              </div>
              <div className="flex gap-2">
                {ride.status === 'ASSIGNED' && (
                  <>
                    <Button size="sm" onClick={() => updateStatus(ride.id, 'IN_PROGRESS')}>Start Ride</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(ride.id, 'CANCELLED')}>Reject</Button>
                  </>
                )}
                {ride.status === 'IN_PROGRESS' && (
                  <Button size="sm" onClick={() => updateStatus(ride.id, 'COMPLETED')}>Complete Ride</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
