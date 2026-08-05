import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import defaultProductIcon from '@/assets/default-product-icon.png';
import { useCampaignProducts, type BuilderWallProduct } from '@/hooks/use-campaign-products';
import { trackCampaignEvent } from '@/lib/campaign';
import { VibeCodeBadge } from '@/components/campaign/VibeCodeBadge';
import { CampaignShareModal } from '@/components/campaign/CampaignShareModal';

const COLUMN_DURATIONS = ['52s', '64s', '58s', '70s'];

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
      className="group/card cursor-pointer rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <img
          src={product.iconUrl || defaultProductIcon}
          alt={`${product.name} icon`}
          width={40}
          height={40}
          loading="lazy"
          decoding="async"
          className="h-10 w-10 flex-shrink-0 rounded-lg object-cover bg-background"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = defaultProductIcon;
          }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-base leading-tight">{product.name}</h3>
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
          className="flex-shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-primary focus:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {product.tagline && (
        <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{product.tagline}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {product.category && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
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
  const { data: products, isLoading } = useCampaignProducts(32);
  const [sharing, setSharing] = useState<BuilderWallProduct | null>(null);

  const columns = useMemo(() => {
    const list = products || [];
    const cols: BuilderWallProduct[][] = [[], [], [], []];
    list.forEach((p, i) => cols[i % 4].push(p));
    return cols;
  }, [products]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading builders" role="status">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl border bg-muted/40" />
        ))}
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

        <div className="h-[560px] overflow-hidden sm:h-[680px] lg:h-[760px]">
          <div className="flex gap-4">
            <WallColumn items={columns[0]} duration={COLUMN_DURATIONS[0]} onShare={setSharing} />
            <WallColumn items={columns[1]} duration={COLUMN_DURATIONS[1]} onShare={setSharing} className="hidden sm:block" />
            <WallColumn items={columns[2]} duration={COLUMN_DURATIONS[2]} onShare={setSharing} className="hidden md:block" />
            <WallColumn items={columns[3]} duration={COLUMN_DURATIONS[3]} onShare={setSharing} className="hidden lg:block" />
          </div>
        </div>
      </div>

      <CampaignShareModal product={sharing} onClose={() => setSharing(null)} />
    </>
  );
};

export default BuilderWall;
