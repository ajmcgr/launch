import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Globe } from 'lucide-react';
import { gradientFor } from '@/lib/gradients';

interface Props {
  profile: any;
  followerCount: number;
  followingCount: number;
  productsCount: number;
  active: 'followers' | 'following';
}

function InlineStat({ value, label, href, active }: { value: number | string; label: string; href: string; active?: boolean }) {
  return (
    <Link
      to={href}
      className={`inline-flex items-baseline gap-1.5 transition-colors ${active ? 'text-foreground' : 'hover:text-primary'}`}
    >
      <span className="font-semibold text-foreground tabular-nums">{value}</span>
      <span className={active ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </Link>
  );
}

export function ProfileMiniHero({ profile, followerCount, followingCount, productsCount, active }: Props) {
  const heroGradient = profile.username === 'alex'
    ? 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #a855f7 100%)'
    : gradientFor(profile.id || profile.username);

  return (
    <>
      {/* Editorial hero band */}
      <div className="relative">
        {profile.banner_image_url ? (
          <img src={profile.banner_image_url} alt="" className="h-40 md:h-56 w-full object-cover" loading="eager" />
        ) : (
          <div className="h-40 md:h-56 w-full" style={{ backgroundImage: heroGradient }} aria-hidden="true" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-black/30 pointer-events-none" />
      </div>

      <div className="container mx-auto px-4 max-w-5xl">
        <div className="-mt-16 md:-mt-20 mb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-7 pt-2">
            <Link to={`/@${profile.username}`} className="shrink-0">
              <Avatar className="h-28 w-28 md:h-36 md:w-36 ring-4 ring-background shadow-lg">
                <AvatarImage src={profile.avatar_url} alt={profile.username} />
                <AvatarFallback className="text-3xl">{profile.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex-1 min-w-0 md:pb-2 pt-6 md:pt-10">
              <Link to={`/@${profile.username}`} className="inline-block group">
                {profile.name && (
                  <h1 className="font-reckless text-3xl md:text-4xl font-bold tracking-tight leading-none text-foreground mb-1 group-hover:text-primary transition-colors">
                    {profile.name}
                  </h1>
                )}
                <span className="text-base md:text-lg font-normal text-muted-foreground">@{profile.username}</span>
              </Link>

              {profile.bio && (
                <p className="text-sm md:text-base text-foreground/80 mt-3 max-w-2xl leading-relaxed whitespace-pre-line line-clamp-2">
                  {profile.bio}
                </p>
              )}

              {/* Socials */}
              {(profile.website || profile.twitter || profile.linkedin) && (
                <div className="flex gap-3 flex-wrap mt-4">
                  {profile.website && (
                    <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" title="Website" className="text-muted-foreground hover:text-primary transition-colors">
                      <Globe className="h-5 w-5" />
                    </a>
                  )}
                  {profile.twitter && (
                    <a href={`https://x.com/${profile.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" title="X" className="text-muted-foreground hover:text-primary transition-colors">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </a>
                  )}
                  {profile.linkedin && (
                    <a href={`https://linkedin.com/in/${profile.linkedin}`} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="text-muted-foreground hover:text-primary transition-colors">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    </a>
                  )}
                </div>
              )}

              {/* Inline stats */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm tracking-tight">
                <InlineStat value={followerCount} label="Followers" href={`/@${profile.username}/followers`} active={active === 'followers'} />
                <InlineStat value={followingCount} label="Following" href={`/@${profile.username}/following`} active={active === 'following'} />
                <Link to={`/@${profile.username}`} className="inline-flex items-baseline gap-1.5 hover:text-primary transition-colors">
                  <span className="font-semibold text-foreground tabular-nums">{productsCount}</span>
                  <span className="text-muted-foreground">Launches</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
