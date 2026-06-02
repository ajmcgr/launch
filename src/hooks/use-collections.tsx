import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  slug: string;
  created_at: string;
  updated_at: string;
  cover_image_url?: string | null;
  item_count?: number;
  owner_username?: string | null;
}

const sb: any = supabase;

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [sharedCollections, setSharedCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchAll = useCallback(async (uid: string) => {
    setLoading(true);
    const { data: cols, error } = await sb
      .from('user_collections')
      .select('*')
      .eq('user_id', uid)
      .order('updated_at', { ascending: false });
    if (error) {
      console.error(error);
      setCollections([]);
      setLoading(false);
      return;
    }
    const ids = (cols ?? []).map((c: Collection) => c.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: items } = await sb
        .from('user_collection_items')
        .select('collection_id')
        .in('collection_id', ids);
      (items ?? []).forEach((i: any) => {
        counts[i.collection_id] = (counts[i.collection_id] ?? 0) + 1;
      });
    }
    // Built With collections derive their items from product_stack_map.
    const builtWith = (cols ?? []).filter((c: Collection) => c.slug?.startsWith('built-with-'));
    if (builtWith.length) {
      const slugs = builtWith.map((c: Collection) => c.slug.replace(/^built-with-/, ''));
      const { data: stackItems } = await sb
        .from('stack_items')
        .select('id, slug')
        .in('slug', slugs);
      const stackIds = (stackItems ?? []).map((s: any) => s.id);
      if (stackIds.length) {
        const { data: maps } = await sb
          .from('product_stack_map')
          .select('stack_item_id, products!inner(status)')
          .in('stack_item_id', stackIds)
          .eq('products.status', 'launched');
        const perStack: Record<string, number> = {};
        (maps ?? []).forEach((m: any) => {
          perStack[m.stack_item_id] = (perStack[m.stack_item_id] ?? 0) + 1;
        });
        const stackBySlug = new Map<string, any>((stackItems ?? []).map((s: any) => [s.slug, s.id]));
        builtWith.forEach((c: Collection) => {
          const platformSlug = c.slug.replace(/^built-with-/, '');
          const sid = stackBySlug.get(platformSlug);
          if (sid) counts[c.id] = (counts[c.id] ?? 0) + (perStack[String(sid)] ?? 0);
        });
      }
    }
    setCollections((cols ?? []).map((c: Collection) => ({ ...c, item_count: counts[c.id] ?? 0 })));

    setLoading(false);
  }, []);

  useEffect(() => {
    let currentUid: string | null = null;
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      currentUid = uid;
      setUserId(uid);
      if (uid) fetchAll(uid);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      if (uid === currentUid) return; // ignore token refreshes — prevents spinner flicker
      currentUid = uid;
      setUserId(uid);
      if (uid) fetchAll(uid);
      else { setCollections([]); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, [fetchAll]);

  const createCollection = useCallback(async (
    name: string,
    opts: { description?: string; is_public?: boolean } = {}
  ): Promise<Collection | null> => {
    if (!userId) return null;
    const { data, error } = await sb
      .from('user_collections')
      .insert({
        user_id: userId,
        name: name.trim(),
        description: opts.description ?? null,
        is_public: opts.is_public ?? true,
      })
      .select()
      .single();
    if (error) { console.error(error); return null; }
    setCollections((prev) => [{ ...(data as Collection), item_count: 0 }, ...prev]);
    return data as Collection;
  }, [userId]);

  const updateCollection = useCallback(async (id: string, patch: Partial<Collection>) => {
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const { error } = await sb.from('user_collections').update(patch).eq('id', id);
    if (error && userId) fetchAll(userId);
  }, [userId, fetchAll]);

  const deleteCollection = useCallback(async (id: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== id));
    const { error } = await sb.from('user_collections').delete().eq('id', id);
    if (error && userId) fetchAll(userId);
  }, [userId, fetchAll]);

  const duplicateCollection = useCallback(async (id: string): Promise<Collection | null> => {
    const src = collections.find((c) => c.id === id);
    if (!src || !userId) return null;
    const newCol = await createCollection(`${src.name} (Copy)`, {
      description: src.description ?? undefined,
      is_public: true,
    });
    if (!newCol) return null;
    const { data: items } = await sb
      .from('user_collection_items')
      .select('product_id, note')
      .eq('collection_id', id);
    if (items?.length) {
      await sb.from('user_collection_items').insert(
        items.map((i: any) => ({ collection_id: newCol.id, product_id: i.product_id, note: i.note }))
      );
    }
    if (userId) fetchAll(userId);
    return newCol;
  }, [collections, createCollection, userId, fetchAll]);

  const refresh = useCallback(() => { if (userId) return fetchAll(userId); }, [userId, fetchAll]);

  return { collections, loading, userId, createCollection, updateCollection, deleteCollection, duplicateCollection, refresh };
}

