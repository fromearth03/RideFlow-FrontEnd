import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

type RideFlowLogoProps = {
  textClassName?: string;
  iconWrapClassName?: string;
  iconClassName?: string;
  className?: string;
};

export const RideFlowLogo = ({
  textClassName,
  iconWrapClassName,
  iconClassName,
  className,
}: RideFlowLogoProps) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-primary', iconWrapClassName)}>
        <Shield className={cn('h-5 w-5 text-primary-foreground', iconClassName)} />
      </div>
      <span className={cn('text-xl font-bold text-foreground', textClassName)}>RideFlow</span>
    </div>
  );
};
