/**
 * Vibe Coded It campaign plumbing.
 *
 * Reuses the existing Launch product/analytics infrastructure — the campaign is
 * just metadata attached to a normal Launch submission. No separate product,
 * database, submission flow or API.
 */

import { supabase } from '@/integrations/supabase/client';

export const CAMPAIGN_SLUG = 'vibe_code_your_future';
export const CAMPAIGN_NAME = 'Vibe Coded It';
export const CAMPAIGN_PATH = '/vibecodedit';

const STORAGE_KEY = 'launch_campaign_intent';

/** Remember that the current submission started from the campaign page. */
export const setCampaignIntent = (campaign: string = CAMPAIGN_SLUG) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, campaign);
  } catch {
    /* storage unavailable — campaign tagging is best-effort */
  }
};

/** Read the pending campaign for this submission session. */
export const getCampaignIntent = (): string | null => {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const clearCampaignIntent = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
};

/**
 * Pick up ?campaign= / ?source= / ?utm_campaign= from the URL so links into the
 * submission flow from anywhere keep their attribution.
 */
export const captureCampaignFromSearch = (search: string): string | null => {
  const params = new URLSearchParams(search);
  const value =
    params.get('campaign') || params.get('source') || params.get('utm_campaign');
  if (value) {
    setCampaignIntent(value);
    return value;
  }
  return getCampaignIntent();
};

export type CampaignEvent =
  | 'campaign_page_view'
  | 'campaign_cta_clicked'
  | 'campaign_submission_started'
  | 'campaign_submission_completed'
  | 'builder_wall_card_clicked'
  | 'builder_wall_share_clicked'
  | 'campaign_email_sent'
  | 'campaign_launch_page_view'
  | 'campaign_search_submitted'
  | 'campaign_newsletter_subscribed';

/**
 * Fire-and-forget campaign analytics. No personal information is ever sent —
 * only the event name, the campaign slug and (when relevant) a product id.
 */
export const trackCampaignEvent = async (
  event: CampaignEvent,
  productId?: string | null,
  campaign: string = CAMPAIGN_SLUG
) => {
  try {
    await (supabase as any).from('campaign_events').insert({
      campaign,
      event_type: event,
      product_id: productId ?? null,
    });
  } catch (err) {
    // Table may not exist yet — analytics must never break the experience.
    console.debug('campaign event skipped', event, err);
  }
};

/** Marks a product as having come through the campaign. Best-effort. */
export const tagProductWithCampaign = async (
  productId: string,
  campaign: string = CAMPAIGN_SLUG
) => {
  try {
    await (supabase as any).from('products').update({ campaign }).eq('id', productId);
  } catch (err) {
    console.debug('campaign tag skipped', err);
  }
};
