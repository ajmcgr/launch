import { supabase } from '@/integrations/supabase/client';

// Get or create a visitor ID for tracking
const getVisitorId = (): string => {
  let visitorId = localStorage.getItem('visitor_id');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem('visitor_id', visitorId);
  }
  return visitorId;
};

// Session-based deduplication for impressions
const getSessionImpressionKey = (): string => {
  // Create a session key that resets on page refresh
  let sessionKey = sessionStorage.getItem('sponsor_session_key');
  if (!sessionKey) {
    sessionKey = crypto.randomUUID();
    sessionStorage.setItem('sponsor_session_key', sessionKey);
  }
  return sessionKey;
};

// Track which impressions have been recorded this session
const trackedImpressions = new Set<string>();

// Track sponsor impression (called when sponsor appears in viewport)
export const trackSponsorImpression = async (productId: string, position: number) => {
  try {
    const sessionKey = getSessionImpressionKey();
    const impressionKey = `${sessionKey}-${productId}-${position}`;
    
    // Skip if already tracked this session
    if (trackedImpressions.has(impressionKey)) {
      return;
    }
    
    trackedImpressions.add(impressionKey);
    
    const visitorId = getVisitorId();
    await supabase.from('sponsor_analytics').insert({
      product_id: productId,
      event_type: 'impression',
      visitor_id: visitorId,
      sponsored_position: position,
    });
  } catch (error) {
    console.error('Failed to track sponsor impression:', error);
  }
};

// Track sponsor click (called when user clicks on sponsored product)
export const trackSponsorClick = async (productId: string, position?: number) => {
  try {
    const visitorId = getVisitorId();
    await supabase.from('sponsor_analytics').insert({
      product_id: productId,
      event_type: 'click',
      visitor_id: visitorId,
      sponsored_position: position ?? null,
    });
  } catch (error) {
    console.error('Failed to track sponsor click:', error);
  }
};
