/**
 * Hostname-based routing for the Vibe Code Your Future campaign domain.
 * vibecodeyourfuture.com serves the campaign page at "/" while keeping the
 * URL visible (no redirects). trylaunch.ai is unaffected.
 */

export const CAMPAIGN_HOSTS = ['vibecodeyourfuture.com', 'www.vibecodeyourfuture.com'];
export const CAMPAIGN_ORIGIN = 'https://vibecodeyourfuture.com';

/** True when the current request hostname is the campaign domain. */
export function isCampaignHost(hostname: string = typeof window !== 'undefined' ? window.location.hostname : ''): boolean {
  return CAMPAIGN_HOSTS.includes(hostname.toLowerCase());
}
