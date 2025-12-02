import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DiscourseSso = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleSso = async () => {
      try {
        // Get SSO parameters from URL
        const sso = searchParams.get('sso');
        const sig = searchParams.get('sig');

        if (!sso || !sig) {
          toast.error('Invalid SSO request');
          navigate('/');
          return;
        }

        // Check if user is authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          // Store the SSO parameters and redirect to login
          const returnUrl = `/discourse-sso?sso=${encodeURIComponent(sso)}&sig=${encodeURIComponent(sig)}`;
          navigate(`/auth?returnTo=${encodeURIComponent(returnUrl)}`);
          return;
        }

        // User is authenticated, call the edge function with session token
        const { data, error } = await supabase.functions.invoke('discourse-sso', {
          body: { sso, sig },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          console.error('SSO error:', error);
          toast.error('Failed to authenticate with forum');
          navigate('/');
          return;
        }

        // Redirect to Discourse with the SSO response
        if (data?.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          toast.error('Invalid SSO response');
          navigate('/');
        }
      } catch (error: any) {
        console.error('SSO error:', error);
        toast.error('An error occurred during authentication');
        navigate('/');
      }
    };

    handleSso();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Connecting to forum...</p>
      </div>
    </div>
  );
};

export default DiscourseSso;
