import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Calendar, AlertCircle } from 'lucide-react';
import { PassOption } from './PassOption';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface PassStatusProps {
  hasActivePass: boolean;
  expiresAt: Date | null;
  cancelAtPeriodEnd?: boolean;
  subscriptionStatus?: string | null;
  onStatusChange?: () => void;
}

export const PassStatus = ({ 
  hasActivePass, 
  expiresAt, 
  cancelAtPeriodEnd = false,
  subscriptionStatus,
  onStatusChange 
}: PassStatusProps) => {
  const [loading, setLoading] = useState(false);

  const handleCancelSubscription = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to continue');
        return;
      }

      const { error } = await supabase.functions.invoke('cancel-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success('Your subscription will be canceled at the end of the billing period');
      onStatusChange?.();
    } catch (error) {
      console.error('Cancel subscription error:', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to continue');
        return;
      }

      const { error } = await supabase.functions.invoke('reactivate-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success('Your subscription has been reactivated');
      onStatusChange?.();
    } catch (error) {
      console.error('Reactivate subscription error:', error);
      toast.error('Failed to reactivate subscription');
    } finally {
      setLoading(false);
    }
  };

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
            <div className="flex items-center gap-2">
              {cancelAtPeriodEnd && (
                <Badge variant="secondary" className="text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400">
                  Canceling
                </Badge>
              )}
              <Badge variant="default">Active</Badge>
            </div>
          </div>
          <CardDescription>
            {cancelAtPeriodEnd 
              ? 'Your subscription is set to cancel at the end of the billing period'
              : 'Your subscription is active'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {cancelAtPeriodEnd ? 'Access until' : 'Renews'} {format(expiresAt, 'MMMM d, yyyy')} ({daysRemaining} days remaining)
            </span>
          </div>
          
          {cancelAtPeriodEnd && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-sm">
                Your subscription is scheduled to be canceled. You'll lose access to Launch Pass features after the current period ends.
              </p>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground">
            You have unlimited access to all Launch features including launches, relaunches, 
            and priority scheduling. Advertising is not included.
          </p>

          <div className="pt-2">
            {cancelAtPeriodEnd ? (
              <Button 
                onClick={handleReactivateSubscription} 
                disabled={loading}
                variant="default"
              >
                {loading ? 'Processing...' : 'Reactivate Subscription'}
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    Cancel Subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your subscription will remain active until {format(expiresAt, 'MMMM d, yyyy')}. 
                      After that, you'll lose access to Launch Pass features. You can reactivate anytime before then.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleCancelSubscription}
                      disabled={loading}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {loading ? 'Canceling...' : 'Yes, Cancel'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return <PassOption />;
};
