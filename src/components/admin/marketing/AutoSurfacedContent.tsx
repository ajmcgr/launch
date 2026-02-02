import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, ExternalLink, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface SurfacedProduct {
  id: string;
  name: string;
  tagline: string | null;
  slug: string;
  net_votes?: number;
}

interface SponsoredProduct {
  id: string;
  name: string;
  tagline: string | null;
  slug: string;
  sponsorship_type: string;
  start_date: string;
  end_date: string;
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
  sponsoredProducts?: SponsoredProduct[];
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
  const productUrl = `https://trylaunch.ai/launch/${product.slug}`;
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
          <a href={`/launch/${product.slug}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
};

const SponsoredProductCard = ({ product }: { product: SponsoredProduct }) => {
  const productUrl = `https://trylaunch.ai/launch/${product.slug}`;
  const copyText = `${product.name} - ${product.tagline || 'No tagline'}\n${productUrl}`;

  return (
    <div className="flex items-start justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors border-amber-500/30">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{product.name}</span>
          <Badge className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
            {product.sponsorship_type === 'combined' ? 'Website + Newsletter' : 
             product.sponsorship_type === 'website' ? 'Website' : 'Newsletter'}
          </Badge>
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
          <a href={`/launch/${product.slug}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
};

const BuilderCard = ({ builder }: { builder: SurfacedBuilder }) => {
  const profileUrl = `https://trylaunch.ai/@${builder.username}`;
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
      .map((p) => `${p.name} - ${p.tagline || 'No tagline'}\nhttps://trylaunch.ai/launch/${p.slug}`)
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

const CopyAllSponsoredButton = ({ products, title }: { products: SponsoredProduct[]; title: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    const text = products
      .map((p) => `${p.name} - ${p.tagline || 'No tagline'}\nhttps://trylaunch.ai/launch/${p.slug}`)
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

const CopyAllBuildersButton = ({ builders, title }: { builders: SurfacedBuilder[]; title: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    const text = builders
      .map((b) => `${b.name || b.username} (@${b.username})\nhttps://trylaunch.ai/@${b.username}`)
      .join('\n\n');
    
    await navigator.clipboard.writeText(`${title}\n\n${text}`);
    setCopied(true);
    toast.success('All builders copied!');
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
  const [masterCopied, setMasterCopied] = useState(false);
  
  // Get today's date range in UTC
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfDay = todayUTC.toISOString();
  const endOfDay = new Date(todayUTC.getTime() + 24 * 60 * 60 * 1000).toISOString();
  
  // Date ranges for various queries
  const oneWeekAgo = new Date(todayUTC.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(todayUTC.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(todayUTC.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // Paid Launches - currently active sponsored products
  const { data: paidLaunches, isLoading: paidLoading } = useQuery({
    queryKey: ['auto-paid-launches', todayUTC.toISOString()],
    queryFn: async () => {
      const today = todayUTC.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('sponsored_products')
        .select(`
          id,
          sponsorship_type,
          start_date,
          end_date,
          position,
          products(id, name, tagline, slug)
        `)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('position', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map((sp: any) => ({
        id: sp.products?.id || sp.id,
        name: sp.products?.name || 'Unknown',
        tagline: sp.products?.tagline,
        slug: sp.products?.slug || '',
        sponsorship_type: sp.sponsorship_type,
        start_date: sp.start_date,
        end_date: sp.end_date,
      }));
    },
  });

  // Launch of the Day - top voted product today
  const { data: launchOfDay, isLoading: launchLoading } = useQuery({
    queryKey: ['auto-launch-of-day', startOfDay],
    queryFn: async () => {
      // Fetch products and votes separately since product_vote_counts is a VIEW
      const [productsRes, votesRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, tagline, slug')
          .eq('status', 'launched')
          .gte('launch_date', startOfDay)
          .lt('launch_date', endOfDay),
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
      
      return mapped.sort((a, b) => (b.net_votes || 0) - (a.net_votes || 0)).slice(0, 3);
    },
  });

  // Weekly Winners - top voted products this week
  const { data: weeklyWinners, isLoading: weeklyLoading } = useQuery({
    queryKey: ['auto-weekly-winners', twoWeeksAgo],
    queryFn: async () => {
      // Fetch products and votes separately since product_vote_counts is a VIEW
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
      if (votesRes.error) throw votesRes.error;
      
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
  });

  // Hidden Gems - recent products with fewer votes but launched
  const { data: hiddenGems, isLoading: gemsLoading } = useQuery({
    queryKey: ['auto-hidden-gems'],
    queryFn: async () => {
      // Get products from last 30 days with lower vote counts
      const thirtyDaysAgo = new Date(todayUTC.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // Fetch products and votes separately since product_vote_counts is a VIEW
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

  // 5 Products You Missed This Week - top products from 7-14 days ago
  const { data: missedProducts, isLoading: missedLoading } = useQuery({
    queryKey: ['auto-missed-products', oneWeekAgo, twoWeeksAgo],
    queryFn: async () => {
      const [productsRes, votesRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, tagline, slug')
          .eq('status', 'launched')
          .gte('launch_date', twoWeeksAgo)
          .lt('launch_date', oneWeekAgo),
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
  });

  // New & Noteworthy - newest launches with at least 1 vote
  const { data: newNoteworthy, isLoading: newNoteworthyLoading } = useQuery({
    queryKey: ['auto-new-noteworthy', threeDaysAgo],
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
      
      // Filter to products with at least 1 vote
      return mapped.filter((p) => (p.net_votes || 0) >= 1).slice(0, 5);
    },
  });

  // Master copy function for all newsletter content
  const handleMasterCopy = async () => {
    const sections: string[] = [];
    
    // Paid Launches
    if (paidLaunches && paidLaunches.length > 0) {
      const paidText = paidLaunches
        .map((p) => `${p.name} - ${p.tagline || 'No tagline'}\nhttps://trylaunch.ai/launch/${p.slug}`)
        .join('\n\n');
      sections.push(`💰 Sponsored Launches\n\n${paidText}`);
    }
    
    // Weekly Winners
    if (weeklyWinners && weeklyWinners.length > 0) {
      const winnersText = weeklyWinners
        .map((p) => `${p.name} - ${p.tagline || 'No tagline'}\nhttps://trylaunch.ai/launch/${p.slug}`)
        .join('\n\n');
      sections.push(`📈 Launch Weekly Winners\n\n${winnersText}`);
    }
    
    // New & Noteworthy
    if (newNoteworthy && newNoteworthy.length > 0) {
      const newText = newNoteworthy
        .map((p) => `${p.name} - ${p.tagline || 'No tagline'}\nhttps://trylaunch.ai/launch/${p.slug}`)
        .join('\n\n');
      sections.push(`✨ New & Noteworthy\n\n${newText}`);
    }
    
    // Hidden Gems
    if (hiddenGems && hiddenGems.length > 0) {
      const gemsText = hiddenGems
        .map((p) => `${p.name} - ${p.tagline || 'No tagline'}\nhttps://trylaunch.ai/launch/${p.slug}`)
        .join('\n\n');
      sections.push(`💎 Launch Hidden Gems\n\n${gemsText}`);
    }
    
    // Products You Missed
    if (missedProducts && missedProducts.length > 0) {
      const missedText = missedProducts
        .map((p) => `${p.name} - ${p.tagline || 'No tagline'}\nhttps://trylaunch.ai/launch/${p.slug}`)
        .join('\n\n');
      sections.push(`🕐 5 Products You Missed This Week\n\n${missedText}`);
    }
    
    // Builders to Watch
    if (buildersToWatch && buildersToWatch.length > 0) {
      const buildersText = buildersToWatch
        .map((b) => `${b.name || b.username} (@${b.username})\nhttps://trylaunch.ai/@${b.username}`)
        .join('\n\n');
      sections.push(`👀 Launch Builders to Watch\n\n${buildersText}`);
    }
    
    const fullContent = sections.join('\n\n---\n\n');
    await navigator.clipboard.writeText(fullContent);
    setMasterCopied(true);
    toast.success('All newsletter content copied!');
    setTimeout(() => setMasterCopied(false), 2000);
  };

  const sections: ContentSection[] = [
    {
      title: "💰 Sponsored Launches",
      description: "Currently active sponsored products",
      icon: null,
      sponsoredProducts: paidLaunches,
      isLoading: paidLoading,
    },
    {
      title: "🏆 Launch of the Day",
      description: "Top voted product(s) launched today",
      icon: null,
      products: launchOfDay,
      isLoading: launchLoading,
    },
    {
      title: "📈 Launch Weekly Winners",
      description: "Top 5 products from the past week",
      icon: null,
      products: weeklyWinners,
      isLoading: weeklyLoading,
    },
    {
      title: "🕐 5 Products You Missed This Week",
      description: "Top performers from 7-14 days ago",
      icon: null,
      products: missedProducts,
      isLoading: missedLoading,
    },
    {
      title: "✨ New & Noteworthy",
      description: "Fresh launches gaining traction",
      icon: null,
      products: newNoteworthy,
      isLoading: newNoteworthyLoading,
    },
    {
      title: "💎 Launch Hidden Gems",
      description: "Quality products that deserve more attention",
      icon: null,
      products: hiddenGems,
      isLoading: gemsLoading,
    },
    {
      title: "👀 Launch Builders to Watch",
      description: "Prolific builders with multiple products",
      icon: null,
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
        <Button 
          onClick={handleMasterCopy} 
          className="gap-2"
          variant="default"
        >
          {masterCopied ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          Copy All for Newsletter
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map((section) => (
          <Card key={section.title} className={section.sponsoredProducts ? 'border-amber-500/30' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{section.title}</CardTitle>
                {section.products && section.products.length > 0 && (
                  <CopyAllButton products={section.products} title={section.title} />
                )}
                {section.sponsoredProducts && section.sponsoredProducts.length > 0 && (
                  <CopyAllSponsoredButton products={section.sponsoredProducts} title={section.title} />
                )}
                {section.builders && section.builders.length > 0 && (
                  <CopyAllBuildersButton builders={section.builders} title={section.title} />
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
              ) : section.sponsoredProducts ? (
                section.sponsoredProducts.length > 0 ? (
                  section.sponsoredProducts.map((product) => (
                    <SponsoredProductCard key={product.id} product={product} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No active sponsored products
                  </p>
                )
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
