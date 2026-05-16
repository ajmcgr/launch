// Shared types for SEO page templates.
// Pages are hand-curated configs consumed by /best/:slug, /vs/:slug, /alternatives/:slug.

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ToolItem {
  name: string;
  oneLiner: string;
  pros: string[];
  cons: string[];
  url?: string;
  internal?: string; // internal route, takes precedence over url
  bestFor: string;
}

export interface ComparisonRow {
  feature: string;
  values: string[]; // aligned with columnHeaders
  winnerIndex?: number; // 0-based; -1 for tie/none
}

export interface ComparisonTable {
  columnHeaders: string[];
  rows: ComparisonRow[];
}

export interface RelatedLink {
  label: string;
  to: string;
}

export interface BasePageConfig {
  slug: string;
  title: string;          // <title> ≤60 chars
  metaDescription: string; // <meta description> ≤155
  h1: string;
  intro: string;
  whoIsItFor: string;
  faqs: FaqItem[];
  related: RelatedLink[];
  ctaHeading: string;
  ctaBody: string;
  ctaPrimary: { label: string; to: string };
}

export interface BestPageConfig extends BasePageConfig {
  kind: 'best';
  items: ToolItem[];
  table?: ComparisonTable;
}

export interface AlternativePageConfig extends BasePageConfig {
  kind: 'alternative';
  targetTool: string;
  whyAlternatives: string;
  items: ToolItem[];
  table?: ComparisonTable;
}

export interface VsPageConfig extends BasePageConfig {
  kind: 'vs';
  competitor: string;
  oneLiner: string;
  summary: string;
  whoForLaunch: string;
  whoForCompetitor: string;
  table: ComparisonTable; // required for vs
  pricing: { launch: string; competitor: string };
  verdict: string;
}
