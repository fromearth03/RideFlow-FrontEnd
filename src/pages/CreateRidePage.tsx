import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ridesApi, dispatcherApi } from '@/services/api';
import type { ApiError } from '@/types';

const CreateRidePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isDispatcher = user?.role === 'ROLE_DISPATCHER';

  const [form, setForm] = useState({
    pickup: '',
    dropoff: '',
    scheduledDate: '',
    scheduledTime: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!form.scheduledDate || !form.scheduledTime) {
      setErrors({ scheduledDate: 'Date and time are required.' });
      return;
    }
    // Combine to ISO 8601 format required by backend
    const scheduledTime = `${form.scheduledDate}T${form.scheduledTime}:00`;
    setLoading(true);
    try {
      if (isDispatcher) {
        await dispatcherApi.createRide(form.pickup, form.dropoff, scheduledTime);
      } else {
        await ridesApi.create(form.pickup, form.dropoff, scheduledTime);
      }
      toast({ title: 'Ride created', description: 'Your booking has been submitted successfully.' });
      navigate(isDispatcher ? '/dashboard' : '/rides');
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.errors) {
        setErrors(apiErr.errors);
      } else {
        toast({
          title: 'Failed to create ride',
          description: apiErr?.message || 'Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <h1 className="text-xl font-semibold text-foreground mb-1">
          {isDispatcher ? 'Create Booking' : 'Book a Ride'}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {isDispatcher ? 'Create a booking on behalf of a customer.' : 'Request a long-distance ride.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="text-foreground">Pickup Location</Label>
            <Input value={form.pickup} onChange={update('pickup')} placeholder="e.g. Times Square, New York" required className="mt-1" />
            {errors.pickupLocation && <p className="text-xs text-destructive mt-1">{errors.pickupLocation}</p>}
          </div>

          <div>
            <Label className="text-foreground">Drop-off Location</Label>
            <Input value={form.dropoff} onChange={update('dropoff')} placeholder="e.g. JFK Airport, New York" required className="mt-1" />
            {errors.dropLocation && <p className="text-xs text-destructive mt-1">{errors.dropLocation}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground">Date</Label>
              <Input type="date" value={form.scheduledDate} onChange={update('scheduledDate')} required className="mt-1" />
            </div>
            <div>
              <Label className="text-foreground">Time</Label>
              <Input type="time" value={form.scheduledTime} onChange={update('scheduledTime')} required className="mt-1" />
            </div>
          </div>
          {errors.scheduledDate && <p className="text-xs text-destructive">{errors.scheduledDate}</p>}
          {errors.scheduledTime && <p className="text-xs text-destructive">{errors.scheduledTime}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Booking
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default CreateRidePage;
