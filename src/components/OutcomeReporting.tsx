import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Target, Copy, Check, Link2, TrendingUp, DollarSign, Users } from 'lucide-react';

interface OutcomeReportingProps {
  productId: string;
  productSlug: string;
  productName: string;
}

interface OutcomeData {
  signups: number | null;
  revenue: number | null;
  testimonial: string;
}

interface StoredOutcome {
  id: string;
  product_id: string;
  signups: number | null;
  revenue: number | null;
  testimonial: string | null;
  updated_at: string;
}

const OutcomeReporting = ({ productId, productSlug, productName }: OutcomeReportingProps) => {
  const [outcome, setOutcome] = useState<OutcomeData>({ signups: null, revenue: null, testimonial: '' });
  const [existingOutcome, setExistingOutcome] = useState<StoredOutcome | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const trackableLink = `https://trylaunch.ai/go/${productSlug}`;

  useEffect(() => {
    const loadOutcome = async () => {
      const { data, error } = await (supabase as any)
        .from('product_outcomes')
        .select('*')
        .eq('product_id', productId)
        .single();

      if (data && !error) {
        setExistingOutcome(data as StoredOutcome);
        setOutcome({
          signups: data.signups,
          revenue: data.revenue,
          testimonial: data.testimonial || '',
        });
      }
    };
    loadOutcome();
  }, [productId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(trackableLink);
    setCopied(true);
    toast.success('Trackable link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        product_id: productId,
        signups: outcome.signups,
        revenue: outcome.revenue,
        testimonial: outcome.testimonial || null,
        updated_at: new Date().toISOString(),
      };

      if (existingOutcome) {
        const { error } = await (supabase as any)
          .from('product_outcomes')
          .update(payload)
          .eq('id', existingOutcome.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('product_outcomes')
          .insert(payload);
        if (error) throw error;
      }

      toast.success('Outcomes saved!');
      setExistingOutcome({ ...existingOutcome, ...payload } as StoredOutcome);
    } catch (err) {
      console.error('Save outcome error:', err);
      toast.error('Failed to save outcomes. The table may not be set up yet.');
    } finally {
      setSaving(false);
    }
  };

  const [referralClicks, setReferralClicks] = useState(0);
  useEffect(() => {
    const fetchClicks = async () => {
      const { count } = await supabase
        .from('product_analytics')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', productId)
        .eq('event_type', 'referral_click');
      setReferralClicks(count || 0);
    };
    fetchClicks();
  }, [productId]);

  return (
    <div className="space-y-6">
      {/* Trackable Link Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Your Trackable Launch Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Share this link instead of your direct URL. It tracks clicks from Launch and adds UTM parameters so you can measure results in your own analytics.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-background border rounded-md px-3 py-2 text-sm font-mono truncate">
              {trackableLink}
            </div>
            <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0 gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          {referralClicks > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{referralClicks}</span> clicks tracked through this link
            </p>
          )}
          <div className="bg-background/50 rounded-md p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">UTM parameters added automatically:</p>
            <p><code className="bg-muted px-1 rounded">utm_source=trylaunch</code></p>
            <p><code className="bg-muted px-1 rounded">utm_medium=referral</code></p>
            <p><code className="bg-muted px-1 rounded">utm_campaign={productSlug}</code></p>
          </div>
        </CardContent>
      </Card>

      {/* Outcome Reporting Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Report Your Launch Outcomes
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            How did your launch perform? This helps us improve the platform and showcase success stories.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="signups" className="flex items-center gap-1.5 text-sm">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                Signups / New Users
              </Label>
              <Input
                id="signups"
                type="number"
                min="0"
                placeholder="e.g. 47"
                value={outcome.signups ?? ''}
                onChange={(e) => setOutcome(prev => ({ ...prev, signups: e.target.value ? parseInt(e.target.value) : null }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenue" className="flex items-center gap-1.5 text-sm">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                Revenue Generated ($)
              </Label>
              <Input
                id="revenue"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 230"
                value={outcome.revenue ?? ''}
                onChange={(e) => setOutcome(prev => ({ ...prev, revenue: e.target.value ? parseFloat(e.target.value) : null }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="testimonial" className="flex items-center gap-1.5 text-sm">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              What results did Launch help you achieve?
            </Label>
            <Textarea
              id="testimonial"
              placeholder="e.g. 'Got 47 signups in 48 hours and closed my first 3 paying customers from Launch traffic.'"
              value={outcome.testimonial}
              onChange={(e) => setOutcome(prev => ({ ...prev, testimonial: e.target.value }))}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">{outcome.testimonial.length}/500</p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? 'Saving...' : existingOutcome ? 'Update Outcomes' : 'Save Outcomes'}
          </Button>

          {existingOutcome && (
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(existingOutcome.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OutcomeReporting;