export async function saveLaunchToCollections(
  productId: string,
  collectionIds: string[],
  note?: string
) {
  if (!collectionIds.length) return;
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) throw new Error('Not signed in');
  const rows = collectionIds.map((cid) => ({ collection_id: cid, product_id: productId, note: note || null, added_by: uid }));
  const { error } = await sb.from('user_collection_items').upsert(rows, { onConflict: 'collection_id,product_id' });
  if (error) throw error;
}

export async function removeLaunchFromCollection(collectionId: string, productId: string) {
  const { error } = await sb
    .from('user_collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('product_id', productId);
  if (error) throw error;
}

export async function getSavedCollectionIds(productId: string, userId: string): Promise<string[]> {
  const { data } = await sb
    .from('user_collection_items')
    .select('collection_id, user_collections!inner(user_id)')
    .eq('product_id', productId)
    .eq('collections.user_id', userId);
  return (data ?? []).map((r: any) => r.collection_id);
}

// ---- Collaborators ----

export interface CollaboratorInfo {
  id: string;
  user_id: string;
  created_at: string;
  username: string | null;
  avatar_url: string | null;
}

export async function listCollaborators(collectionId: string): Promise<CollaboratorInfo[]> {
  const { data: rows } = await sb
    .from('collection_collaborators')
    .select('id, user_id, created_at')
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: true });
  const ids = (rows ?? []).map((r: any) => r.user_id);
  if (!ids.length) return [];
  const { data: users } = await sb.from('users').select('id, username, avatar_url').in('id', ids);
  const um = new Map<string, any>((users ?? []).map((u: any) => [u.id, u]));
  return (rows ?? []).map((r: any) => ({
    id: r.id,
    user_id: r.user_id,
    created_at: r.created_at,
    username: um.get(r.user_id)?.username ?? null,
    avatar_url: um.get(r.user_id)?.avatar_url ?? null,
  }));
}

export async function inviteCollaboratorByUsername(
  collectionId: string,
  username: string
): Promise<{ ok: boolean; error?: string }> {
  const cleaned = username.trim().replace(/^@/, '');
  if (!cleaned) return { ok: false, error: 'Enter a username' };
  const { data: u } = await sb.from('users').select('id, username').ilike('username', cleaned).maybeSingle();
  if (!u) return { ok: false, error: `No user found with username "${cleaned}"` };
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: 'Not signed in' };
  if (u.id === uid) return { ok: false, error: "You're already the owner" };
  const { error } = await sb.from('collection_collaborators').insert({
    collection_id: collectionId,
    user_id: u.id,
    invited_by: uid,
  });
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Already a collaborator' };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function removeCollaborator(collectionId: string, userId: string) {
  const { error } = await sb
    .from('collection_collaborators')
    .delete()
    .eq('collection_id', collectionId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function listEditableCollectionIds(userId: string): Promise<Set<string>> {
  // Collections this user can add launches to (owner OR collaborator).
  const [{ data: owned }, { data: collab }] = await Promise.all([
    sb.from('user_collections').select('id').eq('user_id', userId),
    sb.from('collection_collaborators').select('collection_id').eq('user_id', userId),
  ]);
  const ids = new Set<string>();
  (owned ?? []).forEach((r: any) => ids.add(r.id));
  (collab ?? []).forEach((r: any) => ids.add(r.collection_id));
  return ids;
}
