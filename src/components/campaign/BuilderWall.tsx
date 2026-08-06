import { useMemo, useState } from 'react';
import { ExternalLink, Share2, ChevronDown } from 'lucide-react';
import defaultProductIcon from '@/assets/default-product-icon.png';
import { useCampaignProducts, type BuilderWallProduct } from '@/hooks/use-campaign-products';
import { trackCampaignEvent } from '@/lib/campaign';
import { VibeCodeBadge } from '@/components/campaign/VibeCodeBadge';
import { CampaignShareModal } from '@/components/campaign/CampaignShareModal';
import { Button } from '@/components/ui/button';
import { SaveToCollectionButton } from '@/components/SaveToCollectionButton';

const INITIAL_ROWS = 4;
const LOAD_MORE_ROWS = 5;
const PRODUCTS_LIMIT = 120; // fetch a fast first slab; 'See More Apps' pages through it

type TileSize = 'tall' | 'standard' | 'compact' | 'row' | 'semi-compact';

const TileSizeClasses: Record<TileSize, { card: string; icon: string; screenshot: string; name: string; tagline: string; footer: string }> = {
  tall: {
    card: 'p-6',
    icon: 'h-11 w-11',
    screenshot: 'mt-4 aspect-[4/3]',
    name: 'text-lg',
    tagline: 'line-clamp-3',
    footer: 'mt-5',
  },
  standard: {
    card: 'flex h-full flex-col p-5',
    icon: 'h-9 w-9',
    screenshot: 'mt-3 aspect-video',
    name: 'text-base',
    tagline: 'line-clamp-2',
    footer: 'mt-auto pt-4',
  },
  row: {
    card: 'p-4',
    icon: 'h-10 w-10',
    screenshot: 'hidden',
    name: 'text-base',
    tagline: 'truncate',
    footer: 'mt-2',
  },
  compact: {
    card: 'p-4',
    icon: 'h-8 w-8',
    screenshot: 'hidden',
    name: 'text-base',
    tagline: 'hidden',
    footer: 'mt-3',
  },
  'semi-compact': {
    card: 'p-3',
    icon: 'h-9 w-9',
    screenshot: 'mt-2 aspect-video',
    name: 'text-base',
    tagline: 'line-clamp-1',
    footer: 'mt-2',
  },
};


interface BuilderCardProps {
  product: BuilderWallProduct;
  size: TileSize;
  onShare: (p: BuilderWallProduct) => void;
}

