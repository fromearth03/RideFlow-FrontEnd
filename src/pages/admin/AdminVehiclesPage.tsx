import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Wrench, Loader2 } from 'lucide-react';
import { adminApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import type { BackendVehicle } from '@/types';

const AdminVehiclesPage = () => {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<BackendVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState<BackendVehicle | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState({ plateNumber: '', model: '', status: 'ACTIVE' });
  const [maintDesc, setMaintDesc] = useState('');
  const [maintLoading, setMaintLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const data = await adminApi.getVehicles();
      setVehicles(data);
    } catch {
      setError('Failed to load vehicles.');
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
                    <td>
                      <Button size="sm" variant="ghost" onClick={() => { setShowMaintenance(v); setMaintDesc(''); }}>
                        <Wrench className="h-3 w-3 mr-1" /> Maintenance
                      </Button>
                    </td>
                  </tr>
                ))}
                {vehicles.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted-foreground py-6">No vehicles yet.</td></tr>
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
