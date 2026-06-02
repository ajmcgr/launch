# Invite-only collaborative collections

Let collection owners invite specific users to add launches to their collection, and show "Added by @user" attribution on each item.

## Database (new migration)

1. **`collection_collaborators` table**
   - `id uuid pk`, `collection_id uuid → user_collections(id) on delete cascade`
   - `user_id uuid → auth.users(id) on delete cascade`
   - `invited_by uuid`, `created_at timestamptz default now()`
   - `unique(collection_id, user_id)`
   - GRANT select/insert/delete to `authenticated`; all to `service_role`.
   - RLS:
     - SELECT: owner of collection OR the collaborator themself
     - INSERT/DELETE: only collection owner

2. **`user_collection_items.added_by uuid`** (nullable) — who added the launch. Backfill = parent collection's `user_id`.

3. **Security-definer function** `public.is_collection_collaborator(_cid uuid, _uid uuid) returns boolean` — bypasses RLS to avoid recursion.

4. **Update RLS on `user_collection_items`**:
   - INSERT: allowed if `auth.uid()` is owner OR `is_collection_collaborator(collection_id, auth.uid())`. Also force `added_by = auth.uid()` via a check.
   - DELETE: owner of collection OR `added_by = auth.uid()` (contributor can remove their own).
   - UPDATE: unchanged (owner only — note editing).

5. **Public read** of `collection_collaborators` for displaying member list on public collections.

## Backend hooks (`src/hooks/use-collections.tsx` + new helper)

- Extend save flow to set `added_by: auth.uid()` on insert.
- New helper functions:
  - `listCollaborators(collectionId)` → joined with `users` for username/avatar
  - `inviteCollaborator(collectionId, username)` → lookup user by username, insert row
  - `removeCollaborator(collectionId, userId)`
  - `listEditableCollections(uid)` → owner OR collaborator (used by SaveToCollectionModal so invitees see those collections in the picker)

## UI

1. **Collection settings (My Collections → edit modal)**
   - New "Collaborators" section: input + Invite button, list of current collaborators with remove (×).
   - Helper text: "Invited users can add launches to this collection. Only you can remove them or edit collection settings."

2. **Public collection page (`PublicCollection.tsx`)**
   - If viewer is owner or collaborator: show "Add launch" button (already exists for owner — extend permission check).
   - Under each launch card: small "Added by @username" line (link to profile). Skip when `added_by` matches the collection owner to keep the owner's own collections clean.
   - Small "Collaborators" avatar stack near the header for collaborative collections.

3. **SaveToCollectionModal**
   - Source list from `listEditableCollections` so invitees see collections they can contribute to, labeled with "Shared by @owner".

## Files touched

- New: `database-collection-collaborators.sql` (migration content)
- Edit: `src/hooks/use-collections.tsx`
- Edit: `src/components/SaveToCollectionModal.tsx`
- Edit: `src/pages/PublicCollection.tsx`
- Edit: `src/pages/MyCollections.tsx` (or wherever the edit modal lives — confirm during impl)
- Edit: `src/integrations/supabase/types.ts` regen note (manual after migration)

## Out of scope

- Public open-to-all contributions, suggestion queues, notifications on invite (can add later).

Confirm and I'll ship it.
