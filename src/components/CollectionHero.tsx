import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Linkedin, Link2, Eye, Bookmark, Users, FolderOpen, Heart, HeartOff, Globe, Lock,
} from 'lucide-react';

const XLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
import { toast } from 'sonner';

const sb: any = supabase;

interface Creator { id: string; username: string; avatar_url?: string | null }

interface Props {
  collection: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    is_public: boolean;
    cover_image_url?: string | null;
    view_count?: number;
    user_id: string;
  };
  productCount: number;
}

/**
 * Hero block for a collection: cover image, title, stat row,
 * creator attribution, Follow button, and social share buttons.
 */
export const CollectionHero = ({ collection, productCount }: Props) => {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [followers, setFollowers] = useState<number>(0);
  const [following, setFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    sb.from('users')
      .select('id, username, avatar_url')
      .eq('id', collection.user_id)
      .maybeSingle()
      .then(({ data }: any) => setCreator(data ?? null));
  }, [collection.user_id]);

  useEffect(() => {
    sb.from('collection_follows')
      .select('user_id', { count: 'exact' })
      .eq('collection_id', collection.id)
      .then(({ count }: any) => setFollowers(count ?? 0));

    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setCurrentUserId(uid);
      if (uid) {
        sb.from('collection_follows')
          .select('id')
          .eq('collection_id', collection.id)
          .eq('user_id', uid)
          .maybeSingle()
          .then(({ data }: any) => setFollowing(!!data));
      }
    });
  }, [collection.id]);

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${collection.slug}`;

  const handleFollow = async () => {
    if (!currentUserId) {
      toast.error('Sign in to follow collections');
      return;
    }
    if (following) {
      await sb.from('collection_follows').delete()
        .eq('collection_id', collection.id).eq('user_id', currentUserId);
      setFollowing(false);
      setFollowers((n) => Math.max(0, n - 1));
    } else {
      const { error } = await sb.from('collection_follows').insert({
        collection_id: collection.id, user_id: currentUserId,
      });
      if (error) { toast.error(error.message); return; }
      setFollowing(true);
      setFollowers((n) => n + 1);
      toast.success('Following collection');
    }
  };

  const shareText = `${collection.name} — a curated collection on Launch`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(publicUrl)}`;
  const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`;
  const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(publicUrl)}&title=${encodeURIComponent(shareText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success('Link copied');
  };

  return (
    <section className="mb-8">
      {collection.cover_image_url && (
        <div className="aspect-[3/1] w-full overflow-hidden rounded-xl mb-6 bg-muted">
          <img
            src={collection.cover_image_url}
            alt={collection.name}
            className="w-full h-full object-cover"
            width={1280}
            height={427}
            loading="eager"
          />
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-2">
              {collection.is_public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {collection.is_public ? 'Public collection' : 'Private collection'}
            </span>
            <h1 className="text-3xl md:text-4xl font-reckless font-bold leading-tight">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-muted-foreground mt-2 max-w-2xl">{collection.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {collection.is_public && (
              <Button
                variant={following ? 'outline' : 'default'}
                onClick={handleFollow}
                size="sm"
              >
                {following ? <><HeartOff className="h-4 w-4 mr-1" />Following</> : <><Heart className="h-4 w-4 mr-1" />Follow</>}
              </Button>
            )}
          </div>
        </div>

        {/* Stat row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Stat icon={<FolderOpen className="h-4 w-4" />} value={productCount} label="Products" />
          <Stat icon={<Eye className="h-4 w-4" />} value={collection.view_count ?? 0} label="Views" />
          <Stat icon={<Bookmark className="h-4 w-4" />} value={followers} label="Saves" />
          <Stat icon={<Users className="h-4 w-4" />} value={followers} label="Followers" />
          {creator && (
            <Link to={`/@${creator.username}`} className="flex items-center gap-2 hover:text-primary transition-colors">
              <Avatar className="h-6 w-6">
                <AvatarImage src={creator.avatar_url ?? undefined} alt={creator.username} />
                <AvatarFallback className="text-xs">{creator.username?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground">Created by <span className="font-medium text-foreground">@{creator.username}</span></span>
            </Link>
          )}
        </div>

        {/* Share */}
        {collection.is_public && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Share:</span>
            <a href={xUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm"><XLogo className="h-4 w-4 mr-1" />X</Button>
            </a>
            <a href={redditUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                Reddit
              </Button>
            </a>
            <a href={liUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm"><Linkedin className="h-4 w-4 mr-1" />LinkedIn</Button>
            </a>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Link2 className="h-4 w-4 mr-1" />Copy link
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

const Stat = ({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) => (
  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
    {icon}
    <span className="font-semibold text-foreground tabular-nums">{value.toLocaleString()}</span>
    <span>{label}</span>
  </span>
);
