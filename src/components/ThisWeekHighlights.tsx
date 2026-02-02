import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUp, MessageSquare, ExternalLink, Globe } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatTimeAgo } from '@/lib/formatTime';
import { PlatformIcons, Platform } from '@/components/PlatformIcons';
import defaultProductIcon from '@/assets/default-product-icon.png';

interface SurfacedProduct {
  id: string;
  name: string;
  tagline: string | null;
  slug: string;
  iconUrl?: string;
  domainUrl?: string;
  net_votes?: number;
  categories?: string[];
  platforms?: Platform[];
  makers?: Array<{ username: string; avatar_url?: string }>;
  commentCount?: number;
  launch_date?: string;
}

interface SurfacedBuilder {
  id: string;
  username: string;
  name: string | null;
  avatar_url?: string;
  product_count: number;
}

const ProductListItem = ({ product, rank }: { product: SurfacedProduct; rank: number }) => {
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) {
      return;
    }
    navigate(`/launch/${product.slug}`);
  };

  return (
    <div 
      className="group/card hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-3 py-3 px-2">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 overflow-hidden bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            {product.iconUrl ? (
              <img 
                src={product.iconUrl} 
                alt={product.name} 
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = defaultProductIcon;
                }}
              />
            ) : (
              <img 
                src={defaultProductIcon} 
                alt={product.name} 
                className="w-full h-full object-cover rounded-lg"
              />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-muted-foreground">
              {rank}.
            </span>
            <h3 className="font-semibold text-base hover:text-primary transition-colors">
              {product.name}
            </h3>
            {product.domainUrl && (
              <a
                href={product.domainUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover/card:opacity-100"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-1.5 line-clamp-1">
            {product.tagline}
          </p>
          
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {product.categories && product.categories.slice(0, 3).map((category, index, arr) => (
              <span key={category}>
                <Link 
                  to={`/products?category=${encodeURIComponent(category)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-primary transition-colors"
                >
                  {category}
                </Link>
                {index < arr.length - 1 && ', '}
              </span>
            ))}
            
            {product.makers && product.makers.length > 0 && (
              <>
                <span>·</span>
                <div className="flex items-center gap-1">
                  {product.makers.filter(m => m && m.username).slice(0, 2).map((maker, index, arr) => (
                    <span key={maker.username} className="text-xs text-muted-foreground">
                      <Link 
                        to={`/@${maker.username}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-primary transition-colors"
                      >
                        @{maker.username}
                      </Link>
                      {index < arr.length - 1 && ','}
                    </span>
                  ))}
                </div>
              </>
            )}
            
            <span>·</span>
            <Globe className="h-3.5 w-3.5" />
            
            <span>·</span>
            <div className="flex items-center gap-0.5">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{product.commentCount || 0}</span>
            </div>
            
            {product.launch_date && (
              <>
                <span>·</span>
                <span>{formatTimeAgo(product.launch_date)}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-start self-start">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="group flex flex-col items-center justify-center gap-0.5 h-12 w-12 p-0 transition-colors touch-manipulation border-2 border-muted-foreground/20 [@media(hover:hover)]:hover:border-primary [@media(hover:hover)]:hover:bg-primary"
          >
            <ArrowUp className="h-4 w-4 [@media(hover:hover)]:group-hover:text-primary-foreground" strokeWidth={2.5} />
            <span className="font-bold text-sm [@media(hover:hover)]:group-hover:text-primary-foreground">{product.net_votes || 0}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

const BuilderItem = ({ builder, rank }: { builder: SurfacedBuilder; rank: number }) => {
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('a')) return;
    navigate(`/@${builder.username}`);
  };

  return (
    <div 
      className="group/card hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start gap-3 py-3 px-2">
        <div className="flex-shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={builder.avatar_url} alt={builder.name || builder.username} />
            <AvatarFallback className="text-sm">
              {(builder.name || builder.username).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-muted-foreground">
              {rank}.
            </span>
            <h3 className="font-semibold text-base hover:text-primary transition-colors">
              {builder.name || builder.username}
            </h3>
          </div>
          
          <p className="text-sm text-muted-foreground mb-1.5">
            Building in public
          </p>
          
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Link 
              to={`/@${builder.username}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-primary transition-colors"
            >
              @{builder.username}
            </Link>
            <span>·</span>
            <span>{builder.product_count} product{builder.product_count !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ThisWeekHighlights = () => {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const twoWeeksAgo = new Date(todayUTC.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(todayUTC.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // Weekly Winners
  const { data: weeklyWinners, isLoading: weeklyLoading } = useQuery({
    queryKey: ['home-weekly-winners', twoWeeksAgo],
    queryFn: async () => {
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
          .gte('launch_date', twoWeeksAgo),
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
      
      return mapped.sort((a, b) => (b.net_votes || 0) - (a.net_votes || 0)).slice(0, 5);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Hidden Gems
  const { data: hiddenGems, isLoading: gemsLoading } = useQuery({
    queryKey: ['home-hidden-gems'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(todayUTC.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
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

  // New & Noteworthy
  const { data: newNoteworthy, isLoading: newNoteworthyLoading } = useQuery({
    queryKey: ['home-new-noteworthy', threeDaysAgo],
    queryFn: async () => {
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
          .gte('launch_date', threeDaysAgo)
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
      
      return mapped.filter((p) => (p.net_votes || 0) >= 1).slice(0, 5);
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

  const sections = [
    { title: '📈 Weekly Winners', products: weeklyWinners, isLoading: weeklyLoading },
    { title: '✨ New & Noteworthy', products: newNoteworthy, isLoading: newNoteworthyLoading },
    { title: '💎 Hidden Gems', products: hiddenGems, isLoading: gemsLoading },
  ];

  return (
    <section className="py-6 bg-background">
      <div className="container mx-auto px-4 max-w-5xl">
        <h2 className="text-2xl font-bold text-center mb-8">This Week on Launch</h2>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
              {section.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : !section.products?.length ? (
                <p className="text-sm text-muted-foreground py-3">Nothing to show yet</p>
              ) : (
                <div>
                  {section.products.map((product, index) => (
                    <ProductListItem key={product.id} product={product} rank={index + 1} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
