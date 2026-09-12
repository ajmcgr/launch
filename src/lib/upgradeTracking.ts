import { supabase } from '@/integrations/supabase/client';

export type UpgradeTriggerType =
  | 'post_submission'
  | 'low_rank'
  | 'live_window'
  | 'low_traction'
  | 'product_detail_sidebar'
  | 'instant_launch_modal'
  | 'instant_launch_banner'
  | 'instant_launch_card'
  | 'analytics_boost';

export type UpgradeTriggerEvent =
  | 'trigger_shown'
  | 'trigger_clicked'
  | 'trigger_dismissed'
  | 'checkout_started'
  | 'checkout_completed';

const DISMISS_KEY = 'upgrade_nudge_dismissed';
const SHOWN_KEY = 'upgrade_nudge_shown_session';
const CHECKOUT_KEY = 'launch_upgrade_checkout';

/**
 * Track an upgrade trigger event via product_analytics
 */
export const trackUpgradeTrigger = async (
  productId: string,
  triggerType: UpgradeTriggerType,
  event: UpgradeTriggerEvent
) => {
  try {
    const { error } = await supabase.from('product_analytics').insert({
      product_id: productId,
      // product_analytics has no referrer column. Encode the surface in the
      // event name so every funnel step can be queried without a schema change.
      event_type: `upgrade_${triggerType}_${event}`,
    });
    if (error) throw error;
  } catch (err) {
    console.error('Failed to track upgrade trigger:', err);
  }
};

export const setUpgradeCheckoutAttribution = (productId: string, triggerType: UpgradeTriggerType) => {
  sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify({ productId, triggerType, startedAt: Date.now() }));
};

export const consumeUpgradeCheckoutAttribution = (): { productId: string; triggerType: UpgradeTriggerType } | null => {
  try {
    const value = sessionStorage.getItem(CHECKOUT_KEY);
    sessionStorage.removeItem(CHECKOUT_KEY);
    if (!value) return null;
    const attribution = JSON.parse(value);
    // A cancelled checkout should not be credited to a different later payment.
    if (!attribution.startedAt || Date.now() - attribution.startedAt > 2 * 60 * 60 * 1000) return null;
    return attribution;
  } catch {
    sessionStorage.removeItem(CHECKOUT_KEY);
    return null;
  }
};

export const clearUpgradeCheckoutAttribution = () => sessionStorage.removeItem(CHECKOUT_KEY);

/**
 * Check if user has dismissed this trigger type recently (within session)
 */
export const isDismissed = (triggerType: UpgradeTriggerType, productId: string): boolean => {
  const key = `${DISMISS_KEY}_${triggerType}_${productId}`;
  return sessionStorage.getItem(key) === 'true';
};

/**
 * Mark a trigger as dismissed for this session
 */
export const dismissTrigger = (triggerType: UpgradeTriggerType, productId: string) => {
  const key = `${DISMISS_KEY}_${triggerType}_${productId}`;
  sessionStorage.setItem(key, 'true');
};

/**
 * Check if we've already shown a trigger this session (max 1 active)
 */
export const hasShownTriggerThisSession = (): boolean => {
  return sessionStorage.getItem(SHOWN_KEY) === 'true';
};

/**
 * Mark that we've shown a trigger this session
 */
export const markTriggerShown = () => {
  sessionStorage.setItem(SHOWN_KEY, 'true');
};

/**
 * Determine the best upgrade trigger to show for a product
 */
export const getBestTrigger = (product: {
  id: string;
  orderPlan?: string | null;
  status: string;
  launch_date?: string | null;
  rank?: number;
  pageViews?: number;
  netVotes?: number;
}): UpgradeTriggerType | null => {
  // Stop condition: already on Pro or higher
  if (product.orderPlan && !['free', 'join'].includes(product.orderPlan)) return null;
  if (product.status !== 'launched') return null;

  // Priority 1: Low rank (most urgent)
  if (product.rank && product.rank > 5) return 'low_rank';

  // Priority 2: Live window active
  if (product.launch_date) {
    const launch = new Date(product.launch_date);
    const now = new Date();
    const hoursSinceLaunch = (now.getTime() - launch.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLaunch >= 0 && hoursSinceLaunch <= 48) return 'live_window';
  }

  // Priority 3: Low traction
  if (product.launch_date) {
    const launch = new Date(product.launch_date);
    const now = new Date();
    const hoursSinceLaunch = (now.getTime() - launch.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLaunch > 6 && ((product.pageViews || 0) < 20 || (product.netVotes || 0) < 3)) {
      return 'low_traction';
    }
  }

  return null;
};
