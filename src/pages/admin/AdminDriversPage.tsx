import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, ToggleLeft, ToggleRight, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { driversApi, authApi, adminApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import type { BackendDriver } from '@/types';

const AdminDriversPage = () => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<BackendDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [form, setForm] = useState({ email: '', password: '', licenseNumber: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const data = await adminApi.getDrivers();
      setDrivers(data);
    } catch {
      setError('Failed to load drivers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleAvailability = async (driver: BackendDriver) => {
    try {
      const updated = await driversApi.toggleAvailability(driver.id, !driver.isAvailable);
      setDrivers(prev => prev.map(d => d.id === updated.id ? updated : d));
      toast({ title: `Driver #${driver.id} marked as ${updated.isAvailable ? 'available' : 'unavailable'}` });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' });
    }
  };

  const approveDriver = async (driverId: number) => {
    try {
      setBusyId(driverId);
      const updated = await adminApi.approveDriver(driverId);
      setDrivers(prev => prev.map(d => d.id === updated.id ? updated : d));
      toast({ title: `Driver #${driverId} approved` });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Approve failed', description: e?.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const deleteDriver = async (driverId: number) => {
    try {
      setBusyId(driverId);
      await adminApi.deleteDriver(driverId);
      setDrivers(prev => prev.filter(d => d.id !== driverId));
      toast({ title: `Driver #${driverId} deleted` });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Delete failed', description: e?.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const handleAdd = async () => {
    setFormErrors({});
    if (!form.email || !form.password || !form.licenseNumber) {
      setFormErrors({ general: 'All fields are required.' });
      return;
    }
    setAddLoading(true);
    try {
      // Step 1: Register driver user
      const authRes = await authApi.registerDriver(form.email, form.password);
      // Step 2: We don't get userId from register response, so we need to find it.
      // We'll fetch all drivers after a short moment and find the newly added one.
      // The backend does not return userId in authResponse, so we re-fetch and find new driver.
      // Wait: we cannot create driver profile without userId. The backend register/driver only creates a User,
      // not a Driver profile. We need POST /drivers with userId.
      // Since we don't get userId from the register response, we inform the admin.
      toast({
        title: 'Driver user created',
        description: `Account for ${form.email} created. License profile setup requires a manual POST /drivers with their user ID from the database. To automate this, the backend would need to return userId on register.`,
      });
      setShowAdd(false);
      setForm({ email: '', password: '', licenseNumber: '' });
    } catch (err: unknown) {
      const apiErr = err as { errors?: Record<string, string>; message?: string };
      if (apiErr?.errors) {
        setFormErrors(apiErr.errors);
      } else {
        toast({ title: 'Failed to add driver', description: apiErr?.message, variant: 'destructive' });
      }
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Drivers</h1>
            <p className="text-sm text-muted-foreground">Manage your driver fleet.</p>
          </div>
          <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" /> Add Driver</Button>
        </div>

        {loading && <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
        {error && <p className="text-destructive text-sm">{error}</p>}

        {!loading && !error && (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Driver ID</th>
                  <th>Email</th>
                  <th>License Number</th>
                  <th>Approved</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(d => (
                  <tr key={d.id}>
                    <td className="font-mono text-xs text-muted-foreground">#{d.id}</td>
                    <td className="font-medium">{d.email ?? '—'}</td>
                    <td className="font-medium font-mono text-sm">{d.licenseNumber}</td>
                    <td>
                      <span className={`status-badge ${d.approved ? 'status-completed' : 'status-pending'}`}>
                        {d.approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${d.isAvailable ? 'status-completed' : 'status-pending'}`}>
                        {d.isAvailable ? 'Available' : 'Busy'}
                      </span>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleAvailability(d)}
                        title={d.isAvailable ? 'Set unavailable' : 'Set available'}
                      >
                        {d.isAvailable
                          ? <><ToggleRight className="h-4 w-4 text-green-500 mr-1" /> Available</>
                          : <><ToggleLeft className="h-4 w-4 text-muted-foreground mr-1" /> Busy</>
                        }
                      </Button>
                      {!d.approved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveDriver(d.id)}
                          disabled={busyId === d.id}
                          className="ml-1"
                        >
                          {busyId === d.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <><CheckCircle2 className="h-4 w-4 mr-1" />Approve</>}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteDriver(d.id)}
                        disabled={busyId === d.id}
                        className="ml-1"
                      >
                        {busyId === d.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <><Trash2 className="h-4 w-4 mr-1" />Delete</>}
                      </Button>
                    </td>
                  </tr>
                ))}
                {drivers.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-muted-foreground py-6">No drivers yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Driver Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Driver Account</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                This creates a driver user account. The driver license profile can then be linked via the API with their user ID.
              </p>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
                {formErrors.email && <p className="text-xs text-destructive mt-1">{formErrors.email}</p>}
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="mt-1" />
                {formErrors.password && <p className="text-xs text-destructive mt-1">{formErrors.password}</p>}
              </div>
              <div>
                <Label>License Number</Label>
                <Input value={form.licenseNumber} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))} className="mt-1" placeholder="e.g. DL-2024-NY-00123" />
              </div>
              {formErrors.general && <p className="text-xs text-destructive">{formErrors.general}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={addLoading}>
                  {addLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Driver
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AdminDriversPage;
