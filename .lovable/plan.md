
# Launch SEO Page System — Plan

Goal: ship a repeatable framework to publish 2 high-intent SEO pages/week without touching existing UI, auth, or routes. All new work is additive: new routes under new path prefixes, new data files, sitemap additions.

## 1. Keyword + intent clusters

| Cluster | Primary KW | Secondary KWs | Intent | Slug pattern |
|---|---|---|---|---|
| Launch platforms | product launch platforms | best launch platforms for startups, where to launch a SaaS | Commercial investigation | `/best/launch-platforms` |
| PH alternatives | product hunt alternatives | sites like product hunt, ph competitors 2026 | Commercial / replacement | `/alternatives/product-hunt` |
| Launch checklist tools | product launch checklist | startup launch checklist template, saas launch checklist | Informational + tool | `/best/launch-checklist-tools` |
| Startup launch templates | startup launch templates | launch plan template, go-to-market template | Informational + download | `/best/launch-templates` |
| AI launch tools | ai tools for product launches | ai launch assistant, ai for founders launching | Commercial | `/best/ai-launch-tools-for-founders` |

Each cluster has a hub (Best/Alternatives) + 1–3 supporting comparison or alternative pages.

## 2. Page templates (3 reusable)

All built as new React routes — none modify `Home`, `Header`, `Footer` behavior. Each renders server-friendly markup (semantic HTML, single H1, Helmet meta, JSON-LD).

**A. `BestToolsPage`** — `/best/:slug`
Blocks: H1 + intent intro · "Who this is for" · Comparison table · Per-tool mini-cards (name, one-liner, pros/cons, link, CTA) · FAQ (FAQPage schema) · CTA to `/submit` · Related pages module · Breadcrumb schema.

**B. `VsPage`** — `/vs/:slug` (e.g. `launch-vs-betalist`)
Reuses the existing `ComparePage` pattern but lives under `/vs/` to free `/compare/*` for the Launch-centric comparisons already shipped. Driven by a new `src/lib/vsPages.ts` config.

**C. `AlternativesPage`** — `/alternatives/:slug`
Blocks: H1 (`[Tool] Alternatives in 2026`) · Why look for alternatives · Ranked list (5–10) · Comparison table · "Best for X" segments · FAQ · CTA · Related.

All three share `src/components/seo/` primitives: `SeoHero`, `SeoComparisonTable`, `SeoFaq`, `SeoRelated`, `SeoCta`. Pure presentation, no business logic.

## 3. Data layer

Single source of truth per template, so non-engineers can add a page by appending to a TS array:

- `src/lib/seo/bestPages.ts` → `BestPageConfig[]`
- `src/lib/seo/vsPages.ts` → `VsPageConfig[]`
- `src/lib/seo/alternativesPages.ts` → `AlternativePageConfig[]`

Each config carries: slug, title, metaDescription, h1, intro, whoFor, tableRows, items, faqs, related, canonical.

## 4. Twelve publish-ready briefs

| # | Type | Slug | Title (≤60) | Meta (≤155) | H1 |
|---|---|---|---|---|---|
| 1 | Best | `/best/launch-platforms` | Best Product Launch Platforms in 2026 | Compare the top product launch platforms for founders in 2026 — pricing, traffic, dofollow links, and audience fit. | Best Product Launch Platforms in 2026 |
| 2 | Alt | `/alternatives/product-hunt` | Product Hunt Alternatives in 2026 (Ranked) | Ranked Product Hunt alternatives for AI startups and indie founders — fairer ranking, real traffic, dofollow links. | Product Hunt Alternatives in 2026 |
| 3 | Best | `/best/launch-checklist-tools` | Best Product Launch Checklist Tools | The best launch checklist tools and templates for SaaS and AI startups. Free + paid options compared. | Best Product Launch Checklist Tools |
| 4 | Best | `/best/launch-templates` | Best Startup Launch Plan Templates 2026 | Free launch plan templates for SaaS and AI startups — GTM, press, social, and Day-1 checklists. | Startup Launch Plan Templates |
| 5 | Best | `/best/ai-launch-tools-for-founders` | Best AI Launch Tools for Founders (2026) | AI tools that help founders write, design, and execute a product launch. Curated, no fluff. | Best AI Launch Tools for Founders |
| 6 | Vs | `/vs/launch-vs-betalist` | Launch vs BetaList — Which Is Better 2026 | Launch vs BetaList compared on traffic, audience, pricing, dofollow links, and indie-founder fit. | Launch vs BetaList |
| 7 | Vs | `/vs/launch-vs-peerlist` | Launch vs Peerlist — Honest Comparison | Launch vs Peerlist for shipping products in 2026 — audience, ranking, and backlink value compared. | Launch vs Peerlist |
| 8 | Vs | `/vs/launch-vs-microlaunch` | Launch vs MicroLaunch (2026) | Two indie launch platforms compared — pricing, ranking algorithm, audience size, dofollow backlinks. | Launch vs MicroLaunch |
| 9 | Alt | `/alternatives/betalist` | BetaList Alternatives for 2026 | The best BetaList alternatives for early-stage founders. Compared on traffic, audience, and pricing. | BetaList Alternatives |
| 10 | Alt | `/alternatives/hacker-news` | Show HN Alternatives for Launching | Where to launch besides Show HN — focused communities for AI tools and indie SaaS. | Show HN Alternatives |
| 11 | Best | `/best/places-to-launch-saas` | Best Places to Launch Your SaaS in 2026 | 12 best sites and communities to launch a SaaS — ranked by real traffic and conversion potential. | Best Places to Launch a SaaS |
| 12 | Best | `/best/places-to-launch-ai-product` | Best Places to Launch an AI Product | Where to launch an AI product in 2026 — directories, communities, and platforms ranked by quality. | Best Places to Launch an AI Product |

