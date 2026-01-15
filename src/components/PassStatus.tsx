import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Calendar } from 'lucide-react';
import { PassOption } from './PassOption';

interface PassStatusProps {
  hasActivePass: boolean;
  expiresAt: Date | null;
}

export const PassStatus = ({ hasActivePass, expiresAt }: PassStatusProps) => {
  if (hasActivePass && expiresAt) {
    const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle>Launch Pass</CardTitle>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
          <CardDescription>
            Your pass is active
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              Expires {format(expiresAt, 'MMMM d, yyyy')} ({daysRemaining} days remaining)
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            You have unlimited access to all Launch features including launches, relaunches, 
            and priority scheduling. Advertising is not included.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <PassOption />;
};
