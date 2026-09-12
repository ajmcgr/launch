type FunnelProperties = Record<string, string | number | boolean | undefined>;
const FUNNEL_ATTRIBUTION_KEY = 'launch_funnel_attribution';

declare global {
  interface Window {
    gtag?: (command: 'event', eventName: string, parameters?: FunnelProperties) => void;
  }
}

// Keep commercial funnel reporting in the analytics provider already loaded by index.html.
export const trackFunnelEvent = (eventName: string, properties: FunnelProperties = {}) => {
  if (typeof window === 'undefined') return;
  window.gtag?.('event', eventName, { ...properties, app: 'launch' });
};

// Keep the acquisition context through auth and checkout redirects in this browser.
export const setFunnelAttribution = (properties: FunnelProperties) => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(FUNNEL_ATTRIBUTION_KEY, JSON.stringify(properties));
};

export const getFunnelAttribution = (): FunnelProperties => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(sessionStorage.getItem(FUNNEL_ATTRIBUTION_KEY) || '{}') as FunnelProperties;
  } catch {
    return {};
  }
};
