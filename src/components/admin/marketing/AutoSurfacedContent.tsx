import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, ExternalLink, Trophy, TrendingUp, Gem, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
  product_count: number;
}

interface ContentSection {
  title: string;
  description: string;
  icon: React.ReactNode;
  products?: SurfacedProduct[];
  builders?: SurfacedBuilder[];
  isLoading: boolean;
}

const CopyButton = ({ text, label }: { text: string; label: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-8 px-2"
      title={`Copy ${label}`}
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
};

const ProductCard = ({ product }: { product: SurfacedProduct }) => {
  const productUrl = `https://trylaunch.lovable.app/launches/${product.slug}`;
  const copyText = `${product.name} - ${product.tagline || 'No tagline'}\n${productUrl}`;

  return (
    <div className="flex items-start justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{product.name}</span>
          {product.net_votes !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {product.net_votes} votes
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate mt-0.5">
          {product.tagline || 'No tagline'}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1 truncate">{productUrl}</p>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <CopyButton text={copyText} label="product" />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          asChild
        >
          <a href={`/launches/${product.slug}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
};

const BuilderCard = ({ builder }: { builder: SurfacedBuilder }) => {
  const profileUrl = `https://trylaunch.lovable.app/@${builder.username}`;
  const copyText = `${builder.name || builder.username} (@${builder.username})\n${profileUrl}`;

  return (
    <div className="flex items-start justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{builder.name || builder.username}</span>
          <Badge variant="secondary" className="text-xs">
            {builder.product_count} product{builder.product_count !== 1 ? 's' : ''}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">@{builder.username}</p>
        <p className="text-xs text-muted-foreground/70 mt-1 truncate">{profileUrl}</p>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <CopyButton text={copyText} label="builder" />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          asChild
        >
          <a href={`/@${builder.username}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
};

const CopyAllButton = ({ products, title }: { products: SurfacedProduct[]; title: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    const text = products
      .map((p) => `${p.name} - ${p.tagline || 'No tagline'}\nhttps://trylaunch.lovable.app/launches/${p.slug}`)
      .join('\n\n');
    
    await navigator.clipboard.writeText(`${title}\n\n${text}`);
    setCopied(true);
    toast.success('All products copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopyAll} className="gap-2">
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      Copy All
    </Button>
  );
};

export const AutoSurfacedContent = () => {
  // Get today's date range
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
  
  // Get this week's date range (last 7 days)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Launch of the Day - top voted product today
  const { data: launchOfDay, isLoading: launchLoading } = useQuery({
    queryKey: ['auto-launch-of-day', startOfDay],
    queryFn: async () => {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id, name, tagline, slug,
          product_vote_counts(net_votes)
        `)
        .eq('status', 'launched')
        .gte('launch_date', startOfDay)
        .lt('launch_date', endOfDay)
        .limit(3);
      
      if (error) throw error;
      
      const mapped = (products || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        slug: p.slug,
        net_votes: p.product_vote_counts?.[0]?.net_votes || 0,
      }));
      
      return mapped.sort((a, b) => (b.net_votes || 0) - (a.net_votes || 0));
    },
  });

  // Weekly Winners - top voted products this week
  const { data: weeklyWinners, isLoading: weeklyLoading } = useQuery({
    queryKey: ['auto-weekly-winners', weekAgo],
    queryFn: async () => {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id, name, tagline, slug,
          product_vote_counts(net_votes)
        `)
        .eq('status', 'launched')
        .gte('launch_date', weekAgo)
        .limit(10);
      
      if (error) throw error;
      
      const mapped = (products || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        slug: p.slug,
        net_votes: p.product_vote_counts?.[0]?.net_votes || 0,
      }));
      
      return mapped.sort((a, b) => (b.net_votes || 0) - (a.net_votes || 0)).slice(0, 5);
    },
  });

  // Hidden Gems - recent products with fewer votes but launched
  const { data: hiddenGems, isLoading: gemsLoading } = useQuery({
    queryKey: ['auto-hidden-gems'],
    queryFn: async () => {
      // Get products from last 30 days with lower vote counts
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id, name, tagline, slug,
          product_vote_counts(net_votes)
        `)
        .eq('status', 'launched')
        .gte('launch_date', thirtyDaysAgo)
        .order('launch_date', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      const mapped = (products || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        slug: p.slug,
        net_votes: p.product_vote_counts?.[0]?.net_votes || 0,
      }));
      
      // Filter to products with 1-10 votes (hidden gems)
      return mapped
        .filter((p) => (p.net_votes || 0) >= 1 && (p.net_votes || 0) <= 10)
        .slice(0, 5);
    },
  });

  // Builders to Watch - users with multiple products
  const { data: buildersToWatch, isLoading: buildersLoading } = useQuery({
    queryKey: ['auto-builders-to-watch'],
    queryFn: async () => {
      const { data: makers, error } = await supabase
        .from('product_makers')
        .select(`
          user_id,
          users(id, username, name)
        `)
        .limit(200);
      
      if (error) throw error;
      
      // Count products per builder
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
      
      // Get top builders by product count
      return Object.values(builderCounts)
        .filter((b) => b.count >= 2)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((b) => ({
          id: b.user.id,
          username: b.user.username,
          name: b.user.name,
          product_count: b.count,
        }));
    },
  });

  const sections: ContentSection[] = [
    {
      title: "🏆 Launch of the Day",
      description: "Top voted product(s) launched today",
      icon: <Trophy className="h-5 w-5 text-amber-500" />,
      products: launchOfDay,
      isLoading: launchLoading,
    },
    {
      title: "📈 Weekly Winners",
      description: "Top 5 products from the past week",
      icon: <TrendingUp className="h-5 w-5 text-green-500" />,
      products: weeklyWinners,
      isLoading: weeklyLoading,
    },
    {
      title: "💎 Hidden Gems",
      description: "Quality products that deserve more attention",
      icon: <Gem className="h-5 w-5 text-purple-500" />,
      products: hiddenGems,
      isLoading: gemsLoading,
    },
    {
      title: "👀 Builders to Watch",
      description: "Prolific builders with multiple products",
      icon: <Users className="h-5 w-5 text-blue-500" />,
      builders: buildersToWatch,
      isLoading: buildersLoading,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">This Week's Content</h2>
          <p className="text-sm text-muted-foreground">
            Auto-surfaced products and builders ready to copy & paste
          </p>
        </div>
        <Badge variant="outline">Auto-updated</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {section.icon}
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </div>
                {section.products && section.products.length > 0 && (
                  <CopyAllButton products={section.products} title={section.title} />
                )}
              </div>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {section.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : section.products ? (
                section.products.length > 0 ? (
                  section.products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No products found for this period
                  </p>
                )
              ) : section.builders ? (
                section.builders.length > 0 ? (
                  section.builders.map((builder) => (
                    <BuilderCard key={builder.id} builder={builder} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No builders found
                  </p>
                )
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
