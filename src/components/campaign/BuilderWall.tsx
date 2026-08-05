import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import defaultProductIcon from '@/assets/default-product-icon.png';
import { useCampaignProducts, type BuilderWallProduct } from '@/hooks/use-campaign-products';
import { trackCampaignEvent } from '@/lib/campaign';
import { VibeCodeBadge } from '@/components/campaign/VibeCodeBadge';
import { CampaignShareModal } from '@/components/campaign/CampaignShareModal';
import { Button } from '@/components/ui/button';

const COLUMN_DURATIONS = ['48s', '56s', '52s', '60s'];
const INITIAL_ROWS = 8;
const LOAD_MORE_ROWS = 4;

const BuilderCard = ({
  product,
  onShare,
}: {
  product: BuilderWallProduct;
  onShare: (p: BuilderWallProduct) => void;
}) => {
  const navigate = useNavigate();

  const open = () => {
    trackCampaignEvent('builder_wall_card_clicked', product.id);
    navigate(`/launch/${product.slug}`);
  };

  return (
    <article
      onClick={open}
      className="group/card cursor-pointer rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-2.5">
        <img
          src={product.iconUrl || defaultProductIcon}
          alt={`${product.name} icon`}
          width={32}
          height={32}
          loading="lazy"
          decoding="async"
          className="h-8 w-8 flex-shrink-0 rounded-lg object-cover bg-background"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = defaultProductIcon;
          }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</h3>
          {product.founder && (
            <p className="truncate text-xs text-muted-foreground">@{product.founder}</p>
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

      {product.tagline && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{product.tagline}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {product.category && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {product.category}
          </span>
        )}
        {product.isCampaign && <VibeCodeBadge />}
      </div>
    </article>
  );
};

const WallColumn = ({
  items,
  duration,
  onShare,
  className = '',
}: {
  items: BuilderWallProduct[];
  duration: string;
  onShare: (p: BuilderWallProduct) => void;
  className?: string;
}) => {
  if (items.length === 0) return null;
  return (
    <div className={`min-w-0 flex-1 ${className}`}>
      <div
        className="flex flex-col gap-4 builder-wall-track group-hover/wall:[animation-play-state:paused]"
        style={{ animationDuration: duration }}
      >
        {[...items, ...items].map((product, i) => (
          <BuilderCard key={`${product.id}-${i}`} product={product} onShare={onShare} />
        ))}
      </div>
    </div>
  );
};

export const BuilderWall = () => {
  const { data: products, isLoading } = useCampaignProducts(64);
  const [sharing, setSharing] = useState<BuilderWallProduct | null>(null);
  const [visibleRows, setVisibleRows] = useState(INITIAL_ROWS);

  const columns = useMemo(() => {
    const list = (products || []).slice(0, visibleRows * 4);
    const cols: BuilderWallProduct[][] = [[], [], [], []];
    list.forEach((p, i) => cols[i % 4].push(p));
    return cols;
  }, [products, visibleRows]);

  const hasMore = products && visibleRows * 4 < products.length;

  const loadMore = () => {
    setVisibleRows((prev) => prev + LOAD_MORE_ROWS);
  };

  if (isLoading) {
    return (
      <div className="h-[900px] overflow-hidden sm:h-[1100px] lg:h-[1300px]">
        <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) return null;

  return (
    <>
      <div className="group/wall relative">
        {/* fade gradients */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-background to-transparent sm:h-24" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-background to-transparent sm:h-24" />

        <div className="h-[900px] overflow-hidden sm:h-[1100px] lg:h-[1300px]">
          <div className="flex gap-4">
            <WallColumn items={columns[0]} duration={COLUMN_DURATIONS[0]} onShare={setSharing} />
            <WallColumn items={columns[1]} duration={COLUMN_DURATIONS[1]} onShare={setSharing} className="hidden sm:block" />
            <WallColumn items={columns[2]} duration={COLUMN_DURATIONS[2]} onShare={setSharing} className="hidden md:block" />
            <WallColumn items={columns[3]} duration={COLUMN_DURATIONS[3]} onShare={setSharing} className="hidden lg:block" />
          </div>
        </div>
      </div>

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <Button variant="outline" size="lg" onClick={loadMore}>
            See more
          </Button>
        </div>
      )}

      <CampaignShareModal product={sharing} onClose={() => setSharing(null)} />
    </>
  );
};

export default BuilderWall;
