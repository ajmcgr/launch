import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  X, Linkedin, Link2, Eye, Bookmark, Users, FolderOpen, Heart, HeartOff, Globe, Lock,
} from 'lucide-react';
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
              <Button variant="outline" size="sm"><Twitter className="h-4 w-4 mr-1" />X</Button>
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
