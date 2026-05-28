/**
 * Extract a registrable (root) domain from a URL or hostname.
 * Handles subdomains by returning the last two labels (best-effort, no PSL).
 * Examples:
 *   normalizeDomain('https://www.acme.com/path') => 'acme.com'
 *   normalizeDomain('acme.co.uk') => 'acme.co.uk' (best-effort)
 */
export function normalizeDomain(input?: string | null): string | null {
  if (!input) return null;
  try {
    const trimmed = input.trim().toLowerCase();
    const withProto = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./, '');
    return host || null;
  } catch {
    return null;
  }
}

/** Returns true if an email's domain matches (or is a subdomain of) the product domain. */
export function emailMatchesDomain(email: string, productDomain: string): boolean {
  const emailDomain = email.split('@')[1]?.toLowerCase().trim();
  const product = normalizeDomain(productDomain)?.toLowerCase();
  if (!emailDomain || !product) return false;
  return emailDomain === product || emailDomain.endsWith(`.${product}`);
}
