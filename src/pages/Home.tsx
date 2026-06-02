import { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LaunchCard } from '@/components/LaunchCard';
import { LaunchListItem } from '@/components/LaunchListItem';
import { CompactLaunchListItem } from '@/components/CompactLaunchListItem';
import { CategoryCloud } from '@/components/CategoryCloud';
import { ViewToggle } from '@/components/ViewToggle';
import { SortToggle } from '@/components/SortToggle';
import { PlatformFilter } from '@/components/PlatformFilter';
import { Platform } from '@/components/PlatformIcons';
import { ProductSkeleton } from '@/components/ProductSkeleton';
import { Button } from '@/components/ui/button';

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { trackSponsorImpression } from '@/hooks/use-sponsor-tracking';
import RotatingWord from '@/components/RotatingWord';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from 'react-router-dom';

import { format, getWeek } from 'date-fns';

import { OrganizationSchema, WebSiteSchema, FAQSchema } from '@/components/JsonLd';
import { SponsorBanner } from '@/components/SponsorBanner';
import HomepageSponsorBanners from '@/components/HomepageSponsorBanners';
import { PlatformStats } from '@/components/PlatformStats';
import { ThisWeekHighlights } from '@/components/ThisWeekHighlights';
import { ForumActivityWidget } from '@/components/ForumActivityWidget';
import { SiteStatsWidget } from '@/components/SiteStatsWidget';

import { CommunityCallout } from '@/components/CommunityCallout';

import BuiltWithSection from '@/components/BuiltWithSection';
import AdvertiseCTA from '@/components/AdvertiseCTA';
import SidebarSponsoredAd from '@/components/SidebarSponsoredAd';

interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  thumbnail: string;
  iconUrl?: string;
  domainUrl?: string;
  categories: string[];
  platforms?: Platform[];
  netVotes: number;
  userVote?: 1 | null;
  commentCount: number;
  verifiedMrr?: number | null;
  mrrVerifiedAt?: string | null;
  makers: Array<{ username: string; avatar_url?: string }>;
  launch_date?: string;
  isBoosted?: boolean;
}

const ITEMS_PER_PAGE = 15;
const MAX_HOMEPAGE_PRODUCTS = 15;

