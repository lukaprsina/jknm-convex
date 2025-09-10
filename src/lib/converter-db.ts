/**
 * IndexedDB wrapper for legacy article conversion system
 *
 * Manages persistent caches for:
 * - Legacy articles from articles.json
 * - New article mappings (legacy_id → article_id)
 * - Media cache for staged files
 * - Problems encountered during conversion
 */

import type { Article } from "~/routes/converter/-types";

// Database configuration
const DB_NAME = "converter_db";
const DB_VERSION = 1;

// Store names
export const STORES = {
	LEGACY_ARTICLES: "legacy_articles",
	NEW_ARTICLES_CACHE: "new_articles_cache",
	MEDIA_CACHE: "media_cache",
	PROBLEMS: "problems",
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
let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize the IndexedDB database
 */
export async function initDatabase(): Promise<IDBDatabase> {
	if (dbInstance) {
		return dbInstance;
	}

	if (dbPromise) {
		return dbPromise;
	}

	dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			reject(new Error(`Failed to open database: ${request.error?.message}`));
		};

		request.onsuccess = () => {
			dbInstance = request.result;
			resolve(dbInstance);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;

			// Create legacy_articles store
			if (!db.objectStoreNames.contains(STORES.LEGACY_ARTICLES)) {
				const legacyStore = db.createObjectStore(STORES.LEGACY_ARTICLES, {
					keyPath: "legacy_id",
				});
				legacyStore.createIndex("by_legacy_id", "legacy_id", { unique: true });
			}

			// Create new_articles_cache store
			if (!db.objectStoreNames.contains(STORES.NEW_ARTICLES_CACHE)) {
				const articlesStore = db.createObjectStore(STORES.NEW_ARTICLES_CACHE, {
					keyPath: "legacy_id",
				});
				articlesStore.createIndex("by_legacy_id", "legacy_id", {
					unique: true,
				});
				articlesStore.createIndex("by_article_id", "article_id", {
					unique: false,
				});
				articlesStore.createIndex("by_status", "status", { unique: false });
			}

			// Create media_cache store
			if (!db.objectStoreNames.contains(STORES.MEDIA_CACHE)) {
				const mediaStore = db.createObjectStore(STORES.MEDIA_CACHE, {
					keyPath: "legacy_media_key",
				});
				mediaStore.createIndex("by_legacy_media_key", "legacy_media_key", {
					unique: true,
				});
				mediaStore.createIndex("by_media_id", "media_id", { unique: false });
				mediaStore.createIndex("by_type", "type", { unique: false });
			}

			// Create problems store
			if (!db.objectStoreNames.contains(STORES.PROBLEMS)) {
				const problemsStore = db.createObjectStore(STORES.PROBLEMS, {
					keyPath: "id",
				});
				problemsStore.createIndex("by_legacy_id", "legacy_id", {
					unique: false,
				});
				problemsStore.createIndex("by_kind", "kind", { unique: false });
				problemsStore.createIndex("by_timestamp", "timestamp", {
					unique: false,
				});
			}
		};
	});

	return dbPromise;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
	if (dbInstance) {
		dbInstance.close();
		dbInstance = null;
		dbPromise = null;
	}
}

/**
 * Clear all stores and reset the database
 */
