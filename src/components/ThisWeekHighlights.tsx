import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { ArrowUp, MessageSquare, ExternalLink, Globe } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatTimeAgo } from '@/lib/formatTime';
import { PlatformIcons, Platform } from '@/components/PlatformIcons';
import defaultProductIcon from '@/assets/default-product-icon.png';
import { toast } from 'sonner';
import { ProductSkeleton } from '@/components/ProductSkeleton';
import { getWeek } from 'date-fns';
import roachBanner from '@/assets/sponsors/roach-banner.png';
import bioBanner from '@/assets/sponsors/bio-banner.png';
import { LaunchListItem } from '@/components/LaunchListItem';
import { LaunchCard } from '@/components/LaunchCard';
import { CompactLaunchListItem } from '@/components/CompactLaunchListItem';
...
export const ThisWeekHighlights = ({ view = 'list' }: { view?: 'list' | 'grid' | 'compact' }) => {
  const [user, setUser] = useState<any>(null);
  const [userVotes, setUserVotes] = useState<Map<string, 1>>(new Map());
  const [localVoteChanges, setLocalVoteChanges] = useState<Map<string, { voted: boolean; delta: number }>>(new Map());
  // Date calculations are now done inside each query function to ensure stability
...
  const handleVote = async (productId: string) => {
    if (!user) {
      toast('Sign up to upvote your favorite launches', {
        action: {
          label: 'Sign up',
          onClick: () => {
            window.location.href = '/auth?signup=true';
          },
        },
      });
      return;
    }

    const currentVoted = userVotes.has(productId) || localVoteChanges.get(productId)?.voted;
    const newVoted = !currentVoted;
    const delta = newVoted ? 1 : -1;

    setLocalVoteChanges(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(productId);
      newMap.set(productId, {
        voted: newVoted,
        delta: (existing?.delta || 0) + delta,
      });
      return newMap;
    });

    setUserVotes(prev => {
      const newMap = new Map(prev);
      if (newVoted) {
        newMap.set(productId, 1);
      } else {
        newMap.delete(productId);
      }
      return newMap;
    });

    try {
      const { data: existingVotes, error: existingVotesError } = await supabase
        .from('votes')
        .select('id, value')
        .eq('product_id', productId)
        .eq('user_id', user.id);

      if (existingVotesError) throw existingVotesError;

      if (existingVotes && existingVotes.length > 0) {
        const hasActiveUpvote = existingVotes.some(vote => vote.value === 1);

        if (hasActiveUpvote) {
          const { error: deleteError } = await supabase
            .from('votes')
            .delete()
            .eq('product_id', productId)
            .eq('user_id', user.id);

          if (deleteError) throw deleteError;
        } else {
          const voteIds = existingVotes.map(vote => vote.id);
          const { error: updateError } = await supabase
            .from('votes')
            .update({ value: 1 })
            .in('id', voteIds);

          if (updateError) throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('votes')
          .insert({ product_id: productId, user_id: user.id, value: 1 });

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to record vote');
      setLocalVoteChanges(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(productId);
        if (existing) {
          newMap.set(productId, {
            voted: !newVoted,
            delta: existing.delta - delta,
          });
        }
        return newMap;
      });
      setUserVotes(prev => {
        const newMap = new Map(prev);
        if (!newVoted) {
          newMap.set(productId, 1);
        } else {
          newMap.delete(productId);
        }
        return newMap;
      });
    }
  };

  // Helper to get product with local vote changes applied
  const applyLocalVoteChanges = (product: SurfacedProduct): SurfacedProduct => {
    const changes = localVoteChanges.get(product.id);
    return {
      ...product,
      net_votes: (product.net_votes || 0) + (changes?.delta || 0),
      userVote: userVotes.has(product.id) ? 1 : null,
    };
  };

  // Weekly Winners - products from last 14 days with highest votes
  const { data: weeklyWinners, isLoading: weeklyLoading } = useQuery({
    queryKey: ['home-weekly-winners'],
    queryFn: async () => {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      
      const [productsRes, votesRes, categoriesRes, commentsRes] = await Promise.all([
        supabase
          .from('products')
          .select(`
            id, name, tagline, slug, platforms, launch_date, domain_url,
            product_media(url, type),
            product_category_map(category_id),
            product_makers(user_id, users(username, avatar_url))
          `)
          .eq('status', 'launched')
          .gte('launch_date', fourteenDaysAgo)
          .order('launch_date', { ascending: false }),
        supabase.from('product_vote_counts').select('product_id, net_votes'),
        supabase.from('product_categories').select('id, name'),
        supabase.from('comments').select('product_id')
      ]);
      
      if (productsRes.error) throw productsRes.error;
      
      const votesMap = new Map((votesRes.data || []).map((v: any) => [v.product_id, v.net_votes || 0]));
      const categoryMap = new Map((categoriesRes.data || []).map((c: any) => [c.id, c.name]));
      const commentMap = new Map<string, number>();
      (commentsRes.data || []).forEach((c: any) => {
        commentMap.set(c.product_id, (commentMap.get(c.product_id) || 0) + 1);
      });
      
      const mapped = (productsRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        slug: p.slug,
        iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url,
        domainUrl: p.domain_url,
        net_votes: votesMap.get(p.id) || 0,
        categories: p.product_category_map?.map((c: any) => categoryMap.get(c.category_id)).filter(Boolean) || [],
        platforms: (p.platforms || []) as Platform[],
        makers: (p.product_makers || [])
          .map((pm: any) => pm.users)
          .filter((u: any) => u && u.username)
          .map((u: any) => ({ username: u.username, avatar_url: u.avatar_url })),
        commentCount: commentMap.get(p.id) || 0,
        launch_date: p.launch_date,
      }));
      
      // Sort by votes and return top 5 with at least 1 vote
      return mapped
        .filter((p) => (p.net_votes || 0) >= 1)
        .sort((a, b) => (b.net_votes || 0) - (a.net_votes || 0))
        .slice(0, 5);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Hidden Gems - products with moderate engagement from last 30 days
  const { data: hiddenGems, isLoading: gemsLoading } = useQuery({
    queryKey: ['home-hidden-gems'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const [productsRes, votesRes, categoriesRes, commentsRes] = await Promise.all([
        supabase
          .from('products')
          .select(`
            id, name, tagline, slug, platforms, launch_date, domain_url,
            product_media(url, type),
            product_category_map(category_id),
            product_makers(user_id, users(username, avatar_url))
          `)
          .eq('status', 'launched')
          .gte('launch_date', thirtyDaysAgo)
          .order('launch_date', { ascending: false })
          .limit(50),
        supabase.from('product_vote_counts').select('product_id, net_votes'),
        supabase.from('product_categories').select('id, name'),
        supabase.from('comments').select('product_id')
      ]);
      
      if (productsRes.error) throw productsRes.error;
      
      const votesMap = new Map((votesRes.data || []).map((v: any) => [v.product_id, v.net_votes || 0]));
      const categoryMap = new Map((categoriesRes.data || []).map((c: any) => [c.id, c.name]));
      const commentMap = new Map<string, number>();
      (commentsRes.data || []).forEach((c: any) => {
        commentMap.set(c.product_id, (commentMap.get(c.product_id) || 0) + 1);
      });
      
      const mapped = (productsRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        slug: p.slug,
        iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url,
        domainUrl: p.domain_url,
        net_votes: votesMap.get(p.id) || 0,
        categories: p.product_category_map?.map((c: any) => categoryMap.get(c.category_id)).filter(Boolean) || [],
        platforms: (p.platforms || []) as Platform[],
        makers: (p.product_makers || [])
          .map((pm: any) => pm.users)
          .filter((u: any) => u && u.username)
          .map((u: any) => ({ username: u.username, avatar_url: u.avatar_url })),
        commentCount: commentMap.get(p.id) || 0,
        launch_date: p.launch_date,
      }));
      
      return mapped
        .filter((p) => (p.net_votes || 0) >= 1 && (p.net_votes || 0) <= 10)
        .slice(0, 5);
    },
    staleTime: 5 * 60 * 1000,
  });

  // New & Noteworthy - most recent products from last 3 days
  const { data: newNoteworthy, isLoading: newNoteworthyLoading } = useQuery({
    queryKey: ['home-new-noteworthy'],
    queryFn: async () => {
      const threeDays = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      
      const [productsRes, votesRes, categoriesRes, commentsRes] = await Promise.all([
        supabase
          .from('products')
          .select(`
            id, name, tagline, slug, platforms, launch_date, domain_url,
            product_media(url, type),
            product_category_map(category_id),
            product_makers(user_id, users(username, avatar_url))
          `)
          .eq('status', 'launched')
          .gte('launch_date', threeDays)
          .order('launch_date', { ascending: false }),
        supabase.from('product_vote_counts').select('product_id, net_votes'),
        supabase.from('product_categories').select('id, name'),
        supabase.from('comments').select('product_id')
      ]);
      
      if (productsRes.error) throw productsRes.error;
      
      const votesMap = new Map((votesRes.data || []).map((v: any) => [v.product_id, v.net_votes || 0]));
      const categoryMap = new Map((categoriesRes.data || []).map((c: any) => [c.id, c.name]));
      const commentMap = new Map<string, number>();
      (commentsRes.data || []).forEach((c: any) => {
        commentMap.set(c.product_id, (commentMap.get(c.product_id) || 0) + 1);
      });
      
      const mapped = (productsRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        slug: p.slug,
        iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url,
        domainUrl: p.domain_url,
        net_votes: votesMap.get(p.id) || 0,
        categories: p.product_category_map?.map((c: any) => categoryMap.get(c.category_id)).filter(Boolean) || [],
        platforms: (p.platforms || []) as Platform[],
        makers: (p.product_makers || [])
          .map((pm: any) => pm.users)
          .filter((u: any) => u && u.username)
          .map((u: any) => ({ username: u.username, avatar_url: u.avatar_url })),
        commentCount: commentMap.get(p.id) || 0,
        launch_date: p.launch_date,
      }));
      
      // Return newest products, no minimum vote requirement
      return mapped.slice(0, 5);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Builders to Watch
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

  // Products You Missed (7-14 days ago)
  const { data: missedProducts, isLoading: missedLoading } = useQuery({
    queryKey: ['home-missed-products'],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      
      const [productsRes, votesRes, categoriesRes, commentsRes] = await Promise.all([
        supabase
          .from('products')
          .select(`
            id, name, tagline, slug, platforms, launch_date, domain_url,
            product_media(url, type),
            product_category_map(category_id),
            product_makers(user_id, users(username, avatar_url))
          `)
          .eq('status', 'launched')
          .gte('launch_date', fourteenDaysAgo)
          .lt('launch_date', sevenDaysAgo),
        supabase.from('product_vote_counts').select('product_id, net_votes'),
        supabase.from('product_categories').select('id, name'),
        supabase.from('comments').select('product_id')
      ]);
      
      if (productsRes.error) throw productsRes.error;
      
      const votesMap = new Map((votesRes.data || []).map((v: any) => [v.product_id, v.net_votes || 0]));
      const categoryMap = new Map((categoriesRes.data || []).map((c: any) => [c.id, c.name]));
      const commentMap = new Map<string, number>();
      (commentsRes.data || []).forEach((c: any) => {
        commentMap.set(c.product_id, (commentMap.get(c.product_id) || 0) + 1);
      });
      
      const mapped = (productsRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        slug: p.slug,
        iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url,
        domainUrl: p.domain_url,
        net_votes: votesMap.get(p.id) || 0,
        categories: p.product_category_map?.map((c: any) => categoryMap.get(c.category_id)).filter(Boolean) || [],
        platforms: (p.platforms || []) as Platform[],
        makers: (p.product_makers || [])
          .map((pm: any) => pm.users)
          .filter((u: any) => u && u.username)
          .map((u: any) => ({ username: u.username, avatar_url: u.avatar_url })),
        commentCount: commentMap.get(p.id) || 0,
        launch_date: p.launch_date,
      }));
      
      // Sort by votes and return top 5
      return mapped.sort((a, b) => (b.net_votes || 0) - (a.net_votes || 0)).slice(0, 5);
    },
    staleTime: 5 * 60 * 1000,
  });

  const sections = [
    { title: '📈 Weekly Winners', products: weeklyWinners, isLoading: weeklyLoading },
    { title: '✨ New & Noteworthy', products: newNoteworthy, isLoading: newNoteworthyLoading },
    { title: '💎 Hidden Gems', products: hiddenGems, isLoading: gemsLoading },
    { title: '🕐 5 Products You Missed This Week', products: missedProducts, isLoading: missedLoading },
  ];

  return (
    <section className="py-6">
      <div>
        <h2 className="text-2xl font-bold text-left mb-8">This Week's Launch Picks</h2>

        <div className="space-y-8">
          {sections.map((section, sectionIndex) => (
            <React.Fragment key={section.title}>
            {sectionIndex === 2 && (
              <div className="py-6 flex flex-col items-center w-full">
                <a 
                  href="https://trybio.ai" 
                  target="_blank" 
                  rel="noopener noreferrer sponsored"
                  className="block w-full"
                >
                  <img 
                    src={bioBanner} 
                    alt="Bio - Link in Bio" 
                    className="w-full h-auto transition-all duration-200 hover:opacity-95"
                  />
                </a>
                <Link to="/media-kit" className="text-[10px] text-muted-foreground opacity-60 hover:opacity-100 mt-2">
                  Featured Partner · Become a partner
                </Link>
              </div>
            )}
            <div key={section.title}>
              <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
              {section.isLoading ? (
                <ProductSkeleton view="list" count={3} />
              ) : !section.products?.length ? (
                <p className="text-sm text-muted-foreground py-3">Nothing to show yet</p>
              ) : (
                <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : view === 'compact' ? 'space-y-0' : 'space-y-2'}>
                  {section.products.map((product, index) => {
                    const p = applyLocalVoteChanges(product);
                    if (view === 'compact') {
                      return (
                        <CompactLaunchListItem
                          key={p.id}
                          rank={index + 1}
                          name={p.name}
                          votes={p.net_votes || 0}
                          slug={p.slug}
                          userVote={p.userVote}
                          onVote={() => handleVote(p.id)}
                          launchDate={p.launch_date}
                          commentCount={p.commentCount}
                          makers={p.makers}
                          domainUrl={p.domainUrl}
                          categories={p.categories}
                          platforms={p.platforms}
                        />
                      );
                    }
                    if (view === 'grid') {
                      return (
                        <LaunchCard
                          key={p.id}
                          id={p.id}
                          slug={p.slug}
                          name={p.name}
                          tagline={p.tagline || ''}
                          thumbnail={p.iconUrl || ''}
                          iconUrl={p.iconUrl}
                          domainUrl={p.domainUrl}
                          categories={p.categories || []}
                          platforms={p.platforms}
                          netVotes={p.net_votes || 0}
                          userVote={p.userVote}
                          commentCount={p.commentCount || 0}
                          makers={p.makers || []}
                          rank={index + 1}
                          onVote={() => handleVote(p.id)}
                        />
                      );
                    }
                    return (
                      <ProductListItem 
                        key={p.id} 
                        product={p} 
                        rank={index + 1} 
                        onVote={handleVote}
                      />
                    );
                  })}
                </div>
              )}
            </div>
            </React.Fragment>
          ))}
        </div>

        <div className="flex justify-center mt-6">
          <Link to={`/launches/${new Date().getFullYear()}/w${getWeek(new Date(), { weekStartsOn: 1 }).toString().padStart(2, '0')}`}>
            <Button variant="outline" className="border-2 border-muted-foreground/20">
              View all this week's launches →
            </Button>
          </Link>
        </div>
        
      </div>
    </section>
  );
};
