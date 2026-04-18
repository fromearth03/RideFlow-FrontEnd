import { useEffect, useState, useCallback } from 'react';
import { Car, CheckCircle, Clock, Loader2, Truck } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { ridesApi, driversApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { BackendRide, BackendVehicle } from '@/types';

export const DriverDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rides, setRides] = useState<BackendRide[]>([]);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [assignedVehicles, setAssignedVehicles] = useState<BackendVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRides = useCallback(async () => {
    try {
      const [all, drivers] = await Promise.all([ridesApi.getAll(), driversApi.getAll()]);
      const currentDriver = drivers.find(driver => driver.email?.toLowerCase() === user?.email?.toLowerCase());
      setRides(all);
      setDriverId(currentDriver?.id ?? null);

      if (currentDriver) {
        const dtoVehicleIds = currentDriver.vehicleIds ?? [];
        const dtoVehicleModels = currentDriver.vehicleModels ?? [];
        const dtoVehicleStatuses = currentDriver.vehicleStatuses ?? [];
        const itemCount = Math.max(dtoVehicleIds.length, dtoVehicleModels.length, dtoVehicleStatuses.length);

        const vehicles: BackendVehicle[] = Array.from({ length: itemCount }, (_, index) => {
          const vehicleId = dtoVehicleIds[index] ?? -(index + 1);
          const model = dtoVehicleModels[index]?.trim() ?? '';
          const status = dtoVehicleStatuses[index]?.trim() ?? 'INACTIVE';

          return {
            id: vehicleId,
            plateNumber: dtoVehicleIds[index] ? `Vehicle #${dtoVehicleIds[index]}` : 'Assigned vehicle',
            model,
            status,
          };
        });

        setAssignedVehicles(vehicles);
      } else {
        setAssignedVehicles([]);
      }
    } catch {
      setError('Failed to load rides.');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => { loadRides(); }, [loadRides]);

  const hasAssignedVehicle = assignedVehicles.length > 0;
  const hasOperableVehicle = assignedVehicles.some(vehicle => {
    const normalized = (vehicle.status ?? '').trim().toUpperCase();
    return normalized === 'ACTIVE';
  });

  const updateStatus = async (rideId: number, status: string) => {
    if (!hasAssignedVehicle && status === 'IN_PROGRESS') {
      toast({
        title: 'Vehicle assignment required',
        description: 'You need an assigned vehicle before starting a ride.',
        variant: 'destructive',
      });
      return;
    }

    if (!hasOperableVehicle) {
      toast({
        title: 'Action blocked',
        description: 'Your assigned vehicle is disabled. Contact dispatch/admin.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const updated = await ridesApi.updateStatus(rideId, status);
      setRides(prev => prev.map(r => r.id === updated.id ? updated : r));
      toast({ title: 'Ride updated', description: `Ride #${rideId} marked as ${status.replace('_', ' ')}.` });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Update failed', description: e?.message || 'Could not update ride.', variant: 'destructive' });
    }
  };

  const myRides = driverId === null ? [] : rides.filter(r => r.driverId === driverId);
  const assignedRides = hasOperableVehicle
    ? myRides.filter(r => ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(r.status))
    : [];
  const activeRides = assignedRides.filter(r => ['ASSIGNED', 'IN_PROGRESS'].includes(r.status));
  const completed = assignedRides.filter(r => r.status === 'COMPLETED');

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
        <StatCard title="Total Assigned" value={assignedRides.length} icon={Clock} />
      </div>

      {user?.approved && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Assigned Vehicles</h2>
          </div>

          <p className="text-sm text-muted-foreground">
            This list is derived using the same assignment mapping logic as the admin drivers panel.
          </p>

          {!hasAssignedVehicle && (
            <p className="text-xs text-destructive">
              You must have at least one assigned vehicle to start rides.
            </p>
          )}

          {hasAssignedVehicle && !hasOperableVehicle && (
            <p className="text-xs text-destructive">
              All assigned vehicles are disabled. You cannot view or accept rides until a vehicle is enabled.
            </p>
          )}

          {assignedVehicles.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">Currently Assigned Vehicles</p>
              {assignedVehicles.map(vehicle => (
                <p key={vehicle.id} className="text-xs text-muted-foreground">
                  {`Vehicle: ${vehicle.plateNumber}`}
                  {` · Model: ${vehicle.model?.trim() || 'Not set yet'}`}
                  {` · Status: ${vehicle.status || 'ACTIVE'}`}
                </p>
              ))}
            </div>
          )}

        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Assigned Rides</h2>
        <div className="space-y-3">
          {!hasOperableVehicle && hasAssignedVehicle && (
            <p className="text-muted-foreground text-sm py-6 text-center">Rides are hidden because your assigned vehicle is disabled.</p>
          )}
          {assignedRides.length === 0 && (hasOperableVehicle || !hasAssignedVehicle) && (
            <p className="text-muted-foreground text-sm py-6 text-center">No rides assigned yet.</p>
          )}
          {assignedRides.map(ride => (
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
                    <Button size="sm" onClick={() => updateStatus(ride.id, 'IN_PROGRESS')} disabled={!hasAssignedVehicle}>Start Ride</Button>
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
