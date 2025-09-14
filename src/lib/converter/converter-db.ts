/**
 * IndexedDB wrapper for legacy article conversion system
 *
 * Manages persistent caches for:
 * - Legacy articles from articles.json
 * - New article mappings (legacy_id → article_id)
 * - Media cache for staged files
 * - Problems encountered during conversion
 */

import type { Article } from "~/lib/converter/types";

// Database configuration
const DB_NAME = "converter_db";
const DB_VERSION = 1;

// Store names
export const STORES = {
	legacy_articles: "legacy_articles",
	new_articles_cache: "new_articles_cache",
	media_cache: "media_cache",
	problems: "problems",
} as const;

// Type definitions for IndexedDB stores
export interface LegacyArticleEntry {
	legacy_id: number;
	article: Article;
}

export interface NewArticleCacheEntry {
	legacy_id: number;
	article_id: string;
	status: "draft" | "published";
	published_at?: number;
}

export interface MediaCacheEntry {
	legacy_media_key: string;
	media_id: string;
	type: "image" | "document";
	filename: string;
	content_type: string;
	size_bytes?: number;
	base_url: string;
}

export interface ProblemEntry {
	id: string; // UUID
	legacy_id: number;
	kind:
		| "missing_media"
		| "bad_block"
		| "unexpected_link"
		| "invalid_document"
		| "other";
	detail: string;
	media_key?: string;
	timestamp: number;
}

// Database instance management
let db_instance: IDBDatabase | null = null;
let db_promise: Promise<IDBDatabase> | null = null;

/**
 * Initialize the IndexedDB database
 */
export async function init_database(): Promise<IDBDatabase> {
	if (db_instance) {
		return db_instance;
	}

	if (db_promise) {
		return db_promise;
	}

	db_promise = new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			reject(new Error(`Failed to open database: ${request.error?.message}`));
		};

		request.onsuccess = () => {
			db_instance = request.result;
			resolve(db_instance);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;

			// Create legacy_articles store
			if (!db.objectStoreNames.contains(STORES.legacy_articles)) {
				const legacy_store = db.createObjectStore(STORES.legacy_articles, {
					keyPath: "legacy_id",
				});
				legacy_store.createIndex("by_legacy_id", "legacy_id", { unique: true });
			}

			// Create new_articles_cache store
			if (!db.objectStoreNames.contains(STORES.new_articles_cache)) {
				const articles_store = db.createObjectStore(STORES.new_articles_cache, {
					keyPath: "legacy_id",
				});
				articles_store.createIndex("by_legacy_id", "legacy_id", {
					unique: true,
				});
				articles_store.createIndex("by_article_id", "article_id", {
					unique: false,
				});
				articles_store.createIndex("by_status", "status", { unique: false });
			}

			// Create media_cache store
			if (!db.objectStoreNames.contains(STORES.media_cache)) {
				const media_store = db.createObjectStore(STORES.media_cache, {
					keyPath: "legacy_media_key",
				});
				media_store.createIndex("by_legacy_media_key", "legacy_media_key", {
					unique: true,
				});
				media_store.createIndex("by_media_id", "media_id", { unique: false });
				media_store.createIndex("by_type", "type", { unique: false });
			}

			// Create problems store
			if (!db.objectStoreNames.contains(STORES.problems)) {
				const problems_store = db.createObjectStore(STORES.problems, {
					keyPath: "id",
				});
				problems_store.createIndex("by_legacy_id", "legacy_id", {
					unique: false,
				});
				problems_store.createIndex("by_kind", "kind", { unique: false });
				problems_store.createIndex("by_timestamp", "timestamp", {
					unique: false,
				});
			}
		};
	});

	return db_promise;
}

/**
 * Close the database connection
 */
export function close_database(): void {
	if (db_instance) {
		db_instance.close();
		db_instance = null;
		db_promise = null;
	}
}

/**
 * Clear all stores and reset the database
 */