const BuilderCard = ({ product, size, onShare }: BuilderCardProps) => {
  const styles = TileSizeClasses[size];

  const open = () => {
    trackCampaignEvent('builder_wall_card_clicked', product.id);
    window.open(`/launch/${product.slug}`, '_blank', 'noopener,noreferrer');
  };

  if (size === 'row' || size === 'compact') {
    const dense = size === 'compact';
    return (
      <article
        onClick={open}
        className={`group/card flex cursor-pointer items-center gap-3 rounded-xl border bg-card transition-shadow hover:shadow-md ${dense ? 'p-3' : 'p-4'}`}
      >
        <img
          src={product.iconUrl || defaultProductIcon}
          alt={`${product.name} icon`}
          width={40}
          height={40}
          loading="lazy"
          decoding="async"
          className={`${dense ? 'h-8 w-8' : 'h-10 w-10'} flex-shrink-0 rounded-lg object-cover bg-background`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = defaultProductIcon;
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold leading-tight">{product.name}</h3>
            {product.isCampaign && <VibeCodeBadge size="sm" />}
          </div>
          {!dense && product.tagline && (
            <p className="truncate text-sm text-muted-foreground">{product.tagline}</p>
          )}
        </div>
        {!dense && product.category && (
          <span className="hidden flex-shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground sm:inline">
            {product.category}
          </span>
        )}
        <div
          className="flex flex-shrink-0 items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <a
            href={`/launch/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${product.name} in new window`}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-primary"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <SaveToCollectionButton
            productId={product.id}
            productName={product.name}
            variant="bare"
            className="rounded-md p-1"
          />
          <button
            type="button"
            aria-label={`Share ${product.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onShare(product);
            }}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-primary"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </article>
    );
  }

  return (
    <article
      onClick={open}
      className={`group/card cursor-pointer rounded-xl border bg-card ${styles.card} transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start gap-2.5">
        <img
          src={product.iconUrl || defaultProductIcon}
          alt={`${product.name} icon`}
          width={40}
          height={40}
          loading="lazy"
          decoding="async"
          className={`${styles.icon} flex-shrink-0 rounded-lg object-cover bg-background`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = defaultProductIcon;
          }}
        />
        <div className="min-w-0 flex-1">
          <h3 className={`font-semibold leading-tight line-clamp-2 ${styles.name}`}>{product.name}</h3>
          {product.founder && (
            <p className="truncate text-sm text-muted-foreground">@{product.founder}</p>
          )}
        </div>
        <div
          className="flex flex-shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <a
            href={`/launch/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${product.name} in new window`}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-primary"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {product.screenshotUrl && (
        <div className={`relative w-full overflow-hidden rounded-lg bg-muted ${styles.screenshot}`}>
          <img
            src={product.screenshotUrl}
            alt={`${product.name} screenshot`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {product.tagline && (
        <p className={`mt-2 text-sm text-muted-foreground ${styles.tagline}`}>{product.tagline}</p>
      )}

      <div className={`flex items-center justify-between gap-2 ${styles.footer}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          {product.category && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              {product.category}
            </span>
          )}
          {product.isCampaign && <VibeCodeBadge size="sm" />}
        </div>
        <div
          className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <SaveToCollectionButton
            productId={product.id}
            productName={product.name}
            variant="bare"
            className="rounded-md p-1"
          />
          <button
            type="button"
            aria-label={`Share ${product.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onShare(product);
            }}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-primary"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};

export const BuilderWall = ({ view = 'grid' }: { view?: 'list' | 'grid' | 'compact' | 'semi-compact' }) => {
  const { data: products, isLoading } = useCampaignProducts(PRODUCTS_LIMIT);
  const [sharing, setSharing] = useState<BuilderWallProduct | null>(null);
  const [visibleRows, setVisibleRows] = useState(INITIAL_ROWS);

  const gridClass =
    view === 'grid'
      ? 'grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      : view === 'semi-compact'
        ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
        : view === 'list'
          ? 'flex flex-col gap-3'
          : 'flex flex-col gap-2';
  const perRow = view === 'grid' ? 4 : view === 'semi-compact' ? 4 : 8;
  const tileSize: TileSize =
    view === 'compact' ? 'compact' : view === 'list' ? 'row' : view === 'semi-compact' ? 'semi-compact' : 'standard';

  const visible = useMemo(
    () => (products || []).slice(0, visibleRows * perRow),
    [products, visibleRows, perRow]
  );

  const maxRows = Math.max(INITIAL_ROWS, Math.ceil((products?.length || 0) / perRow));
  const hasMore = visibleRows < maxRows && visibleRows * perRow < (products?.length || 0);

  const loadMore = () => {
    setVisibleRows((prev) => Math.min(prev + LOAD_MORE_ROWS, maxRows));
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: INITIAL_ROWS * 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5">
              <div className="flex items-start gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-muted/60 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted/60 animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-muted/50 animate-pulse" />
                </div>
              </div>
              <div className="mt-3 aspect-video w-full rounded-lg bg-muted/50 animate-pulse" />
              <div className="mt-2 space-y-2">
                <div className="h-3 w-full rounded bg-muted/50 animate-pulse" />
                <div className="h-3 w-4/5 rounded bg-muted/50 animate-pulse" />
              </div>
              <div className="mt-4 h-6 w-24 rounded-full bg-muted/50 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) return null;

  return (
    <>
      <div className="w-full">
        <div className={gridClass}>
          {visible.map((product) => (
            <BuilderCard
              key={product.id}
              product={product}
              size={tileSize}
              onShare={setSharing}
            />
          ))}
        </div>
      </div>

      {hasMore && (
        <div className="text-center mt-8">
          <Button variant="outline" className="border-2 border-muted-foreground/20" onClick={loadMore}>
            See More Apps <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      <CampaignShareModal product={sharing} onClose={() => setSharing(null)} />
    </>
  );
};


export default BuilderWall;

