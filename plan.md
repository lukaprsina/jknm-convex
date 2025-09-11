# Legacy Article & Media Conversion Plan

This plan documents the finalized architecture and implementation steps for converting ~700 legacy Editor.js articles (with ~4000 images and ~100 documents) into the new PlateJS + Convex system using the `/converter` route. It reflects explicit decisions confirmed after review and is intended to be self‑contained so another engineer can execute it.

---
## 1. Goals
- One-off bulk migration with iterative debugging capability.
- Preserve legacy IDs and map to Convex article IDs (draft first → publish) while hardcoding final media URLs directly into Plate value trees.
- Stage media locally (no immediate Backblaze B2 uploads while iterating) but still create Convex `media` + `media_to_articles` rows so SSR and static rendering logic can function with canonical URLs.
- Maintain idempotent, resumable workflow using IndexedDB caches + optional JSON disk snapshots.
- Defer: legacy internal link rewriting (`/novica?id=…`), image variant generation, thumbnails, dead external link auditing, and hash-based dedupe.

---
## 2. High-Level Flow (Per Iteration)
1. Load `articles.json` into IndexedDB (read-only dataset cache). Provide UI buttons: `Load Articles`, `Reload Articles From Disk`.
2. Navigate articles by index. When index changes:
   - Lookup legacy_id → article_id in `new_articles_cache` (IndexedDB).
   - If absent, create a draft via `create_draft` mutation; store mapping (legacy_id → draft article_id).
   - Convert legacy Editor.js blocks to Plate value (text + media placeholders) via `get_value_from_article`.
   - For each media encountered (image or document): ensure staged presence (see Section 5).
   - Inject final canonical media URL (hardcoded pattern) into Plate nodes immediately.
3. Display editable / preview JSON in `/converter` (already implemented for text).
4. On `Accept`:
   - Call `publish_draft` with prepared Plate JSON + metadata (authors, thumbnail optional; may stub initially).
   - Update `new_articles_cache` marking published.
   - Persist caches periodically to disk snapshots (optional safety) while authoritative source remains IndexedDB.
5. Repeat until edge cases fixed. Use `Wipe All` to drop Convex tables + clear caches and restart.

Post-migration phases executed later:
- Link rewriting (legacy ID anchors → new slugs).
- Variant + placeholder generation for images.
- Thumbnail cropping pass.
- External link audit + remediation.

---
## 3. Data & Cache Layers
### 3.1 Datasets
- `articles.json` (5MB) loaded once into memory & mirrored into IndexedDB `legacy_articles` store.
- Strictly read-only after load (unless file changes → manual `Reload`).

### 3.2 IndexedDB Stores
1. `legacy_articles`:
   - Key: `legacy_id` (number) or synthetic increment.
   - Value: Full legacy article object as parsed.
2. `new_articles_cache`:
   - Key: `legacy_id` (number)
   - Value: `{ article_id: string, status: 'draft' | 'published', published_at?: number }`
3. `media_cache`:
   - Key: `legacy_media_key` (string) — normalized relative legacy path (e.g. `/some/article-folder/img01.jpg`).
   - Value: `{ media_id: string, type: 'image' | 'document', filename: string, content_type: string, size_bytes?: number, base_url: string }`
4. `problems`:
   - Key: auto / uuid
   - Value: `{ legacy_id: number, kind: 'missing_media' | 'bad_block' | 'unexpected_link' | 'invalid_document' | 'other', detail: string, media_key?: string }`

### 3.3 Disk Snapshot JSON (Optional)
- On demand buttons: `Export Caches` / `Import Caches` writing to local filesystem (dev only) for off-browser persistence.

### 3.4 Versioning & Resets
- No multi-version branching. If transform logic changes: user triggers `Wipe All` (DB + caches) then reprocess.
- Wipe workflow:
  1. Call Convex `delete_everything` mutation.
  2. Clear all IndexedDB stores.
  3. (Optional) Retain exported disk snapshots if desired (user-managed).

---
## 4. Convex Backend Adjustments
### 4.1 Article Mutations
- Keep existing `create_draft` and `publish_draft` pair.
- Future refactor (not immediately required for migration): unify shared logic into helper `update_article` used by `update_draft` and `publish_draft`.
- Migration path will invoke: `draft_id = create_draft()` → populate media links → `publish_draft({ article_id: draft_id, content_json, thumbnail, author_ids, published_at })`.

### 4.2 Media Mutations
Add a new mutation: `stage_legacy_media`:
- Args: `{ filename, content_type, size_bytes, legacy_key }`
- Behavior:
  1. Insert row into `media` with `upload_status: 'staged'`.
  2. Compute `ext` from filename.
  3. Derive `base_url = https://gradivo.jknm.site/<media_id>` and `original.url = base_url + '/original' + ext`.
  4. Patch row with those values (mirroring final production convention but without uploading actual file yet).
  5. Return full media doc (including id / URLs).

