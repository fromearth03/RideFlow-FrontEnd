import { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { ridesApi, driversApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { BackendRide, BackendVehicle } from '@/types';
import { addRideRequest, hasRideRequest } from '@/lib/rideAssignmentRequests';

const DriverRidesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rides, setRides] = useState<BackendRide[]>([]);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestingRideId, setRequestingRideId] = useState<number | null>(null);
  const [assignedVehicles, setAssignedVehicles] = useState<BackendVehicle[]>([]);

  const isVehicleOperable = (status: string | null | undefined): boolean => {
    const normalized = (status ?? '').trim().toUpperCase();
    if (!normalized) return true;

    if (['INACTIVE', 'DISABLED', 'DISABLE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'BLOCKED', 'SUSPENDED', 'FALSE', '0'].includes(normalized)) {
      return false;
    }

    if (['ACTIVE', 'ENABLED', 'ENABLE', 'AVAILABLE', 'READY', 'OPERABLE', 'TRUE', '1'].includes(normalized)) {
      return true;
    }

    return true;
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allRides, drivers] = await Promise.all([ridesApi.getAll(), driversApi.getAll()]);
      const currentDriver = drivers.find(driver => driver.email?.toLowerCase() === user?.email?.toLowerCase());
      setDriverId(currentDriver?.id ?? null);
      if (currentDriver) {
        const dtoVehicleIds = currentDriver.vehicleIds ?? [];
        const dtoVehicleModels = currentDriver.vehicleModels ?? [];
        const dtoVehicleStatuses = currentDriver.vehicleStatuses ?? [];
        const itemCount = Math.max(dtoVehicleIds.length, dtoVehicleModels.length, dtoVehicleStatuses.length);

        const vehicles: BackendVehicle[] = Array.from({ length: itemCount }, (_, index) => {
          const vehicleId = dtoVehicleIds[index] ?? -(index + 1);
          const model = dtoVehicleModels[index]?.trim() ?? '';
          const status = dtoVehicleStatuses[index]?.trim() ?? 'ACTIVE';

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
      setRides(allRides);
      setError('');
    } catch {
      setError('Failed to load incoming rides.');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hasAssignedVehicle = assignedVehicles.length > 0;
  const hasOperableVehicle = assignedVehicles.some(vehicle => isVehicleOperable(vehicle.status));

  const requestAssignment = async (rideId: number) => {
    if (!driverId) {
      toast({
        title: 'Driver profile missing',
        description: 'Your driver profile could not be identified. Please contact admin.',
        variant: 'destructive',
      });
      return;
    }

    if (!hasAssignedVehicle) {
      toast({
        title: 'Vehicle assignment required',
        description: 'You need an assigned vehicle before requesting rides.',
        variant: 'destructive',
      });
      return;
    }

    if (!hasOperableVehicle) {
      toast({
        title: 'Request blocked',
        description: 'All your assigned vehicles are inactive/disabled. Contact admin or dispatcher.',
        variant: 'destructive',
      });
      return;
    }

    if (hasRideRequest(rideId, driverId)) {
      toast({ title: 'Already requested', description: `You already requested ride #${rideId}.` });
      return;
    }

    setRequestingRideId(rideId);
    try {
      addRideRequest(rideId, driverId);
      toast({ title: 'Request sent', description: `Request submitted for ride #${rideId}.` });
    } finally {
      setRequestingRideId(null);
    }
  };

  const incomingRides = rides.filter(ride => ride.driverId === null && ride.status === 'PENDING');

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Incoming Rides</h1>
          <p className="text-sm text-muted-foreground">Only rides not assigned to any driver are shown here.</p>
          {!hasAssignedVehicle && (
            <p className="text-xs text-destructive mt-2">
              You cannot request rides until a vehicle is assigned to your driver profile.
            </p>
          )}
          {hasAssignedVehicle && !hasOperableVehicle && (
            <p className="text-xs text-destructive mt-2">
              All your assigned vehicles are inactive/disabled, so ride requests are blocked.
            </p>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && <p className="text-destructive py-4">{error}</p>}

        {!loading && !error && (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Pickup</th>
                  <th>Drop-off</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incomingRides.map(ride => {
                  const requested = driverId !== null && hasRideRequest(ride.id, driverId);
                  return (
                    <tr key={ride.id}>
                      <td className="font-mono text-xs text-muted-foreground">#{ride.id}</td>
                      <td className="font-medium">{ride.pickupLocation}</td>
                      <td className="text-muted-foreground">{ride.dropLocation}</td>
                      <td>
                        <span className={`status-badge status-${ride.status.toLowerCase().replace('_', '-')}`}>
                          {ride.status}
                        </span>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant={requested ? 'outline' : 'default'}
                          onClick={() => requestAssignment(ride.id)}
                          disabled={!hasAssignedVehicle || !hasOperableVehicle || requested || requestingRideId === ride.id}
                        >
                          {requestingRideId === ride.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-1" />
                          )}
                          {requested ? 'Requested' : 'Request Assignment'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {incomingRides.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted-foreground py-6">
                      No unassigned incoming rides right now.
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

export default DriverRidesPage;