export async function wipe_all_stores(): Promise<void> {
	const db = await init_database();

	const transaction = db.transaction(Object.values(STORES), "readwrite");

	const promises = Object.values(STORES).map((store_name) => {
		const store = transaction.objectStore(store_name);
		return new Promise<void>((resolve, reject) => {
			const request = store.clear();
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	});

	await Promise.all(promises);
}

/**
 * Generic transaction helper
 */
async function perform_transaction<T>(
	store_names: string | string[],
	mode: IDBTransactionMode,
	operation: (stores: IDBObjectStore | IDBObjectStore[]) => Promise<T> | T,
): Promise<T> {
	const db = await init_database();
	const transaction = db.transaction(store_names, mode);

	const stores_arr = Array.isArray(store_names)
		? store_names.map((name) => transaction.objectStore(name))
		: transaction.objectStore(store_names);

	return operation(stores_arr);
}

// Legacy Articles CRUD operations
export async function load_legacy_articles(articles: Article[]): Promise<void> {
	await perform_transaction(
		STORES.legacy_articles,
		"readwrite",
		async (store) => {
			const object_store = store as IDBObjectStore;

			for (const article of articles) {
				const entry: LegacyArticleEntry = {
					legacy_id: article.old_id,
					article,
				};

				await new Promise<void>((resolve, reject) => {
					const request = object_store.put(entry);
					request.onsuccess = () => resolve();
					request.onerror = () => reject(request.error);
				});
			}
		},
	);
}

export async function get_legacy_article(
	legacy_id: number,
): Promise<Article | null> {
	return perform_transaction(
		STORES.legacy_articles,
		"readonly",
		async (store) => {
			const object_store = store as IDBObjectStore;

			return new Promise<Article | null>((resolve, reject) => {
				const request = object_store.get(legacy_id);
				request.onsuccess = () => {
					const entry = request.result as LegacyArticleEntry | undefined;
					resolve(entry?.article || null);
				};
				request.onerror = () => reject(request.error);
			});
		},
	);
}

export async function get_all_legacy_articles(): Promise<Article[]> {
	return perform_transaction(
		STORES.legacy_articles,
		"readonly",
		async (store) => {
			const object_store = store as IDBObjectStore;

			return new Promise<Article[]>((resolve, reject) => {
				const request = object_store.getAll();
				request.onsuccess = () => {
					const entries = request.result as LegacyArticleEntry[];
					resolve(entries.map((entry) => entry.article));
				};
				request.onerror = () => reject(request.error);
			});
		},
	);
}

// New Articles Cache CRUD operations
export async function put_article_mapping(
	legacy_id: number,
	article_id: string,
	status: "draft" | "published",
	published_at?: number,
): Promise<void> {
	await perform_transaction(
		STORES.new_articles_cache,
		"readwrite",
		async (store) => {
			const object_store = store as IDBObjectStore;

			const entry: NewArticleCacheEntry = {
				legacy_id,
				article_id,
				status,
				published_at,
			};

			await new Promise<void>((resolve, reject) => {
				const request = object_store.put(entry);
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			});
		},
	);
}

export async function get_article_mapping(
	legacy_id: number,
): Promise<NewArticleCacheEntry | null> {
	return perform_transaction(
		STORES.new_articles_cache,
		"readonly",
		async (store) => {
			const object_store = store as IDBObjectStore;

			return new Promise<NewArticleCacheEntry | null>((resolve, reject) => {
				const request = object_store.get(legacy_id);
				request.onsuccess = () => resolve(request.result || null);
				request.onerror = () => reject(request.error);
			});
		},
	);
}

export async function get_all_article_mappings(): Promise<
	NewArticleCacheEntry[]
> {
	return perform_transaction(
		STORES.new_articles_cache,
		"readonly",
		async (store) => {
			const object_store = store as IDBObjectStore;

			return new Promise<NewArticleCacheEntry[]>((resolve, reject) => {
				const request = object_store.getAll();
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
		},
	);
}

// Media Cache CRUD operations
export async function put_media_entry(entry: MediaCacheEntry): Promise<void> {
	await perform_transaction(STORES.media_cache, "readwrite", async (store) => {
		const object_store = store as IDBObjectStore;

		await new Promise<void>((resolve, reject) => {
			const request = object_store.put(entry);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	});
}

export async function get_media_entry(
	legacy_media_key: string,
): Promise<MediaCacheEntry | null> {
	return perform_transaction(STORES.media_cache, "readonly", async (store) => {
		const object_store = store as IDBObjectStore;

		return new Promise<MediaCacheEntry | null>((resolve, reject) => {
			const request = object_store.get(legacy_media_key);
			request.onsuccess = () => resolve(request.result || null);
			request.onerror = () => reject(request.error);
		});
	});
}

export async function get_all_media_entries(): Promise<MediaCacheEntry[]> {
	return perform_transaction(STORES.media_cache, "readonly", async (store) => {
		const object_store = store as IDBObjectStore;

		return new Promise<MediaCacheEntry[]>((resolve, reject) => {
			const request = object_store.getAll();
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	});
}

// Problems CRUD operations
export async function record_problem(
	legacy_id: number,
	kind: ProblemEntry["kind"],
	detail: string,
	media_key?: string,
): Promise<void> {
	await perform_transaction(STORES.problems, "readwrite", async (store) => {
		const object_store = store as IDBObjectStore;

		const entry: ProblemEntry = {
			id: crypto.randomUUID(),
			legacy_id,
			kind,
			detail,
			media_key,
			timestamp: Date.now(),
		};

		await new Promise<void>((resolve, reject) => {
			const request = object_store.put(entry);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	});
}

export async function get_problems_for_article(
	legacy_id: number,
): Promise<ProblemEntry[]> {
	return perform_transaction(STORES.problems, "readonly", async (store) => {
		const object_store = store as IDBObjectStore;
		const index = object_store.index("by_legacy_id");

		return new Promise<ProblemEntry[]>((resolve, reject) => {
			const request = index.getAll(legacy_id);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	});
}

export async function get_all_problems(): Promise<ProblemEntry[]> {
	return perform_transaction(STORES.problems, "readonly", async (store) => {
		const object_store = store as IDBObjectStore;

		return new Promise<ProblemEntry[]>((resolve, reject) => {
			const request = object_store.getAll();
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	});
}

export async function get_problems_by_kind(
	kind: ProblemEntry["kind"],
): Promise<ProblemEntry[]> {
	return perform_transaction(STORES.problems, "readonly", async (store) => {
		const object_store = store as IDBObjectStore;
		const index = object_store.index("by_kind");

		return new Promise<ProblemEntry[]>((resolve, reject) => {
			const request = index.getAll(kind);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	});
}

export async function clear_problems_for_article(
	legacy_id: number,
): Promise<void> {
	const problems_arr = await get_problems_for_article(legacy_id);

	await perform_transaction(STORES.problems, "readwrite", async (store) => {
		const object_store = store as IDBObjectStore;

		const promises = problems_arr.map(
			(problem) =>
				new Promise<void>((resolve, reject) => {
					const request = object_store.delete(problem.id);
					request.onsuccess = () => resolve();
					request.onerror = () => reject(request.error);
				}),
		);

		await Promise.all(promises);
	});
}

// Utility functions for media key normalization
export function normalize_legacy_media_key(path: string): string {
	return path
		.replace(/\\/g, "/") // Convert Windows backslashes to forward slashes
		.replace(/\/+/g, "/") // Remove duplicate slashes
		.replace(/^\/+/, "/"); // Ensure single leading slash
}

// Export/Import functionality for disk snapshots
export interface DatabaseSnapshot {
	version: number;
	timestamp: number;
	legacy_articles: LegacyArticleEntry[];
	new_articles_cache: NewArticleCacheEntry[];
	media_cache: MediaCacheEntry[];
	problems: ProblemEntry[];
}

export async function export_database(): Promise<DatabaseSnapshot> {
	const [legacy_articles, new_articles_cache, media_cache, problems] =
		await Promise.all([
			perform_transaction(STORES.legacy_articles, "readonly", async (store) => {
				const object_store = store as IDBObjectStore;
				return new Promise<LegacyArticleEntry[]>((resolve, reject) => {
					const request = object_store.getAll();
					request.onsuccess = () => resolve(request.result);
					request.onerror = () => reject(request.error);
				});
			}),
			get_all_article_mappings(),
			get_all_media_entries(),
			get_all_problems(),
		]);

	return {
		version: DB_VERSION,
		timestamp: Date.now(),
		legacy_articles,
		new_articles_cache,
		media_cache,
		problems,
	};
}

export async function import_database(
	snapshot: DatabaseSnapshot,
): Promise<void> {
	// Validate version compatibility
	if (snapshot.version !== DB_VERSION) {
		throw new Error(
			`Snapshot version ${snapshot.version} is incompatible with current version ${DB_VERSION}`,
		);
	}

	// Clear existing data
	await wipe_all_stores();

	// Import data
	await perform_transaction(
		Object.values(STORES),
		"readwrite",
		async (stores_arr) => {
			const [legacy_store, articles_store, media_store, problems_store] =
				stores_arr as IDBObjectStore[];

			// Import legacy articles
			for (const entry of snapshot.legacy_articles) {
				await new Promise<void>((resolve, reject) => {
					const request = legacy_store.put(entry);
					request.onsuccess = () => resolve();
					request.onerror = () => reject(request.error);
				});
			}

			// Import article mappings
			for (const entry of snapshot.new_articles_cache) {
				await new Promise<void>((resolve, reject) => {
					const request = articles_store.put(entry);
					request.onsuccess = () => resolve();
					request.onerror = () => reject(request.error);
				});
			}

			// Import media cache
			for (const entry of snapshot.media_cache) {
				await new Promise<void>((resolve, reject) => {
					const request = media_store.put(entry);
					request.onsuccess = () => resolve();
					request.onerror = () => reject(request.error);
				});
			}

			// Import problems
			for (const entry of snapshot.problems) {
				await new Promise<void>((resolve, reject) => {
					const request = problems_store.put(entry);
					request.onsuccess = () => resolve();
					request.onerror = () => reject(request.error);
				});
			}
		},
	);
}
