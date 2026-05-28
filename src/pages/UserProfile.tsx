import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, UserMinus, Globe, Share2, Bookmark, FolderHeart, Trophy, Rocket, Sparkles, ChevronLeft, ChevronRight, Pencil, ImagePlus } from 'lucide-react';
import { notifyUserFollow } from '@/lib/notifications';
import { LaunchCard } from '@/components/LaunchCard';
import { ProfileSkeleton } from '@/components/ProfileSkeleton';
import { KarmaScore } from '@/components/KarmaScore';
import { useMakerScoreByUsername } from '@/hooks/use-maker-score';
import { SeoHead } from '@/components/seo/SeoHead';
import { gradientFor } from '@/lib/gradients';

const FounderAchievements = lazy(() => import('@/components/FounderAchievements'));

const sb: any = supabase;
const PAGE_SIZE = 12;

type TabKey = 'launches' | 'collections' | 'community' | 'achievements';

interface ProfileStats {
  founderLaunches: number;
  communityLaunches: number;
  collections: number;
  saves: number;
  followers: number;
  following: number;
  bestAward: 'gold' | 'silver' | 'bronze' | null;
}

// ---------- helpers ----------
const formatProduct = (p: any, voteCounts: Record<string, number>, fallbackMaker?: any) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  tagline: p.tagline,
  thumbnail: p.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '',
  iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url || '',
  categories: p.product_category_map?.map((c: any) => c.product_categories?.name).filter(Boolean) || [],
  netVotes: voteCounts[p.id] || 0,
  makers: fallbackMaker ? [fallbackMaker] : (p.product_makers?.map((m: any) => m.users).filter((u: any) => u?.username) || []),
});

async function fetchVoteCounts(productIds: string[]): Promise<Record<string, number>> {
  if (!productIds.length) return {};
  const { data } = await supabase.from('votes').select('product_id, value').in('product_id', productIds);
  const counts: Record<string, number> = {};
  data?.forEach((v: any) => { counts[v.product_id] = (counts[v.product_id] || 0) + v.value; });
  return counts;
}

// ---------- tab panels ----------

function LaunchesPanel({ profile, currentUser }: { profile: any; currentUser: any }) {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bestAwardSetter, setBestAwardSetter] = useState<any>(null); void bestAwardSetter;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count } = await supabase
        .from('products')
        .select(`id, slug, name, tagline, won_daily, won_weekly, won_monthly,
          product_media!inner(url, type),
          product_category_map(product_categories(name))`, { count: 'exact' })
        .eq('owner_id', profile.id)
        .eq('status', 'launched')
        .eq('product_media.type', 'thumbnail')
        .order('launch_date', { ascending: false })
        .range(from, to);
      if (cancelled) return;
      const ids = (data || []).map((p: any) => p.id);
      const voteCounts = await fetchVoteCounts(ids);
      if (cancelled) return;
      setItems((data || []).map((p: any) => formatProduct(p, voteCounts, { username: profile.username, avatar_url: profile.avatar_url })));
      setTotal(count || 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profile.id, page]);

  if (loading) return <GridSkeleton />;
  if (!items.length) return <EmptyState icon={Rocket} title="No launches yet" />;

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((p) => (
          <LaunchCard key={p.id} {...p} onVote={() => {}} showFollowButton={false} />
        ))}
      </div>
      <Pager page={page} pages={pages} total={total} onChange={setPage} />
    </div>
  );
}

