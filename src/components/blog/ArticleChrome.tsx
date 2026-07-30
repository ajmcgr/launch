import { useEffect, useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Heading } from '@/lib/blog/post';

/** Thin progress bar showing how far through the article the reader is. */
export const ReadingProgress = () => {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-0.5 z-50 bg-transparent"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${pct}%` }} />
    </div>
  );
};

/** Sticky table of contents with active-section highlighting. */
export const TableOfContents = ({ headings }: { headings: Heading[] }) => {
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 3) return null;

  return (
    <nav aria-label="Table of contents" className="text-sm">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
        On this page
      </p>
      <ul className="space-y-2 border-l border-border">
        {headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? 'pl-6' : 'pl-4'}>
            <a
              href={`#${h.id}`}
              className={`block leading-snug transition-colors ${
                active === h.id ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

/** Copy link + share buttons. */
export const ShareBar = ({ url, title }: { url: string; title: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const x = `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const li = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={copy} aria-label="Copy link to this article">
        {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Link2 className="h-4 w-4 mr-1.5" />}
        {copied ? 'Copied' : 'Copy link'}
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={x} target="_blank" rel="noopener noreferrer" aria-label="Share on X">
          <Share2 className="h-4 w-4 mr-1.5" /> Share on X
        </a>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={li} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">
          LinkedIn
        </a>
      </Button>
    </div>
  );
};
