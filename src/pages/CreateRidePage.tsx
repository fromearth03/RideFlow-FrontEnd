import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ridesApi, dispatcherApi } from '@/services/api';
import { LocationMapPicker } from '@/components/LocationMapPicker';
import { estimateFareFromLocations } from '@/lib/fare';
import type { ApiError, BackendCustomer } from '@/types';

const CreateRidePage = () => {
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
  const [customers, setCustomers] = useState<BackendCustomer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerUserId, setSelectedCustomerUserId] = useState<string>('');
  const [customersLoading, setCustomersLoading] = useState(false);
  const [fareEstimate, setFareEstimate] = useState<{ distanceKm: number; farePkr: number } | null>(null);
  const [fareLoading, setFareLoading] = useState(false);

  useEffect(() => {
    if (!isDispatcher) return;

    const loadCustomers = async () => {
      try {
        setCustomersLoading(true);
        const customerData = await dispatcherApi.getCustomers();
        setCustomers(customerData);
      } catch {
        toast({
          title: 'Customers unavailable',
          description: 'Could not load customer list from /customers endpoint.',
          variant: 'destructive',
        });
      } finally {
        setCustomersLoading(false);
      }
    };

    loadCustomers();
  }, [isDispatcher, toast]);

  useEffect(() => {
    const pickup = form.pickup.trim();
    const dropoff = form.dropoff.trim();

    if (!pickup || !dropoff) {
      setFareEstimate(null);
      setFareLoading(false);
      return;
    }

    let isCancelled = false;
    const timer = window.setTimeout(async () => {
      setFareLoading(true);
      try {
        const result = await estimateFareFromLocations(pickup, dropoff);
        if (!isCancelled) {
          setFareEstimate(result);
        }
      } catch {
        if (!isCancelled) {
          setFareEstimate(null);
        }
      } finally {
        if (!isCancelled) {
          setFareLoading(false);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.pickup, form.dropoff]);

  const filteredCustomers = useMemo(() => {
    const keyword = customerSearch.trim().toLowerCase();
    if (!keyword) return customers;
    return customers.filter(customer => customer.email.toLowerCase().includes(keyword));
  }, [customers, customerSearch]);

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
    if (isDispatcher && !selectedCustomerUserId) {
      setErrors({ customerId: 'Please choose a customer before creating a ride.' });
      return;
    }
    const scheduledTime = `${form.scheduledDate}T${form.scheduledTime}:00`;
    const pickupLocation = form.pickup;
    const dropLocation = form.dropoff;
    setLoading(true);
    try {
      if (isDispatcher) {
        const parsedSelectedCustomerUserId = Number(selectedCustomerUserId);
        const selectedCustomer = customers.find(customer => (customer.userId ?? customer.id) === parsedSelectedCustomerUserId);
        if (!selectedCustomer) {
          setErrors({ customerId: 'Selected customer is invalid. Please pick again.' });
          setLoading(false);
          return;
        }

        if (user?.id && parsedSelectedCustomerUserId === user.id) {
          setErrors({ customerId: 'Invalid customer selection. Please choose a customer account.' });
          setLoading(false);
          return;
        }

        console.log('[Dispatcher Submit] selectedCustomerUserId:', parsedSelectedCustomerUserId);

        let resolvedFare = fareEstimate?.farePkr ?? null;
        if (!resolvedFare) {
          const recalculated = await estimateFareFromLocations(pickupLocation, dropLocation);
          resolvedFare = recalculated?.farePkr ?? null;
        }

        if (!resolvedFare) {
          toast({
            title: 'Fare unavailable',
            description: 'Could not calculate fare. Please refine pickup/drop-off and try again.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        await dispatcherApi.createRide(pickupLocation, dropLocation, scheduledTime, true, parsedSelectedCustomerUserId, resolvedFare);
      } else {
        await ridesApi.create(pickupLocation, dropLocation, scheduledTime, true);
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
          {isDispatcher ? 'Intra City Ride' : 'Book a Ride'}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {isDispatcher ? 'Create an intra-city booking on behalf of a customer.' : 'Request a long-distance ride.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isDispatcher && (
            <div className="space-y-2 rounded-lg border bg-card p-4">
              <p className="text-sm font-medium text-foreground">Customer Selection</p>
              <p className="text-xs text-muted-foreground">Search by email and select the customer this booking belongs to.</p>
              <div>
                <Label className="text-foreground">Search Customer by Email</Label>
                <Input
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Type customer email"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-foreground">Select Customer</Label>
                <Select
                  value={selectedCustomerUserId}
                  onValueChange={value => {
                    setSelectedCustomerUserId(value);
                    setErrors(prev => {
                      const next = { ...prev };
                      delete next.customerId;
                      return next;
                    });
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={customersLoading ? 'Loading customers...' : 'Choose customer'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCustomers.map(customer => (
                      <SelectItem key={customer.id} value={String(customer.userId ?? customer.id)}>
                        {`${customer.userId ?? customer.id} - ${customer.email}`}
                      </SelectItem>
                    ))}
                    {!customersLoading && filteredCustomers.length === 0 && (
                      <SelectItem value="none" disabled>No customers match your search</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.customerId && <p className="text-xs text-destructive mt-1">{errors.customerId}</p>}
              </div>
            </div>
          )}

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

          <div className="rounded-lg border bg-card p-3">
            <p className="text-sm font-medium text-foreground">Estimated Fare (PKR)</p>
            {fareLoading && <p className="text-xs text-muted-foreground mt-1">Calculating distance and fare...</p>}
            {!fareLoading && fareEstimate && (
              <p className="text-sm text-foreground mt-1">
                PKR {fareEstimate.farePkr.toLocaleString()} ({fareEstimate.distanceKm.toFixed(2)} km)
              </p>
            )}
            {!fareLoading && !fareEstimate && (
              <p className="text-xs text-muted-foreground mt-1">Enter pickup and drop-off to see fare.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground">Date</Label>
              <Input type="date" value={form.scheduledDate} onChange={update('scheduledDate')} min={today} required className="mt-1 text-black dark:text-foreground [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
            <div>
              <Label className="text-foreground">Time</Label>
              <Input type="time" value={form.scheduledTime} onChange={update('scheduledTime')} min={isToday ? currentTime : undefined} required className="mt-1 text-black dark:text-foreground [color-scheme:light] dark:[color-scheme:dark]" />
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
