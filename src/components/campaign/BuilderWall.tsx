import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import defaultProductIcon from '@/assets/default-product-icon.png';
import { useCampaignProducts, type BuilderWallProduct } from '@/hooks/use-campaign-products';
import { trackCampaignEvent } from '@/lib/campaign';
import { VibeCodeBadge } from '@/components/campaign/VibeCodeBadge';
import { CampaignShareModal } from '@/components/campaign/CampaignShareModal';
import { Button } from '@/components/ui/button';

const ROW_HEIGHT = 120;
const INITIAL_ROWS = 8;
const LOAD_MORE_ROWS = 5;
const MAX_ROWS = 32;
const PRODUCTS_LIMIT = MAX_ROWS * 4;

const TILE_SIZE_PATTERN = ['tall', 'standard', 'compact', 'standard', 'standard', 'tall', 'compact', 'standard'] as const;
type TileSize = (typeof TILE_SIZE_PATTERN)[number];

const TileSizeClasses: Record<TileSize, { card: string; icon: string; name: string; tagline: string; footer: string }> = {
  tall: {
    card: 'p-6',
    icon: 'h-11 w-11',
    name: 'text-lg',
    tagline: 'line-clamp-3',
    footer: 'mt-5',
  },
  standard: {
    card: 'p-5',
    icon: 'h-9 w-9',
    name: 'text-base',
    tagline: 'line-clamp-2',
    footer: 'mt-4',
  },
  compact: {
    card: 'p-4',
    icon: 'h-8 w-8',
    name: 'text-base',
    tagline: 'hidden',
    footer: 'mt-3',
  },
};

const getTileSize = (index: number): TileSize => TILE_SIZE_PATTERN[index % TILE_SIZE_PATTERN.length];

interface BuilderCardProps {
  product: BuilderWallProduct;
  size: TileSize;
  onShare: (p: BuilderWallProduct) => void;
}

const BuilderCard = ({ product, size, onShare }: BuilderCardProps) => {
  const navigate = useNavigate();
  const styles = TileSizeClasses[size];

  const open = () => {
    trackCampaignEvent('builder_wall_card_clicked', product.id);
    navigate(`/launch/${product.slug}`);
  };

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
        <button
          type="button"
          aria-label={`Share ${product.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onShare(product);
          }}
          className="flex-shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-primary focus:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {product.tagline && size !== 'compact' && (
        <p className={`mt-2 text-sm text-muted-foreground ${styles.tagline}`}>{product.tagline}</p>
      )}

      <div className={`flex flex-wrap items-center gap-1.5 ${styles.footer}`}>
        {product.category && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {product.category}
          </span>
        )}
        {product.isCampaign && <VibeCodeBadge size={size === 'compact' ? 'sm' : 'sm'} />}
      </div>
    </article>
  );
};

interface WallColumnItem {
  product: BuilderWallProduct;
  size: TileSize;
}

interface WallColumnProps {
  items: WallColumnItem[];
  onShare: (p: BuilderWallProduct) => void;
  className?: string;
  duration: number;
  reverse?: boolean;
}

const WallColumn = ({ items, onShare, className = '', duration, reverse }: WallColumnProps) => {
  if (items.length === 0) return null;
  const group = (keyPrefix: string) => (
    <div className="flex flex-col gap-5">
      {items.map((item, i) => (
        <BuilderCard key={`${keyPrefix}-${item.product.id}-${i}`} product={item.product} size={item.size} onShare={onShare} />
      ))}
    </div>
  );
  return (
    <div className={`min-w-0 flex-1 ${className}`}>
      <div
        className={`builder-wall-track ${reverse ? 'is-reverse' : ''}`}
        style={{ ['--wall-duration' as string]: `${duration}s` }}
      >
        {group('a')}
        {group('b')}
      </div>
    </div>
  );
};

export const BuilderWall = () => {
  const { data: products, isLoading } = useCampaignProducts(64);
  const [sharing, setSharing] = useState<BuilderWallProduct | null>(null);
  const [visibleRows, setVisibleRows] = useState(INITIAL_ROWS);

  const columns = useMemo(() => {
    const list = products || [];
    const cols: WallColumnItem[][] = [[], [], [], []];
    list.forEach((product, i) => {
      const colIndex = i % 4;
      const rowIndex = Math.floor(i / 4);
      cols[colIndex].push({ product, size: getTileSize(rowIndex + colIndex) });
    });
    return cols;
  }, [products]);

  const wallHeight = visibleRows * 120 + 160;
  const hasMore = visibleRows < MAX_ROWS;

  const loadMore = () => {
    setVisibleRows((prev) => Math.min(prev + LOAD_MORE_ROWS, MAX_ROWS));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 24 }).map((_, i) => {
            const size = getTileSize(i);
            const height = size === 'tall' ? 'h-56' : size === 'compact' ? 'h-24' : 'h-40';
            return (
              <div
                key={i}
                className={`${height} animate-pulse rounded-xl border border-border bg-muted/40`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) return null;

  return (
    <>
      <div className="group/wall">
        <div className="container mx-auto max-w-7xl px-4">
          <div
            className="builder-wall-viewport"
            style={{ ['--wall-height' as string]: `${wallHeight}px` }}
          >
            <div className="flex gap-5">
              <WallColumn items={columns[0]} onShare={setSharing} duration={64} />
              <WallColumn items={columns[1]} onShare={setSharing} className="hidden sm:block" duration={78} reverse />
              <WallColumn items={columns[2]} onShare={setSharing} className="hidden md:block" duration={70} />
              <WallColumn items={columns[3]} onShare={setSharing} className="hidden lg:block" duration={86} reverse />
            </div>
          </div>
        </div>
      </div>

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <Button variant="outline" size="lg" onClick={loadMore}>
            See More Apps
          </Button>
        </div>
      )}

      <CampaignShareModal product={sharing} onClose={() => setSharing(null)} />
    </>
  );
};

export default BuilderWall;

