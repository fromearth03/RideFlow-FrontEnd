import { useNavigate } from 'react-router-dom';
import { Headphones, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const DispatcherHomeDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dispatcher Dashboard</h1>
        <p className="text-sm text-muted-foreground">Quick access to booking and dispatch operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">City-to-City Booking</h2>
          </div>
          <p className="text-sm text-muted-foreground">View and manage all city-to-city ride bookings.</p>
          <Button onClick={() => navigate('/dispatch/rides')} variant="outline">Open City-to-City Booking</Button>
        </div>

        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Create City Booking</h2>
          </div>
          <p className="text-sm text-muted-foreground">Create a new booking on behalf of a customer.</p>
          <Button onClick={() => navigate('/dispatch/rides/new')}>Create Booking</Button>
        </div>
      </div>
    </div>
  );
};
