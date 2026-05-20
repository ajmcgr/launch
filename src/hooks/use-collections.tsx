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
  item_count?: number;
}

const sb: any = supabase;

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
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
    setCollections((cols ?? []).map((c: Collection) => ({ ...c, item_count: counts[c.id] ?? 0 })));
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) fetchAll(uid);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
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
        is_public: opts.is_public ?? false,
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
      is_public: false,
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
  const rows = collectionIds.map((cid) => ({ collection_id: cid, product_id: productId, note: note || null }));
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
