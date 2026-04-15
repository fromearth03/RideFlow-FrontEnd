import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { adminApi } from '@/services/api';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { BackendCustomer } from '@/types';

const AdminUsersPage = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<BackendCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await adminApi.getCustomers();
      setCustomers(data);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: number) => {
    try {
      setBusyId(id);
      await adminApi.deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      toast({ title: 'Customer deleted' });
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      toast({ title: 'Failed to delete', description: apiErr?.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">
            View all customer profiles and remove users when required.
          </p>
        </div>

        {loading && <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
        {error && <p className="text-destructive text-sm">{error}</p>}

        {!loading && !error && (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Phone Number</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id}>
                    <td className="font-mono text-xs text-muted-foreground">#{c.id}</td>
                    <td className="font-medium">{c.email}</td>
                    <td className="text-muted-foreground">{c.phoneNumber ?? '—'}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => remove(c.id)}
                        disabled={busyId === c.id}
                      >
                        {busyId === c.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <><Trash2 className="h-4 w-4 mr-1" />Delete</>}
                      </Button>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-muted-foreground py-6">No customers available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminUsersPage;
