import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('subscribe-to-newsletter', {
        body: { email },
      });

      if (error) throw error;

      toast.success('Successfully subscribed!');
      setEmail('');
    } catch (error: any) {
      console.error('Newsletter subscription error:', error);
      toast.error(error.message || 'Failed to subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-muted/30 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-center md:text-left">
        <Mail className="h-4 w-4 text-muted-foreground hidden md:block" />
        <div>
          <h3 className="text-sm font-semibold leading-tight">Get the Newsletter</h3>
          <p className="text-xs text-muted-foreground">Weekly launches, no filler.</p>
        </div>
      </div>
      <form onSubmit={handleSubscribe} className="flex gap-2 w-full md:w-auto md:min-w-[360px]">
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 h-9 text-sm"
          disabled={loading}
        />
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? '...' : 'Subscribe'}
        </Button>
      </form>
    </div>
  );
};