Each brief in code includes section-by-section H2/H3 outline, internal links, CTA placements (top, mid, bottom).

## 5. Internal linking map

```text
Home ─┐
      ├─ /best/launch-platforms ──┬─ /alternatives/product-hunt
      ├─ /best/places-to-launch-saas ─┤
      ├─ /best/places-to-launch-ai-product ─┤
      ├─ /best/ai-launch-tools-for-founders ─┤
      ├─ /best/launch-checklist-tools ──── /best/launch-templates
      └─ /vs/launch-vs-betalist ─┬─ /alternatives/betalist
                                 ├─ /vs/launch-vs-peerlist
                                 └─ /vs/launch-vs-microlaunch
                                 
Existing /compare/* hub ── links to /vs/* (cross-cluster)
Footer "Resources" column ── add link to /best/launch-platforms (hub-of-hubs)
```

Each new page links to: 1 sibling cluster page, 1 cross-cluster page, 1 existing Launch page (`/submit`, `/pricing`, or relevant `/tools/*`). No orphans.

## 6. On-page technical SEO

Per page (via `react-helmet-async`): unique `<title>`, meta description, canonical (`https://trylaunch.ai{path}`), OG (title/desc/url/type=website/image=`/social-card.png`), Twitter (card, site=@trylaunchai, title, desc), FAQPage JSON-LD, BreadcrumbList JSON-LD. ItemList JSON-LD on Best/Alternatives pages.

## 7. Sitemap + robots

- Append new routes to `supabase/functions/sitemap/index.ts` (existing edge function pattern). Priority 0.8 for hubs, 0.7 for vs/alternatives. `changefreq: monthly`. `lastmod` = build date.
- `public/robots.txt` already allows all — no change needed.
- Manual redeploy of `sitemap` edge function noted in deliverable.

## 8. Routes (additive only)

`src/App.tsx`: add three `<Route>` entries — `/best/:slug`, `/vs/:slug`, `/alternatives/:slug` — mounted alongside existing routes. No existing route modified.

## 9. 4-week publishing cadence (2/wk)

| Week | Mon | Thu |
|---|---|---|
| 1 | #1 Best launch platforms (hub) | #2 PH alternatives (hub) |
| 2 | #5 AI launch tools | #6 Launch vs BetaList |
| 3 | #11 Places to launch SaaS | #7 Launch vs Peerlist |
| 4 | #12 Places to launch AI product | #3 Launch checklist tools |

Backlog (week 5+): #4, #8, #9, #10.

## 10. QA checklist (per page, before publish)

- [ ] Single `<h1>`, descriptive
- [ ] Title ≤60 chars, meta ≤155
- [ ] Canonical set and matches route
- [ ] OG + Twitter tags render in `view-source`
- [ ] FAQ JSON-LD validates (Rich Results Test)
- [ ] Breadcrumb JSON-LD validates
- [ ] Min 2 internal links to existing Launch pages
- [ ] At least 1 CTA above the fold (to `/submit`)
- [ ] No duplicate copy with other SEO pages (check intro + FAQ wording)
- [ ] Sitemap entry added, edge function redeployed
- [ ] Lighthouse mobile ≥ 90 perf / 100 SEO
- [ ] Submitted to Google Search Console "Request indexing"

## 11. Files to create / modify

Create:
- `src/lib/seo/bestPages.ts`, `vsPages.ts`, `alternativesPages.ts`, `types.ts`
- `src/components/seo/SeoHero.tsx`, `SeoComparisonTable.tsx`, `SeoFaq.tsx`, `SeoRelated.tsx`, `SeoCta.tsx`
- `src/pages/seo/BestPage.tsx`, `VsPage.tsx`, `AlternativesPage.tsx`

Modify (additive only):
- `src/App.tsx` — 3 new Route entries
- `supabase/functions/sitemap/index.ts` — append 12 URLs
- `src/components/Footer.tsx` — add single "Best launch platforms" link in Resources column (no layout change)

Untouched: Home, Header, auth, schema, edge functions other than sitemap.

## 12. Out of scope (will flag, not implement)

- Programmatic generation of cluster pages from DB — current scope is hand-curated 12, framework supports later expansion.
- Blog/article publishing UI for non-engineers.
- Hreflang / i18n.
- Server-side rendering — Helmet client-side is sufficient for Google; LinkedIn/Slack previews rely on the static `index.html` OG fallback.
