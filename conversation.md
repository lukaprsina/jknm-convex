# lukaprsina (user):

this is a tanstack start and convex remake of a 2008 caving news/blog website. the functionality to add new articles on the current site is done, i have two more things to do: a bit of frontend and to convert about 700 articles from the old site to the new platejs editor format. i exported the article table into json: `src\content\articles.json`. refer to `.github\copilot-instructions.md`.

in the `src\routes\converter\index.tsx` file i just finished implementing text conversion; this is done in `get_value_from_article`. the missing part are documents and images. there are 4k images and ~100 documents. the old website used editor.js and had an admin view that provided a file explorer. you could upload files to the folder of the current article or to the parent folder to enable sharing files (mostly documents).

for the new website, images/documents are uploaded to backblaze b2 and stored in the media table in the convex db. on b2, the files are stored as just the media table id plus a possible image variant, no article id prefix. this solves file sharing between articles (several pdf files are our publications, books...)

i want to know what the best way is to "upload" images and documents while i am still experimenting with the bulk article conversion in `/converter`. this can't be a script because the platejs editor uses react.
- this is not the normal way to add articles; it is done automatically on the /converter route
- i can use `editor.tf.insert.media` to trigger a file upload to my b2 bucket
- that requires me to inject the article id into my custom platejs plugin for the media join table
- because i am still experimenting, i will need to regularly delete everything in the db, start the converter from scratch (possibly the b2 bucket)

the question is whether i should upload media to b2 every iteration (i can still delete unused files at the end) or keep a local duplicate that i will sync once at the end. i don't care about images being displayed in the editor so much (they can 404) to do all the extra work of storing them in `/public/legacy` and using that relative URL or something like that. here is what i think is best:
- change the `/converter` logic so that the articles file is loaded in memory (it's 5MB, what can I do? i don't want to load it after every site reload)
- use the final correct B2 url as the plate media source, without uploading anything to B2. instead, copy the image from `OLD_MEDIA_DIRECTORY` to another directory called `NEW_MEDIA_DIRECTORY`; which will be synced to B2 at the end in one step. this should be done only once per media, not for every iteration, add the mapping to a cache json file.
- article id is not just the sequential index of an article in convex, it's an UUID. i need to create the row so i can inject that into `src\components\plugins\save-kit.tsx`. the user-facing way to create an article is to call the convex function `create_draft` and then `publish_draft` in `convex\articles.ts`. there is no reason not to use them directly; i am hosting the convex backend locally in a docker container for development
- create a new "accept" button in the converter, it should add the currently loaded article into the db to test if the system works. i should also have a "wipe all" button to clear article, media and media_to_articles tables.
- when every edge-case is fixed, i will wipe everything and call "accept" for every article automatically in a loop

