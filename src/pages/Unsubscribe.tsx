import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const email = (params.get('email') || '').trim();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('invalid');
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('outreach-unsubscribe', {
          body: { email },
        });
        if (error || (data as any)?.error) {
          setStatus('error');
          setErrorMsg(error?.message || (data as any)?.error || 'Something went wrong');
        } else {
          setStatus('success');
        }
      } catch (e: any) {
        setStatus('error');
        setErrorMsg(e?.message || 'Network error');
      }
    })();
  }, [email]);

  return (
    <>
      <Helmet>
        <title>Unsubscribe · Launch</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="font-reckless text-3xl">Unsubscribe</h1>
          {status === 'loading' && (
            <p className="text-muted-foreground">Processing your request...</p>
          )}
          {status === 'invalid' && (
            <p className="text-muted-foreground">No email provided. The unsubscribe link appears to be malformed.</p>
          )}
          {status === 'success' && (
            <>
              <p className="text-foreground">
                You're unsubscribed from outreach emails. <span className="font-medium">{email}</span> won't receive further cold outreach from us.
              </p>
              <p className="text-sm text-muted-foreground">
                This only affects outreach. To manage other emails (product notifications, weekly newsletter, daily digest), update preferences in <a href="/settings" className="underline">your settings</a> or use the unsubscribe link in those specific emails.
              </p>
              <p className="text-sm text-muted-foreground">
                Changed your mind? Email <a href="mailto:alex@trylaunch.ai" className="underline">alex@trylaunch.ai</a> and we'll re-enable you.
              </p>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="text-destructive">We couldn't process your unsubscribe request.</p>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <p className="text-sm text-muted-foreground">
                Please email <a href="mailto:alex@trylaunch.ai" className="underline">alex@trylaunch.ai</a> and we'll handle it manually.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
