import { useEffect, useMemo, useState } from 'react';
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
import { estimateFareFromLocations } from '@/lib/fare';
import type { ApiError, BackendCustomer } from '@/types';

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
  const [customers, setCustomers] = useState<BackendCustomer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isCustomerSuggestionsOpen, setIsCustomerSuggestionsOpen] = useState(false);
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
    return customers.filter(customer => customer.email.toLowerCase().startsWith(keyword));
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
    if (isDispatcher && !selectedCustomerId) {
      setErrors({ customerId: 'Please choose a customer before creating a ride.' });
      return;
    }
    // Combine to ISO 8601 format required by backend
    const scheduledTime = `${form.scheduledDate}T${form.scheduledTime}:00`;
    const pickupLocation = form.pickup;
    const dropLocation = form.dropoff;
    setLoading(true);
    try {
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

      if (isDispatcher) {
        const parsedSelectedCustomerId = Number(selectedCustomerId);
        const selectedCustomer = customers.find(customer => customer.id === parsedSelectedCustomerId);
        if (!selectedCustomer) {
          setErrors({ customerId: 'Selected customer is invalid. Please pick again.' });
          setLoading(false);
          return;
        }

        let resolvedCustomerUserId = Number(selectedCustomer.userId ?? 0);
        if (!Number.isFinite(resolvedCustomerUserId) || resolvedCustomerUserId <= 0) {
          resolvedCustomerUserId = await dispatcherApi.getCustomerUserIdByEmail(selectedCustomer.email);
        }

        if (user?.id && resolvedCustomerUserId === user.id) {
          setErrors({ customerId: 'Invalid customer selection. Please choose a customer account.' });
          setLoading(false);
          return;
        }

        console.log('[Dispatcher Submit] selectedCustomerId:', parsedSelectedCustomerId, 'resolvedCustomerUserId:', resolvedCustomerUserId);

        await dispatcherApi.createRide(pickupLocation, dropLocation, scheduledTime, false, resolvedCustomerUserId, resolvedFare);
      } else {
        await ridesApi.create(pickupLocation, dropLocation, scheduledTime, false, resolvedFare);
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
          Inter City Ride
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Create an inter-city booking on behalf of a customer.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isDispatcher && (
            <div className="space-y-2 rounded-lg border bg-card p-4">
              <p className="text-sm font-medium text-foreground">Customer Selection</p>
              <p className="text-xs text-muted-foreground">Search by email and select the customer this booking belongs to.</p>
              <div className="relative">
                <Label className="text-foreground">Search Customer by Email</Label>
                <Input
                  value={customerSearch}
                  onChange={e => {
                    const nextValue = e.target.value;
                    setCustomerSearch(nextValue);
                    setIsCustomerSuggestionsOpen(nextValue.trim().length > 0);
                    setSelectedCustomerId('');
                  }}
                  onFocus={() => {
                    if (customerSearch.trim().length > 0) {
                      setIsCustomerSuggestionsOpen(true);
                    }
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setIsCustomerSuggestionsOpen(false), 120);
                  }}
                  placeholder="Type customer email"
                  className="mt-1"
                />
                {isCustomerSuggestionsOpen && (
                  <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border border-border bg-popover shadow-lg">
                    {customersLoading && <p className="px-3 py-2 text-xs text-muted-foreground">Loading customers...</p>}
                    {!customersLoading && filteredCustomers.length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">No customers match your search</p>
                    )}
                    {!customersLoading && filteredCustomers.map(customer => (
                      <button
                        key={customer.id}
                        type="button"
                        className="w-full border-b border-border px-3 py-2 text-left text-sm text-foreground last:border-b-0 hover:bg-accent"
                        onMouseDown={event => {
                          event.preventDefault();
                          setSelectedCustomerId(String(customer.id));
                          setCustomerSearch(customer.email);
                          setIsCustomerSuggestionsOpen(false);
                          setErrors(prev => {
                            const next = { ...prev };
                            delete next.customerId;
                            return next;
                          });
                        }}
                      >
                        {`${customer.userId ?? customer.id} - ${customer.email}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-foreground">Select Customer</Label>
                <p className="mt-1 text-sm text-foreground">
                  {selectedCustomerId
                    ? (() => {
                        const selected = customers.find(customer => customer.id === Number(selectedCustomerId));
                        return selected ? `${selected.userId ?? selected.id} - ${selected.email}` : 'Choose customer';
                      })()
                    : 'Choose customer from search results above'}
                </p>
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

export default IntraCityRidePage;