the `OLD_MEDIA_DIRECTORY` contains only directories of images for every article: `${article.url}/${image_name.jpg}`, nothing else. i didn't download any shared documents yet. so, i have to comb through the links in text, captions and so on to find inline "a" tags that link to documents - i will be using rehype-parse and the unified ecosystem for that. here is the decision tree for every link found in an article:
- if it's absolute, assert it's from an another domain, check if it's still exists by fetching it, assert the status to be 200, otherwise store it in a file
- else if it's relative, assert that they all start with a slash.
  1. if it starts with "/novica?id=", read the query param id (i kept the old id's in the `src\content\articles.json`), call a convex function to convert a legacy id to the article's URL and change the href of the anchor. another thought, this will have to be done after everything else; as we need to fill the database with articles first
  2. if it doesn't start with "/novica", assume it's a document (i will find out if that's true by crashing the script if it's just another html page, then adding it to an ignore array), download it and check the mime type. assert it's a document, call the function to add it to the `media` and the `media_to_articles` join tables, as well as copying the `NEW_MEDIA_PATH` directory at the correct place. that function should be reused from copying the images from `OLD_MEDIA_DIRECTORY`.

again, this "a" tag decision should be done only once per media, not for every iteration, add the mapping of url to the decision into a cache json file. final considerations:
- the database doesn't contain any article or media before the bulk transaction
- after clicking "accept", an empty article of status published is inserted into the db, the id is returned and used in json caches. i don't want to deal with drafts, they have a different url slug
- the media table can be filled with a new convex mutation function, not the `generate_presigned_upload_url` pipeline. this should be called after clicking "accept" and creating the article
- fixing article anchor tags in text will be done after this is all finished
- the same for computing thumbnails, they will need to be cropped again in an another pass
- don't worry about my `delete_everything` mutation, mime types or performance of bulk image variant processing, i already thought about that

relevant convex files: `convex\schema.ts`, `convex\articles.ts`, `convex\media.ts`, `convex\media_sharp.ts`.

so, do you disagree with anything? see any possible improvements? be critical of wrong decisions, talk about pros and cons. think hard, i don't want to architect this suboptimally. present the flow of the converter and make a plan, no need for code snippets, this is all just talk.

# GitHub Copilot

Digging straight into the architecture and trade‑offs for the bulk conversion + media pipeline so you can finish this with minimal rework later.

## High-level reaction

Your outlined direction is broadly sound: stage everything locally, avoid repeatedly re-uploading to B2 while you iterate, keep idempotent caches, then do one authoritative sync + variant generation pass at the end. The main improvements are around (1) separation of “content normalization” from “persistence”, (2) deterministic media mapping and duplicate handling, (3) placeholder vs final URL timing, (4) staged link rewriting, and (5) resilience if you wipe the DB but keep caches.

Below I’ll challenge each decision, list pros/cons, then propose a concrete end‑to‑end converter flow.

---

## Core decision points

### 1. Load the entire `articles.json` once and keep it in memory
Pros:
- 5MB is trivial in dev.
- Faster iteration, avoids refetching.
- Lets you precompute indexes (legacy_id → object, slug collisions, stats) immediately.

Cons:
- Lost if the dev server restarts (but acceptable).
- If you hot-reload server modules, you may accidentally re-run initialization logic twice (so add a guard).

Verdict: Keep it in memory; add a global singleton cache with a manual “reload dataset” button to avoid accidental repeated preprocessing. That’s cleaner than re-reading per page load.

### 2. Don’t actually upload to B2 during iterative development
Pros:
- Massive time saver (4k images × multiple iterations).
- Eliminates cleanup churn in B2.
- Lets you experiment with content transforms first.

Cons:
- Editor shows 404s; dev UX a bit worse.
- Risk that final URL construction logic changes (and the already baked URLs in content_json become stale).
- You postpone detecting edge cases in your existing upload/variant pipeline until late.

Mitigation:
- Add a “single article eager upload” debug toggle to test pipeline early when desired.
- Or introduce a lightweight placeholder scheme (see next).

Verdict: Still correct to defer bulk upload. Add a verification pass before final sync.

### 3. Use “final correct B2 URL” immediately vs placeholder
Current idea: Put final URL (that doesn’t exist yet) into Plate nodes.

Pros:
- No post-processing rewrite for images required.
- Avoids an extra traversal step later.

Cons:
- If you later tweak CDN domain, variant naming, or path layout, every already-converted article’s JSON must be rewritten.
- Harder to detect which images are “uncommitted” (they look final already).
- Editors or downstream code might attempt optimization (Headless prefetch) and log noise due to 404s.

Alternative: Use a distinct placeholder schema e.g. `b2-staged://<legacy_relative_path>` or `data-media-key="legacy:/foo/bar.jpg"` until Accept time. Then, during Accept:
1. Resolve / allocate media row (getting its Convex id).
2. Materialize the real canonical URL.
3. Replace placeholders inside the value tree once per article.

Hybrid compromise (recommended):
- During initial view (pre-Accept) keep original legacy URL (or placeholder).
- On Accept: resolve each needed media → ensure media row exists → rewrite node src attributes to canonical B2 URLs → save article.
- Cache the mapping old_legacy_path → media_id so subsequent Accepts reuse without re-copy.

Verdict: Your “immediately final URL” plan works but is brittle. I’d switch to rewrite-on-Accept. It keeps you flexible and still low effort.

### 4. Creating articles: bypass drafts and insert directly as published
Pros:
- Simpler, you preserve original published_at.
- Avoid slug drift between draft and published states.

Cons:
- If any existing logic (thumbnail generation, search indexing, author assignment triggers) expects the draft→publish pipeline, you could miss side-effects.

Mitigation:
- Inspect `create_draft` + `publish_draft` to see what extra fields or transformations they perform. If they only wrap validations and set timestamps, replicate precisely or temporarily add an internal mutation `create_legacy_article` that atomically inserts with all fields (including computed published_year) to avoid two-step pipeline overhead.

Verdict: Fine to bypass drafts, but do it with a dedicated internal mutation to keep this path explicit and auditable (and prevent future maintainers from conflating it with user flows).

### 5. Media rows created via a special mutation (skipping presigned upload)
Pros:
- You control ID allocation timing (after insert returns ID).
- Can attach original file metadata and mark `upload_status = "pending"` or custom `"staged"` value during conversion.
- Later a bulk action processes variants & srcsets.

Cons:
- Must ensure no consumer assumes variants/srcsets exist for status `published`.
- Need an internal action to fill in variants & placeholders later; delays bug discovery in Sharp pipeline.

Mitigation:
- Introduce a new transitional status (if you want): `upload_status: "staged"` distinct from `"pending"` vs `"processing"`.
- After bulk real upload + processing, transition to `"completed"`.

Verdict: Good. Defer heavy work until after acceptance loop finishes.

### 6. Deduplicating media across articles
With 4k images across 700 articles there’s likely repetition (logos, shared figures, doc PDFs reused).

Add SHA-256 (or fast hash) at staging time:
- Key the mapping by normalized legacy path AND by content hash.
- If two different legacy paths share identical file contents, decide whether to unify them under one media record (preferable for storage) or keep separate (simpler mental model). Given your future variant cost, dedupe is beneficial.

Potential pitfall: If two distinct conceptual assets differ only by metadata (e.g., same binary image reused intentionally), dedupe is fine; no per-article customization.

Verdict: Implement hash-based dedupe; optional but valuable.

### 7. Rewriting internal article links (/novica?id=)
You already caught the dependency ordering: can only rewrite once destination articles exist. That implies a post-pass (Phase D).

Two implementation strategies:
- Maintain mapping legacy_id → new slug as soon as each article is accepted. After all accepted, run a second mutation or server-side script that:
  - Fetches each article content_json
  - Traverses nodes for anchors with unresolved placeholders
  - Rewrites and patches article
- Or accumulate rewrite operations in memory and apply at the end in bulk.

Pitfall: Partial acceptance (crash mid-run) leaves some anchors unresolved. Keep the link placeholder shape explicit (e.g., `data-legacy-article-id="1234"`) so the post-pass can detect and fill.

Verdict: Explicit placeholder attr is cleaner than scanning for `/novica?id=` raw in persisted HTML fragments.

### 8. Documents (PDFs, etc.)
Your anchor decision tree is fine. Key additions:
- Normalize relative paths (leading slash, collapse `./` and `../` if they appear).
- Handle query strings (strip or include in key?) — usually documents lack queries but guard anyway.
- For absolute external links: optional HEAD fetch during iterative dev can slow Accept; maybe defer validation to a “link integrity audit” pass to avoid blocking Accept flow.

Verdict: Good. Defer network validation to a separate audit pass that can be retried and cached.

### 9. Cache JSON strategy
You need multiple caches with explicit schemas:

- `articles_cache.json`
  - legacy_id
  - detected slug
  - accepted: boolean
  - article_id (Convex)
  - hash_of_content_source (so if you change transformation rules you can detect stale conversion)
  - unresolved_link_count

- `media_cache.json`
  - legacy_path (normalized)
  - media_id (Convex)
  - sha256
  - original_filename
  - content_type (guessed)
  - staged_local_path
  - size_bytes
  - status: staged | uploaded | variants_completed
  - reference_count (increment each Accept to detect orphan media later)

- `document_cache.json` (if you want separation) or merged with media.

- `problems.json`
  - type (missing_source, invalid_mime, broken_link, unexpected_html_anchor)
  - context (legacy_id, path, original_anchor_html, notes)

Key principle: Make caches idempotent. On startup:
1. Load caches if they exist.
2. Verify each recorded `media_id` still exists in DB when you attempt reuse (if DB wiped but cache persisted).
3. If mismatch, mark cache entries stale and re-stage from scratch (and regenerate new media_id). Optionally prompt you to confirm clearing caches.

Verdict: Essential. Add a “Reset caches” button to the UI.

### 10. Wipe-all behavior
If you retain caches while wiping DB, they become dangerous (point to non-existent media/article IDs). Provide two paths:
- “Wipe DB only (keep caches and rehydrate)” → Converter scans caches, recreates DB rows with same legacy mapping but new IDs; BUT article content_json already baked with old media URLs referencing old IDs → mismatch.
- Therefore simplest: wiping DB must invalidate caches or trigger a regeneration that also rewrites article content before saving.

Verdict: Tie wipe-all to both DB + cache purge to avoid confusing mismatches. Simplicity over clever rehydration.

### 11. Content transformations and future re-runs
If you later refine `get_value_from_article`, you’ll want to know which articles need reconversion.
Solution: store a version stamp (e.g., `converter_transform_version: 1`) in `articles_cache.json`. Bump version when logic changes; mark all articles stale and highlight them in UI for re-accept / patch.

Verdict: Low-cost high gain.

### 12. Timing of metadata creation (excerpt, markdown, published_year)
Do it at Accept so the DB state resembles production early. Recompute later if needed. Avoid leaving them blank because any indexing or search code might assume presence.

### 13. Variant generation scheduling
After all media inserted and original binaries uploaded to B2, run a bulk internal action that:
- Queries media with `upload_status = "staged"` (or `"pending"`)
- Processes in batches (to avoid timeouts)
- Updates each row with variants/srcsets/placeholder → `upload_status = "completed"`

Optional safety:
- Mark documents (non-image) with a field `is_image: false` or simply skip when content_type not in allowed list.

Verdict: Use an internalAction + scheduler pattern for large batches.

### 14. Performance and ordering
700 articles × scanning HTML for anchors + conversion is trivial CPU-wise. The heavier operations are hashing images and computing dimensions (if you do them early). You can defer width/height extraction to the variant generation phase (Sharp already reads them).

### 15. Error handling philosophy
Fail fast on:
- Missing local image file
- Unsupported block type (except you can log & skip if those are known rare legacy anomalies)
Accumulate soft errors on:
- External link 404
- Non-document MIME for a supposed document link

Expose a “Problems” panel in the converter UI enumerating unresolved items.

---

## Recommended converter flow (end-to-end)

### Phase A: Initialization
1. Load `articles.json` once → in-memory array.
2. Build `legacy_id_index` + slug proposals (normalize titles).
3. Load caches (if exist); validate version + DB consistency (spot-check a few IDs or query by IDs en masse).
4. If inconsistency → prompt to purge caches.

### Phase B: Interactive Preview
1. User navigates through articles with Current Index.
2. For preview rendering:
   - Run `get_value_from_article` (text-only blocks).
   - For image blocks, keep original legacy URL (or annotate node with `data-legacy-img-path`).
   - For captions, pass through as you do now.
3. Display raw JSON in the side panel (like you already do).

(You intentionally do NOT allocate media IDs nor copy files yet.)

### Phase C: Accept (single article)
On “Accept”:
1. Gather all legacy image references from the article’s block data (and optionally parse HTML fragments just for that one article for embedded anchors → documents).
2. For each image legacy path:
   - Normalize path key (e.g., `/some/article-folder/img01.jpg`).
   - If in `media_cache` → reuse `media_id`.
   - Else:
     a. Create a media Convex row with minimal fields (`upload_status="staged"`, original file metadata placeholders).
     b. Copy file from `OLD_MEDIA_DIRECTORY/<legacy_path>` to `NEW_MEDIA_DIRECTORY/<media_id>/original.ext`
     c. Compute sha256; update DB row with size, hash (if you add a field) and cache entry.
3. For each document link identified (relative non-/novica):
   - Similar logic (create media row; mark content_type; copy file; stage).
4. Transform the Plate value tree:
   - Replace legacy image src with canonical future B2 URL pattern using `media_id` (e.g., `https://cdn.example.com/media/<media_id>/original.<ext>`).
   - Annotate anchors for legacy article links (`/novica?id=123`) with `data-legacy-article-id="123"` (leave href unchanged or set placeholder `#legacy-123`).
5. Create article DB row via internal mutation:
   - Fill title, slug, status=published, published_at = original timestamp, published_year, updated_at, view_count=0 (or legacy count if any), content_json (stringified transformed value), excerpt (derive first N chars / first paragraph).
   - Insert join rows into `media_to_articles` for each media_id (with order from first appearance or block index).
6. Update `articles_cache` entry (accepted=true, article_id).
7. Persist caches to disk.

### Phase D: Post-pass: Legacy Article Link Rewriting
After all accepted:
1. Build in-memory mapping legacy_id → slug (from `articles_cache`).
2. Iterate articles needing link rewrite:
   - Parse content_json → traverse nodes for anchors with `data-legacy-article-id`.
   - Replace href with `/novica/<slug>` (or final route pattern).
   - Patch article row (Convex mutation).
3. Update rewritten counts in cache (set unresolved_link_count = 0).

### Phase E: Bulk Media Upload + Variants
1. Run a local script or UI button “Upload Media & Generate Variants”.
2. For each cache media entry with status staged:
   - Upload `NEW_MEDIA_DIRECTORY/<media_id>/original.ext` to B2 at final key `<media_id>/original.ext`.
   - Mark DB row `upload_status="processing"`.
3. Queue internal action to process images (Sharp) into variants; update row with variants/srcsets, placeholder; set `upload_status="completed"`.
4. For documents, simply set status to completed after upload (no variants).

### Phase F: Integrity Audit
1. Link check pass (external anchors).
2. Identify orphan media (reference_count == 0).
3. Optionally regenerate content_markdown for all articles (if needed for search index).
4. Final thumbnail selection pass (maybe manual cropping UI later).

---

## Pros & cons summary for key alternatives

| Topic                   | Your Initial Plan                  | Recommended Adjustment                            | Why                                                                     |
| ----------------------- | ---------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| Image URLs pre-upload   | Use final B2 URL immediately (404) | Use legacy URL/placeholder then rewrite on Accept | Flexibility if URL pattern changes; clear staging semantics             |
| Media creation timing   | Maybe at parse time                | Only on Accept                                    | Avoids allocating unused media for articles you might skip or reconvert |
| Draft vs direct publish | Direct publish                     | Direct publish via dedicated internal mutation    | Encapsulates differences, avoids drift from user path                   |
| Duplicate handling      | Not specified                      | Hash-based dedupe and reuse                       | Saves variant generation cost and storage                               |
| Cache wipe semantics    | Not detailed                       | Tie DB wipe to cache purge                        | Prevent inconsistent IDs in content_json                                |
| Legacy internal links   | Rewrite early                      | Placeholder attr + post-pass                      | Avoid ordering dependency issues                                        |
| Variant generation      | Maybe ad hoc                       | Single bulk action after all staging              | Operational simplicity, predictable resource usage                      |

---

## Risks & Mitigations

- Risk: Cache stale after DB wipe → mitigate by version + integrity check.
- Risk: Missed transformation bug discovered late → keep `converter_transform_version` to force reconversion.
- Risk: External link validation slows Accept flow → defer to audit phase.
- Risk: Memory mismatch if user edits article after Accept (in DB) but not in `articles_cache` → store a content hash on Accept to detect divergence; show “modified” badge if DB hash differs from stored hash (optional polish).
- Risk: Path normalization edge cases (`%20`, case sensitivity on Windows vs B2) → canonicalize by lowercasing only if original site treated paths case-insensitively; otherwise preserve exact case and encode URL properly.

---

## Minimal additions to Convex backend (conceptual)

(Describing, not implementing code per your instruction)
- internal mutation create_legacy_article(fields...)
- internal mutation stage_media(original_filename, content_type, size_bytes, hash?) → returns media_id
- internal mutation link_media_to_article(article_id, media_id, order)
- internal mutation finalize_article_links(article_id, link_map)
- internal action/process to generate image variants for staged media (reuse existing Sharp logic) invoked in batches

---

## Operational checklist (UI buttons on /converter)

1. Load Dataset
2. Accept Current Article
3. Skip / Next / Previous
4. Problems Panel (counts by category)
5. Wipe All (DB + caches)
6. Rewrite Legacy Links (post-pass)
7. Upload & Generate Variants
8. Run Link Audit
9. Export Reports (optional)

---

## Final verdict

You’re on the right path. The biggest improvement is delaying binding to final B2 URLs until you actually allocate a media record (Accept step). The rest are refinements to make the pipeline idempotent, auditable, and resilient to restarts or resets. Avoid optimizing prematurely (e.g., early variant generation) and keep each phase conceptually pure.

If you disagree with switching away from immediate final URLs, you can still proceed, but you’ll pay a rewrite cost if the URL template evolves. Everything else is incremental quality-of-life and future-proofing.

Let me know if you want: 
- A diagram of data flows
- Concrete field lists for the internal mutations
- A traversal spec for rewriting content_json

Happy to drill deeper into any part next.


# lukaprsina (user):

thank you, very informative. i will go through your suggestions point-by-point and argue my decisions.


## Core decision points

1. i decided i want to load `articles.json` into indexeddb. they will be mostly read only, pulled when a reload happens and passed into the react context. methods will be load_articles() and reload_articles() - which will truncate everything and load from file again. same for every other cache file, i will add a button to nuke all of them and reload from disk if i want to.
2. (and 3.) here is the main point: the decision to hardcode media URL's into the article is final. i experimented/benchmarked other cdn/image solutions and this is the best - cloudflare cdn proxying backblaze B2. if i decide to change that (which i am almost sure will never happen), it's simple to write a script to find+replace only original image urls in the plate value of articles, it would be the easiest part of the migration (of course with dual writing). my image variation logic is tight, when an article is fetched by a user, the article from the db is passed to the SSR `PlateStatic` component, and it uses my `src\components\plate-ui\media-image-node-static.tsx` to render images. the variations are fetched for every image from the db, the figure `srcset` and `sizes` are computed strings matching files on B2. if no variations exist, only the original image url is returned automatically. that is all batched by tanstack start, the variations are then server rendered to HTML and sent to the client. the editor uses only original image urls.
4. i found a mistake thanks to you. currently, thumbnail, authors and other metadata can't be changed in a draft article. creating a draft is just an db insertion, nothing more. i will merge `update_draft` and `publish_draft` a helper function `update_article` (taking the content and metadata as arguments), different mutations will then use this helper for consistency. the only difference between a draft and a published article should be no image variants for drafts, as they are not public yet, while published articles need to be copied into a new draft article to be edited. and yes, i can use `await create_draft(...); await publish_draft(...)` for converting, thank you. i'll change it now.
5. i agree with `upload_status: "staged"`.
6. afaik there are no duplicate images, i ran a check on `OLD_MEDIA_DIRECTORY` and they are unique. i have access to the old server filesystem and every document is uploaded once, it's clean. i can check with the same tool and avoid the hash complexity for now; if i want i can add that later for future articles.
7. mapping legacy_id to new URL's in a post-pass is actually low-priority, because of google search actually. it can be done later. i made a route `src\routes\novica\index.tsx`, which reads the id query param on the server and returns a 308 permanent redirect to the new slug. that way we keep our position with search engines. i will dig deeper into SEO before we sunset the old app because it's very important. for a large majority of queries about slovenian caves our website comes first.
8. i agree, no need to fetch. i am only interested in dead links so we can reword the few articles that contain them. this is not a priority. as for query strings in relative url documents, i will store them in `problems.json` i find any.
9. the "reset caches" button is good, cache files will live in indexeddb to persist between reloads. every accept can write to disk then. to avoid confusion with `articles.json`, i will name the cache `new_articles_cache.json`, store just the legacy_id to convex_id mapping. i will merge images and documents into `media_cache.json`.
10. nice catch, i think that i can wipe db and cache in one swoop. i have a list of legacy_id's which are problematic (about 30). i will mostly iterate on them. like you said, that saves me a bunch of headaches about cache invalidation.
11. versioning is fine, but i don't think i will write code that branches on versions. i'd rather wipe+redo.
12. i agree, article metadata will be inserted in the same mutation as the content.
13. i agree, after conversions are done, i will generate thumbnails and image variants sequentially, awaiting the result one by one in a custom script. the good thing is that i am running the convex backend in a docker container, everything is done on my machine. media is discriminated with `const is_image = media.content_type.startsWith("image/");`
14. as i said, i won't bother with hashing now to keep things fast. maybe after the site is live.
15. good error philosophy. i will change what throws and what goes in `problems.json` during iteration.


## Recommended converter flow

i will likely merge phase a to phase c. every time i click "wipe cache", file caches are cleared (if i want to store them i will copy them). indexeddb is also cleared. this is separate from the articles indexeddb cache, which i will reload if i ever make a change in `articles.json`.

flows:
when the article index changes, i read the `new_articles_cache` from indexeddb. if it doesn't exist, read article from react context of `article.json`, make a draft to get the new id.
then, i run get_value_from_article, do the actual conversion. for every media, i will lookup into indexeddb `media_cache`, if it doesn't exist:
- copy the file and insert it into indexeddb,
- insert media into the convex `media` table and the `media_to_articles` join table using the article id,
- use the media.base_url as the new anchor href.

when accept is clicked, i will call the convex mutation `publish_draft`, which calls `update_article`, store the id in `new_articles_cache` indexeddb. i will also write every cache to disk just to be safe. if needed, i can write to disk every 10 articles.


## Conclusion

everything else: link rewrites, variant generation is for later. that is it. anything exceptionally wrong with my points? otherwise these decisions are final. what i want you to do is a plan. you now have edit capabilities, make a `plan.md` file and write down the needed code changes in a few iterations. if you don't know how something is done or want to learn something else about the code, you can freely fetch and search the codebase. the plan should be clear and self-contained.


# GitHub Copilot:

I'll read the existing Convex backend files for articles and media to ground the implementation plan. 

Read [](file:///d%3A/dev/js/jknm-convex/convex/articles.ts)

I'll read the media convex file to understand existing mutations for staging or uploading media. 

Read [](file:///d%3A/dev/js/jknm-convex/convex/media.ts)

I'll read media_sharp for variant generation pipeline details. 

Read [](file:///d%3A/dev/js/jknm-convex/convex/media_sharp.ts)

I'll search for media image static component for context on URL usage. 

Searched text for `media-image-node-static` (`**/*.ts*`), 1 result

I'll read the static image node component to confirm usage of media base_url/variants. 

Read [](file:///d%3A/dev/js/jknm-convex/src/components/plate-ui/media-image-node-static.tsx)

I'll check media-base-kit plugin to understand editor insertion pattern, to account for modifications for staging. 

Read [](file:///d%3A/dev/js/jknm-convex/src/components/plugins/media-base-kit.tsx)

I'll now plan the tasks and create plan.md with required changes. 

Created 2 todos

I'll create plan.md with the detailed plan. 

Created [](file:///d%3A/dev/js/jknm-convex/plan.md)

Completed (1/2) *Create plan.md with comprehensive migration plan*

Added a comprehensive plan.md detailing the finalized migration architecture, cache schemas, Convex mutation additions, UI workflows, phased implementation steps, risks, and acceptance criteria.

## Actions taken
- Created plan.md at repository root with a fully self-contained plan matching your decisions (hardcoded media URLs, IndexedDB-first caching, draft→publish pipeline reuse, staged media status).
- Covered: data layers, mutations to add, per-article flow, button/UX needs, deferred tasks, and a clear iteration roadmap.

## Highlights
- Internal mutation `stage_legacy_media` + (optional) `link_media_to_article`.
- IndexedDB store definitions and wipe/reset semantics.
- Explicit Accept flow vs later post-pass tasks (links, variants, thumbnails).
- Risk table and acceptance criteria so another engineer can execute confidently.

Let me know if you’d like next steps turned into actual code scaffolding (e.g. mutation stubs, IndexedDB helper module, `/converter` UI changes), or if you want a diagram / condensed checklist version.

Made changes.