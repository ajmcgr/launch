/**
 * Hostname-based routing for the Vibe Coded It campaign domain.
 * vibecodedit.com serves the campaign page at "/" while keeping the
 * URL visible (no redirects). trylaunch.ai is unaffected.
 */

export const CAMPAIGN_HOSTS = ['vibecodedit.com', 'www.vibecodedit.com'];
export const CAMPAIGN_ORIGIN = 'https://vibecodedit.com';

/** True when the current request hostname is the campaign domain. */
export function isCampaignHost(hostname: string = typeof window !== 'undefined' ? window.location.hostname : ''): boolean {
  return CAMPAIGN_HOSTS.includes(hostname.toLowerCase());
}