export async function wipeAllStores(): Promise<void> {
	const db = await initDatabase();

	const transaction = db.transaction(Object.values(STORES), "readwrite");

	const promises = Object.values(STORES).map((storeName) => {
		const store = transaction.objectStore(storeName);
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
async function performTransaction<T>(
	storeNames: string | string[],
	mode: IDBTransactionMode,
	operation: (stores: IDBObjectStore | IDBObjectStore[]) => Promise<T> | T,
): Promise<T> {
	const db = await initDatabase();
	const transaction = db.transaction(storeNames, mode);

	const stores = Array.isArray(storeNames)
		? storeNames.map((name) => transaction.objectStore(name))
		: transaction.objectStore(storeNames);

	return operation(stores);
}

// Legacy Articles CRUD operations
export async function loadLegacyArticles(articles: Article[]): Promise<void> {
	await performTransaction(
		STORES.LEGACY_ARTICLES,
		"readwrite",
		async (store) => {
			const objectStore = store as IDBObjectStore;

			for (const article of articles) {
				const entry: LegacyArticleEntry = {
					legacy_id: article.id,
					article,
				};

				await new Promise<void>((resolve, reject) => {
					const request = objectStore.put(entry);
					request.onsuccess = () => resolve();
					request.onerror = () => reject(request.error);
				});
			}
		},
	);
}

export async function getLegacyArticle(
	legacy_id: number,
): Promise<Article | null> {
	return performTransaction(
		STORES.LEGACY_ARTICLES,
		"readonly",
		async (store) => {
			const objectStore = store as IDBObjectStore;

			return new Promise<Article | null>((resolve, reject) => {
				const request = objectStore.get(legacy_id);
				request.onsuccess = () => {
					const entry = request.result as LegacyArticleEntry | undefined;
					resolve(entry?.article || null);
				};
				request.onerror = () => reject(request.error);
			});
		},
	);
}

export async function getAllLegacyArticles(): Promise<Article[]> {
	return performTransaction(
		STORES.LEGACY_ARTICLES,
		"readonly",
		async (store) => {
			const objectStore = store as IDBObjectStore;

			return new Promise<Article[]>((resolve, reject) => {
				const request = objectStore.getAll();
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
export async function putArticleMapping(
	legacy_id: number,
	article_id: string,
	status: "draft" | "published",
	published_at?: number,
): Promise<void> {
	await performTransaction(
		STORES.NEW_ARTICLES_CACHE,
		"readwrite",
		async (store) => {
			const objectStore = store as IDBObjectStore;

			const entry: NewArticleCacheEntry = {
				legacy_id,
				article_id,
				status,
				published_at,
			};

			await new Promise<void>((resolve, reject) => {
				const request = objectStore.put(entry);
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			});
		},
	);
}

export async function getArticleMapping(
	legacy_id: number,
): Promise<NewArticleCacheEntry | null> {
	return performTransaction(
		STORES.NEW_ARTICLES_CACHE,
		"readonly",
		async (store) => {
			const objectStore = store as IDBObjectStore;

			return new Promise<NewArticleCacheEntry | null>((resolve, reject) => {
				const request = objectStore.get(legacy_id);
				request.onsuccess = () => resolve(request.result || null);
				request.onerror = () => reject(request.error);
			});
		},
	);
}

export async function getAllArticleMappings(): Promise<NewArticleCacheEntry[]> {
	return performTransaction(
		STORES.NEW_ARTICLES_CACHE,
		"readonly",
		async (store) => {
			const objectStore = store as IDBObjectStore;

			return new Promise<NewArticleCacheEntry[]>((resolve, reject) => {
				const request = objectStore.getAll();
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
		},
	);
}

// Media Cache CRUD operations
export async function putMediaEntry(entry: MediaCacheEntry): Promise<void> {
	await performTransaction(STORES.MEDIA_CACHE, "readwrite", async (store) => {
		const objectStore = store as IDBObjectStore;

		await new Promise<void>((resolve, reject) => {
			const request = objectStore.put(entry);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	});
}

export async function getMediaEntry(
	legacy_media_key: string,
): Promise<MediaCacheEntry | null> {
	return performTransaction(STORES.MEDIA_CACHE, "readonly", async (store) => {
		const objectStore = store as IDBObjectStore;

		return new Promise<MediaCacheEntry | null>((resolve, reject) => {
			const request = objectStore.get(legacy_media_key);
			request.onsuccess = () => resolve(request.result || null);
			request.onerror = () => reject(request.error);
		});
	});
}

export async function getAllMediaEntries(): Promise<MediaCacheEntry[]> {
	return performTransaction(STORES.MEDIA_CACHE, "readonly", async (store) => {
		const objectStore = store as IDBObjectStore;

		return new Promise<MediaCacheEntry[]>((resolve, reject) => {
			const request = objectStore.getAll();
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	});
}

// Problems CRUD operations
export async function recordProblem(
	legacy_id: number,
	kind: ProblemEntry["kind"],
	detail: string,
	media_key?: string,
): Promise<void> {
	await performTransaction(STORES.PROBLEMS, "readwrite", async (store) => {
		const objectStore = store as IDBObjectStore;

		const entry: ProblemEntry = {
			id: crypto.randomUUID(),
			legacy_id,
			kind,
			detail,
			media_key,
			timestamp: Date.now(),
		};

		await new Promise<void>((resolve, reject) => {
			const request = objectStore.put(entry);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	});
}

export async function getProblemsForArticle(
	legacy_id: number,
): Promise<ProblemEntry[]> {
	return performTransaction(STORES.PROBLEMS, "readonly", async (store) => {
		const objectStore = store as IDBObjectStore;
		const index = objectStore.index("by_legacy_id");

		return new Promise<ProblemEntry[]>((resolve, reject) => {
			const request = index.getAll(legacy_id);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	});
}

export async function getAllProblems(): Promise<ProblemEntry[]> {
	return performTransaction(STORES.PROBLEMS, "readonly", async (store) => {
		const objectStore = store as IDBObjectStore;

		return new Promise<ProblemEntry[]>((resolve, reject) => {
			const request = objectStore.getAll();
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	});
}

export async function getProblemsByKind(
	kind: ProblemEntry["kind"],
): Promise<ProblemEntry[]> {
	return performTransaction(STORES.PROBLEMS, "readonly", async (store) => {
		const objectStore = store as IDBObjectStore;
		const index = objectStore.index("by_kind");

		return new Promise<ProblemEntry[]>((resolve, reject) => {
			const request = index.getAll(kind);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	});
}

export async function clearProblemsForArticle(
	legacy_id: number,
): Promise<void> {
	const problems = await getProblemsForArticle(legacy_id);

	await performTransaction(STORES.PROBLEMS, "readwrite", async (store) => {
		const objectStore = store as IDBObjectStore;

		const promises = problems.map(
			(problem) =>
				new Promise<void>((resolve, reject) => {
					const request = objectStore.delete(problem.id);
					request.onsuccess = () => resolve();
					request.onerror = () => reject(request.error);
				}),
		);

		await Promise.all(promises);
	});
}

// Utility functions for media key normalization
export function normalizeLegacyMediaKey(path: string): string {
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

export async function exportDatabase(): Promise<DatabaseSnapshot> {
	const [legacy_articles, new_articles_cache, media_cache, problems] =
		await Promise.all([
			performTransaction(STORES.LEGACY_ARTICLES, "readonly", async (store) => {
				const objectStore = store as IDBObjectStore;
				return new Promise<LegacyArticleEntry[]>((resolve, reject) => {
					const request = objectStore.getAll();
					request.onsuccess = () => resolve(request.result);
					request.onerror = () => reject(request.error);
				});
			}),
			getAllArticleMappings(),
			getAllMediaEntries(),
			getAllProblems(),
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

export async function importDatabase(
	snapshot: DatabaseSnapshot,
): Promise<void> {
	// Validate version compatibility
	if (snapshot.version !== DB_VERSION) {
		throw new Error(
			`Snapshot version ${snapshot.version} is incompatible with current version ${DB_VERSION}`,
		);
	}

	// Clear existing data
	await wipeAllStores();

	// Import data
	await performTransaction(
		Object.values(STORES),
		"readwrite",
		async (stores) => {
			const [legacyStore, articlesStore, mediaStore, problemsStore] =
				stores as IDBObjectStore[];

			// Import legacy articles
			for (const entry of snapshot.legacy_articles) {
				await new Promise<void>((resolve, reject) => {
					const request = legacyStore.put(entry);
					request.onsuccess = () => resolve();
					request.onerror = () => reject(request.error);
				});
			}

			// Import article mappings
			for (const entry of snapshot.new_articles_cache) {
				await new Promise<void>((resolve, reject) => {
					const request = articlesStore.put(entry);
					request.onsuccess = () => resolve();
					request.onerror = () => reject(request.error);
				});
			}

			// Import media cache
			for (const entry of snapshot.media_cache) {
				await new Promise<void>((resolve, reject) => {
					const request = mediaStore.put(entry);
					request.onsuccess = () => resolve();
					request.onerror = () => reject(request.error);
				});
			}

			// Import problems
			for (const entry of snapshot.problems) {
				await new Promise<void>((resolve, reject) => {
					const request = problemsStore.put(entry);
					request.onsuccess = () => resolve();
					request.onerror = () => reject(request.error);
				});
			}
		},
	);
}
