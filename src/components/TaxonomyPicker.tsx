import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Plus, Search, X } from 'lucide-react';

export interface TaxonomyItem {
  id: number;
  name: string;
  slug: string;
}

interface Props {
  items: TaxonomyItem[];
  selected: number[];
  onToggle: (id: number) => void;
  onCreate: (name: string) => Promise<void> | void;
  creating?: boolean;
  max?: number;
  placeholder?: string;
  label: string;
}

// "Next.js", "nextjs", "next js" all normalize to "nextjs"
export const normalizeTerm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

const TaxonomyPicker = ({ items, selected, onToggle, onCreate, creating, max, placeholder, label }: Props) => {
  const [query, setQuery] = useState('');
  const q = normalizeTerm(query);
  const atMax = max !== undefined && selected.length >= max;

  const selectedItems = useMemo(
    () => selected.map((id) => items.find((i) => i.id === id)).filter(Boolean) as TaxonomyItem[],
    [selected, items]
  );

  const matches = useMemo(() => {
    if (!q) return items.slice(0, 60);
    const starts: TaxonomyItem[] = [];
    const contains: TaxonomyItem[] = [];
    for (const i of items) {
      const n = normalizeTerm(i.name);
      if (n.startsWith(q)) starts.push(i);
      else if (n.includes(q)) contains.push(i);
    }
    return [...starts, ...contains].slice(0, 60);
  }, [items, q]);

  const exact = q ? items.find((i) => normalizeTerm(i.name) === q) : undefined;

  const handleEnter = async () => {
    if (!query.trim()) return;
    if (exact) {
      if (!selected.includes(exact.id) && !atMax) onToggle(exact.id);
      setQuery('');
      return;
    }
    if (atMax) return;
    await onCreate(query.trim());
    setQuery('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[28px]">
        {selectedItems.length === 0 ? (
          <span className="text-sm text-muted-foreground">No {label} selected yet</span>
        ) : (
          selectedItems.map((i) => (
            <Badge key={i.id} className="gap-1 pr-1">
              {i.name}
              <button type="button" onClick={() => onToggle(i.id)} aria-label={`Remove ${i.name}`} className="rounded hover:bg-background/20 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
        {max !== undefined && (
          <span className="text-xs text-muted-foreground self-center ml-auto">{selected.length}/{max}</span>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleEnter();
            }
          }}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>

      <div className="border rounded-md max-h-72 overflow-y-auto p-2 flex flex-wrap gap-2">
        {q && !exact && (
          <Button type="button" size="sm" variant="secondary" disabled={creating || atMax} onClick={handleEnter}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {creating ? 'Adding...' : `Add "${query.trim()}"`}
          </Button>
        )}
        {matches.map((i) => {
          const active = selected.includes(i.id);
          return (
            <button
              key={i.id}
              type="button"
              disabled={!active && atMax}
              onClick={() => onToggle(i.id)}
              className={`inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full border transition-colors disabled:opacity-40 ${
                active ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary hover:text-primary'
              }`}
            >
              {active && <Check className="h-3 w-3" />}
              {i.name}
            </button>
          );
        })}
        {matches.length === 0 && !q && <span className="text-sm text-muted-foreground p-1">Loading…</span>}
      </div>
      <p className="text-xs text-muted-foreground">
        {atMax
          ? `Maximum of ${max} reached — remove one to add another.`
          : `Type to search ${items.length.toLocaleString()} ${label}. Press Enter to select, or add a new one if it doesn't exist.`}
      </p>
    </div>
  );
};

export default TaxonomyPicker;
