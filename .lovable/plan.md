# Collections Feature

Let users save launches into named collections, organize them, and share publicly.

## Database (migration)

Two new tables with RLS:

**`collections`**
- `id` uuid PK
- `user_id` uuid → users(id) cascade
- `name` text NOT NULL
- `description` text
- `is_public` boolean default false
- `slug` text unique (for public URLs)
- `created_at`, `updated_at` timestamptz

**`collection_items`**
- `id` uuid PK
- `collection_id` uuid → collections(id) cascade
- `product_id` uuid → products(id) cascade
- `note` text
- `added_at` timestamptz default now()
- UNIQUE(collection_id, product_id)

Triggers: bump `collections.updated_at` on item insert/delete.

**RLS**
- collections SELECT: `is_public = true OR user_id = auth.uid()`
- collections INSERT/UPDATE/DELETE: `user_id = auth.uid()`
- collection_items SELECT: parent collection visible
- collection_items INSERT/UPDATE/DELETE: parent owner only

## Routes

- `/collections` — current user's library (auth required)
- `/collections/:id` — owner detail view (grid/list, sort, filter, bulk actions)
- `/c/:slug` — public read-only collection page (SEO meta + JSON-LD)

## Components

- `src/pages/Collections.tsx` — library list with create/rename/delete/duplicate/share
- `src/pages/CollectionDetail.tsx` — owner editor (grid/list toggle, sort, filter, bulk remove/move, CSV export)
- `src/pages/PublicCollection.tsx` — public view at `/c/:slug`
- `src/components/SaveToCollectionButton.tsx` — bookmark icon button on launch cards
- `src/components/SaveToCollectionModal.tsx` — checkbox list of collections, inline create, optional note
- `src/hooks/use-collections.tsx` — fetch/mutate with optimistic updates

## Integrations

- **Header avatar dropdown** (`src/components/Header.tsx`): add "Collections" item directly below "Profile", routes to `/collections`. Fires `collections_nav_clicked` analytics.
- **LaunchCard** (`src/components/LaunchCard.tsx`): add `SaveToCollectionButton` in the action row next to vote button.
- **LaunchDetail** (`src/pages/LaunchDetail.tsx`): add Save button near upvote.
- **App.tsx**: register 3 new routes.

## Analytics

Insert into existing `product_analytics` table (consistent with project memory) for events: `collection_created`, `launch_saved_to_collection`, `launch_removed_from_collection`, `collection_shared`, `collection_viewed`, `collections_nav_clicked`.

## UX details

- Optimistic save/remove with toast (sonner).
- Empty state on library: "No collections yet — start saving launches."
- Empty state on detail: CTA → `/products`.
- Public badge with lock/globe icon.
- Share button copies `${origin}/c/${slug}` and fires `collection_shared`.
- Pagination: 24 per page on detail, infinite scroll via existing `use-infinite-scroll`.
- Mobile-responsive grids, ARIA labels on icon buttons, keyboard-friendly modal (shadcn Dialog).
- Loading skeletons reuse `ProductSkeleton`.

## Out of scope (flagging)

- No automated test harness exists in repo — will skip "basic tests" deliverable unless you want me to add Vitest setup.
- "Move to another collection" bulk action included; "duplicate collection" implemented as server-side copy of items.

Proceed?