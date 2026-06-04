import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { normalizeDomain, emailMatchesDomain } from '@/lib/domain';
import { format } from 'date-fns';

interface Props {
  product: any;
  currentUserId?: string;
  onClaimed?: () => void;
}

/**
 * Renders the submission-type badge, attribution line ("Submitted by @x"),
 * and the Claim This Product CTA for unclaimed Community Launches.
 */
export const SubmissionAttribution = ({ product, currentUserId, onClaimed }: Props) => {
  const type: 'founder' | 'community' = product?.submission_type || 'founder';
  const isCommunity = type === 'community';
  const isClaimed = !!product?.claimed_at;
  const productDomain = normalizeDomain(product?.domain_url);
  const submittedById = product?.submitted_by_user_id || product?.original_submitter_id;
  const ownerId = product?.owner_id;

  const [submitter, setSubmitter] = useState<{ username: string } | null>(null);
  const [owner, setOwner] = useState<{ username: string } | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);

  useEffect(() => {
    const ids = [submittedById, isClaimed ? ownerId : null].filter(Boolean) as string[];
    if (ids.length === 0) return;
    supabase.from('users').select('id, username').in('id', ids).then(({ data }) => {
      if (!data) return;
      setSubmitter(data.find((u) => u.id === submittedById) || null);
      if (isClaimed) setOwner(data.find((u) => u.id === ownerId) || null);
    });
  }, [submittedById, ownerId, isClaimed]);

  const canClaim = isCommunity && !isClaimed && !!currentUserId && currentUserId !== submittedById;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <span
        className={
          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ' +
          (isCommunity
            ? 'bg-muted text-muted-foreground'
            : 'bg-primary/10 text-primary')
        }
      >
        {isCommunity ? '🌎 Community Launch' : '🚀 Founder Launch'}
      </span>

      {isClaimed && owner && submitter && (
        <span className="text-muted-foreground">
          Originally submitted by{' '}
          <Link to={`/@${submitter.username}`} className="hover:text-primary font-medium">
            @{submitter.username}
          </Link>
          {' · '}
          Claimed by{' '}
          <Link to={`/@${owner.username}`} className="hover:text-primary font-medium">
            @{owner.username}
          </Link>
          {product.claimed_at ? ` on ${format(new Date(product.claimed_at), 'MMM d, yyyy')}` : null}
        </span>
      )}

      {!isClaimed && submitter && (
        <span className="text-muted-foreground">
          Submitted by{' '}
          <Link to={`/@${submitter.username}`} className="hover:text-primary font-medium">
            @{submitter.username}
          </Link>
        </span>
      )}

      {canClaim && (
        <Button size="sm" variant="default" onClick={() => setClaimOpen(true)}>
          Claim This Product
        </Button>
      )}

      <ClaimProductModal
        open={claimOpen}
        onOpenChange={setClaimOpen}
        productId={product.id}
        productName={product.name}
        productDomain={productDomain}
        currentUserId={currentUserId}
        onSuccess={() => {
          setClaimOpen(false);
          toast.success('Claim submitted! We will review it shortly.');
          onClaimed?.();
        }}
      />
    </div>
  );
};

interface ModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string;
  productName: string;
  productDomain: string | null;
  currentUserId?: string;
  onSuccess: () => void;
}

const ClaimProductModal = ({
  open,
  onOpenChange,
  productId,
  productName,
  productDomain,
  currentUserId,
  onSuccess,
}: ModalProps) => {
  const [tab, setTab] = useState<'email' | 'admin'>('email');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleEmailClaim = async () => {
    if (!currentUserId) {
      toast.error('Please sign in to claim');
      return;
    }
    if (!productDomain || !emailMatchesDomain(email, productDomain)) {
      toast.error(`Email must match the product domain (${productDomain || 'unknown'})`);
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-product-claim', {
        body: { productId, email: email.trim().toLowerCase() },
      });
      if (error || (data && (data as any).error)) {
        throw new Error((data && (data as any).error) || error?.message || 'Failed to send verification');
      }
      setSent(true);
      toast.success('Check your inbox for the verification link.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit claim');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminClaim = async () => {
    if (!currentUserId) {
      toast.error('Please sign in to claim');
      return;
    }
    if (!message.trim()) {
      toast.error('Please describe your relationship to this product');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from('product_claims').insert({
        product_id: productId,
        claimant_user_id: currentUserId,
        verification_method: 'admin',
        status: 'pending',
        message: message.trim(),
      });
      if (error) throw error;
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit claim');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Claim {productName}</DialogTitle>
          <DialogDescription>
            Verify you're the founder or an official representative to unlock founder analytics,
            milestones, and advertising tools.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b">
          <button
            type="button"
            onClick={() => setTab('email')}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === 'email' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Company email
          </button>
          <button
            type="button"
            onClick={() => setTab('admin')}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === 'admin' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Request review
          </button>
        </div>

        {tab === 'email' && !sent && (
          <div className="space-y-3">
            <Label htmlFor="claim-email">
              Email address {productDomain ? `@${productDomain}` : ''}
            </Label>
            <Input
              id="claim-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={productDomain ? `you@${productDomain}` : 'you@yourdomain.com'}
            />
            <p className="text-xs text-muted-foreground">
              We'll email you a verification link. Click it and the launch is instantly transferred to your account — no admin review.
            </p>
            <Button onClick={handleEmailClaim} disabled={submitting} className="w-full">
              {submitting ? 'Sending…' : 'Send verification email'}
            </Button>
          </div>
        )}

        {tab === 'email' && sent && (
          <div className="space-y-3 text-center py-4">
            <p className="text-sm">
              We sent a verification link to <strong>{email}</strong>.
            </p>
            <p className="text-xs text-muted-foreground">
              Click the link in the email to instantly claim this launch. The link expires in 24 hours.
            </p>
          </div>
        )}

        {tab === 'admin' && (
          <div className="space-y-3">
            <Label htmlFor="claim-msg">Tell us about your role</Label>
            <Textarea
              id="claim-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="I'm the founder of this product. Here's proof…"
              rows={5}
              maxLength={1000}
            />
            <Button onClick={handleAdminClaim} disabled={submitting} className="w-full">
              {submitting ? 'Submitting…' : 'Request admin review'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
