type FunnelProperties = Record<string, string | number | boolean | undefined>;

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
