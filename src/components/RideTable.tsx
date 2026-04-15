import type { BackendRide } from '@/types';
import { StatusBadge } from './StatusBadge';

interface Props {
  rides: BackendRide[];
  actions?: (ride: BackendRide) => React.ReactNode;
}

export const RideTable = ({ rides, actions }: Props) => {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Pickup</th>
            <th>Drop-off</th>
            <th>Status</th>
            <th>Driver</th>
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rides.map(ride => (
            <tr key={ride.id}>
              <td className="font-mono text-xs text-muted-foreground">#{ride.id}</td>
              <td className="font-medium max-w-[180px] truncate">{ride.pickupLocation}</td>
              <td className="text-muted-foreground max-w-[180px] truncate">{ride.dropLocation}</td>
              <td><StatusBadge status={ride.status} /></td>
              <td className="text-muted-foreground">{ride.driverId ? `#${ride.driverId}` : '—'}</td>
              {actions && <td onClick={e => e.stopPropagation()}>{actions(ride)}</td>}
            </tr>
          ))}
          {rides.length === 0 && (
            <tr>
              <td colSpan={actions ? 6 : 5} className="py-8 text-center text-muted-foreground">No rides found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
