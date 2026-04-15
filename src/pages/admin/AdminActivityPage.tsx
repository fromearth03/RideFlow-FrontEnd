import { AppLayout } from '@/components/AppLayout';
import { Activity } from 'lucide-react';

const logs = [
  { id: 1, action: 'Ride created', user: 'Emily Clarke', role: 'dispatcher', details: 'Booking R8 created for Tom Baker', time: '10:02 AM' },
  { id: 2, action: 'Driver assigned', user: 'Emily Clarke', role: 'dispatcher', details: 'Mark Thompson assigned to R2', time: '09:45 AM' },
  { id: 3, action: 'Ride started', user: 'Sarah Mitchell', role: 'driver', details: 'Ride R1 en route from Heathrow to Manchester', time: '08:05 AM' },
  { id: 4, action: 'Ride completed', user: 'David Patel', role: 'driver', details: 'Ride R4 completed — £75', time: 'Yesterday, 5:15 PM' },
  { id: 5, action: 'User registered', user: 'System', role: 'system', details: 'New user Lisa Jones registered', time: 'Yesterday, 2:30 PM' },
  { id: 6, action: 'Vehicle maintenance', user: 'Robert Taylor', role: 'admin', details: 'Tesla Model S (UV24 WXY) set to maintenance', time: 'Yesterday, 11:00 AM' },
  { id: 7, action: 'Ride completed', user: 'Sarah Mitchell', role: 'driver', details: 'Ride R5 Edinburgh → Glasgow — £95', time: '12 Apr, 10:20 AM' },
  { id: 8, action: 'Driver added', user: 'Robert Taylor', role: 'admin', details: 'Karen White added as new driver', time: '11 Apr, 3:00 PM' },
];

const AdminActivityPage = () => (
  <AppLayout>
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Activity Log</h1>
        <p className="text-sm text-muted-foreground">System-wide activity and audit trail.</p>
      </div>

      <div className="space-y-2">
        {logs.map(log => (
          <div key={log.id} className="flex items-start gap-3 rounded-lg border bg-card p-4">
            <div className="mt-0.5 rounded-md bg-primary/10 p-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-card-foreground">{log.action}</span>
                <span className="status-badge status-assigned text-[10px]">{log.role}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{log.details}</p>
              <p className="text-xs text-muted-foreground mt-1">{log.user} · {log.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </AppLayout>
);

export default AdminActivityPage;