Add (or reuse existing) mutation to link staged media to article: `link_media_to_article({ article_id, media_id, order })` (could reuse part of `confirm_upload` minus status checks). If not present, create a small mutation.

No B2 write occurs here; local filesystem copy (handled by the converter UI logic) places file into staging directory: `NEW_MEDIA_DIRECTORY/<media_id>/original<ext>` for future batch upload.

### 4.3 Upload & Variant Post-Pass (Later)
- A separate script/action will:
  1. Enumerate `media` rows with `upload_status = 'staged'`.
  2. For each row, upload local `original` to B2 location `<media_id>/original<ext>`.
  3. Set `upload_status = 'processing'`.
  4. Schedule existing `internal.media_sharp.optimize_image` for images (documents go straight to `completed`).

---
## 5. Media Handling During Conversion
### 5.1 Legacy Media Key Normalization
- Given legacy image path pattern: `${article.url}/${image_name.jpg}` already implicitly relative.
- Normalize by:
  - Ensuring a single leading slash.
  - Converting Windows backslashes to forward slashes.
  - Removing duplicate slashes.
  - No lowercasing (case preserved).

### 5.2 Staging Algorithm (Per Image/Doc)
1. Generate `legacy_media_key`.
2. Lookup in `media_cache`.
3. If hit: reuse `media_id` and base_url.
4. If miss:
   - Read file from `OLD_MEDIA_DIRECTORY + legacy_media_key`.
   - Infer content_type by extension (simple mapping; fallback `application/octet-stream`).
   - Call `stage_legacy_media` to create DB row.
   - Insert link row with provisional `order` (incremental index from encounter order in article conversion).
   - Copy file to `NEW_MEDIA_DIRECTORY/<media_id>/original<ext>`.
   - Store entry in `media_cache`.
5. Inject `media.original.url` as the node's `url` in the Plate image element (hardcoded final URL).

Documents follow identical path but `type='document'`, no variant generation later.

### 5.3 Order Assignment
- Maintain an in-memory counter during article conversion; first encountered media gets order 0, etc.
- If an article is revisited (already staged) and media order differs, optionally ignore or update (non-critical for migration). Simplicity: if published already, do not reorder.

---
## 6. Plate Value Construction Updates
- Extend `get_value_from_article` media conversion branch:
  - Resolve or stage media (as above) before constructing element.
  - Use final URL in element `url` attribute.
  - If caption exists, deserialize like current logic.
- Text, headers, lists, embeds logic unchanged.
- Anchor tag/document discovery (from inline HTML in blocks) postponed until later phase (not required for initial Accept path). Mark TODO comments to implement using rehype/unified.

---
## 7. UI / UX Additions in `/converter`
Buttons / Controls:
1. Load Articles (initial dataset → IndexedDB)
2. Reload Articles From Disk (truncate `legacy_articles` then reload file)
3. Previous / Next navigation (already present)
4. Accept Article (draft → publish)
5. Wipe All (DB `delete_everything` + clear all IndexedDB stores)
6. Export Caches (download JSON snapshots)
7. Import Caches (optional drag-and-drop / file input)
8. Problems Panel (render from `problems` store)

Status Indicators:
- Current legacy_id
- Draft / Published state
- Media count staged for this article
- Cache presence (icons or badges)

Edge Handling:
- Disable Accept if already published (or allow re-publish flow via draft copy—out of scope now).
- On navigation, auto-save any unsaved changes (not necessary if we only accept immutable converted value—lowest complexity chosen).

---
## 8. Error & Problem Recording
- Throw (hard fail) only on fundamental invariants: missing file for required image, unreadable JSON block, corrupt legacy structure.
- Soft record (append to `problems` store) for: unexpected link patterns, suspected non-document mime, missing caption where expected (if optional, skip), etc.
- Provide filter UI by `kind`.

---
## 9. Deferred Tasks (Explicitly Not in First Implementation)
- Internal `/novica?id=` link rewriting (will require legacy_id → slug map after all published).
- External link validation & dead link remediation.
- Image variant generation + blur placeholders (use existing Sharp action after bulk upload script).
- Thumbnail generation & manual cropping UI.
- Hash-based duplicate media detection.
- Draft edit rehydration (only forward conversion path supported initially).

