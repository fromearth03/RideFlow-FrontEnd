import { useEffect, useState, useCallback } from 'react';
import { Headphones, Car, Users, Clock, UserPlus, Zap, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ridesApi, driversApi, dispatcherApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import type { BackendRide, BackendDriver } from '@/types';

export const DispatcherDashboard = () => {
  const { toast } = useToast();
  const [rides, setRides] = useState<BackendRide[]>([]);
  const [drivers, setDrivers] = useState<BackendDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignDialog, setAssignDialog] = useState<BackendRide | null>(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assigning, setAssigning] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [r, d] = await Promise.all([ridesApi.getAll(), driversApi.getAll()]);
      setRides(r);
      setDrivers(d);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = statusFilter === 'all' ? rides : rides.filter(r => r.status === statusFilter);
  const pending = rides.filter(r => r.status === 'PENDING').length;
  const active = rides.filter(r => ['ASSIGNED', 'IN_PROGRESS'].includes(r.status)).length;
  const availableDrivers = drivers.filter(d => d.isAvailable);

  const assignDriver = async () => {
    if (!assignDialog || !selectedDriver) return;
    setAssigning(true);
    try {
      const updated = await dispatcherApi.assignDriver(assignDialog.id, Number(selectedDriver));
      setRides(prev => prev.map(r => r.id === updated.id ? updated : r));
      // Mark driver as unavailable in local state
      setDrivers(prev => prev.map(d => d.id === Number(selectedDriver) ? { ...d, isAvailable: false } : d));
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
    try {
      const updated = await dispatcherApi.autoAssign(rideId);
      setRides(prev => prev.map(r => r.id === updated.id ? updated : r));
      // Refresh drivers to get updated availability
      const d = await driversApi.getAll();
      setDrivers(d);
      toast({ title: 'Auto-assigned', description: `Driver auto-assigned to ride #${rideId}.` });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Auto-assign failed', description: e?.message || 'No available drivers.', variant: 'destructive' });
    }
  };

  const updateStatus = async (rideId: number, status: string) => {
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
        <h1 className="text-xl font-semibold text-foreground">Dispatch Operations</h1>
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
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
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
                  <div className="flex gap-1 flex-wrap">
                    {ride.status === 'PENDING' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => { setAssignDialog(ride); setSelectedDriver(''); }}>
                          <UserPlus className="h-3 w-3 mr-1" /> Assign
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => autoAssign(ride.id)}>
                          <Zap className="h-3 w-3 mr-1" /> Auto
                        </Button>
                      </>
                    )}
                    {ride.status === 'ASSIGNED' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(ride.id, 'IN_PROGRESS')}>Start</Button>
                    )}
                    {ride.status === 'IN_PROGRESS' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(ride.id, 'COMPLETED')}>Complete</Button>
                    )}
                    {['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(ride.status) && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateStatus(ride.id, 'CANCELLED')}>Cancel</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center text-muted-foreground py-6">No rides found.</td></tr>
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
                <Button onClick={assignDriver} disabled={!selectedDriver || selectedDriver === 'none' || assigning}>
                  {assigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Assign Driver
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
