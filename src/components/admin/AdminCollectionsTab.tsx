import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Star, Search, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const sb: any = supabase;

interface Row {
  id: string;
  slug: string;
  name: string;
  is_featured: boolean;
  is_public: boolean;
  view_count: number;
  user_id: string;
  username?: string;
  itemCount: number;
  followerCount: number;
}

export const AdminCollectionsTab = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyFeatured, setOnlyFeatured] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: cols } = await sb
      .from('user_collections')
      .select('id, slug, name, is_featured, is_public, view_count, user_id')
      .eq('is_public', true)
      .order('view_count', { ascending: false, nullsFirst: false })
      .limit(500);

    const ids = (cols ?? []).map((c: any) => c.id);
    const userIds = Array.from(new Set((cols ?? []).map((c: any) => c.user_id)));
    const [{ data: items }, { data: follows }, { data: users }] = await Promise.all([
      sb.from('user_collection_items').select('collection_id').in('collection_id', ids),
      sb.from('collection_follows').select('collection_id').in('collection_id', ids),
      sb.from('users').select('id, username').in('id', userIds),
    ]);
    const ic = new Map<string, number>();
    (items ?? []).forEach((r: any) => ic.set(r.collection_id, (ic.get(r.collection_id) ?? 0) + 1));
    const fc = new Map<string, number>();
    (follows ?? []).forEach((r: any) => fc.set(r.collection_id, (fc.get(r.collection_id) ?? 0) + 1));
    const um = new Map((users ?? []).map((u: any) => [u.id, u.username]));

    setRows((cols ?? []).map((c: any) => ({
      ...c,
      username: um.get(c.user_id),
      itemCount: ic.get(c.id) ?? 0,
      followerCount: fc.get(c.id) ?? 0,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleFeatured = async (id: string, next: boolean) => {
    const prev = rows;
    setRows((r) => r.map((x) => x.id === id ? { ...x, is_featured: next } : x));
    const { error } = await sb.from('user_collections').update({ is_featured: next }).eq('id', id);
    if (error) {
      setRows(prev);
      toast.error(error.message || 'Failed to update');
    } else {
      toast.success(next ? 'Featured' : 'Unfeatured');
    }
  };

  const filtered = rows
    .filter((r) => !onlyFeatured || r.is_featured)
    .filter((r) => !search.trim() ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.slug.toLowerCase().includes(search.toLowerCase()) ||
      (r.username ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collections</CardTitle>
        <CardDescription>Manually feature public collections on the /collections Featured tab.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search collections, slugs, makers..." className="pl-9" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={onlyFeatured} onCheckedChange={setOnlyFeatured} />
            Featured only
          </label>
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} of {rows.length}</span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : (
          <div className="border rounded-md divide-y">
            {filtered.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{r.name}</p>
                    {r.is_featured && <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3" />Featured</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    @{r.username ?? '?'} · {r.itemCount} items · {r.followerCount} followers · {r.view_count} views
                  </p>
                </div>
                <Link to={`/c/${r.slug}`} target="_blank" className="text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <Switch checked={r.is_featured} onCheckedChange={(v) => toggleFeatured(r.id, v)} />
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">No collections found.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminCollectionsTab;