function CollectionsPanel({ profile }: { profile: any }) {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count } = await sb
        .from('user_collections')
        .select('id, name, slug, description, updated_at, cover_image_url, view_count', { count: 'exact' })
        .eq('user_id', profile.id)
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .range(from, to);
      if (cancelled) return;
      const ids = (data || []).map((c: any) => c.id);
      // Item counts per collection
      const countMap: Record<string, number> = {};
      if (ids.length) {
        const { data: itemsRows } = await sb
          .from('user_collection_items')
          .select('collection_id')
          .in('collection_id', ids);
        itemsRows?.forEach((r: any) => { countMap[r.collection_id] = (countMap[r.collection_id] || 0) + 1; });
      }
      if (cancelled) return;
      setItems((data || []).map((c: any) => ({ ...c, count: countMap[c.id] || 0 })));
      setTotal(count || 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profile.id, page]);

  if (loading) return <GridSkeleton />;
  if (!items.length) return <EmptyState icon={FolderHeart} title="No public collections yet" />;

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((c: any) => (
          <Card key={c.id} className="overflow-hidden hover:border-primary/50 transition-colors group">
            {c.cover_image_url && (
              <Link to={`/c/${c.slug}`} className="block aspect-[16/9] bg-muted overflow-hidden">
                <img src={c.cover_image_url} alt={c.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
              </Link>
            )}
            <div className="p-4">
              <Link to={`/c/${c.slug}`}>
                <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{c.name}</h3>
              </Link>
              {c.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{c.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
                <span>{c.count} products</span>
                <span>·</span>
                <span>{c.view_count ?? 0} views</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Pager page={page} pages={pages} total={total} onChange={setPage} />
    </div>
  );
}

function CommunityPanel({ profile }: { profile: any }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [savesGenerated, setSavesGenerated] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await sb
        .from('products')
        .select(`id, slug, name, tagline, claimed_at,
          product_media(url, type),
          product_category_map(product_categories(name))`)
        .or(`submitted_by_user_id.eq.${profile.id},original_submitter_id.eq.${profile.id}`)
        .eq('submission_type', 'community')
        .eq('status', 'launched')
        .order('launch_date', { ascending: false })
        .limit(50);
      if (cancelled) return;
      const ids = (data || []).map((p: any) => p.id);
      const voteCounts = await fetchVoteCounts(ids);
      let saves = 0;
      if (ids.length) {
        const { count } = await sb
          .from('user_collection_items')
          .select('product_id', { count: 'exact', head: true })
          .in('product_id', ids);
        saves = count || 0;
      }
      if (cancelled) return;
      setItems((data || []).map((p: any) => formatProduct(p, voteCounts)));
      setSavesGenerated(saves);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profile.id]);

  if (loading) return <GridSkeleton />;
  if (!items.length) return <EmptyState icon={Sparkles} title="No community contributions yet" subtitle="Products submitted on behalf of others will appear here." />;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatBlock label="Contributions" value={items.length} />
        <StatBlock label="Saves generated" value={savesGenerated} />
        <StatBlock label="Claimed by founder" value={items.filter((p) => !!p.claimed_at).length} />
        <StatBlock label="Awaiting claim" value={items.filter((p) => !p.claimed_at).length} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((p) => (
          <LaunchCard key={p.id} {...p} onVote={() => {}} submissionType="community" />
        ))}
      </div>
    </div>
  );
}

