import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus } from 'lucide-react';
import { ridesApi, driversApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import type { BackendRide, BackendDriver } from '@/types';

const AdminRidesPage = () => {
  const { toast } = useToast();
  const [rides, setRides] = useState<BackendRide[]>([]);
  const [drivers, setDrivers] = useState<BackendDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignDialog, setAssignDialog] = useState<BackendRide | null>(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [statusDialog, setStatusDialog] = useState<BackendRide | null>(null);
  const [newStatus, setNewStatus] = useState('');

  const load = useCallback(async () => {
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

  useEffect(() => { load(); }, [load]);

  const handleAssign = async () => {
    if (!assignDialog || !selectedDriver) return;
    setAssigning(true);
    try {
      const updated = await ridesApi.assignDriver(assignDialog.id, Number(selectedDriver));
      setRides(prev => prev.map(r => r.id === updated.id ? updated : r));
      toast({ title: 'Driver assigned', description: `Driver #${selectedDriver} → Ride #${assignDialog.id}` });
      setAssignDialog(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' });
    } finally {
      setAssigning(false);
    }
  };

  const handleStatus = async () => {
    if (!statusDialog || !newStatus) return;
    try {
      const updated = await ridesApi.updateStatus(statusDialog.id, newStatus);
      setRides(prev => prev.map(r => r.id === updated.id ? updated : r));
      toast({ title: 'Status updated' });
      setStatusDialog(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' });
    }
  };

  const availableDrivers = drivers.filter(d => d.isAvailable);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">All Rides</h1>
          <p className="text-sm text-muted-foreground">Complete ride history across the platform.</p>
        </div>

        {loading && <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
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
                  <th>Actions</th>
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
                    <td>
                      <div className="flex gap-1">
                        {r.status === 'PENDING' && (
                          <Button size="sm" variant="outline" onClick={() => { setAssignDialog(r); setSelectedDriver(''); }}>
                            <UserPlus className="h-3 w-3 mr-1" /> Assign
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => { setStatusDialog(r); setNewStatus(r.status); }}>
                          Status
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rides.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-muted-foreground py-6">No rides found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Assign Driver Dialog */}
        <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Driver to Ride #{assignDialog?.id}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger><SelectValue placeholder="Select available driver..." /></SelectTrigger>
                <SelectContent>
                  {availableDrivers.map(d => (
                    <SelectItem key={d.id} value={String(d.id)}>#{d.id} — {d.licenseNumber}</SelectItem>
                  ))}
                  {availableDrivers.length === 0 && <SelectItem value="none" disabled>No available drivers</SelectItem>}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAssignDialog(null)}>Cancel</Button>
                <Button onClick={handleAssign} disabled={!selectedDriver || selectedDriver === 'none' || assigning}>
                  {assigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Assign
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Update Status Dialog */}
        <Dialog open={!!statusDialog} onOpenChange={() => setStatusDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Update Status for Ride #{statusDialog?.id}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStatusDialog(null)}>Cancel</Button>
                <Button onClick={handleStatus}>Update</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AdminRidesPage;
