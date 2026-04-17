import { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CheckCircle2, Trash2, Plus } from 'lucide-react';
import { adminApi, authApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import type { BackendDispatcher } from '@/types';

const AdminDispatchersPage = () => {
  const { toast } = useToast();
  const [dispatchers, setDispatchers] = useState<BackendDispatcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getDispatchers();
      setDispatchers(data);
      setError('');
    } catch {
      setError('Failed to load dispatchers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: number) => {
    try {
      setBusyId(id);
      const updated = await adminApi.approveDispatcher(id);
      setDispatchers(prev => prev.map(d => (d.id === updated.id ? updated : d)));
      toast({ title: 'Dispatcher approved' });
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      toast({ title: 'Failed to approve', description: apiErr?.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    try {
      setBusyId(id);
      await adminApi.deleteDispatcher(id);
      setDispatchers(prev => prev.filter(d => d.id !== id));
      toast({ title: 'Dispatcher deleted' });
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      toast({ title: 'Failed to delete', description: apiErr?.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const handleAdd = async () => {
    setFormErrors({});
    if (!form.email || !form.password) {
      setFormErrors({ general: 'Email and password are required.' });
      return;
    }
    setAddLoading(true);
    try {
      await authApi.registerDispatcher(form.email, form.password);
      await load();
      toast({ title: 'Dispatcher created', description: `${form.email} registered successfully.` });
      setShowAdd(false);
      setForm({ email: '', password: '' });
    } catch (err: unknown) {
      const apiErr = err as { errors?: Record<string, string>; message?: string };
      if (apiErr?.errors) {
        setFormErrors(apiErr.errors);
      } else {
        toast({ title: 'Failed to add dispatcher', description: apiErr?.message, variant: 'destructive' });
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
            <h1 className="text-xl font-semibold text-foreground">Dispatchers</h1>
            <p className="text-sm text-muted-foreground">Approve and manage dispatcher accounts.</p>
          </div>
          <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" /> Add Dispatcher</Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        {!loading && !error && (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Approved</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dispatchers.map(d => (
                  <tr key={d.id}>
                    <td className="font-mono text-xs text-muted-foreground">#{d.id}</td>
                    <td className="font-medium">{d.email}</td>
                    <td>
                      <span className={`status-badge ${d.approved ? 'status-completed' : 'status-pending'}`}>
                        {d.approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {!d.approved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approve(d.id)}
                            disabled={busyId === d.id}
                          >
                            {busyId === d.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => remove(d.id)}
                          disabled={busyId === d.id}
                        >
                          {busyId === d.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {dispatchers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted-foreground py-6">No dispatchers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Dispatcher Account</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="mt-1"
                />
                {formErrors.email && <p className="text-xs text-destructive mt-1">{formErrors.email}</p>}
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="mt-1"
                />
                {formErrors.password && <p className="text-xs text-destructive mt-1">{formErrors.password}</p>}
              </div>
              {formErrors.general && <p className="text-xs text-destructive">{formErrors.general}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={addLoading}>
                  {addLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Dispatcher
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AdminDispatchersPage;
