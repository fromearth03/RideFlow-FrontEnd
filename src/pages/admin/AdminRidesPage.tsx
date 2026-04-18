import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { ridesApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import type { BackendRide } from '@/types';

const AdminRidesPage = () => {
  const { toast } = useToast();
  const [rides, setRides] = useState<BackendRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusDialog, setStatusDialog] = useState<BackendRide | null>(null);
  const [newStatus, setNewStatus] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await ridesApi.getAll();
      setRides(r);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
