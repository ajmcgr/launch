import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMemberCount = () => {
  const { data: memberCount } = useQuery({
    queryKey: ['member-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const formattedMemberCount = useMemo(() => {
    const count = memberCount ?? 0;
    if (count < 100) return `${count}`;
    const rounded = Math.floor(count / 100) * 100;
    return `${rounded.toLocaleString()}+`;
  }, [memberCount]);

  return { memberCount: memberCount ?? 0, formattedMemberCount };
};

export const TrustPhrase = ({ className }: { className?: string }) => {
  const { formattedMemberCount } = useMemberCount();
  return (
    <p className={className ?? 'text-sm text-muted-foreground'}>
      Trusted by {formattedMemberCount} makers
    </p>
  );
};