---
## 10. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Convex auth blocking mutations in dev | Ensure user session present; add guard UI state if not authenticated. |
| IndexedDB schema evolution | Provide a version number constant; on mismatch wipe stores automatically. |
| Accidental stale caches after wipe | Wipe All combines DB clear + IndexedDB clear. |
| Large batch accept memory pressure | Operation is incremental (one article at a time); safe. |
| Unexpected media path formats | Strict normalization + problem logging with early surfacing. |
| Re-running Accept on published article | Disable Accept; add tooltip. |

---
## 11. Implementation Iterations
### Iteration 1: Convex Backend Extensions
- Add `stage_legacy_media` mutation.
- Add `link_media_to_article` mutation (or reuse existing logic minus status transitions).
- (Optional) Refactor shared article patch logic into helper `update_article` (can defer until after migration).

### Iteration 2: IndexedDB Layer
- Implement small wrapper module `src/lib/converter-db.ts` handling:
  - Opening DB (`converter_db`, version 1).
  - Stores: `legacy_articles`, `new_articles_cache`, `media_cache`, `problems`.
  - CRUD helpers: `getLegacyArticle(legacy_id)`, `putArticleMapping()`, `getOrCreateMedia()`, etc.

### Iteration 3: `/converter` Route Enhancements
- Load dataset into IndexedDB (if absent) on button click.
- Add buttons & UI state (Accept, Wipe All, Export, etc.).
- On index change: ensure draft exists (create if needed), perform conversion.
- Implement media staging workflow & final URL injection in conversion function.

### Iteration 4: Media File Copy Utility
- Node side helper (server fn) or client→server RPC to copy from `OLD_MEDIA_DIRECTORY` to `NEW_MEDIA_DIRECTORY/<media_id>/original<ext>`.
- Ensure idempotency (skip if already exists).
- Record errors to `problems`.

### Iteration 5: Accept Flow
- Gather current converted Plate value (already in component state).
- Call `publish_draft` with required metadata (stub authors, thumbnail as placeholder until real strategy decided).
- Update caches.

### Iteration 6: Wipe & Export/Import
- Hook `delete_everything` + local store clearing.
- Implement export (serialize each store to downloadable Blob) and import (file input parse and repopulate stores).

### Iteration 7: Problems Panel & Instrumentation
- Add problem logging utility with structured reasons.
- Basic UI to list/filter problems.

### Iteration 8 (Deferred / Optional)
- Automated loop: Accept All (iterate through all legacy articles invoking the same per‑article pipeline).
- Progress reporting & simple cancel mechanism.

---
## 12. Minimal Metadata Strategy (Phase 1)
- Authors: supply empty array or a single placeholder author if required by publish mutation (currently mutation requires `author_ids: v.array(v.string())` → pass empty array allowed?).
- Thumbnail: Provide a dummy object or modify mutation to accept optional thumbnail during migration; current schema marks `thumbnail` optional—OK.
- Published timestamp: Use legacy timestamp if present; else `Date.now()`.

---
## 13. Local Directory Conventions
- `OLD_MEDIA_DIRECTORY` (already defined) — read-only source.
- `NEW_MEDIA_DIRECTORY` (new constant) — staging sink: `NEW_MEDIA_DIRECTORY/<media_id>/original<ext>`.
- Ensure creation of parent directories on first write.

---
## 14. Future Post-Migration Script (Outline)
Pseudo-sequence (run once conversion stable):
1. Enumerate media rows where `upload_status = 'staged'`.
2. For each row: locate local staging file; upload to B2; patch status to `processing`.
3. For images: schedule optimize action; for docs: mark `completed`.
4. After queue drain: verify all rows `upload_status = 'completed'`.
5. Run internal link rewrite pass.
6. Generate thumbnails (manual or automatic heuristic) and patch articles.

---
## 15. Acceptance Criteria
- Can navigate any legacy article; draft auto-created if absent.
- Media for visited articles produce Convex `media` rows with final URLs and `upload_status='staged'` without B2 network calls.
- Accept publishes article with correct slug + Plate JSON referencing canonical URLs.
- Wipe resets both DB and caches to a pristine state.
- Re-visiting a previously processed article does not duplicate media rows.

---
## 16. Open Questions (If Later Needed)
- Whether to retroactively attach authorship metadata from legacy dataset (not in current scope).
- How to derive excerpts (first paragraph extraction vs summarization) — placeholder now.
- SEO impact of delayed internal link rewrites (acceptable per decision; redirects exist on legacy site side for Google continuity).

---
## 17. Summary
This plan prioritizes fast, deterministic iteration with hardcoded final media URLs and local staging, leveraging existing Convex mutations with minimal new surface (one staging mutation + optional media link helper). Caches live in IndexedDB for resilience across reloads, with full resets trivial. Deferred tasks isolate complexity (variants, linking, thumbnails) until after accurate article & media core migration is validated.

End of plan.
