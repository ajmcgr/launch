import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface ExternalRedirectProps {
  /** Absolute destination origin, e.g. "https://vibecodedit.com" */
  to: string;
  /** Path prefix stripped from the current pathname before appending the rest. */
  stripPrefix?: string;
}

/**
 * Permanent redirect to an external site.
 *
 * The Vibe Coded It campaign now lives at its own domain. This is a SPA, so the
 * true 301 must be configured at the hosting/edge layer; this component is the
 * client-side fallback. It preserves the remaining path and the full query
 * string (source, utm_*, ref, ...) and uses `location.replace` so the old URL
 * does not stay in history.
 */
export const ExternalRedirect = ({ to, stripPrefix = '' }: ExternalRedirectProps) => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    const rest = stripPrefix && pathname.startsWith(stripPrefix)
      ? pathname.slice(stripPrefix.length)
      : '';
    window.location.replace(`${to}${rest}${search}${hash}`);
  }, [to, stripPrefix, pathname, search, hash]);

  return null;
};

export default ExternalRedirect;
