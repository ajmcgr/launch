import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ChevronUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SurfacedProduct {
  id: string;
  name: string;
  tagline: string | null;
  slug: string;
  net_votes?: number;
}

interface SurfacedBuilder {
  id: string;
  username: string;
  name: string | null;
  avatar_url?: string;
  product_count: number;
}

const ProductItem = ({ product, showVotes = true }: { product: SurfacedProduct; showVotes?: boolean }) => (
  <Link 
    to={`/launch/${product.slug}`}
    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-accent/50 transition-colors group"
  >
    <div className="flex-1 min-w-0 mr-3">
      <span className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">
        {product.name}
      </span>
      {product.tagline && (
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {product.tagline}
        </p>
      )}
    </div>
    {showVotes && product.net_votes !== undefined && (
      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <ChevronUp className="h-3.5 w-3.5" />
        <span>{product.net_votes}</span>
      </div>
    )}
  </Link>
);

const BuilderItem = ({ builder }: { builder: SurfacedBuilder }) => (
  <Link 
    to={`/${builder.username}`}
    className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/50 transition-colors group"
  >
    <Avatar className="h-8 w-8">
      <AvatarImage src={builder.avatar_url} alt={builder.name || builder.username} />
      <AvatarFallback className="text-xs">
        {(builder.name || builder.username).slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <span className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">
        {builder.name || builder.username}
      </span>
      <p className="text-xs text-muted-foreground">
        @{builder.username} · {builder.product_count} product{builder.product_count !== 1 ? 's' : ''}
      </p>
    </div>
  </Link>
);

const SectionCard = ({ 
  title, 
  children, 
  isLoading,
  isEmpty 
}: { 
  title: string; 
  children: React.ReactNode;
  isLoading: boolean;
  isEmpty: boolean;
}) => (
  <Card className="bg-card/50">
    <CardHeader className="pb-2 pt-4 px-4">
      <CardTitle className="text-sm font-semibold">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="px-2 pb-3">
      {isLoading ? (
        <div className="space-y-2 px-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : isEmpty ? (
        <p className="text-xs text-muted-foreground py-3 text-center">
          Nothing to show yet
        </p>
      ) : (
        <div className="space-y-1">
          {children}
        </div>
      )}
    </CardContent>
  </Card>
);

export const ThisWeekHighlights = () => {
  // Get today's date range in UTC
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  
  // Date ranges for various queries
  const twoWeeksAgo = new Date(todayUTC.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(todayUTC.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // Weekly Winners - top voted products this week
  const { data: weeklyWinners, isLoading: weeklyLoading } = useQuery({
    queryKey: ['home-weekly-winners', twoWeeksAgo],
    queryFn: async () => {
      const [productsRes, votesRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, tagline, slug')
          .eq('status', 'launched')
          .gte('launch_date', twoWeeksAgo),
        supabase
          .from('product_vote_counts')
          .select('product_id, net_votes')
      ]);
      
      if (productsRes.error) throw productsRes.error;
      
      const votesMap = new Map((votesRes.data || []).map((v: any) => [v.product_id, v.net_votes || 0]));
      
      const mapped = (productsRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        slug: p.slug,
        net_votes: votesMap.get(p.id) || 0,
      }));
      
      return mapped.sort((a, b) => (b.net_votes || 0) - (a.net_votes || 0)).slice(0, 5);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Hidden Gems - recent products with fewer votes
  const { data: hiddenGems, isLoading: gemsLoading } = useQuery({
    queryKey: ['home-hidden-gems'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(todayUTC.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const [productsRes, votesRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, tagline, slug')
          .eq('status', 'launched')
          .gte('launch_date', thirtyDaysAgo)
          .order('launch_date', { ascending: false })
          .limit(50),
        supabase
          .from('product_vote_counts')
          .select('product_id, net_votes')
      ]);
      
      if (productsRes.error) throw productsRes.error;
      
      const votesMap = new Map((votesRes.data || []).map((v: any) => [v.product_id, v.net_votes || 0]));
      
      const mapped = (productsRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        slug: p.slug,
        net_votes: votesMap.get(p.id) || 0,
      }));
      
      return mapped
        .filter((p) => (p.net_votes || 0) >= 1 && (p.net_votes || 0) <= 10)
        .slice(0, 5);
    },
    staleTime: 5 * 60 * 1000,
  });

  // New & Noteworthy - newest launches with at least 1 vote
  const { data: newNoteworthy, isLoading: newNoteworthyLoading } = useQuery({
    queryKey: ['home-new-noteworthy', threeDaysAgo],
    queryFn: async () => {
      const [productsRes, votesRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, tagline, slug')
          .eq('status', 'launched')
          .gte('launch_date', threeDaysAgo)
          .order('launch_date', { ascending: false }),
        supabase
          .from('product_vote_counts')
          .select('product_id, net_votes')
      ]);
      
      if (productsRes.error) throw productsRes.error;
      
      const votesMap = new Map((votesRes.data || []).map((v: any) => [v.product_id, v.net_votes || 0]));
      
      const mapped = (productsRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        slug: p.slug,
        net_votes: votesMap.get(p.id) || 0,
      }));
      
      return mapped.filter((p) => (p.net_votes || 0) >= 1).slice(0, 5);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Builders to Watch - users with multiple products
  const { data: buildersToWatch, isLoading: buildersLoading } = useQuery({
    queryKey: ['home-builders-to-watch'],
    queryFn: async () => {
      const { data: makers, error } = await supabase
        .from('product_makers')
        .select(`
          user_id,
          users(id, username, name, avatar_url)
        `)
        .limit(200);
      
      if (error) throw error;
      
      const builderCounts: Record<string, { user: any; count: number }> = {};
      (makers || []).forEach((m: any) => {
        if (m.users) {
          const userId = m.users.id;
          if (!builderCounts[userId]) {
            builderCounts[userId] = { user: m.users, count: 0 };
          }
          builderCounts[userId].count++;
        }
      });
      
      return Object.values(builderCounts)
        .filter((b) => b.count >= 2)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((b) => ({
          id: b.user.id,
          username: b.user.username,
          name: b.user.name,
          avatar_url: b.user.avatar_url,
          product_count: b.count,
        }));
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section className="py-6 bg-background">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-2xl font-bold text-center mb-8">This Week on Launch</h2>

        <div className="space-y-4">
          <SectionCard 
            title="📈 Weekly Winners"
            isLoading={weeklyLoading}
            isEmpty={!weeklyWinners?.length}
          >
            {weeklyWinners?.map((product) => (
              <ProductItem key={product.id} product={product} />
            ))}
          </SectionCard>

          <SectionCard 
            title="✨ New & Noteworthy"
            isLoading={newNoteworthyLoading}
            isEmpty={!newNoteworthy?.length}
          >
            {newNoteworthy?.map((product) => (
              <ProductItem key={product.id} product={product} />
            ))}
          </SectionCard>

          <SectionCard 
            title="💎 Hidden Gems"
            isLoading={gemsLoading}
            isEmpty={!hiddenGems?.length}
          >
            {hiddenGems?.map((product) => (
              <ProductItem key={product.id} product={product} />
            ))}
          </SectionCard>

          <SectionCard 
            title="👀 Builders to Watch"
            isLoading={buildersLoading}
            isEmpty={!buildersToWatch?.length}
          >
            {buildersToWatch?.map((builder) => (
              <BuilderItem key={builder.id} builder={builder} />
            ))}
          </SectionCard>
        </div>
      </div>
    </section>
  );
};
