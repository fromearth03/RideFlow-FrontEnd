import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const UnauthorizedPage = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="text-center">
      <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
      <h1 className="text-xl font-semibold text-foreground mb-2">Access Denied</h1>
      <p className="text-sm text-muted-foreground mb-6">You don't have permission to access this page.</p>
      <Button asChild variant="outline">
        <Link to="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  </div>
);

export default UnauthorizedPage;
