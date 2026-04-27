import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Sparkles, Eye, Edit, Trash2, Archive, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_md: string;
  meta_title: string | null;
  meta_description: string | null;
  tags: string[] | null;
  status: 'draft' | 'published' | 'archived';
  ai_generated: boolean;
  published_at: string | null;
  created_at: string;
}

const AdminBlogTab = () => {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as BlogPost[];
    },
  });

  const generateNow = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-post', {
        body: { source: 'manual' },
      });
      if (error) throw error;
      toast.success(`Published: ${data?.title || 'New article'}`);
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate post');
    } finally {
      setGenerating(false);
    }
  };

  const backfillImages = async () => {
    setBackfilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-blog-images', {
        body: {},
      });
      if (error) throw error;
      toast.success(
        `Generated ${data?.succeeded ?? 0} of ${data?.processed ?? 0} cover images`,
      );
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to backfill images');
    } finally {
      setBackfilling(false);
    }
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'published') updates.published_at = new Date().toISOString();
      const { error } = await (supabase as any).from('blog_posts').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Updated');
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const savePost = useMutation({
    mutationFn: async (post: BlogPost) => {
      const { error } = await (supabase as any)
        .from('blog_posts')
        .update({
          title: post.title,
          excerpt: post.excerpt,
          content_md: post.content_md,
          meta_title: post.meta_title,
          meta_description: post.meta_description,
        })
        .eq('id', post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Saved');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Blog Posts</CardTitle>
              <CardDescription>
                AI auto-publishes a new article every 3 days at 14:00 UTC. You can also generate one
                on demand.
              </CardDescription>
            </div>
            <Button onClick={generateNow} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Generate Now
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !posts || posts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No blog posts yet. Click "Generate Now" to publish your first article.
            </p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div key={post.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold truncate">{post.title}</h3>
                        <Badge
                          variant={
                            post.status === 'published'
                              ? 'default'
                              : post.status === 'archived'
                              ? 'outline'
                              : 'secondary'
                          }
                        >
                          {post.status}
                        </Badge>
                        {post.ai_generated && (
                          <Badge variant="outline" className="text-xs">
                            <Sparkles className="h-3 w-3 mr-1" /> AI
                          </Badge>
                        )}
                      </div>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {post.excerpt}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        /blog/{post.slug} · {format(new Date(post.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(post)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {post.status !== 'published' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStatus.mutate({ id: post.id, status: 'published' })}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      {post.status === 'published' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStatus.mutate({ id: post.id, status: 'archived' })}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete "${post.title}"?`)) deletePost.mutate(post.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Blog Post</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Meta Title</Label>
                <Input
                  value={editing.meta_title || ''}
                  onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })}
                />
              </div>
              <div>
                <Label>Meta Description</Label>
                <Textarea
                  rows={2}
                  value={editing.meta_description || ''}
                  onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })}
                />
              </div>
              <div>
                <Label>Excerpt</Label>
                <Textarea
                  rows={2}
                  value={editing.excerpt || ''}
                  onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                />
              </div>
              <div>
                <Label>Content (Markdown)</Label>
                <Textarea
                  rows={20}
                  className="font-mono text-xs"
                  value={editing.content_md}
                  onChange={(e) => setEditing({ ...editing, content_md: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => editing && savePost.mutate(editing)} disabled={savePost.isPending}>
              {savePost.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBlogTab;
