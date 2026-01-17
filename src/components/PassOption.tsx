import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Zap, X } from 'lucide-react';

interface PassOptionProps {
  onClose?: () => void;
  showClose?: boolean;
  variant?: 'inline' | 'modal';
}

export const PassOption = ({ onClose, showClose = false, variant = 'inline' }: PassOptionProps) => {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to continue');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          plan: 'annual_access',
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Pass purchase error:', error);
      toast.error('Failed to initiate purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`relative ${variant === 'modal' ? 'border-0 shadow-none' : ''}`}>
      {showClose && onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Launch Pass</CardTitle>
        </div>
        <CardDescription className="text-sm">
          For frequent builders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">$99</span>
          <span className="text-muted-foreground">/year</span>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Annual subscription for unlimited launches. Cancel anytime.
        </p>
        
        <ul className="text-sm space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>All launches and relaunches included</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>Choose any launch date and time</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>Newsletter and social media promotion</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-muted-foreground">–</span>
            <span className="text-muted-foreground">Advertising not included</span>
          </li>
        </ul>

        <Separator />

        <Button
          onClick={handlePurchase}
          disabled={loading}
          className="w-full"
          variant="outline"
        >
          {loading ? 'Processing...' : 'Subscribe Now'}
        </Button>
      </CardContent>
    </Card>
  );
};
