import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserRole, ApiError } from '@/types';

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'ROLE_CUSTOMER', label: 'Customer', description: 'Book rides' },
  { value: 'ROLE_DRIVER', label: 'Driver', description: 'Accept rides' },
  { value: 'ROLE_DISPATCHER', label: 'Dispatcher', description: 'Manage fleet' },
  { value: 'ROLE_ADMIN', label: 'Admin', description: 'Full control' },
];

const RegisterPage = () => {
  const { register, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'ROLE_CUSTOMER' as UserRole,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match.' });
      return;
    }
    setLoading(true);
    try {
      await register({ email: form.email, password: form.password, role: form.role });
      toast({ title: 'Account created', description: 'Welcome to RideFlow!' });
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.errors) {
        setErrors(apiErr.errors);
      } else {
        toast({
          title: 'Registration failed',
          description: apiErr?.message || 'Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-foreground">RideFlow</span>
        </div>

        <div className="rounded-lg border bg-card p-8">
          <h2 className="text-lg font-semibold text-card-foreground mb-1">Create Account</h2>
          <p className="text-sm text-muted-foreground mb-6">Register to get started on RideFlow.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selector */}
            <div>
              <Label className="text-card-foreground mb-2 block">I am a...</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: r.value }))}
                    className={`flex flex-col items-start rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${form.role === r.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                  >
                    <span className="font-medium">{r.label}</span>
                    <span className="text-xs opacity-75">{r.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-card-foreground">Email</Label>
              <Input type="email" value={form.email} onChange={update('email')} required className="mt-1" />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div>
              <Label className="text-card-foreground">Password</Label>
              <Input type="password" value={form.password} onChange={update('password')} required className="mt-1" />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>
            <div>
              <Label className="text-card-foreground">Confirm Password</Label>
              <Input type="password" value={form.confirmPassword} onChange={update('confirmPassword')} required className="mt-1" />
              {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