function AchievementsPanel({ profile, stats, makerScore }: { profile: any; stats: ProfileStats; makerScore: number }) {
  const { bestAward, founderLaunches, collections, saves } = stats;
  const cards: Array<{ icon: any; title: string; sub: string; tone?: string }> = [];
  if (bestAward) cards.push({ icon: Trophy, title: `${bestAward[0].toUpperCase()}${bestAward.slice(1)} Winner`, sub: 'Top-ranked launch', tone: bestAward });
  if (founderLaunches) cards.push({ icon: Rocket, title: `${founderLaunches} Launched`, sub: founderLaunches === 1 ? 'Product shipped' : 'Products shipped' });
  if (collections) cards.push({ icon: FolderHeart, title: 'Curator', sub: `${collections} public collection${collections === 1 ? '' : 's'}` });
  if (saves) cards.push({ icon: Bookmark, title: `${saves} Saves`, sub: 'Products curated' });
  if (makerScore > 0) cards.push({ icon: Sparkles, title: `${makerScore} Karma`, sub: 'Maker score' });

  return (
    <div className="space-y-8">
      {cards.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {cards.map((c, i) => (
            <Card key={i} className="p-4 flex items-center gap-3">
              <c.icon className={`h-6 w-6 ${c.tone === 'gold' ? 'text-yellow-500' : c.tone === 'silver' ? 'text-gray-400' : c.tone === 'bronze' ? 'text-amber-600' : 'text-primary'}`} />
              <div>
                <p className="text-sm font-semibold">{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.sub}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Trophy} title="No achievements yet" subtitle="Ship a launch or curate a collection to start earning badges." />
      )}
      <Suspense fallback={<GridSkeleton rows={1} />}>
        <FounderAchievements founderId={profile.id} title="Milestones" />
      </Suspense>
    </div>
  );
}

// ---------- small UI primitives ----------

function StatBlock({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </Card>
  );
}

function GridSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: rows * 3 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-lg" />
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="text-center py-16 border border-dashed rounded-lg">
      <Icon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
      <p className="font-semibold">{title}</p>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

function Pager({ page, pages, total, onChange }: { page: number; pages: number; total: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-6">
      <span className="text-xs text-muted-foreground">Page {page + 1} of {pages} · {total} total</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => onChange(page + 1)}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------- main ----------

const UserProfile = () => {
  const { username: rawUsername } = useParams();
  const username = rawUsername?.startsWith('@') ? rawUsername.slice(1) : rawUsername;
  const { score: makerScore } = useMakerScoreByUsername(username);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as TabKey | null;

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>(urlTab || 'launches');
  const [visited, setVisited] = useState<Set<TabKey>>(new Set([urlTab || 'launches']));
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB.'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    setUploadingBanner(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${currentUser.id}/banner-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('user-banners').upload(path, file, { cacheControl: '3600', upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('user-banners').getPublicUrl(path);
      const { error: updErr } = await sb.from('users').update({ banner_image_url: publicUrl }).eq('id', currentUser.id);
      if (updErr) throw updErr;
      setProfile({ ...profile, banner_image_url: publicUrl });
      toast.success('Banner updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload banner');
    } finally {
      setUploadingBanner(false);
      e.target.value = '';
    }
  };

  // Fetch session + profile + lightweight stats only
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      const sessionUser = session?.user ?? null;
      setCurrentUser(sessionUser);

      const { data: profileData, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (cancelled) return;
      if (error || !profileData) { setLoading(false); return; }
      setProfile(profileData);

      // Parallel lightweight counts (head queries — no rows fetched)
      const [
        { count: founderLaunches },
        { count: communityLaunches },
        { count: collections },
        { count: followers },
        { count: following },
        savesAndAwardsRes,
        followCheckRes,
      ] = await Promise.all([
        sb.from('products').select('id', { count: 'exact', head: true })
          .eq('owner_id', profileData.id).eq('status', 'launched'),
        sb.from('products').select('id', { count: 'exact', head: true })
          .or(`submitted_by_user_id.eq.${profileData.id},original_submitter_id.eq.${profileData.id}`)
          .eq('submission_type', 'community').eq('status', 'launched'),
        sb.from('user_collections').select('id', { count: 'exact', head: true })
          .eq('user_id', profileData.id).eq('is_public', true),
        sb.from('follows').select('follower_id', { count: 'exact', head: true })
          .eq('followed_id', profileData.id),
        sb.from('follows').select('followed_id', { count: 'exact', head: true })
          .eq('follower_id', profileData.id),
        sb.from('votes').select('product_id', { count: 'exact', head: true })
          .eq('user_id', profileData.id).eq('value', 1),
        sessionUser
          ? sb.from('follows').select('follower_id').eq('follower_id', sessionUser.id).eq('followed_id', profileData.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      // Best award — cheap query, only winning flags
      const { data: winRows } = await sb
        .from('products')
        .select('won_daily, won_weekly, won_monthly')
        .eq('owner_id', profileData.id)
        .eq('status', 'launched')
        .or('won_daily.eq.true,won_weekly.eq.true,won_monthly.eq.true')
        .limit(50);
      let bestAward: 'gold' | 'silver' | 'bronze' | null = null;
      if (winRows?.some((p: any) => p.won_monthly)) bestAward = 'gold';
      else if (winRows?.some((p: any) => p.won_weekly)) bestAward = 'silver';
      else if (winRows?.some((p: any) => p.won_daily)) bestAward = 'bronze';

      if (cancelled) return;
      setStats({
        founderLaunches: founderLaunches || 0,
        communityLaunches: communityLaunches || 0,
        collections: collections || 0,
        saves: savesAndAwardsRes.count || 0,
        followers: followers || 0,
        following: following || 0,
        bestAward,
      });
      setIsFollowing(!!followCheckRes?.data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [username]);

  const handleTabChange = useCallback((tab: string) => {
    const t = tab as TabKey;
    setActiveTab(t);
    setVisited((prev) => new Set(prev).add(t));
    setSearchParams((sp) => { sp.set('tab', t); return sp; }, { replace: true });
  }, [setSearchParams]);

  const handleFollow = async () => {
    if (!currentUser) { toast.error('Please login to follow'); return; }
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('followed_id', profile.id);
        setIsFollowing(false);
        setStats((s) => s ? { ...s, followers: Math.max(0, s.followers - 1) } : s);
      } else {
        await supabase.from('follows').insert({ follower_id: currentUser.id, followed_id: profile.id });
        setIsFollowing(true);
        setStats((s) => s ? { ...s, followers: s.followers + 1 } : s);
        notifyUserFollow(profile.id, currentUser.id);
      }
    } catch {
      toast.error('Failed to update follow status');
    }
  };

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/@${profile.username}`;
    try {
      if (navigator.share) await navigator.share({ title: `@${profile.username} on Launch`, url });
      else { await navigator.clipboard.writeText(url); toast.success('Profile link copied'); }
    } catch { /* user cancelled */ }
  };

  if (loading) return <ProfileSkeleton />;
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">User not found</h1>
          <Link to="/" className="text-primary hover:underline">Return home</Link>
        </div>
      </div>
    );
  }

  const s = stats!;

  const isOwnProfile = currentUser && currentUser.id === profile.id;
  const heroGradient = profile.username === 'alex'
    ? 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #a855f7 100%)'
    : gradientFor(profile.id || profile.username);

  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title={`@${profile.username} — Products & collections on Launch`}
        description={profile.bio ? profile.bio.slice(0, 155) : `Explore products launched, collections curated, and activity by @${profile.username} on Launch.`}
        path={`/@${profile.username}`}
        breadcrumbs={[
          { name: 'Makers', path: '/makers' },
          { name: `@${profile.username}`, path: `/@${profile.username}` },
        ]}
      />

      {/* Editorial hero band */}
      <div className="container mx-auto px-4 max-w-5xl pt-6 md:pt-8">

        <div className="relative overflow-hidden rounded-xl">
          {profile.banner_image_url ? (
            <img
              src={profile.banner_image_url}
              alt=""
              className="h-40 md:h-56 w-full object-cover"
              loading="eager"
            />
          ) : (
            <div
              className="h-40 md:h-56 w-full"
              style={{ backgroundImage: heroGradient }}
              aria-hidden="true"
            />
          )}
          {!profile.banner_image_url && (
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-black/30 pointer-events-none" />
          )}
          {isOwnProfile && (
            <label
              htmlFor="profile-banner-upload"
              className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-md bg-background/80 backdrop-blur px-2.5 py-1.5 text-xs font-medium border border-border shadow-sm cursor-pointer hover:bg-background transition-colors"
              aria-label={profile.banner_image_url ? 'Change banner image' : 'Upload banner image'}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {uploadingBanner ? 'Uploading…' : (profile.banner_image_url ? 'Change banner' : 'Add banner')}
              <input
                id="profile-banner-upload"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleBannerUpload}
                disabled={uploadingBanner}
              />
            </label>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl">
        {/* Profile header — overlaps hero */}
        <div className="mt-2 md:mt-3 mb-8">
          <div className="flex flex-col md:flex-row md:items-start gap-5 md:gap-7 pt-2">
            <Avatar className="h-28 w-28 md:h-36 md:w-36 ring-4 ring-background shadow-lg shrink-0">
              <AvatarImage src={profile.avatar_url} alt={profile.username} />
              <AvatarFallback className="text-3xl">{profile.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 md:pb-2 pt-2 md:pt-4">

              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  {profile.name && (
                    <h1 className="font-reckless text-3xl md:text-4xl font-bold tracking-tight leading-none text-foreground mb-1">
                      {profile.name}
                    </h1>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base md:text-lg font-normal text-muted-foreground">@{profile.username}</span>
                    <KarmaScore karma={makerScore} size="sm" />
                    {s.bestAward && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        s.bestAward === 'gold' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                        s.bestAward === 'silver' ? 'bg-gray-400/10 text-gray-500 dark:text-gray-400' :
                        'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}>
                        {s.bestAward === 'gold' ? '🥇 Gold' : s.bestAward === 'silver' ? '🥈 Silver' : '🥉 Bronze'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOwnProfile ? (
                    <Link to="/settings">
                      <Button variant="outline" size="sm">
                        <Pencil className="h-4 w-4 mr-2" /> Edit profile
                      </Button>
                    </Link>
                  ) : currentUser && (
                    <Button onClick={handleFollow} variant={isFollowing ? 'outline' : 'default'} size="sm">
                      {isFollowing ? (<><UserMinus className="h-4 w-4 mr-2" />Unfollow</>) : (<><UserPlus className="h-4 w-4 mr-2" />Follow</>)}
                    </Button>
                  )}
                  <Button onClick={handleShareProfile} variant="outline" size="icon" aria-label="Share profile">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {profile.bio ? (
                <p className="text-sm md:text-base text-foreground/80 mt-3 max-w-2xl leading-relaxed whitespace-pre-line">
                  {profile.bio}
                </p>
              ) : isOwnProfile ? (
                <Link to="/settings" className="inline-block mt-3 text-sm text-muted-foreground hover:text-primary border border-dashed border-border rounded-md px-3 py-2">
                  + Add a bio to tell people what you build
                </Link>
              ) : null}

              <SocialLinks profile={profile} />

              {/* Inline stat strip — borderless, dense */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm tracking-tight">
                <InlineStat value={s.followers} label="Followers" href={`/@${profile.username}/followers`} />
                <InlineStat value={s.following} label="Following" href={`/@${profile.username}/following`} />
                <InlineStat value={s.founderLaunches} label="Launches" onClick={() => handleTabChange('launches')} />
                <InlineStat value={s.collections} label="Collections" onClick={() => handleTabChange('collections')} />
                <InlineStat value={s.saves} label="Saves" />
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full md:w-auto flex flex-wrap h-auto bg-transparent border-b border-border rounded-none p-0 gap-1">
            <TabsTrigger value="launches" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Launches{s.founderLaunches ? ` · ${s.founderLaunches}` : ''}</TabsTrigger>
            <TabsTrigger value="collections" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Collections{s.collections ? ` · ${s.collections}` : ''}</TabsTrigger>
            <TabsTrigger value="community" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Community{s.communityLaunches ? ` · ${s.communityLaunches}` : ''}</TabsTrigger>
            <TabsTrigger value="achievements" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="launches" className="mt-6 pb-12">
            {visited.has('launches') && <LaunchesPanel profile={profile} currentUser={currentUser} />}
          </TabsContent>

          <TabsContent value="collections" className="mt-6 pb-12">
            {visited.has('collections') && <CollectionsPanel profile={profile} />}
          </TabsContent>

          <TabsContent value="community" className="mt-6 pb-12">
            {visited.has('community') && <CommunityPanel profile={profile} />}
          </TabsContent>

          <TabsContent value="achievements" className="mt-6 pb-12">
            {visited.has('achievements') && <AchievementsPanel profile={profile} stats={s} makerScore={makerScore} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

function InlineStat({ value, label, href, onClick }: { value: number | string; label: string; href?: string; onClick?: () => void }) {
  const content = (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-semibold text-foreground tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
  if (href) return <Link to={href} className="hover:text-primary transition-colors cursor-pointer">{content}</Link>;
  if (onClick) return <button onClick={onClick} className="hover:text-primary transition-colors cursor-pointer">{content}</button>;
  return content;
}

function OverviewQuickLinks({ stats, onJump }: { stats: ProfileStats; onJump: (t: TabKey) => void }) {
  const quick: Array<{ tab: TabKey; icon: any; label: string; value: number }> = [
    { tab: 'launches', icon: Rocket, label: 'Founder Launches', value: stats.founderLaunches },
    { tab: 'community', icon: Sparkles, label: 'Community Launches', value: stats.communityLaunches },
    { tab: 'collections', icon: FolderHeart, label: 'Collections', value: stats.collections },
    { tab: 'achievements', icon: Trophy, label: 'Achievements', value: (stats.bestAward ? 1 : 0) + stats.founderLaunches },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {quick.map((q) => (
        <button key={q.tab} onClick={() => onJump(q.tab)} className="text-left">
          <Card className="p-4 hover:border-primary/50 transition-colors h-full">
            <q.icon className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{q.value}</p>
            <p className="text-sm text-muted-foreground">{q.label}</p>
          </Card>
        </button>
      ))}
    </div>
  );
}

function SocialLinks({ profile }: { profile: any }) {
  const links: Array<{ key: string; href: string; title: string; svg: JSX.Element }> = [];
  if (profile.website) links.push({ key: 'web', href: profile.website.startsWith('http') ? profile.website : `https://${profile.website}`, title: 'Website', svg: <Globe className="h-5 w-5" /> });
  if (profile.twitter) links.push({ key: 'x', href: `https://x.com/${profile.twitter.replace('@', '')}`, title: 'X (Twitter)', svg: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> });
  if (profile.linkedin) links.push({ key: 'in', href: `https://linkedin.com/in/${profile.linkedin}`, title: 'LinkedIn', svg: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> });
  if (!links.length) return null;
  return (
    <div className="flex gap-3 flex-wrap mt-4">
      {links.map((l) => (
        <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer" title={l.title} className="text-muted-foreground hover:text-primary transition-colors">
          {l.svg}
        </a>
      ))}
    </div>
  );
}

export default UserProfile;
