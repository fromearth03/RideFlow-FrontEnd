import type { RideStatus } from '@/types';

const statusConfig: Record<RideStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'status-badge status-pending' },
  ASSIGNED: { label: 'Assigned', className: 'status-badge status-assigned' },
  IN_PROGRESS: { label: 'In Progress', className: 'status-badge status-in-progress' },
  COMPLETED: { label: 'Completed', className: 'status-badge status-completed' },
  CANCELLED: { label: 'Cancelled', className: 'status-badge status-cancelled' },
};

export const StatusBadge = ({ status }: { status: RideStatus }) => {
  const config = statusConfig[status] ?? { label: status, className: 'status-badge status-pending' };
  return <span className={config.className}>{config.label}</span>;
};