const Home = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  // Hydrate from sessionStorage cache for instant repeat-paint (default view only)
  const cachedHome = (() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem('home:default:v1') : null;
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Expire after 5 minutes
      if (!parsed || Date.now() - parsed.t > 5 * 60 * 1000) return null;
      return parsed.products as Product[];
    } catch { return null; }
  })();
  const [products, setProducts] = useState<Product[]>(cachedHome || []);
  const [sponsoredProducts, setSponsoredProducts] = useState<Map<number, Product>>(new Map());
  const [customSponsored, setCustomSponsored] = useState<Map<number, { id: string; title: string; description: string | null; imageUrl: string; targetUrl: string }>>(new Map());
  const [loading, setLoading] = useState(!cachedHome);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'list' | 'grid' | 'compact'>(() => {
    const saved = localStorage.getItem('productView');
    return (saved === 'list' || saved === 'grid' || saved === 'compact') ? saved : 'list';
  });
  const [currentPeriod, setCurrentPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('week');
  const [sort, setSort] = useState<'rated' | 'popular' | 'latest' | 'revenue' | 'maker'>('popular');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  
  const handlePlatformToggle = (platform: Platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };
  
  // Use the saved view preference (mobile defaults to 'list' if no preference saved)
  const effectiveView = view;

  const handleViewChange = (newView: 'list' | 'grid' | 'compact') => {
    setView(newView);
    localStorage.setItem('productView', newView);
  };

  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setUserLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);


  // Kick off the products fetch immediately on mount (don't wait for auth).
  // Anonymous user-vote lookups are no-ops, so this is safe and saves the
  // auth round-trip from the critical path.
  useEffect(() => {
    fetchProducts(currentPeriod, sort, 0, true);
    fetchSponsoredProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once we know the user is logged in, refetch so their upvote state appears.
  // (Initial fetch ran in parallel with auth for faster first paint.)
  const didRefetchForUser = useRef(false);
  useEffect(() => {
    if (userLoaded && user && !didRefetchForUser.current) {
      didRefetchForUser.current = true;
      fetchProducts(currentPeriod, sort, 0, true);
      fetchSponsoredProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoaded, user]);

  const fetchSponsoredProducts = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nowIso = new Date().toISOString();

      // Fetch active sponsored products from the sponsored_products table
      const { data: sponsoredData } = await supabase
        .from('sponsored_products')
        .select(`
          id,
          position,
          product_id,
          sponsorship_type,
          ad_type,
          custom_image_url,
          custom_title,
          custom_description,
          custom_target_url,
          boost_ends_at,
          products(
            id,
            slug,
            name,
            tagline,
            launch_date,
            domain_url,
            platforms,
            verified_mrr,
            mrr_verified_at,
            product_media(url, type),
            product_category_map(category_id),
            product_makers(user_id, users(username, avatar_url))
          )
        `)
        .lte('start_date', today)
        .gte('end_date', today)
        .in('sponsorship_type', ['website', 'combined', 'boost'])
        .order('position', { ascending: true });

      // Boost rows have a precise 24h expiry — enforce it client-side so
      // boosts never overrun their window even if end_date covers the day.
      const sponsoredRows: any[] = ((sponsoredData as any[]) || []).filter((s) => {
        if (s.sponsorship_type !== 'boost') return true;
        return s.boost_ends_at && new Date(s.boost_ends_at).toISOString() > nowIso;
      });

      if (sponsoredRows.length > 0) {
        const { data: categories } = await supabase
          .from('product_categories')
          .select('id, name');
        const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);

        const productIds = sponsoredRows
          .filter((s) => s.ad_type !== 'custom' && s.products)
          .map((s) => s.products.id);

        const { data: voteCounts } = productIds.length
          ? await supabase
              .from('product_vote_counts')
              .select('product_id, net_votes')
              .in('product_id', productIds)
          : { data: [] as any[] };

        const voteMap = new Map((voteCounts || [])?.map(v => [v.product_id, v.net_votes]) || []);

        let userVotes = new Map<string, 1>();
        if (user && productIds.length) {
          const { data: votes } = await supabase
            .from('votes')
            .select('product_id, value')
            .in('product_id', productIds)
            .eq('user_id', user.id)
            .eq('value', 1);
          votes?.forEach(v => userVotes.set(v.product_id, 1));
        }

        const { data: commentCounts } = productIds.length
          ? await supabase
              .from('comments')
              .select('product_id')
              .in('product_id', productIds)
          : { data: [] as any[] };

        const commentMap = new Map<string, number>();
        (commentCounts || []).forEach((c: any) => {
          commentMap.set(c.product_id, (commentMap.get(c.product_id) || 0) + 1);
        });

        const sponsoredMap = new Map<number, Product>();
        const customMap = new Map<number, { id: string; title: string; description: string | null; imageUrl: string; targetUrl: string }>();

        sponsoredRows.forEach((sponsored: any) => {
          if (sponsored.ad_type === 'custom' && sponsored.custom_target_url) {
            customMap.set(sponsored.position, {
              id: sponsored.id,
              title: sponsored.custom_title || 'Sponsored',
              description: sponsored.custom_description || null,
              imageUrl: sponsored.custom_image_url || '',
              targetUrl: sponsored.custom_target_url,
            });
            return;
          }
          const product = sponsored.products;
          if (!product) return;
          sponsoredMap.set(sponsored.position, {
            id: product.id,
            slug: product.slug,
            name: product.name,
            tagline: product.tagline,
            thumbnail: product.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '',
            iconUrl: product.product_media?.find((m: any) => m.type === 'icon')?.url || '',
            domainUrl: product.domain_url || '',
            categories: product.product_category_map?.map((c: any) => categoryMap.get(c.category_id)).filter(Boolean) || [],
            platforms: (product.platforms || []) as Platform[],
            netVotes: voteMap.get(product.id) || 0,
            userVote: userVotes.get(product.id) || null,
            commentCount: commentMap.get(product.id) || 0,
            verifiedMrr: product.verified_mrr || null,
            mrrVerifiedAt: product.mrr_verified_at || null,
            makers: product.product_makers?.map((m: any) => ({
              username: m.users?.username || 'Anonymous',
              avatar_url: m.users?.avatar_url || ''
            })).filter((m: any) => m.username !== 'Anonymous') || [],
            launch_date: product.launch_date,
            isBoosted: sponsored.sponsorship_type === 'boost',
          });
        });

        setSponsoredProducts(sponsoredMap);
        setCustomSponsored(customMap);
      }
    } catch (error) {
      console.error('Error fetching sponsored products:', error);
    }
  };

  const getStartDateForPeriod = (period: 'all' | 'today' | 'week' | 'month' | 'year'): Date => {
    const now = new Date();
    switch (period) {
      case 'all':
        return new Date(2000, 0, 1); // Far past date to include all products
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }
  };

  const fetchProducts = async (period: 'all' | 'today' | 'week' | 'month' | 'year', currentSort: 'rated' | 'popular' | 'latest' | 'revenue' | 'maker', pageNum: number, reset: boolean = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Calculate date range based on period
      let startDate = getStartDateForPeriod(period);

      const from = pageNum * ITEMS_PER_PAGE;
      const to = Math.min(from + ITEMS_PER_PAGE - 1, MAX_HOMEPAGE_PRODUCTS - 1);

      // Pre-fetch product IDs in the period so we only pull votes/ratings for those rows
      const { data: periodProductIds } = await supabase
        .from('products')
        .select('id')
        .eq('status', 'launched')
        .gte('launch_date', startDate.toISOString());

      const idsInPeriod = (periodProductIds || []).map((p: any) => p.id);

      // Fetch vote counts only for products in the active period
      const { data: voteCounts } = idsInPeriod.length
        ? await supabase
            .from('product_vote_counts')
            .select('product_id, net_votes')
            .in('product_id', idsInPeriod)
        : { data: [] as any[] };

      const voteMap = new Map((voteCounts || [])?.map(v => [v.product_id, v.net_votes || 0]) || []);

      // Fetch rating stats only for products in the active period
      const { data: ratingStats } = idsInPeriod.length
        ? await supabase
            .from('product_rating_stats')
            .select('product_id, average_rating, rating_count')
            .in('product_id', idsInPeriod)
        : { data: [] as any[] };

      const ratingMap = new Map((ratingStats || [])?.map(r => [r.product_id, { avg: r.average_rating || 0, count: r.rating_count || 0 }]) || []);

      let allProducts: any[] = [];

      if (currentSort === 'rated') {
        // For rated sorting, fetch all products in the period and sort by average rating
        const { data: productsData, error } = await supabase
          .from('products')
          .select(`
            id,
            slug,
            name,
            tagline,
            launch_date,
            domain_url,
            platforms,
            verified_mrr,
            mrr_verified_at,
            product_media(url, type),
            product_category_map(category_id),
            product_makers(user_id, users(username, avatar_url))
          `)
          .eq('status', 'launched')
          .gte('launch_date', startDate.toISOString());

        if (error) throw error;

        // Sort by average rating descending, then by rating count as tiebreaker
        const sortedByRating = (productsData || []).sort((a, b) => {
          const ratingA = ratingMap.get(a.id) || { avg: 0, count: 0 };
          const ratingB = ratingMap.get(b.id) || { avg: 0, count: 0 };
          if (ratingB.avg !== ratingA.avg) return ratingB.avg - ratingA.avg;
          return ratingB.count - ratingA.count;
        });

        const cappedProducts = sortedByRating.slice(0, MAX_HOMEPAGE_PRODUCTS);
        allProducts = cappedProducts.slice(from, to + 1);
        setHasMore(cappedProducts.length > to + 1 && to + 1 < MAX_HOMEPAGE_PRODUCTS);
      } else if (currentSort === 'popular') {
        // For popular sorting, we need to fetch all products in the period and sort by votes
        const { data: productsData, error } = await supabase
          .from('products')
          .select(`
            id,
            slug,
            name,
            tagline,
            launch_date,
            domain_url,
            platforms,
            verified_mrr,
            mrr_verified_at,
            product_media(url, type),
            product_category_map(category_id),
            product_makers(user_id, users(username, avatar_url))
          `)
          .eq('status', 'launched')
          .gte('launch_date', startDate.toISOString());

        if (error) throw error;

        // Sort by votes client-side and then paginate
        const sortedByVotes = (productsData || []).sort((a, b) => {
          const votesA = voteMap.get(a.id) || 0;
          const votesB = voteMap.get(b.id) || 0;
          return votesB - votesA;
        });

        // Cap to MAX_HOMEPAGE_PRODUCTS total
        const cappedProducts = sortedByVotes.slice(0, MAX_HOMEPAGE_PRODUCTS);
        allProducts = cappedProducts.slice(from, to + 1);
        setHasMore(cappedProducts.length > to + 1 && to + 1 < MAX_HOMEPAGE_PRODUCTS);
      } else if (currentSort === 'revenue') {
        // For revenue sorting, fetch all and sort by verified_mrr
        const { data: productsData, error } = await supabase
          .from('products')
          .select(`
            id,
            slug,
            name,
            tagline,
            launch_date,
            domain_url,
            platforms,
            verified_mrr,
            mrr_verified_at,
            product_media(url, type),
            product_category_map(category_id),
            product_makers(user_id, users(username, avatar_url))
          `)
          .eq('status', 'launched')
          .gte('launch_date', startDate.toISOString())
          .not('verified_mrr', 'is', null);

        if (error) throw error;

        // Sort by verified_mrr descending
        const sortedByRevenue = (productsData || []).sort((a, b) => {
          return (b.verified_mrr || 0) - (a.verified_mrr || 0);
        });

        // Cap to MAX_HOMEPAGE_PRODUCTS total
        const cappedProducts = sortedByRevenue.slice(0, MAX_HOMEPAGE_PRODUCTS);
        allProducts = cappedProducts.slice(from, to + 1);
        setHasMore(cappedProducts.length > to + 1 && to + 1 < MAX_HOMEPAGE_PRODUCTS);
      } else if (currentSort === 'maker') {
        // For maker sorting, fetch all products then sort by owner karma
        const { data: productsData, error } = await supabase
          .from('products')
          .select(`
            id,
            slug,
            name,
            tagline,
            launch_date,
            domain_url,
            platforms,
            verified_mrr,
            mrr_verified_at,
            owner_id,
            product_media(url, type),
            product_category_map(category_id),
            product_makers(user_id, users(username, avatar_url))
          `)
          .eq('status', 'launched')
          .gte('launch_date', startDate.toISOString());

        if (error) throw error;

        // Fetch karma for all owners
        const ownerIds = [...new Set((productsData || []).map(p => p.owner_id))];
        const { data: karmaData } = await supabase
          .from('user_karma' as any)
          .select('user_id, karma')
          .in('user_id', ownerIds);

        const karmaMap = new Map((karmaData as any[] || []).map((k: any) => [k.user_id, k.karma || 0]));

        const sortedByKarma = (productsData || []).sort((a, b) => {
          return (karmaMap.get(b.owner_id) || 0) - (karmaMap.get(a.owner_id) || 0);
        });

        const cappedProducts = sortedByKarma.slice(0, MAX_HOMEPAGE_PRODUCTS);
        allProducts = cappedProducts.slice(from, to + 1);
        setHasMore(cappedProducts.length > to + 1 && to + 1 < MAX_HOMEPAGE_PRODUCTS);
      } else {
        // For latest sorting, use database ordering with pagination
        const { data: productsData, error } = await supabase
          .from('products')
          .select(`
            id,
            slug,
            name,
            tagline,
            launch_date,
            domain_url,
            platforms,
            verified_mrr,
            mrr_verified_at,
            product_media(url, type),
            product_category_map(category_id),
            product_makers(user_id, users(username, avatar_url))
          `)
          .eq('status', 'launched')
          .gte('launch_date', startDate.toISOString())
          .order('launch_date', { ascending: false })
          .range(from, to);

        if (error) throw error;
        allProducts = productsData || [];
        setHasMore(allProducts.length === ITEMS_PER_PAGE && to + 1 < MAX_HOMEPAGE_PRODUCTS);
      }

      const productIds = allProducts.map(p => p.id);

      const { data: categories } = await supabase
        .from('product_categories')
        .select('id, name');

      const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);

      const { data: userVotes } = user ? await supabase
        .from('votes')
        .select('product_id, value')
        .eq('user_id', user.id)
        .eq('value', 1) : { data: null };

      const userVoteMap = new Map(userVotes?.map(v => [v.product_id, 1 as const]) || []);

      // Fetch all comments in a single query
      const { data: allComments } = productIds.length
        ? await supabase
            .from('comments')
            .select('product_id')
            .in('product_id', productIds)
        : { data: [] as any[] };

      // Count comments per product
      const commentMap = new Map<string, number>();
      allComments?.forEach(comment => {
        const currentCount = commentMap.get(comment.product_id) || 0;
        commentMap.set(comment.product_id, currentCount + 1);
      });

      const formattedProducts: Product[] = allProducts.map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        thumbnail: p.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '',
        iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url || '',
        domainUrl: p.domain_url || '',
        categories: p.product_category_map?.map((c: any) => categoryMap.get(c.category_id)).filter(Boolean) || [],
        platforms: (p.platforms || []) as Platform[],
        netVotes: voteMap.get(p.id) || 0,
        userVote: userVoteMap.get(p.id) || null,
        commentCount: commentMap.get(p.id) || 0,
        verifiedMrr: p.verified_mrr || null,
        mrrVerifiedAt: p.mrr_verified_at || null,
        makers: p.product_makers?.map((m: any) => ({
          username: m.users?.username || 'Anonymous',
          avatar_url: m.users?.avatar_url || ''
        })).filter((m: any) => m.username !== 'Anonymous') || [],
        launch_date: p.launch_date
      }));


      if (reset) {
        setProducts(formattedProducts);
        // Cache only the default homepage state for instant repeat-visit paints
        if (period === 'week' && currentSort === 'popular' && pageNum === 0) {
          try {
            sessionStorage.setItem('home:default:v1', JSON.stringify({ t: Date.now(), products: formattedProducts }));
          } catch {}
        }
      } else {
        setProducts(prev => [...prev, ...formattedProducts]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && products.length < MAX_HOMEPAGE_PRODUCTS) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(currentPeriod, sort, nextPage, false);
    }
  }, [loadingMore, hasMore, page, currentPeriod, sort, products.length]);

  // Check if we've hit the homepage limit
  const canLoadMore = hasMore && products.length < MAX_HOMEPAGE_PRODUCTS;

  const handlePeriodChange = (period: 'all' | 'today' | 'week' | 'month' | 'year') => {
    setCurrentPeriod(period);
    setPage(0);
    setProducts([]);
    setHasMore(true);
    fetchProducts(period, sort, 0, true);
  };

  const handleSortChange = (newSort: 'rated' | 'popular' | 'latest' | 'revenue' | 'maker') => {
    setSort(newSort);
    setPage(0);
    setProducts([]);
    setHasMore(true);
    fetchProducts(currentPeriod, newSort, 0, true);
  };

  const handleVote = async (productId: string) => {
    if (!user) {
      toast('Sign up to upvote your favorite launches', {
        action: {
          label: 'Sign up',
          onClick: () => navigate('/auth?signup=true'),
        },
      });
      return;
    }

    let voteDelta = 0;
    let revertedUserVote: 1 | null = null;

    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;

      const isRemovingVote = p.userVote === 1;
      voteDelta = isRemovingVote ? -1 : 1;
      revertedUserVote = isRemovingVote ? 1 : null;

      return {
        ...p,
        netVotes: p.netVotes + voteDelta,
        userVote: isRemovingVote ? null : 1,
      };
    }));

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
          .upsert(
            { product_id: productId, user_id: user.id, value: 1 },
            { onConflict: 'product_id,user_id' }
          );

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error voting:', error);
      setProducts(prev => prev.map(p => {
        if (p.id !== productId) return p;

        return {
          ...p,
          netVotes: Math.max(0, p.netVotes - voteDelta),
          userVote: revertedUserVote,
        };
      }));
      toast.error('Failed to record vote');
    }
  };

  // Products are now sorted from the database/fetch, no need for client-side sorting

  // Generate link for "View all" button based on current period
  const getViewAllLink = () => {
    const now = new Date();
    switch (currentPeriod) {
      case 'all':
        return `/products`;
      case 'today':
        return `/launches/${format(now, 'yyyy-MM-dd')}`;
      case 'week': {
        const year = now.getFullYear();
        const week = getWeek(now, { weekStartsOn: 1 });
        return `/launches/${year}/w${week.toString().padStart(2, '0')}`;
      }
      case 'month': {
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        return `/launches/${year}/m${month}`;
      }
      case 'year':
        return `/launches/${now.getFullYear()}`;
      default:
        return `/products`;
    }
  };

  const renderProductList = (productList: Product[]) => {
    // Filter by selected platforms
    const filteredList = selectedPlatforms.length > 0 
      ? productList.filter(p => p.platforms?.some(platform => selectedPlatforms.includes(platform)))
      : productList;

    if (loading) {
      return <ProductSkeleton view={effectiveView} count={5} />;
    }

    if (filteredList.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nothing shipped in this window yet.</p>
          {currentPeriod === 'today' && (
            <p className="mt-2 text-sm">Be the first to ship today. <Link to="/submit" className="text-primary hover:underline">Ship it →</Link></p>
          )}
        </div>
      );
    }

    // Show encouragement when Today has very few products
    const showLowVolumeNote = currentPeriod === 'today' && filteredList.length <= 3;

    // Helper to render products with sponsored items at their positions
    const renderProductsWithSponsored = (viewMode: 'list' | 'grid' | 'compact') => {
      const items: React.ReactNode[] = [];
      let productIndex = 0;

      const renderCustomSponsor = (
        pos: number,
        c: { id: string; title: string; description: string | null; imageUrl: string; targetUrl: string }
      ) => (
        <a
          key={`sponsored-custom-${pos}`}
          href={c.targetUrl}
          target="_blank"
          rel="noopener noreferrer sponsored nofollow"
          onClick={() => {
            try {
              supabase.from('product_analytics').insert({
                event_type: 'ad_click',
                metadata: { ad_type: 'custom', ad_id: c.id, target_url: c.targetUrl, placement: `feed-pos-${pos}` },
              } as any);
            } catch {}
          }}
          className="flex items-center gap-4 p-4 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
        >
          {c.imageUrl && (
            <img src={c.imageUrl} alt={c.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold truncate">{c.title}</p>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-muted-foreground/30 rounded px-1">Ad</span>
            </div>
            {c.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{c.description}</p>
            )}
          </div>
        </a>
      );

      // Featured Boost uses position 0 and is pinned above the organic feed in every view.
      const featuredBoost = sponsoredProducts.get(0);
      if (featuredBoost) {
        trackSponsorImpression(featuredBoost.id, 0);
        if (viewMode === 'compact') {
          items.push(
            <CompactLaunchListItem
              key={`featured-boost-${featuredBoost.id}`}
              productId={featuredBoost.id}
              rank={1}
              name={featuredBoost.name}
              votes={featuredBoost.netVotes}
              slug={featuredBoost.slug}
              userVote={featuredBoost.userVote}
              onVote={() => handleVote(featuredBoost.id)}
              launchDate={featuredBoost.launch_date}
              commentCount={featuredBoost.commentCount}
              makers={featuredBoost.makers}
              domainUrl={featuredBoost.domainUrl}
              categories={featuredBoost.categories}
              platforms={featuredBoost.platforms}
              verifiedMrr={featuredBoost.verifiedMrr}
              mrrVerifiedAt={featuredBoost.mrrVerifiedAt}
              isBoosted
            />
          );
        } else if (viewMode === 'list') {
          items.push(
            <LaunchListItem
              key={`featured-boost-${featuredBoost.id}`}
              {...featuredBoost}
              rank={1}
              sponsored
              sponsoredPosition={0}
              onVote={handleVote}
            />
          );
        } else {
          items.push(
            <LaunchCard
              key={`featured-boost-${featuredBoost.id}`}
              {...featuredBoost}
              rank={1}
              sponsored
              sponsoredPosition={0}
              onVote={handleVote}
            />
          );
        }
      }

      // Position 1 sponsored product goes at the top of the paid listing slots (skip for compact view)
      const pos1Sponsor = sponsoredProducts.get(1);
      const pos1Custom = customSponsored.get(1);
      if (pos1Custom && viewMode !== 'compact') {
        items.push(renderCustomSponsor(1, pos1Custom));
      } else if (pos1Sponsor && viewMode !== 'compact') {
        // Track impression for position 1
        trackSponsorImpression(pos1Sponsor.id, 1);
        items.push(
          <LaunchListItem
            key={`sponsored-1`}
            {...pos1Sponsor}
            sponsored
            sponsoredPosition={1}
            onVote={handleVote}
          />
        );
      }
      
      // Interleave products with sponsored items at positions 10, 20, 30
      filteredList.filter((product) => product.id !== featuredBoost?.id).forEach((product, idx) => {
        productIndex++;
        const displayRank = productIndex;
        
        if (viewMode === 'compact') {
          items.push(
            <CompactLaunchListItem
              key={product.id}
              productId={product.id}
              rank={displayRank}
              name={product.name}
              votes={product.netVotes}
              slug={product.slug}
              userVote={product.userVote}
              onVote={() => handleVote(product.id)}
              launchDate={product.launch_date}
              commentCount={product.commentCount}
              makers={product.makers}
              domainUrl={product.domainUrl}
              categories={product.categories}
              platforms={product.platforms}
              verifiedMrr={product.verifiedMrr}
              mrrVerifiedAt={product.mrrVerifiedAt}
            />
          );
        } else if (viewMode === 'list') {
          items.push(
            <LaunchListItem
              key={product.id}
              {...product}
              rank={displayRank}
              onVote={handleVote}
            />
          );
        } else {
          items.push(
            <LaunchCard
              key={product.id}
              {...product}
              rank={displayRank}
              onVote={handleVote}
            />
          );
        }
        
        // Insert sponsor banner after product 5
        if (productIndex === 5) {
          items.push(
            <SponsorBanner key="sponsor-banner-inline" />
          );
        }
        
        // Check if there's a sponsored product for the next position (skip for compact)
        // Position 2 = after 10 products, Position 3 = after 20 products, etc.
        if (viewMode !== 'compact') {
          const sponsorPositionCheck = productIndex + 1;
          const sponsorPosition = sponsorPositionCheck === 10 ? 2 : sponsorPositionCheck === 20 ? 3 : sponsorPositionCheck === 30 ? 4 : null;
          if (sponsorPosition) {
            const custom = customSponsored.get(sponsorPosition);
            if (custom) {
              items.push(renderCustomSponsor(sponsorPosition, custom));
            } else {
              const sponsor = sponsoredProducts.get(sponsorPosition);
              if (sponsor) {
                trackSponsorImpression(sponsor.id, sponsorPosition);
                items.push(
                  <LaunchListItem
                    key={`sponsored-${sponsorPosition}`}
                    {...sponsor}
                    sponsored
                    sponsoredPosition={sponsorPosition}
                    onVote={handleVote}
                  />
                );
              }
            }
          }
        }
      });
      
      return items;
    };

    return (
      <>
        {effectiveView === 'compact' ? (
          <div className="space-y-0">
            {renderProductsWithSponsored('compact')}
          </div>
        ) : effectiveView === 'list' ? (
          <div className="space-y-2">
            {renderProductsWithSponsored('list')}
          </div>
        ) : (
          <div className="space-y-4">
            {renderProductsWithSponsored('grid')}
          </div>
        )}

        {/* Low volume encouragement for Today */}
        {showLowVolumeNote && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <p>More vibe coders shipping today. <Link to="/submit" className="text-primary hover:underline">Be next →</Link></p>
          </div>
        )}
        
        {/* View all link */}
        {filteredList.length > 0 && (
          <div className="flex justify-center pt-6">
            <Link to={getViewAllLink()}>
              <Button variant="outline" className="border-2 border-muted-foreground/20">
                View all {currentPeriod === 'all' ? "all-time" : currentPeriod === 'today' ? "today's" : currentPeriod === 'week' ? "this week's" : currentPeriod === 'month' ? "this month's" : "this year's"} launches →
              </Button>
            </Link>
          </div>
        )}
        
      </>
    );
  };

  const homepageFaqs = [
    { question: 'What is Launch?', answer: 'Launch is the home of vibe coders — the place to ship what you build, get discovered, and build your reputation alongside thousands of people building their future.' },
    { question: 'How do I ship my thing?', answer: 'Start building an account, hit "Sign Up", add your details, and pick a launch date. You can schedule ahead too.' },
    { question: 'How does voting work?', answer: 'Vibe coders upvote what they love. Rankings are by time period (Today, Week, Month, Year). Sign in to vote.' },
    { question: 'What are Top Products and Archives?', answer: 'The top 100 launches for each time period. We archive every year so you can revisit what shipped.' },
    { question: 'How do notifications work?', answer: 'Hear it when people vote, comment, or when makers you follow ship something new. Tune it in Settings.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <OrganizationSchema />
      <WebSiteSchema />
      <FAQSchema faqs={homepageFaqs} />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Tabs value={currentPeriod} onValueChange={(v) => handlePeriodChange(v as any)}>
          <div className="flex flex-row items-center justify-between gap-2 mb-6">
            <TabsList className="h-9 bg-transparent border rounded-md p-1 gap-1">
              <TabsTrigger value="today" className="text-[11px] sm:text-xs px-2 h-7 rounded-md data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">Today</TabsTrigger>
              <TabsTrigger value="week" className="text-[11px] sm:text-xs px-2 h-7 rounded-md data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-[11px] sm:text-xs px-2 h-7 rounded-md data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">Month</TabsTrigger>
              <TabsTrigger value="year" className="hidden sm:inline-flex text-xs px-2 h-7 rounded-md data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">Year</TabsTrigger>
              <TabsTrigger value="all" className="hidden sm:inline-flex text-[11px] sm:text-xs px-2 h-7 rounded-md data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">All</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-0.5 sm:gap-1.5 flex-shrink-0">

              <PlatformFilter selectedPlatforms={selectedPlatforms} onPlatformToggle={handlePlatformToggle} />
              <SortToggle sort={sort} onSortChange={handleSortChange} iconOnly={isMobile} showRevenue={true} />
              <ViewToggle view={view} onViewChange={handleViewChange} />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main feed column */}
            <div className="flex-1 min-w-0">
              {/* Logged-out CTA */}
              {!user && (
                <div className="w-full bg-muted/30 px-6 py-6 md:py-0 flex items-center md:aspect-[7/1] mb-6">
                  <div className="w-full flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-lg font-semibold mb-1">Launch your thing to 50,000+ vibe coders</h3>
                      <p className="text-sm text-muted-foreground">Ship it. Get discovered. Build your reputation — free to start.</p>
                    </div>
                    <div className="shrink-0">
                      <Button asChild className="gap-2">
                        <Link to="/auth">Sign Up →</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )}


              {/* Value Proposition */}
              <div className="text-left mb-8">
                <h2 className="text-2xl font-bold mb-2">
                  {currentPeriod === 'all' && "All-Time Launches"}
                  {currentPeriod === 'today' && "Today's Launches"}
                  {currentPeriod === 'week' && "This Week's Launches"}
                  {currentPeriod === 'month' && "This Month's Launches"}
                  {currentPeriod === 'year' && "This Year's Launches"}
                </h2>
              </div>

              <TabsContent value="all" className="space-y-6">
                {renderProductList(products)}
              </TabsContent>

              <TabsContent value="today" className="space-y-6">
                {renderProductList(products)}
              </TabsContent>

              <TabsContent value="week" className="space-y-6">
                {renderProductList(products)}
              </TabsContent>

              <TabsContent value="month" className="space-y-6">
                {renderProductList(products)}
              </TabsContent>

              <TabsContent value="year" className="space-y-6">
                {renderProductList(products)}
              </TabsContent>
              
              {/* Sponsor Banner - Below leaderboard */}
              <SponsorBanner className="mt-6" />

              {/* Homepage Sponsor Banner #1 (DB-managed) */}
              <HomepageSponsorBanners offset={0} limit={1} />

              <ThisWeekHighlights view={effectiveView} />

              {/* Homepage Sponsor Banner #2 (DB-managed) */}
              <HomepageSponsorBanners offset={1} limit={1} />

              {/* Explore By Collection — Built With platform cards */}
              <div className="py-6">
                <h2 className="text-2xl font-bold mb-8 text-left">Explore By Collections</h2>
                <BuiltWithSection headless cols={3} />
                <div className="text-center mt-6">
                  <Link to="/collections">
                    <Button variant="outline" className="border-2 border-muted-foreground/20">View All Collections →</Button>
                  </Link>
                </div>
              </div>







              <HomepageSponsorBanners offset={2} limit={1} fallbackMedia />

              <div className="py-6">
                <h2 className="text-2xl font-bold mb-8 text-left">Frequently Asked Questions</h2>
                
                <Accordion type="single" collapsible className="w-full space-y-4">
                  <AccordionItem value="what-is" className="border rounded-lg px-6">
                    <AccordionTrigger className="text-left text-sm">
                      What is Launch?
                    </AccordionTrigger>
                    <AccordionContent>
                      Launch is the home of vibe coders — the place to ship what you build, get discovered, and build your reputation alongside thousands of people building their future.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="how-submit" className="border rounded-lg px-6">
                    <AccordionTrigger className="text-left text-sm">
                      How do I ship my thing?
                    </AccordionTrigger>
                    <AccordionContent>
                      Start building an account, hit "Sign Up", add your details, and pick a launch date. You can schedule ahead too.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="voting" className="border rounded-lg px-6">
                    <AccordionTrigger className="text-left text-sm">
                      How does voting work?
                    </AccordionTrigger>
                    <AccordionContent>
                      Users can upvote products they find interesting. Products are ranked based on their votes within specific time periods (Today, This Week, This Month, This Year). You must be logged in to vote.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="top-products" className="border rounded-lg px-6">
                    <AccordionTrigger className="text-left text-sm">
                      What are Top Products and Archives?
                    </AccordionTrigger>
                    <AccordionContent>
                      Top Products show the top 100 products for each time period. At the end of each year, we automatically archive these rankings so you can explore past winners. Visit the Products page to see current rankings and archives.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="notifications" className="border rounded-lg px-6">
                    <AccordionTrigger className="text-left text-sm">
                      How do notifications work?
                    </AccordionTrigger>
                    <AccordionContent>
                      Get notified when someone votes on your product, comments, or when people you follow launch new products. Customize your notification preferences in Settings.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="text-center mt-6">
                  <Link to="/faq">
                    <Button variant="outline" className="border-2 border-muted-foreground/20">View All FAQs →</Button>
                  </Link>
                </div>
              </div>

              
            </div>

            {/* Right sidebar (hidden on mobile) */}
            <div className="hidden lg:block w-72 flex-shrink-0 space-y-6">
              <SiteStatsWidget />
              <AdvertiseCTA compact />
              <SidebarSponsoredAd />
              <div>
                <ForumActivityWidget />
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Home;
