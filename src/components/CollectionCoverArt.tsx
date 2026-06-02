import { builtWithBySlug } from '@/lib/builtWithPlatforms';
import { gradientFor } from '@/lib/gradients';

interface Props {
  slug?: string | null;
  name: string;
  coverImageUrl?: string | null;
  className?: string;
}

/**
 * Renders the cover art for a collection.
 * - Built With {platform} collections (slug `built-with-*`) render the platform logo plate.
 * - Otherwise renders the uploaded cover image, falling back to a deterministic gradient.
 */
export default function CollectionCoverArt({ slug, name, coverImageUrl, className = '' }: Props) {
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

  if (coverImageUrl) {
    return (
      <img
        src={coverImageUrl}
        alt={name}
        className={`w-full h-full object-cover ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`w-full h-full ${className}`}
      style={{ backgroundImage: gradientFor(slug || name) }}
    />
  );
}
