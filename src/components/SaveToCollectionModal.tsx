import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, FolderPlus } from 'lucide-react';
import {
  useCollections,
  saveLaunchToCollections,
  getSavedCollectionIds,
} from '@/hooks/use-collections';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName?: string;
  onSaved?: () => void;
}

export const SaveToCollectionModal = ({ open, onOpenChange, productId, productName, onSaved }: Props) => {
  const navigate = useNavigate();
  const { collections, sharedCollections, loading, createCollection, userId, refresh } = useCollections();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    getSavedCollectionIds(productId, userId).then((ids) => setSelected(new Set(ids)));
  }, [open, userId, productId]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const col = await createCollection(name);
    if (col) {
      setSelected((prev) => new Set(prev).add(col.id));
      setNewName('');
      setCreating(false);
      toast.success(`Created "${col.name}"`);
    } else {
      toast.error('Could not create collection');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveLaunchToCollections(productId, Array.from(selected), note);
      // Track save event for founder/sponsor analytics
      supabase.from('product_analytics').insert({
        product_id: productId,
        event_type: 'collection_save',
        visitor_id: localStorage.getItem('visitor_id') || crypto.randomUUID(),
        metadata: { collection_count: selected.size },
      }).then(({ error }) => {
        if (error) console.error('Failed to track save:', error);
      });
      try { localStorage.setItem('launch_engagement_signals', String((parseInt(localStorage.getItem('launch_engagement_signals') || '0', 10)) + 1)); } catch {}
      toast.success(`Saved ${productName ?? 'launch'} to ${selected.size} collection${selected.size === 1 ? '' : 's'}`);
      onSaved?.();
      onOpenChange(false);
      refresh();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!userId && open) {
    // not signed in
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in to save launches</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Create collections of your favorite launches once you're signed in.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => { onOpenChange(false); navigate('/auth'); }}>Sign in</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save to collection</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1" role="list" aria-label="Your collections">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : collections.length === 0 && !creating ? (
            <div className="text-sm text-muted-foreground">No collections yet. Create your first one below.</div>
          ) : (
            collections.map((c) => (
              <label key={c.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-muted/50" role="listitem">
                <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} aria-label={`Toggle ${c.name}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.item_count ?? 0} launches{c.is_public ? ' • Public' : ''}</div>
                </div>
              </label>
            ))
          )}
        </div>

        {creating ? (
          <div className="space-y-2 border-t pt-3">
            <Label htmlFor="new-collection-name">New collection name</Label>
            <div className="flex gap-2">
              <Input
                id="new-collection-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. AI tools to try"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button onClick={handleCreate} size="sm">Create</Button>
              <Button onClick={() => { setCreating(false); setNewName(''); }} variant="ghost" size="sm">Cancel</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setCreating(true)} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> New collection
          </Button>
        )}

        <div className="space-y-1 border-t pt-3">
          <Label htmlFor="save-note" className="text-xs text-muted-foreground">Note (optional)</Label>
          <Textarea
            id="save-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why this caught your eye…"
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || selected.size === 0}>
            <FolderPlus className="h-4 w-4 mr-1" /> Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
