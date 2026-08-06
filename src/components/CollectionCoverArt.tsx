import { builtWithBySlug } from '@/lib/builtWithPlatforms';

interface Props {
  slug?: string | null;
  name: string;
  coverImageUrl?: string | null;
  /** Latest added product's screenshot, used when no cover image is uploaded. */
  fallbackImageUrl?: string | null;
  className?: string;
}

/**
 * Renders the cover art for a collection.
 * - Built With {platform} collections (slug `built-with-*`) render the platform logo plate.
 * - Otherwise renders the uploaded cover image, then the latest product screenshot,
 *   falling back to a neutral placeholder.
 */
export default function CollectionCoverArt({ slug, name, coverImageUrl, fallbackImageUrl, className = '' }: Props) {
  const platformSlug = slug?.startsWith('built-with-') ? slug.slice('built-with-'.length) : null;
  const platform = platformSlug ? builtWithBySlug.get(platformSlug) : null;

  if (platform) {
    return (
      <div className={`${platform.plate} w-full h-full flex items-center justify-center overflow-hidden ${className}`}>
        <img
          src={platform.logoUrl}
          alt={`${platform.name} logo`}
          className="max-h-[60%] max-w-[78%] object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  const image = coverImageUrl || fallbackImageUrl;
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={`w-full h-full object-cover ${className}`}
        loading="lazy"
      />
    );
  }

  return <div className={`w-full h-full bg-muted animate-pulse ${className}`} />;
}
