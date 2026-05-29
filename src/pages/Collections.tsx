import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useCollections, type Collection } from '@/hooks/use-collections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Globe, Lock, Copy, Trash2, Pencil, Share2, FolderOpen, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { gradientFor } from '@/lib/gradients';

export default function Collections() {
  const navigate = useNavigate();
  const { collections, loading, userId, createCollection, updateCollection, deleteCollection, duplicateCollection } = useCollections();
  const [authChecked, setAuthChecked] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/auth');
      setAuthChecked(true);
    });
  }, [navigate]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const col = await createCollection(name, { description, is_public: isPublic });
    if (col) {
      toast.success(`Collection "${col.name}" created`);
      setCreateOpen(false);
      setName(''); setDescription(''); setIsPublic(true);
    } else {
      toast.error('Failed to create');
    }
  };

  const handleShare = (c: Collection) => {
    const url = `${window.location.origin}/c/${c.slug}`;
    navigator.clipboard.writeText(url);
    toast.success(c.is_public ? 'Public link copied' : 'Link copied (make collection public to share)');
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    await updateCollection(editing.id, {
      name: editing.name,
      description: editing.description,
      is_public: editing.is_public,
      cover_image_url: editing.cover_image_url ?? null,
    });
    toast.success('Updated');
    setEditing(null);
  };

  const handleCoverUpload = async (file: File) => {
    if (!editing || !userId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setUploadingCover(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/${editing.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('collection-covers')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('collection-covers').getPublicUrl(path);
      setEditing({ ...editing, cover_image_url: pub.publicUrl });
      toast.success('Cover uploaded');
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploadingCover(false);
    }
  };

  if (!authChecked || (userId && loading)) {
    return (
      <div className="container mx-auto px-4 max-w-7xl py-20 flex flex-col items-center justify-center text-muted-foreground">
        <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
        <p className="text-sm mt-3">Loading collections…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 max-w-7xl py-8">
      <Helmet>
        <title>Your Collections | Launch</title>
        <meta name="description" content="Organize and revisit your favorite launches in personal collections." />
      </Helmet>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-reckless font-bold">Collections</h1>
          <p className="text-sm text-muted-foreground mt-1">Save and organize launches you love.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> New collection</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create collection</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="c-name">Name</Label>
                <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AI tools to try" />
              </div>
              <div>
                <Label htmlFor="c-desc">Description</Label>
                <Textarea id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="c-public" className="flex items-center gap-2">
                  {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {isPublic ? 'Public' : 'Private'}
                </Label>
                <Switch id="c-public" checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!name.trim()}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-lg">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-1">No collections yet</h2>
          <p className="text-sm text-muted-foreground mb-4">Start saving launches to organize them here.</p>
          <Button onClick={() => navigate('/products')}>Browse launches</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((c) => (
            <div key={c.id} className="border rounded-lg overflow-hidden hover:shadow-sm transition-shadow group">
              <Link
                to={`/my-collections/${c.slug}`}
                className="block aspect-[3/1.6] bg-muted overflow-hidden"
                style={!c.cover_image_url ? { backgroundImage: gradientFor(c.id || c.slug || c.name) } : undefined}
              >
                {c.cover_image_url && (
                  <img src={c.cover_image_url} alt={c.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" loading="lazy" />
                )}
              </Link>
              <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <Link to={`/my-collections/${c.slug}`} className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{c.name}</h3>
                  {c.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{c.description}</p>}
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Collection actions">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(c)}><Pencil className="h-4 w-4 mr-2" />Rename / edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => { const d = await duplicateCollection(c.id); if (d) toast.success('Duplicated'); }}>
                      <Copy className="h-4 w-4 mr-2" />Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare(c)}><Share2 className="h-4 w-4 mr-2" />Share link</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`Delete "${c.name}"? This cannot be undone.`)) {
                          deleteCollection(c.id);
                          toast.success('Deleted');
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                <span>{c.item_count ?? 0} launches</span>
                <span className="flex items-center gap-1">
                  {c.is_public ? <><Globe className="h-3 w-3" /> Public</> : <><Lock className="h-3 w-3" /> Private</>}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Updated {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit collection</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Cover image</Label>
                <div className="mt-2">
                  {editing.cover_image_url ? (
                    <div className="relative w-full h-40 rounded-md overflow-hidden border bg-muted">
                      <img src={editing.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={() => setEditing({ ...editing, cover_image_url: null })}
                        aria-label="Remove cover"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/40 transition-colors text-muted-foreground">
                      <ImagePlus className="h-6 w-6 mb-1" />
                      <span className="text-xs">{uploadingCover ? 'Uploading…' : 'Click to upload (max 5MB)'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingCover}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleCoverUpload(f);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <Label>Name</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  {editing.is_public ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {editing.is_public ? 'Public' : 'Private'}
                </Label>
                <Switch checked={editing.is_public} onCheckedChange={(v) => setEditing({ ...editing, is_public: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
