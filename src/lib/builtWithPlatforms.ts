import lovable from '@/assets/platforms/lovable.png.asset.json';
import bolt from '@/assets/platforms/bolt.png.asset.json';
import cursor from '@/assets/platforms/cursor.png.asset.json';
import replit from '@/assets/platforms/replit.png.asset.json';
import claudeCode from '@/assets/platforms/claudecode.png.asset.json';
import codex from '@/assets/platforms/codex.png.asset.json';
import googleAiStudio from '@/assets/platforms/googleaustudio.png.asset.json';
import base44 from '@/assets/platforms/base44.png.asset.json';
import v0 from '@/assets/platforms/v0.png.asset.json';

export interface BuiltWithPlatform {
  /** matches stack_items.slug */
  slug: string;
  name: string;
  description: string;
  logoUrl: string;
  /** Tailwind background class for the logo plate — tuned per logo */
  plate: string;
}

export const builtWithPlatforms: BuiltWithPlatform[] = [
  { slug: 'lovable',          name: 'Lovable',          description: 'Discover the best products built with Lovable.',          logoUrl: lovable.url,         plate: 'bg-white dark:bg-white' },
  { slug: 'cursor',           name: 'Cursor',           description: 'Discover the best products built with Cursor.',           logoUrl: cursor.url,          plate: 'bg-white dark:bg-white' },
  { slug: 'bolt',             name: 'Bolt',             description: 'Discover the best products built with Bolt.',             logoUrl: bolt.url,            plate: 'bg-white dark:bg-white' },
  { slug: 'replit',           name: 'Replit',           description: 'Discover the best products built with Replit.',           logoUrl: replit.url,          plate: 'bg-white dark:bg-white' },
  { slug: 'claude-code',      name: 'Claude Code',      description: 'Discover the best products built with Claude Code.',      logoUrl: claudeCode.url,      plate: 'bg-white dark:bg-white' },
  { slug: 'codex',            name: 'Codex',            description: 'Discover the best products built with Codex.',            logoUrl: codex.url,           plate: 'bg-white dark:bg-white' },
  { slug: 'google-ai-studio', name: 'Google AI Studio', description: 'Discover the best products built with Google AI Studio.', logoUrl: googleAiStudio.url,  plate: 'bg-white dark:bg-white' },
  { slug: 'base44',           name: 'Base44',           description: 'Discover the best products built with Base44.',           logoUrl: base44.url,          plate: 'bg-white dark:bg-white' },
  { slug: 'v0',               name: 'v0',               description: 'Discover the best products built with v0.',               logoUrl: v0.url,              plate: 'bg-white dark:bg-white' },
];

export const builtWithBySlug = new Map(builtWithPlatforms.map((p) => [p.slug, p]));
