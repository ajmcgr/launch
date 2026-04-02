import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, ExternalLink, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

// Rich clipboard helper: copies both text/html (for Beehiiv) and text/plain fallback
async function copyRichText(html: string, plain: string) {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      }),
    ]);
  } catch {
    await navigator.clipboard.writeText(plain);
  }
}

function productToHtml(name: string, tagline: string, url: string, iconUrl?: string) {
  const img = iconUrl
    ? `<img src="${iconUrl}" alt="${name}" width="20" height="20" style="width:20px;height:20px;vertical-align:middle;margin-right:8px;border-radius:4px" />`
    : '';
  return `<p>${img}<a href="${url}">${name}</a> — ${tagline}</p>`;
}

function productToPlain(name: string, tagline: string, url: string) {
  return `${name} — ${tagline}\n${url}`;
}

function storyToHtml(name: string, signups: number, revenue: number, testimonial: string | null, url: string, iconUrl?: string) {
  const img = iconUrl
    ? `<img src="${iconUrl}" alt="${name}" width="20" height="20" style="width:20px;height:20px;vertical-align:middle;margin-right:8px;border-radius:4px" />`
    : '';
  const summary = `${signups} signups, $${revenue} revenue${testimonial ? ` \"${truncateToOneSentence(testimonial)}\"` : ''}`;
  return `<p>${img}<a href="${url}">${name}</a> — ${summary}</p>`;
}

function storyToPlain(name: string, signups: number, revenue: number, testimonial: string | null, url: string) {
  return `${name} — ${signups} signups, $${revenue} revenue${testimonial ? `\n"${truncateToOneSentence(testimonial)}"` : ''}\n${url}`;
}

// Truncate text to one sentence
const truncateToOneSentence = (text: string): string => {
  if (!text) return '';
  const match = text.match(/^[^.!?]*[.!?]/);
  return match ? match[0] : text;
};

interface SurfacedProduct {
  id: string;
  name: string;
  tagline: string | null;
  slug: string;
  net_votes?: number;
  icon_url?: string;
  product_media?: { url: string; type: string }[];
}

interface SponsoredProduct {
  id: string;
  name: string;
  tagline: string | null;
  slug: string;
  sponsorship_type: string;
  start_date: string;
  end_date: string;
  icon_url?: string;
  product_media?: { url: string; type: string }[];
}

interface SurfacedBuilder {
  id: string;
  username: string;
  name: string | null;
  product_count: number;
}

interface TopMaker {
  user_id: string;
  username: string;
  name: string | null;
  karma: number;
}

interface SuccessStoryItem {
  product_id: string;
  name: string;
  slug: string;
  signups: number;
  revenue: number;
  testimonial: string | null;
  icon_url?: string;
}

interface ContentSection {
  title: string;
  description: string;
  icon: React.ReactNode;
  products?: SurfacedProduct[];
  builders?: SurfacedBuilder[];
  topMakers?: TopMaker[];
  sponsoredProducts?: SponsoredProduct[];
  stackItems?: { id: number; name: string; slug: string; product_count: number }[];
  successStories?: SuccessStoryItem[];
  isLoading: boolean;
}

