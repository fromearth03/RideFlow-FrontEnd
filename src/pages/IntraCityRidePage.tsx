import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ridesApi, dispatcherApi } from '@/services/api';
import { LocationMapPicker } from '@/components/LocationMapPicker';
import type { ApiError } from '@/types';

const IntraCityRidePage = () => {
  const navigate = useNavigate();
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

  const today = new Date().toISOString().split('T')[0];
  const isToday = form.scheduledDate === today;
  const currentTime = new Date().toTimeString().split(' ')[0].slice(0, 5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!form.scheduledDate || !form.scheduledTime) {
      setErrors({ scheduledDate: 'Date and time are required.' });
      return;
    }
    // Combine to ISO 8601 format required by backend
    const scheduledTime = `${form.scheduledDate}T${form.scheduledTime}:00`;
    const pickupLocation = form.pickup;
    const dropLocation = form.dropoff;
    setLoading(true);
    try {
      if (isDispatcher) {
        await dispatcherApi.createRide(pickupLocation, dropLocation, scheduledTime, false);
      } else {
        await ridesApi.create(pickupLocation, dropLocation, scheduledTime, false);
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
          Intra City Ride
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Create an intra-city booking on behalf of a customer.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <LocationMapPicker
            label="Pickup Location"
            value={form.pickup}
            onChange={(nextValue) => setForm(f => ({ ...f, pickup: nextValue }))}
            placeholder="Type pickup location keywords"
            error={errors.pickupLocation}
          />

          <LocationMapPicker
            label="Drop-off Location"
            value={form.dropoff}
            onChange={(nextValue) => setForm(f => ({ ...f, dropoff: nextValue }))}
            placeholder="Type drop-off location keywords"
            error={errors.dropLocation}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground">Date</Label>
              <Input type="date" value={form.scheduledDate} onChange={update('scheduledDate')} min={today} required className="mt-1" />
            </div>
            <div>
              <Label className="text-foreground">Time</Label>
              <Input type="time" value={form.scheduledTime} onChange={update('scheduledTime')} min={isToday ? currentTime : undefined} required className="mt-1" />
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

export default IntraCityRidePage;