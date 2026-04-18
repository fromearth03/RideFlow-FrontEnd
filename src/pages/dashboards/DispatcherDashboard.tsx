import { useEffect, useState, useCallback } from 'react';
import { Headphones, Car, Users, Clock, UserPlus, Zap, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ridesApi, driversApi, dispatcherApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { BackendRide, BackendDriver } from '@/types';
import { clearRideRequests, getAllRideRequests } from '@/lib/rideAssignmentRequests';

export const DispatcherDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rides, setRides] = useState<BackendRide[]>([]);
  const [drivers, setDrivers] = useState<BackendDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [assignDialog, setAssignDialog] = useState<BackendRide | null>(null);
  const [requestDialog, setRequestDialog] = useState<BackendRide | null>(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [rideRequests, setRideRequests] = useState<Record<number, number[]>>({});
  const canDispatch = user?.role === 'ROLE_DISPATCHER';

  const ensureDispatchRole = (): boolean => {
    if (canDispatch) return true;
    toast({
      title: 'Forbidden action',
      description: 'This action requires dispatcher permissions.',
      variant: 'destructive',
    });
    return false;
  };

  const loadData = useCallback(async () => {
    try {
      const [r, d] = await Promise.all([ridesApi.getAll(), driversApi.getAll()]);
      setRides(r);
      setDrivers(d);
      setRideRequests(getAllRideRequests());
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const inProgressDriverIds = new Set(
    rides.filter(ride => ride.status === 'IN_PROGRESS' && ride.driverId !== null).map(ride => ride.driverId as number),
  );

  const dispatchVisibleRides = rides.filter(ride => ride.status !== 'IN_PROGRESS');
  let filtered = dispatchVisibleRides;
  if (statusFilter !== 'all') {
    filtered = filtered.filter(r => r.status === statusFilter);
  }
  if (typeFilter === 'inter-city') {
    filtered = filtered.filter(r => r.inter_city === true);
  } else if (typeFilter === 'intra-city') {
    filtered = filtered.filter(r => r.inter_city === false || r.inter_city === undefined);
  }
  const pending = rides.filter(r => r.status === 'PENDING').length;
  const active = rides.filter(r => ['ASSIGNED', 'IN_PROGRESS'].includes(r.status)).length;

  const isOperableVehicleStatus = (status: string | null | undefined): boolean => {
    const normalized = (status ?? '').trim().toUpperCase();
    return normalized === 'ACTIVE';
  };

  const hasAssignedVehicle = (driver: BackendDriver): boolean => {
    const statuses = driver.vehicleStatuses ?? [];
    if (statuses.length === 0) return false;
    return statuses.some(status => isOperableVehicleStatus(status));
  };

  const isDriverEligibleForAssignment = (driver: BackendDriver): boolean => {
    return driver.isAvailable && !inProgressDriverIds.has(driver.id) && hasAssignedVehicle(driver);
  };

  const availableDrivers = drivers.filter(isDriverEligibleForAssignment);

  const assignDriver = async () => {
    if (!ensureDispatchRole()) return;
    if (!assignDialog || !selectedDriver) return;
    const selectedDriverId = Number(selectedDriver);
    const eligibleDriver = availableDrivers.find(driver => driver.id === selectedDriverId);
    if (!eligibleDriver) {
      toast({
        title: 'Assignment blocked',
        description: 'Selected driver is not eligible. Driver must be available and have at least one ACTIVE assigned vehicle.',
        variant: 'destructive',
      });
      return;
    }
    setAssigning(true);
    try {
      const updated = await dispatcherApi.assignDriver(assignDialog.id, selectedDriverId);
      setRides(prev => prev.map(r => r.id === updated.id ? updated : r));
      clearRideRequests(assignDialog.id);
      setRideRequests(getAllRideRequests());
      // Mark driver as unavailable in local state
      setDrivers(prev => prev.map(d => d.id === selectedDriverId ? { ...d, isAvailable: false } : d));
      toast({ title: 'Driver assigned', description: `Driver #${selectedDriver} assigned to ride #${assignDialog.id}.` });
      setAssignDialog(null);
      setSelectedDriver('');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Assignment failed', description: e?.message || 'Could not assign driver.', variant: 'destructive' });
    } finally {
      setAssigning(false);
    }
  };

  const autoAssign = async (rideId: number) => {
    if (!ensureDispatchRole()) return;
    try {
      const requestedDriverIds = rideRequests[rideId] ?? [];
      if (requestedDriverIds.length === 0) {
        toast({
          title: 'Auto-assign failed',
          description: 'No drivers have requested this ride yet.',
          variant: 'destructive',
        });
        return;
      }

      const requestedAvailableDriver = requestedDriverIds
        .map(requestedId => drivers.find(driver => driver.id === requestedId))
        .find((driver): driver is BackendDriver => !!driver && isDriverEligibleForAssignment(driver));

      if (!requestedAvailableDriver) {
        toast({
          title: 'Auto-assign failed',
          description: 'Requested drivers are not eligible (must be available and have at least one ACTIVE vehicle).',
          variant: 'destructive',
        });
        return;
      }

      const updated = await dispatcherApi.assignDriver(rideId, requestedAvailableDriver.id);

      setRides(prev => prev.map(r => r.id === updated.id ? updated : r));
      clearRideRequests(rideId);
      setRideRequests(getAllRideRequests());
      // Refresh drivers to get updated availability
      const d = await driversApi.getAll();
      setDrivers(d);
      toast({
        title: 'Auto-assigned',
        description: `Ride #${rideId} assigned to first requesting driver #${requestedAvailableDriver.id}.`,
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Auto-assign failed', description: e?.message || 'No available drivers.', variant: 'destructive' });
    }
  };

  const updateStatus = async (rideId: number, status: string) => {
    if (!ensureDispatchRole()) return;
    try {
      const updated = await ridesApi.updateStatus(rideId, status);
      setRides(prev => prev.map(r => r.id === updated.id ? updated : r));
      toast({ title: 'Status updated' });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Update failed', description: e?.message, variant: 'destructive' });
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (error) return <p className="text-destructive py-8">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Monitor and manage all ride bookings.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending" value={pending} icon={Clock} subtitle="Awaiting assignment" />
        <StatCard title="Active Rides" value={active} icon={Car} />
        <StatCard title="Available Drivers" value={availableDrivers.length} icon={Users} />
        <StatCard title="Total Rides" value={rides.length} icon={Headphones} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ASSIGNED">Assigned</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="inter-city">Inter City</SelectItem>
            <SelectItem value="intra-city">Intra City</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rides Table */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Pickup</th>
              <th>Drop-off</th>
              <th>Status</th>
              <th>Driver</th>
              <th>Requests</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(ride => (
              <tr key={ride.id}>
                <td className="font-mono text-xs text-muted-foreground">#{ride.id}</td>
                <td className="font-medium">{ride.pickupLocation}</td>
                <td className="text-muted-foreground">{ride.dropLocation}</td>
                <td>
                  <span className={`status-badge status-${ride.status.toLowerCase().replace('_', '-')}`}>
                    {ride.status}
                  </span>
                </td>
                <td className="text-muted-foreground">{ride.driverId ? `#${ride.driverId}` : '—'}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {(rideRequests[ride.id] ?? []).length > 0 ? (
                      (rideRequests[ride.id] ?? []).map(requestDriverId => {
                        const requestedDriver = drivers.find(driver => driver.id === requestDriverId);
                        return (
                          <span key={`${ride.id}-${requestDriverId}`} className="status-badge status-pending">
                            #{requestDriverId}
                            {requestedDriver?.email ? ` · ${requestedDriver.email}` : ''}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex gap-1 flex-wrap">
                    {ride.status === 'PENDING' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => { setAssignDialog(ride); setSelectedDriver(''); }}>
                          <UserPlus className="h-3 w-3 mr-1" /> Assign
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRequestDialog(ride)}
                          disabled={(rideRequests[ride.id] ?? []).length === 0}
                        >
                          Requests ({(rideRequests[ride.id] ?? []).length})
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => autoAssign(ride.id)} disabled={!canDispatch}>
                          <Zap className="h-3 w-3 mr-1" /> Auto
                        </Button>
                      </>
                    )}
                    {['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(ride.status) && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateStatus(ride.id, 'CANCELLED')} disabled={!canDispatch}>Cancel</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-6">No rides found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Assign Driver Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Driver</DialogTitle>
          </DialogHeader>
          {assignDialog && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Ride:</span> #{assignDialog.id}</p>
                <p><span className="font-medium">From:</span> {assignDialog.pickupLocation}</p>
                <p><span className="font-medium">To:</span> {assignDialog.dropLocation}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Select Driver</label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose an available driver..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDrivers.map(d => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        #{d.id} — {d.licenseNumber}
                      </SelectItem>
                    ))}
                    {availableDrivers.length === 0 && (
                      <SelectItem value="none" disabled>No available drivers</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAssignDialog(null)}>Cancel</Button>
                <Button onClick={assignDriver} disabled={!canDispatch || !selectedDriver || selectedDriver === 'none' || assigning}>
                  {assigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Assign Driver
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!requestDialog} onOpenChange={() => setRequestDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ride Request Queue</DialogTitle>
          </DialogHeader>
          {requestDialog && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Ride #{requestDialog.id} requested drivers (first request has highest priority).</p>
              <div className="space-y-2">
                {(rideRequests[requestDialog.id] ?? []).map((requestDriverId, index) => {
                  const requestedDriver = drivers.find(driver => driver.id === requestDriverId);
                  return (
                    <div key={`${requestDialog.id}-${requestDriverId}`} className="rounded-md border px-3 py-2 text-sm">
                      <span className="font-medium">#{index + 1}</span>
                      <span className="ml-2">Driver #{requestDriverId}</span>
                      {requestedDriver?.email ? <span className="text-muted-foreground"> · {requestedDriver.email}</span> : null}
                    </div>
                  );
                })}
                {(rideRequests[requestDialog.id] ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No requests for this ride.</p>
                )}
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setRequestDialog(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
