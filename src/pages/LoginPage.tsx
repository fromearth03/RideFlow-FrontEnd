import { useEffect, useState } from 'react';
import { Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RideFlowLogo } from '@/components/RideFlowLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { ApiError } from '@/types';

const LoginPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if ((location.state as { pendingApproval?: boolean } | null)?.pendingApproval) {
      toast({
        title: 'Pending Approval',
        description: 'You have not been approved. Contact the Admin.',
        variant: 'destructive',
      });
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    const state = location.state as { justRegistered?: boolean; role?: string } | null;
    if (state?.justRegistered) {
      const isPendingRole = state.role === 'ROLE_DRIVER' || state.role === 'ROLE_DISPATCHER';
      toast({
        title: isPendingRole ? 'Registered Successfully' : 'Account Created',
        description: isPendingRole
          ? 'Your account is pending approval. Please sign in after admin approval.'
          : 'Registration successful. Please sign in.',
      });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate, toast]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.errors) {
        setErrors(apiErr.errors);
      } else if (apiErr?.message === 'You have not been approved. Contact the Admin.') {
        toast({
          title: 'Pending Approval',
          description: 'You have not been approved. Contact the Admin.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Login failed',
          description: apiErr?.message || 'Invalid email or password.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 bg-[hsl(220,25%,12%)]">
        <div className="flex items-center gap-3 mb-8">
          <RideFlowLogo textClassName="text-2xl text-white" />
        </div>
        <h1 className="text-3xl font-bold leading-tight mb-4 text-white">
          Private Long-Distance<br />Cab Booking Platform
        </h1>
        <p className="text-base leading-relaxed text-[hsl(215,20%,65%)]">
          Professional fleet management and ride operations.
          Manage bookings, dispatch drivers, and monitor your entire fleet from one platform.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col justify-center px-8 sm:px-16 lg:px-24 bg-background">
        <div className="w-full max-w-sm mx-auto">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <RideFlowLogo iconWrapClassName="h-9 w-9" iconClassName="h-4 w-4" />
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-1">Sign in</h2>
          <p className="text-sm text-muted-foreground mb-6">Enter your credentials to access the platform.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1"
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div>
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1"
              />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account? <Link to="/register" className="text-primary hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
