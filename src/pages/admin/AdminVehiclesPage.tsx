import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Wrench, Loader2, Link2, UserMinus, Ban, CheckCircle2, Trash2 } from 'lucide-react';
import { adminApi, driversApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import type { BackendVehicle, BackendDriver } from '@/types';

const AdminVehiclesPage = () => {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<BackendVehicle[]>([]);
  const [drivers, setDrivers] = useState<BackendDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState<BackendVehicle | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [unassignLoadingId, setUnassignLoadingId] = useState<number | null>(null);
  const [disableLoadingId, setDisableLoadingId] = useState<number | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
  const [addForm, setAddForm] = useState({ plateNumber: '', model: '', status: 'ACTIVE' });
  const [assignForm, setAssignForm] = useState({ vehicleId: '', driverId: '' });
  const [maintDesc, setMaintDesc] = useState('');
  const [maintLoading, setMaintLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [vehicleData, driverData] = await Promise.all([adminApi.getVehicles(), adminApi.getDrivers()]);
      setVehicles(vehicleData);
      setDrivers(driverData);
      setError('');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to load vehicles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    setFormErrors({});
    if (!addForm.plateNumber || !addForm.model) {
      setFormErrors({ general: 'Plate number and model are required.' });
      return;
    }
    setAddLoading(true);
    try {
      const vehicle = await adminApi.addVehicle(addForm.plateNumber, addForm.model, addForm.status);
      setVehicles(prev => [...prev, vehicle]);
      setShowAdd(false);
      setAddForm({ plateNumber: '', model: '', status: 'ACTIVE' });
      toast({ title: 'Vehicle added', description: `${vehicle.plateNumber} added to fleet.` });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Failed to add vehicle', description: e?.message || 'Plate number may already exist.', variant: 'destructive' });
    } finally {
      setAddLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!assignForm.vehicleId || !assignForm.driverId) {
      toast({
        title: 'Assignment details missing',
        description: 'Select both a vehicle and a driver.',
        variant: 'destructive',
      });
      return;
    }

    const selectedDriverId = Number(assignForm.driverId);
    const selectedVehicleId = Number(assignForm.vehicleId);
    const selectedVehicle = vehicles.find(vehicle => vehicle.id === selectedVehicleId);

    // Check if vehicle is already assigned to a driver
    const assignedDriverId = getAssignedDriverId(selectedVehicle!);
    if (assignedDriverId) {
      toast({
        title: 'Vehicle already assigned',
        description: `This vehicle is already assigned to a driver. Unassign it first.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setAssignLoading(true);
      const selectedDriver = drivers.find(driver => driver.id === selectedDriverId);

      await adminApi.assignVehicleToDriver(selectedDriverId, selectedVehicleId);

      const refreshedVehicles = await adminApi.getVehicles();
      setVehicles(refreshedVehicles);
      setAssignForm({ vehicleId: '', driverId: '' });
      toast({
        title: 'Vehicle assigned',
        description: `${selectedVehicle?.plateNumber ?? `Vehicle #${selectedVehicleId}`} assigned to driver #${selectedDriverId}${selectedDriver?.email ? ` (${selectedDriver.email})` : ''}.`,
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Assignment failed', description: e?.message || 'Could not assign vehicle to driver.', variant: 'destructive' });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleMaintenance = async () => {
    if (!showMaintenance || !maintDesc.trim()) return;
    setMaintLoading(true);
    try {
      await adminApi.addMaintenance(showMaintenance.id, maintDesc);
      toast({ title: 'Maintenance logged', description: `Record added for ${showMaintenance.plateNumber}.` });
      setShowMaintenance(null);
      setMaintDesc('');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' });
    } finally {
      setMaintLoading(false);
    }
  };

  const handleUnassign = async (vehicle: BackendVehicle) => {
    const assignedDriverId = getAssignedDriverId(vehicle);
    if (!assignedDriverId) {
      toast({
        title: 'No assigned driver',
        description: 'This vehicle is already unassigned.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUnassignLoadingId(vehicle.id);
      await adminApi.unassignVehicleFromDriver(assignedDriverId, vehicle.id);
      const refreshedVehicles = await adminApi.getVehicles();
      setVehicles(refreshedVehicles);
      toast({
        title: 'Vehicle unassigned',
        description: `${vehicle.plateNumber} was unassigned from driver #${assignedDriverId}.`,
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({
        title: 'Unassign failed',
        description: e?.message || 'Could not unassign vehicle from driver.',
        variant: 'destructive',
      });
    } finally {
      setUnassignLoadingId(null);
    }
  };

  const handleDelete = async (vehicle: BackendVehicle) => {
    try {
      setDeleteLoadingId(vehicle.id);
      await adminApi.deleteVehicle(vehicle.id);
      setVehicles(prev => prev.filter(v => v.id !== vehicle.id));
      toast({
        title: 'Vehicle deleted',
        description: `${vehicle.plateNumber} has been deleted.`,
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({
        title: 'Delete failed',
        description: e?.message || 'Could not delete vehicle.',
        variant: 'destructive',
      });
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleToggleVehicleStatus = async (vehicle: BackendVehicle) => {
    const isInactive = vehicle.status === 'INACTIVE';

    try {
      setDisableLoadingId(vehicle.id);
      if (isInactive) {
        await adminApi.enableVehicle(vehicle.id);
      } else {
        await adminApi.disableVehicle(vehicle.id);
      }

      const refreshedVehicles = await adminApi.getVehicles();
      setVehicles(refreshedVehicles);
      toast({
        title: isInactive ? 'Vehicle enabled' : 'Vehicle disabled',
        description: `${vehicle.plateNumber} has been ${isInactive ? 'enabled' : 'disabled'}.`,
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({
        title: isInactive ? 'Enable failed' : 'Disable failed',
        description: e?.message || `Could not ${isInactive ? 'enable' : 'disable'} vehicle.`,
        variant: 'destructive',
      });
    } finally {
      setDisableLoadingId(null);
    }
  };

  const getAssignedDriverId = (vehicle: BackendVehicle): number | null => {
    const rawVehicle = vehicle as BackendVehicle & Record<string, unknown>;
    const nestedDriver = (
      rawVehicle.driver ??
      rawVehicle.assignedDriver ??
      rawVehicle.assigned_to ??
      rawVehicle.assignedTo ??
      rawVehicle.driverDTO ??
      rawVehicle.driverDto ??
      {}
    ) as Record<string, unknown>;
    const nestedUser = (nestedDriver.user ?? nestedDriver.userDTO ?? nestedDriver.userDto ?? {}) as Record<string, unknown>;

    const rawDriverId =
      rawVehicle.driverId ??
      rawVehicle.assignedDriverId ??
      rawVehicle.driver_id ??
      rawVehicle.assigned_driver_id ??
      rawVehicle.assignedToDriverId ??
      rawVehicle.assigned_to_driver_id ??
      nestedDriver.id ??
      nestedDriver.driverId ??
      nestedDriver.driver_id ??
      nestedDriver.userId ??
      nestedDriver.user_id ??
      nestedUser.id ??
      nestedUser.userId ??
      nestedUser.user_id;

    const parsed = Number(rawDriverId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const resolveAssignedDriverLabel = (vehicle: BackendVehicle): string => {
    const rawVehicle = vehicle as BackendVehicle & Record<string, unknown>;
    const nestedDriver = (
      rawVehicle.driver ??
      rawVehicle.assignedDriver ??
      rawVehicle.assigned_to ??
      rawVehicle.assignedTo ??
      rawVehicle.driverDTO ??
      rawVehicle.driverDto ??
      {}
    ) as Record<string, unknown>;
    const nestedUser = (nestedDriver.user ?? nestedDriver.userDTO ?? nestedDriver.userDto ?? {}) as Record<string, unknown>;
    const vehicleLevelLicense = String(
      rawVehicle.driverLicenseNumber ??
      rawVehicle.assignedDriverLicenseNumber ??
      rawVehicle.assigned_driver_license_number ??
      nestedDriver.licenseNumber ??
      nestedDriver.license_number ??
      nestedUser.licenseNumber ??
      nestedUser.license_number ??
      '',
    ).trim();

    if (vehicleLevelLicense) {
      return `DL: ${vehicleLevelLicense}`;
    }

    const assignedDriverId = getAssignedDriverId(vehicle);
    const assignedById = assignedDriverId
      ? drivers.find(driver => driver.id === assignedDriverId) || drivers.find(driver => (driver.userId ?? null) === assignedDriverId)
      : null;

    if (assignedById?.licenseNumber) {
      return `DL: ${assignedById.licenseNumber}`;
    }

    const assignedByVehicleId = drivers.find(driver => (driver.vehicleIds ?? []).includes(vehicle.id));
    if (assignedByVehicleId?.licenseNumber) {
      return `DL: ${assignedByVehicleId.licenseNumber}`;
    }

    if (assignedDriverId) {
      return `Driver #${assignedDriverId} (license unavailable)`;
    }

    return 'Unassigned';
  };

  const statusColor = (s: string) => {
    if (s === 'ACTIVE') return 'status-completed';
    if (s === 'MAINTENANCE') return 'status-pending';
    return 'status-cancelled';
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Vehicles</h1>
            <p className="text-sm text-muted-foreground">Fleet inventory management.</p>
          </div>
          <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" /> Add Vehicle</Button>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Assign Vehicle to Driver</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Select Vehicle</Label>
              <Select value={assignForm.vehicleId} onValueChange={value => setAssignForm(prev => ({ ...prev, vehicleId: value }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose vehicle" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(vehicle => (
                    <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                      #{vehicle.id} — {vehicle.plateNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select Driver</Label>
              <Select value={assignForm.driverId} onValueChange={value => setAssignForm(prev => ({ ...prev, driverId: value }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose driver" /></SelectTrigger>
                <SelectContent>
                  {drivers.map(driver => (
                    <SelectItem key={driver.id} value={String(driver.id)}>
                      #{driver.id} {driver.email ? `— ${driver.email}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAssign} disabled={assignLoading} className="w-full">
                {assignLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Assign Vehicle
              </Button>
            </div>
          </div>
        </div>

        {loading && <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
        {error && <p className="text-destructive text-sm">{error}</p>}

        {!loading && !error && (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Plate</th>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Assigned Driver</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}>
                    <td className="font-mono text-xs text-muted-foreground">#{v.id}</td>
                    <td className="font-mono font-medium">{v.plateNumber}</td>
                    <td>{v.model}</td>
                    <td><span className={`status-badge ${statusColor(v.status)}`}>{v.status}</span></td>
                    <td className="text-muted-foreground">
                      {resolveAssignedDriverLabel(v)}
                    </td>
                    <td>
                      <Button size="sm" variant="ghost" onClick={() => { setShowMaintenance(v); setMaintDesc(''); }}>
                        <Wrench className="h-3 w-3 mr-1" /> Maintenance
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-1"
                        onClick={() => handleToggleVehicleStatus(v)}
                        disabled={disableLoadingId === v.id}
                      >
                        {disableLoadingId === v.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : v.status === 'INACTIVE' ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" />Enable</>
                        ) : (
                          <><Ban className="h-3 w-3 mr-1" />Disable</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-1"
                        onClick={() => handleUnassign(v)}
                        disabled={unassignLoadingId === v.id}
                      >
                        {unassignLoadingId === v.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <><UserMinus className="h-3 w-3 mr-1" />Unassign</>}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="ml-1"
                        onClick={() => handleDelete(v)}
                        disabled={deleteLoadingId === v.id}
                      >
                        {deleteLoadingId === v.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <><Trash2 className="h-3 w-3 mr-1" />Delete</>}
                      </Button>
                    </td>
                  </tr>
                ))}
                {vehicles.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-muted-foreground py-6">No vehicles yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Vehicle Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Plate Number</Label>
                <Input value={addForm.plateNumber} onChange={e => setAddForm(f => ({ ...f, plateNumber: e.target.value }))} className="mt-1" placeholder="e.g. NYC-AB-1234" />
              </div>
              <div>
                <Label>Model</Label>
                <Input value={addForm.model} onChange={e => setAddForm(f => ({ ...f, model: e.target.value }))} className="mt-1" placeholder="e.g. Toyota Camry 2024" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={addForm.status} onValueChange={v => setAddForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                    <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formErrors.general && <p className="text-xs text-destructive">{formErrors.general}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={addLoading}>
                  {addLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add Vehicle
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Maintenance Dialog */}
        <Dialog open={!!showMaintenance} onOpenChange={() => setShowMaintenance(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Maintenance — {showMaintenance?.plateNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Date will be set automatically to today.</p>
              <div>
                <Label>Description</Label>
                <Input value={maintDesc} onChange={e => setMaintDesc(e.target.value)} className="mt-1" placeholder="e.g. Oil change and tire rotation" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowMaintenance(null)}>Cancel</Button>
                <Button onClick={handleMaintenance} disabled={!maintDesc.trim() || maintLoading}>
                  {maintLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Log Maintenance
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AdminVehiclesPage;
