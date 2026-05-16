// Shared SEO page primitives. Pure presentation, no business logic.
// Used by /best/:slug, /vs/:slug, /alternatives/:slug.

import { Link } from 'react-router-dom';
import { ArrowRight, Check, ExternalLink, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ComparisonTable, FaqItem, RelatedLink, ToolItem } from '@/lib/seo/types';

export const SeoHero = ({ h1, intro }: { h1: string; intro: string }) => (
  <header className="mb-10">
    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{h1}</h1>
    <p className="text-lg text-muted-foreground leading-relaxed">{intro}</p>
  </header>
);

export const SeoWhoFor = ({ text }: { text: string }) => (
  <section className="mb-10 rounded-xl bg-muted/30 p-5">
    <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
      Who this is for
    </h2>
    <p className="text-sm leading-relaxed">{text}</p>
  </section>
);

export const SeoComparisonTable = ({ table }: { table: ComparisonTable }) => (
  <section className="mb-10">
    <h2 className="text-2xl font-bold mb-4">At a glance</h2>
    <div className="overflow-x-auto rounded-xl bg-muted/20">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            {table.columnHeaders.map((h) => (
              <th key={h} className="p-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.feature} className="border-t border-border/40">
              {row.values.map((v, idx) => {
                if (idx === 0) {
                  return (
                    <td key={idx} className="p-3 font-medium align-top">
                      {v}
                    </td>
                  );
                }
                const isWinner = row.winnerIndex !== undefined && row.winnerIndex === idx - 1;
                return (
                  <td
                    key={idx}
                    className={`p-3 align-top text-sm ${
                      isWinner ? 'font-medium text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {isWinner ? (
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <Minus className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                      )}
                      <span>{v}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

export const SeoToolList = ({ items, heading = 'Tools compared' }: { items: ToolItem[]; heading?: string }) => (
  <section className="mb-10">
    <h2 className="text-2xl font-bold mb-6">{heading}</h2>
    <div className="space-y-6">
      {items.map((it, idx) => (
        <article key={it.name} className="rounded-xl bg-muted/20 p-5">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="text-lg font-semibold">
              <span className="text-muted-foreground mr-2">{idx + 1}.</span>
              {it.name}
            </h3>
            {it.internal ? (
              <Link
                to={it.internal}
                className="text-sm text-primary hover:underline inline-flex items-center gap-1 shrink-0"
              >
                Open <ArrowRight className="h-3 w-3" />
              </Link>
            ) : it.url ? (
              <a
                href={it.url}
                target="_blank"
                rel="noopener"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1 shrink-0"
              >
                Visit <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground mb-3">{it.oneLiner}</p>
          <div className="grid md:grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Pros</p>
              <ul className="text-sm space-y-1">
                {it.pros.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-1" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Cons</p>
              <ul className="text-sm space-y-1">
                {it.cons.map((c) => (
                  <li key={c} className="flex items-start gap-2">
                    <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wide">Best for:</span> {it.bestFor}
          </p>
        </article>
      ))}
    </div>
  </section>
);

export const SeoFaq = ({ items }: { items: FaqItem[] }) => (
  <section className="mb-10">
    <h2 className="text-2xl font-bold mb-6">Frequently asked questions</h2>
    <div className="space-y-6">
      {items.map((f) => (
        <div key={f.question}>
          <h3 className="font-semibold mb-1">{f.question}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{f.answer}</p>
        </div>
      ))}
    </div>
  </section>
);

export const SeoCta = ({
  heading,
  body,
  primary,
}: {
  heading: string;
  body: string;
  primary: { label: string; to: string };
}) => (
  <section className="mb-10 rounded-xl border border-primary/20 bg-primary/5 p-6">
    <h2 className="text-xl font-bold mb-2">{heading}</h2>
    <p className="text-sm text-muted-foreground mb-4">{body}</p>
    <Button asChild className="gap-2">
      <Link to={primary.to}>
        {primary.label} <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  </section>
);

export const SeoRelated = ({ links }: { links: RelatedLink[] }) => (
  <section className="pt-10 border-t border-border/40">
    <h2 className="text-xl font-bold mb-4">Keep reading</h2>
    <ul className="space-y-2">
      {links.map((l) => (
        <li key={l.to}>
          <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground">
            {l.label} →
          </Link>
        </li>
      ))}
    </ul>
  </section>
);
