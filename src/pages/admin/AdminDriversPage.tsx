import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, ToggleLeft, ToggleRight, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { driversApi, authApi, adminApi, ridesApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import type { BackendDriver, BackendVehicle } from '@/types';

const AdminDriversPage = () => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<BackendDriver[]>([]);
  const [vehicles, setVehicles] = useState<BackendVehicle[]>([]);
  const [driverUsersWithoutProfile, setDriverUsersWithoutProfile] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [form, setForm] = useState({ email: '', password: '', licenseNumber: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setError('');
      setDriverUsersWithoutProfile(0);
      let data = await adminApi.getDrivers();
      if (data.length === 0) {
        const fallback = await driversApi.getAll();
        if (fallback.length > 0) {
          data = fallback;
        }
      }
      setDrivers(data);

      const vehicleData = await adminApi.getVehicles();
      setVehicles(vehicleData);

      const users = await adminApi.getUsers();
      const driverUsers = users.filter(u => u.role === 'ROLE_DRIVER');
      const profileEmails = new Set((data.map(d => d.email?.toLowerCase()).filter(Boolean) as string[]));
      const withoutProfile = driverUsers.filter(u => !profileEmails.has(u.email.toLowerCase()));
      setDriverUsersWithoutProfile(withoutProfile.length);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to load drivers.');
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

      const rides = await ridesApi.getAll();
      const assignedRides = rides.filter(ride => ride.driverId === driverId && ride.status === 'ASSIGNED');

      if (assignedRides.length > 0) {
        const cancelResults = await Promise.allSettled(
          assignedRides.map(ride => ridesApi.updateStatus(ride.id, 'CANCELLED')),
        );

        const failedCount = cancelResults.filter(result => result.status === 'rejected').length;
        if (failedCount > 0) {
          throw new Error(
            `Could not cancel ${failedCount} assigned ride(s) for this driver. Driver was not deleted.`,
          );
        }
      }

      await adminApi.deleteDriver(driverId);
      setDrivers(prev => prev.filter(d => d.id !== driverId));
      toast({
        title: `Driver #${driverId} deleted`,
        description: assignedRides.length > 0
          ? `${assignedRides.length} assigned ride(s) were moved to CANCELLED first.`
          : 'No assigned rides required cancellation.',
      });
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
      await authApi.registerDriver(form.email, form.password, form.licenseNumber);
      const users = await adminApi.getUsers();
      const matchedDriverUser = users
        .filter(u => u.role === 'ROLE_DRIVER' && u.email.toLowerCase() === form.email.toLowerCase())
        .sort((a, b) => b.id - a.id)[0];

      if (!matchedDriverUser) {
        throw new Error('Driver account was created, but user ID was not found. Please refresh and try again.');
      }

      const existingDrivers = await adminApi.getDrivers().catch(() => [] as BackendDriver[]);
      const profileAlreadyExists = existingDrivers.some(driver => {
        if ((driver.userId ?? null) === matchedDriverUser.id) return true;
        if (driver.email && driver.email.toLowerCase() === form.email.toLowerCase()) return true;
        return false;
      });

      if (!profileAlreadyExists) {
        try {
          await driversApi.create(matchedDriverUser.id, form.licenseNumber);
        } catch (profileCreateError: unknown) {
          const duplicateError = profileCreateError as { status?: number; message?: string };
          const duplicateByStatus = duplicateError?.status === 409;
          const duplicateByMessage = /already|exist|duplicate/i.test(duplicateError?.message ?? '');

          if (!duplicateByStatus && !duplicateByMessage) {
            throw profileCreateError;
          }
        }
      }

      await load();

      toast({
        title: 'Driver created',
        description: `Account and driver profile for ${form.email} were created successfully.`,
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

        {!loading && !error && driverUsersWithoutProfile > 0 && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
            Found {driverUsersWithoutProfile} driver user account(s) without a driver profile in the `drivers` table.
            Only profiles from `/drivers` or `/admin/drivers` appear in this list.
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Driver ID</th>
                  <th>Email</th>
                  <th>License Number</th>
                  <th>Assigned Vehicles</th>
                  <th>Approved</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(d => (
                  (() => {
                    const assignedVehicles = vehicles
                      .filter(vehicle => {
                        const assignedId = vehicle.driverId ?? vehicle.assignedDriverId ?? null;
                        if (!assignedId) return false;
                        return assignedId === d.id || assignedId === (d.userId ?? null);
                      })
                      .map(vehicle => vehicle.plateNumber)
                      .filter(Boolean);

                    const dtoAssignedVehicles = (d.vehicleIds ?? []).map(vehicleId => {
                      const matchedVehicle = vehicles.find(vehicle => vehicle.id === vehicleId);
                      return matchedVehicle?.plateNumber ?? `Vehicle #${vehicleId}`;
                    });

                    const uniqueAssignedVehicles = Array.from(new Set([...assignedVehicles, ...dtoAssignedVehicles]));

                    return (
                  <tr key={d.id}>
                    <td className="font-mono text-xs text-muted-foreground">#{d.id}</td>
                    <td className="font-medium">{d.email ?? '—'}</td>
                    <td className="font-medium font-mono text-sm">{d.licenseNumber || '—'}</td>
                    <td>
                      {uniqueAssignedVehicles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {uniqueAssignedVehicles.map(plate => (
                            <span key={`${d.id}-${plate}`} className="status-badge status-completed">{plate}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
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
                    );
                  })()
                ))}
                {drivers.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted-foreground py-6">No drivers yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Driver Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Driver Account</DialogTitle>
              <DialogDescription>
                Create a driver account and ensure a single matching driver profile is linked.
              </DialogDescription>
            </DialogHeader>
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