const CopyButton = ({ html, plain, label }: { html: string; plain: string; label: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyRichText(html, plain);
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
  const taglineText = product.tagline ? truncateToOneSentence(product.tagline) : 'No tagline';
  const htmlText = productToHtml(product.name, taglineText, productUrl, product.icon_url);
  const plainText = productToPlain(product.name, taglineText, productUrl);

  return (
    <div className="flex items-start justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {product.icon_url && (
          <img src={product.icon_url} alt={product.name} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
        )}
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
            {product.tagline ? truncateToOneSentence(product.tagline) : 'No tagline'}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1 truncate">{productUrl}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <CopyButton html={htmlText} plain={plainText} label="product" />
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
  const taglineText = product.tagline ? truncateToOneSentence(product.tagline) : 'No tagline';
  const htmlText = productToHtml(product.name, taglineText, productUrl, product.icon_url);
  const plainText = productToPlain(product.name, taglineText, productUrl);

  return (
    <div className="flex items-start justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors border-amber-500/30">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {product.icon_url && (
          <img src={product.icon_url} alt={product.name} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{product.name}</span>
            <Badge className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
              {product.sponsorship_type === 'combined' ? 'Website + Newsletter' : 
               product.sponsorship_type === 'website' ? 'Website' : 
               product.sponsorship_type === 'newsletter' ? 'Newsletter' :
               product.sponsorship_type.toLowerCase() === 'skip' ? 'Pro' :
               product.sponsorship_type.toLowerCase() === 'join' ? 'Lite' :
               product.sponsorship_type.toLowerCase() === 'lite' ? 'Lite' :
               product.sponsorship_type.toLowerCase() === 'pro' ? 'Pro' :
               product.sponsorship_type.toLowerCase().includes('pass') ? 'Pass' :
               product.sponsorship_type}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {product.tagline ? truncateToOneSentence(product.tagline) : 'No tagline'}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1 truncate">{productUrl}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <CopyButton html={htmlText} plain={plainText} label="product" />
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

const TopMakerCard = ({ maker }: { maker: TopMaker }) => {
  const profileUrl = `https://trylaunch.ai/@${maker.username}`;
  const copyText = `${maker.name || maker.username} (@${maker.username}) — ${maker.karma} karma\n${profileUrl}`;

  return (
    <div className="flex items-start justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{maker.name || maker.username}</span>
          <Badge variant="secondary" className="text-xs">
            {maker.karma} karma
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">@{maker.username}</p>
        <p className="text-xs text-muted-foreground/70 mt-1 truncate">{profileUrl}</p>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <CopyButton html={`<p>${maker.name || maker.username} (@${maker.username}) — ${maker.karma} karma</p>`} plain={copyText} label="maker" />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          asChild
        >
          <a href={`/@${maker.username}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
};

const CopyAllTopMakersButton = ({ makers, title }: { makers: TopMaker[]; title: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    const plain = makers
      .map((m) => `${m.name || m.username} (@${m.username}) — ${m.karma} karma\nhttps://trylaunch.ai/@${m.username}`)
      .join('\n\n');
    const html = `<h3>${title}</h3>` + makers
      .map((m) => `<p><a href="https://trylaunch.ai/@${m.username}">${m.name || m.username}</a> (@${m.username}) — ${m.karma} karma</p>`)
      .join('');
    
    await copyRichText(html, `${title}\n\n${plain}`);
    setCopied(true);
    toast.success('All top makers copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopyAll} className="gap-2">
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      Copy All
    </Button>
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
        <CopyButton html={`<p>${builder.name || builder.username} (@${builder.username})</p>`} plain={copyText} label="builder" />
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
    const plain = products
      .map((p) => productToPlain(p.name, p.tagline ? truncateToOneSentence(p.tagline) : 'No tagline', `https://trylaunch.ai/launch/${p.slug}`))
      .join('\n\n');
    const html = `<h3>${title}</h3>` + products
      .map((p) => productToHtml(p.name, p.tagline ? truncateToOneSentence(p.tagline) : 'No tagline', `https://trylaunch.ai/launch/${p.slug}`, p.icon_url))
      .join('');
    
    await copyRichText(html, `${title}\n\n${plain}`);
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
    const plain = products
      .map((p) => productToPlain(p.name, p.tagline ? truncateToOneSentence(p.tagline) : 'No tagline', `https://trylaunch.ai/launch/${p.slug}`))
      .join('\n\n');
    const html = `<h3>${title}</h3>` + products
      .map((p) => productToHtml(p.name, p.tagline ? truncateToOneSentence(p.tagline) : 'No tagline', `https://trylaunch.ai/launch/${p.slug}`, p.icon_url))
      .join('');
    
    await copyRichText(html, `${title}\n\n${plain}`);
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
    const plain = builders
      .map((b) => `${b.name || b.username} (@${b.username})\nhttps://trylaunch.ai/@${b.username}`)
      .join('\n\n');
    const html = `<h3>${title}</h3>` + builders
      .map((b) => `<p><a href="https://trylaunch.ai/@${b.username}">${b.name || b.username}</a> (@${b.username})</p>`)
      .join('');
    
    await copyRichText(html, `${title}\n\n${plain}`);
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

const CopyAllStackButton = ({ items, title }: { items: { name: string; slug: string; product_count: number }[]; title: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    const plain = items
      .map((t) => `${t.name} (${t.product_count} products)\nhttps://trylaunch.ai/tech/${t.slug}`)
      .join('\n\n');
    const html = `<h3>${title}</h3>` + items
      .map((t) => `<p><a href="https://trylaunch.ai/tech/${t.slug}">${t.name}</a> (${t.product_count} products)</p>`)
      .join('');
    
    await copyRichText(html, `${title}\n\n${plain}`);
    setCopied(true);
    toast.success('All technologies copied!');
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
  
  const getIconUrl = (product: any) =>
    product?.icon_url ||
    product?.product_media?.find((media: any) => media.type === 'icon')?.url ||
    undefined;

  // Get today's date range in UTC
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfDay = todayUTC.toISOString();
  const endOfDay = new Date(todayUTC.getTime() + 24 * 60 * 60 * 1000).toISOString();
  
  // Date ranges for various queries
  const oneWeekAgo = new Date(todayUTC.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(todayUTC.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(todayUTC.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // Paid Launches - currently active sponsored products + Lite/Pro/Pass orders from past week
  const { data: paidLaunches, isLoading: paidLoading } = useQuery({
    queryKey: ['auto-paid-launches', todayUTC.toISOString(), oneWeekAgo],
    queryFn: async () => {
      const today = todayUTC.toISOString().split('T')[0];
      
      // Fetch sponsored products and orders in parallel
      const [sponsoredRes, ordersRes] = await Promise.all([
        supabase
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
          .order('position', { ascending: true }),
        supabase
          .from('orders')
          .select(`
            id,
            plan,
            created_at,
            product_id,
            products(id, name, tagline, slug)
          `)
          .gte('created_at', oneWeekAgo)
          .not('product_id', 'is', null)
      ]);
      
      if (sponsoredRes.error) throw sponsoredRes.error;
      
      // Map sponsored products
      const sponsored = (sponsoredRes.data || []).map((sp: any) => ({
        id: sp.products?.id || sp.id,
        name: sp.products?.name || 'Unknown',
        tagline: sp.products?.tagline,
        slug: sp.products?.slug || '',
        sponsorship_type: sp.sponsorship_type,
        start_date: sp.start_date,
        end_date: sp.end_date,
      }));
      
      // Map orders (any paid plan - exclude 'free')
      const orderProducts = (ordersRes.data || [])
        .filter((o: any) => {
          const plan = (o.plan || '').toLowerCase();
          return plan !== 'free' && plan !== '';
        })
        .map((o: any) => ({
          id: o.products?.id || o.product_id,
          name: o.products?.name || 'Unknown',
          tagline: o.products?.tagline,
          slug: o.products?.slug || '',
          sponsorship_type: o.plan,
          start_date: o.created_at?.split('T')[0] || '',
          end_date: '',
        }));
      
      // Combine and deduplicate by product id
      const allProducts = [...sponsored];
      const existingIds = new Set(sponsored.map((p: any) => p.id));
      
      orderProducts.forEach((p: any) => {
        if (!existingIds.has(p.id)) {
          allProducts.push(p);
          existingIds.add(p.id);
        }
      });
      
      return allProducts;
    },
  });

  // Get current sponsored product IDs to exclude from other sections
  const { data: sponsoredProductIds } = useQuery({
    queryKey: ['sponsored-product-ids', todayUTC.toISOString()],
    queryFn: async () => {
      const today = todayUTC.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('sponsored_products')
        .select('product_id')
        .lte('start_date', today)
        .gte('end_date', today);
      
      if (error) throw error;
      return new Set((data || []).map((sp: any) => sp.product_id));
    },
  });

  // Launch of the Day - top voted product today (excluding sponsored)
  const { data: launchOfDay, isLoading: launchLoading } = useQuery({
    queryKey: ['auto-launch-of-day', startOfDay, sponsoredProductIds],
    queryFn: async () => {
      // Fetch products and votes separately since product_vote_counts is a VIEW
      const [productsRes, votesRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, tagline, slug, launch_date')
          .eq('status', 'launched')
          .gte('launch_date', startOfDay)
          .lt('launch_date', endOfDay),
        supabase
          .from('product_vote_counts')
          .select('product_id, net_votes')
      ]);
      
      if (productsRes.error) throw productsRes.error;
      
      const votesMap = new Map((votesRes.data || []).map((v: any) => [v.product_id, v.net_votes || 0]));
      
      const mapped = (productsRes.data || [])
        .filter((p: any) => !sponsoredProductIds?.has(p.id))
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          tagline: p.tagline,
          slug: p.slug,
          launch_date: p.launch_date,
          net_votes: votesMap.get(p.id) || 0,
        }));
      
      // Sort by votes (desc), then by earliest launch_date as tiebreaker
      return mapped.sort((a, b) => {
        const voteDiff = (b.net_votes || 0) - (a.net_votes || 0);
        if (voteDiff !== 0) return voteDiff;
        // Earlier launch wins when votes are tied
        return new Date(a.launch_date).getTime() - new Date(b.launch_date).getTime();
      }).slice(0, 1);
    },
    enabled: sponsoredProductIds !== undefined,
  });

  // Weekly Winners - top voted products this week (excluding sponsored)
  const { data: weeklyWinners, isLoading: weeklyLoading } = useQuery({
    queryKey: ['auto-weekly-winners', twoWeeksAgo, sponsoredProductIds],
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
      
      const mapped = (productsRes.data || [])
        .filter((p: any) => !sponsoredProductIds?.has(p.id))
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          tagline: p.tagline,
          slug: p.slug,
          net_votes: votesMap.get(p.id) || 0,
        }));
      
      return mapped.sort((a, b) => (b.net_votes || 0) - (a.net_votes || 0)).slice(0, 5);
    },
    enabled: sponsoredProductIds !== undefined,
  });

  // Hidden Gems - recent products with fewer votes but launched (excluding sponsored)
  const { data: hiddenGems, isLoading: gemsLoading } = useQuery({
    queryKey: ['auto-hidden-gems', sponsoredProductIds],
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
      
      const mapped = (productsRes.data || [])
        .filter((p: any) => !sponsoredProductIds?.has(p.id))
        .map((p: any) => ({
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
    enabled: sponsoredProductIds !== undefined,
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

  // Top Makers by Karma
  const { data: topMakersByKarma, isLoading: topMakersLoading } = useQuery({
    queryKey: ['auto-top-makers-karma'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_karma')
        .select('user_id, username, name, karma')
        .order('karma', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return (data || []).filter((m: any) => m.karma > 0) as TopMaker[];
    },
  });

  // Popular Technology - top 5 stack items by product count
  const { data: popularTech, isLoading: techLoading } = useQuery({
    queryKey: ['auto-popular-tech'],
    queryFn: async () => {
      const { data: stackItems, error: stackError } = await supabase
        .from('stack_items')
        .select('id, name, slug');
      if (stackError) throw stackError;

      const { data: mappings, error: mapError } = await supabase
        .from('product_stack_map')
        .select('stack_item_id');
      if (mapError) throw mapError;

      const countMap: Record<number, number> = {};
      (mappings || []).forEach((m: any) => {
        countMap[m.stack_item_id] = (countMap[m.stack_item_id] || 0) + 1;
      });

      return (stackItems || [])
        .map((s: any) => ({ id: s.id, name: s.name, slug: s.slug, product_count: countMap[s.id] || 0 }))
        .sort((a, b) => b.product_count - a.product_count)
        .slice(0, 5);
    },
  });

  // Latest Tech on Launch - 5 most recently added stack items
  const { data: latestTech, isLoading: latestTechLoading } = useQuery({
    queryKey: ['auto-latest-tech'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stack_items')
        .select('id, name, slug, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []).map((s: any) => ({ id: s.id, name: s.name, slug: s.slug, product_count: 0 }));
    },
  });

  // Top 5 Monthly Success Stories - best outcomes from the last 30 days
  const { data: topSuccessStories, isLoading: successStoriesLoading } = useQuery({
    queryKey: ['auto-success-stories-monthly'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(todayUTC.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: outcomes, error } = await (supabase as any)
        .from('product_outcomes')
        .select('product_id, signups, revenue, testimonial, updated_at')
        .or('signups.gt.0,revenue.gt.0,testimonial.neq.')
        .gte('updated_at', thirtyDaysAgo)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      if (!outcomes || outcomes.length === 0) return [];

      const productIds = outcomes.map((o: any) => o.product_id);
      const { data: products } = await supabase
        .from('products')
        .select('id, name, slug')
        .in('id', productIds)
        .eq('status', 'launched');

      const productMap = new Map((products || []).map((p: any) => [p.id, p]));

      return outcomes
        .filter((o: any) => productMap.has(o.product_id))
        .map((o: any) => {
          const p = productMap.get(o.product_id);
          return {
            product_id: o.product_id,
            name: p.name,
            slug: p.slug,
            signups: o.signups || 0,
            revenue: o.revenue || 0,
            testimonial: o.testimonial,
          };
        })
        .sort((a: any, b: any) => (b.signups + b.revenue) - (a.signups + a.revenue))
        .slice(0, 5) as SuccessStoryItem[];
    },
  });

  // Weekly Awards - gold, silver, bronze winners from this week
  const { data: weeklyAwards, isLoading: awardsLoading } = useQuery({
    queryKey: ['auto-weekly-awards', oneWeekAgo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, tagline, slug, won_monthly, won_weekly, won_daily, launch_date')
        .or('won_monthly.eq.true,won_weekly.eq.true,won_daily.eq.true')
        .eq('status', 'launched')
        .gte('launch_date', oneWeekAgo)
        .order('launch_date', { ascending: false });

      if (error) throw error;

      // Map to SurfacedProduct with award tier label
      const results: SurfacedProduct[] = [];
      const gold = (data || []).find((p: any) => p.won_monthly);
      const silver = (data || []).find((p: any) => p.won_weekly);
      const bronze = (data || []).find((p: any) => p.won_daily);

      [gold, silver, bronze].forEach((p, i) => {
        if (p) {
          const tierLabel = i === 0 ? '🥇 #1' : i === 1 ? '🥈 #2' : '🥉 #3';
          results.push({
            id: p.id,
            name: `${tierLabel} ${p.name}`,
            tagline: p.tagline,
            slug: p.slug,
          });
        }
      });

      return results;
    },
  });

  // 5 Products You Missed This Week - top products from 7-14 days ago (excluding sponsored)
  const { data: missedProducts, isLoading: missedLoading } = useQuery({
    queryKey: ['auto-missed-products', oneWeekAgo, twoWeeksAgo, sponsoredProductIds],
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
      
      const mapped = (productsRes.data || [])
        .filter((p: any) => !sponsoredProductIds?.has(p.id))
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          tagline: p.tagline,
          slug: p.slug,
          net_votes: votesMap.get(p.id) || 0,
        }));
      
      return mapped.sort((a, b) => (b.net_votes || 0) - (a.net_votes || 0)).slice(0, 5);
    },
    enabled: sponsoredProductIds !== undefined,
  });

  // New & Noteworthy - newest launches with at least 1 vote (excluding sponsored)
  const { data: newNoteworthy, isLoading: newNoteworthyLoading } = useQuery({
    queryKey: ['auto-new-noteworthy', threeDaysAgo, sponsoredProductIds],
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
      
      const mapped = (productsRes.data || [])
        .filter((p: any) => !sponsoredProductIds?.has(p.id))
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          tagline: p.tagline,
          slug: p.slug,
          net_votes: votesMap.get(p.id) || 0,
        }));
      
      // Filter to products with at least 1 vote
      return mapped.filter((p) => (p.net_votes || 0) >= 1).slice(0, 5);
    },
    enabled: sponsoredProductIds !== undefined,
  });

  // Master copy function for all newsletter content
  const handleMasterCopy = async () => {
    const htmlSections: string[] = [];
    const plainSections: string[] = [];
    
    const formatProductHtml = (p: SurfacedProduct | SponsoredProduct) => {
      const tagline = p.tagline ? truncateToOneSentence(p.tagline) : 'No tagline';
      return productToHtml(p.name, tagline, `https://trylaunch.ai/launch/${p.slug}`, (p as any).icon_url);
    };
    const formatProductPlain = (p: SurfacedProduct | SponsoredProduct) => {
      const tagline = p.tagline ? truncateToOneSentence(p.tagline) : 'No tagline';
      return productToPlain(p.name, tagline, `https://trylaunch.ai/launch/${p.slug}`);
    };

    const addProductSection = (title: string, emoji: string, items: (SurfacedProduct | SponsoredProduct)[] | undefined) => {
      if (!items || items.length === 0) return;
      htmlSections.push(`<h2>${emoji} ${title}</h2>` + items.map(formatProductHtml).join(''));
      plainSections.push(`## ${emoji} ${title}\n\n` + items.map(formatProductPlain).join('\n\n'));
    };

    addProductSection('Sponsored Launches', '💰', enrichWithIcons(paidLaunches) as SponsoredProduct[] | undefined);
    addProductSection('Launch Weekly Winners', '📈', enrichWithIcons(weeklyWinners));
    addProductSection('Weekly Awards', '🏅', enrichWithIcons(weeklyAwards));
    addProductSection('5 Launch Products You Missed This Week', '🕐', enrichWithIcons(missedProducts));
    addProductSection('New & Noteworthy on Launch', '✨', enrichWithIcons(newNoteworthy));
    addProductSection('Launch Hidden Gems', '💎', enrichWithIcons(hiddenGems));
    
    // Builders to Watch
    if (buildersToWatch && buildersToWatch.length > 0) {
      htmlSections.push(`<h2>👀 Launch Makers to Watch</h2>` + buildersToWatch
        .map((b) => `<p><a href="https://trylaunch.ai/@${b.username}">${b.name || b.username}</a> (@${b.username})</p>`).join(''));
      plainSections.push(`## 👀 Launch Makers to Watch\n\n` + buildersToWatch
        .map((b) => `${b.name || b.username} (@${b.username})\nhttps://trylaunch.ai/@${b.username}`).join('\n\n'));
    }
    
    // Top Makers by Karma
    if (topMakersByKarma && topMakersByKarma.length > 0) {
      htmlSections.push(`<h2>⚡ Top Makers by Karma</h2>` + topMakersByKarma
        .map((m) => `<p><a href="https://trylaunch.ai/@${m.username}">${m.name || m.username}</a> (@${m.username}) — ${m.karma} karma</p>`).join(''));
      plainSections.push(`## ⚡ Top Makers by Karma\n\n` + topMakersByKarma
        .map((m) => `${m.name || m.username} (@${m.username}) — ${m.karma} karma\nhttps://trylaunch.ai/@${m.username}`).join('\n\n'));
    }
    
    // Popular Technology
    if (popularTech && popularTech.length > 0) {
      htmlSections.push(`<h2>🛠️ Most Popular Tech on Launch</h2>` + popularTech
        .map((t) => `<p><a href="https://trylaunch.ai/tech/${t.slug}">${t.name}</a> (${t.product_count} products)</p>`).join(''));
      plainSections.push(`## 🛠️ Most Popular Tech on Launch\n\n` + popularTech
        .map((t) => `${t.name} (${t.product_count} products)\nhttps://trylaunch.ai/tech/${t.slug}`).join('\n\n'));
    }

    // Latest Tech
    if (latestTech && latestTech.length > 0) {
      htmlSections.push(`<h2>🆕 Latest Tech on Launch</h2>` + latestTech
        .map((t) => `<p><a href="https://trylaunch.ai/tech/${t.slug}">${t.name}</a></p>`).join(''));
      plainSections.push(`## 🆕 Latest Tech on Launch\n\n` + latestTech
        .map((t) => `${t.name}\nhttps://trylaunch.ai/tech/${t.slug}`).join('\n\n'));
    }

    // Top Monthly Success Stories
    if (topSuccessStories && topSuccessStories.length > 0) {
      htmlSections.push(`<h2>🎯 Top Monthly Success Stories</h2>` + topSuccessStories
        .map((s) => `<p><a href="https://trylaunch.ai/launch/${s.slug}">${s.name}</a> — ${s.signups} signups, $${s.revenue} revenue${s.testimonial ? ` "${truncateToOneSentence(s.testimonial)}"` : ''}</p>`).join(''));
      plainSections.push(`## 🎯 Top Monthly Success Stories\n\n` + topSuccessStories
        .map((s) => `${s.name} — ${s.signups} signups, $${s.revenue} revenue${s.testimonial ? `\n"${truncateToOneSentence(s.testimonial)}"` : ''}\nhttps://trylaunch.ai/launch/${s.slug}`).join('\n\n'));
    }
    
    if (htmlSections.length === 0) {
      toast.error('No content available to copy');
      return;
    }
    
    const fullHtml = htmlSections.join('<hr />');
    const fullPlain = plainSections.join('\n\n---\n\n');
    await copyRichText(fullHtml, fullPlain);
    setMasterCopied(true);
    toast.success('All newsletter content copied!');
    setTimeout(() => setMasterCopied(false), 2000);
  };

  const contentSections: ContentSection[] = [
    {
      title: "💰 Sponsored Launches",
      description: "Currently active sponsored products",
      icon: null,
      sponsoredProducts: enrichWithIcons(paidLaunches) as SponsoredProduct[] | undefined,
      isLoading: paidLoading,
    },
    {
      title: "🏆 Launch of the Day",
      description: "Top voted product(s) launched today",
      icon: null,
      products: enrichWithIcons(launchOfDay),
      isLoading: launchLoading,
    },
    {
      title: "📈 Launch Weekly Winners",
      description: "Top 5 products from the past week",
      icon: null,
      products: enrichWithIcons(weeklyWinners),
      isLoading: weeklyLoading,
    },
    {
      title: "🏅 Weekly Awards",
      description: "This week's Gold, Silver, and Bronze winners",
      icon: null,
      products: enrichWithIcons(weeklyAwards),
      isLoading: awardsLoading,
    },
    {
      title: "🕐 5 Launch Products You Missed This Week",
      description: "Top performers from 7-14 days ago",
      icon: null,
      products: enrichWithIcons(missedProducts),
      isLoading: missedLoading,
    },
    {
      title: "✨ New & Noteworthy on Launch",
      description: "Fresh launches gaining traction",
      icon: null,
      products: enrichWithIcons(newNoteworthy),
      isLoading: newNoteworthyLoading,
    },
    {
      title: "💎 Launch Hidden Gems",
      description: "Quality products that deserve more attention",
      icon: null,
      products: enrichWithIcons(hiddenGems),
      isLoading: gemsLoading,
    },
    {
      title: "👀 Launch Makers to Watch",
      description: "Prolific makers with multiple products",
      icon: null,
      builders: buildersToWatch,
      isLoading: buildersLoading,
    },
    {
      title: "⚡ Top Makers by Karma",
      description: "Top 10 makers ranked by karma score",
      icon: null,
      topMakers: topMakersByKarma,
      isLoading: topMakersLoading,
    },
    {
      title: "🛠️ Most Popular Tech on Launch",
      description: "Top 5 technologies used by makers",
      icon: null,
      stackItems: popularTech,
      isLoading: techLoading,
    },
    {
      title: "🆕 Latest Tech on Launch",
      description: "5 most recently added technologies",
      icon: null,
      stackItems: latestTech,
      isLoading: latestTechLoading,
    },
    {
      title: "🎯 Top Monthly Success Stories",
      description: "Best reported outcomes from the last 30 days",
      icon: null,
      successStories: topSuccessStories,
      isLoading: successStoriesLoading,
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
        {contentSections.map((section) => (
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
                {section.topMakers && section.topMakers.length > 0 && (
                  <CopyAllTopMakersButton makers={section.topMakers} title={section.title} />
                )}
                {section.stackItems && section.stackItems.length > 0 && (
                  <CopyAllStackButton items={section.stackItems} title={section.title} />
                )}
                {section.successStories && section.successStories.length > 0 && (
                  <Button variant="outline" size="sm" className="gap-2" onClick={async () => {
                    const text = section.successStories!.map(s => 
                      `${s.name} — ${s.signups} signups, $${s.revenue} revenue${s.testimonial ? `\n"${truncateToOneSentence(s.testimonial)}"` : ''}\nhttps://trylaunch.ai/launch/${s.slug}`
                    ).join('\n\n');
                    await navigator.clipboard.writeText(`${section.title}\n\n${text}`);
                    toast.success('Success stories copied!');
                  }}>
                    <Copy className="h-4 w-4" /> Copy All
                  </Button>
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
              ) : section.topMakers ? (
                section.topMakers.length > 0 ? (
                  section.topMakers.map((maker) => (
                    <TopMakerCard key={maker.user_id} maker={maker} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No makers found
                  </p>
                )
              ) : section.stackItems ? (
                section.stackItems.length > 0 ? (
                  section.stackItems.map((item) => (
                    <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{item.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {item.product_count} product{item.product_count !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground/70 mt-1 truncate">https://trylaunch.ai/tech/{item.slug}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <CopyButton html={`<p>${item.name} (${item.product_count} products) — <a href="https://trylaunch.ai/tech/${item.slug}">View</a></p>`} plain={`${item.name} (${item.product_count} products)\nhttps://trylaunch.ai/tech/${item.slug}`} label="technology" />
                        <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                          <a href={`/tech/${item.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No technologies found
                  </p>
                )
              ) : section.successStories ? (
                section.successStories.length > 0 ? (
                  section.successStories.map((story) => (
                    <div key={story.product_id} className="flex items-start justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{story.name}</span>
                          {story.signups > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {story.signups} signups
                            </Badge>
                          )}
                          {story.revenue > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              ${story.revenue.toLocaleString()}
                            </Badge>
                          )}
                        </div>
                        {story.testimonial && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5 italic">
                            "{truncateToOneSentence(story.testimonial)}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/70 mt-1 truncate">https://trylaunch.ai/launch/{story.slug}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <CopyButton html={`<p>${story.name} — ${story.signups} signups, $${story.revenue} revenue${story.testimonial ? ` "${truncateToOneSentence(story.testimonial)}"` : ''} — <a href="https://trylaunch.ai/launch/${story.slug}">View</a></p>`} plain={`${story.name} — ${story.signups} signups, $${story.revenue} revenue${story.testimonial ? `\n"${truncateToOneSentence(story.testimonial)}"` : ''}\nhttps://trylaunch.ai/launch/${story.slug}`} label="story" />
                        <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                          <a href={`/launch/${story.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No success stories this month
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
