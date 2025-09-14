#!/usr/bin/env node
/*
  Fetch missing legacy media referenced in converter/problems.json

  Behavior:
  - Read converter/problems.json and converter/legacy_articles.json
  - Filter problems to kind === 'missing_media'
  - For each problem: extract image_name from media_key (shape: `${old_article_slug}/${image_name}`)
  - Find the article index by matching Article.old_id === legacy_id
  - Use article.created_at to determine year
  - Build URL: `https://www.jknm.si/media/img/novice/${year}/${legacy_id}/${image_name}`
  - encodeURI() the URL and fetch it
  - Throttle requests to 1 second apart
  - Throw if any fetch returns a non-200 status

  Usage: run with ts-node or compile with tsc. On Windows pwsh use: node .\scripts\staged_media.js
*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProblemEntry } from "~/lib/converter/converter-db";

type Article = {
	id: number;
	old_id: number | null;
	title: string;
	url: string;
	created_at: string | number; // may be ISO string or epoch
	updated_at?: string | number;
	// ...other fields omitted
};

function sleep(ms: number) {
	return new Promise((res) => setTimeout(res, ms));
}

async function main() {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const repoRoot = path.resolve(__dirname, "..");

	const problemsPath = path.join(repoRoot, "converter", "problems.json");
	const articlesPath = path.join(repoRoot, "converter", "legacy_articles.json");

	if (!fs.existsSync(problemsPath)) {
		throw new Error(`Missing file: ${problemsPath}`);
	}
	if (!fs.existsSync(articlesPath)) {
		throw new Error(`Missing file: ${articlesPath}`);
	}

	const problemsRaw = fs.readFileSync(problemsPath, "utf-8");
	const articlesRaw = fs.readFileSync(articlesPath, "utf-8");

	let problems: ProblemEntry[];
	let articles: Article[];

	try {
		problems = JSON.parse(problemsRaw) as ProblemEntry[];
	} catch (e) {
		throw new Error(`Failed to parse ${problemsPath}: ${String(e)}`);
	}

	try {
		articles = JSON.parse(articlesRaw) as Article[];
	} catch (e) {
		throw new Error(`Failed to parse ${articlesPath}: ${String(e)}`);
	}

	const missing = problems.filter((p) => p.kind === "missing_media");

	console.log(
		`Found ${missing.length} missing_media problems our of ${problems.length} total problems.`,
	);

	// Helper to find an article by old_id and return the Article or null
	function findArticleByOldId(old_id: number): Article | null {
		return articles.find((a) => a.old_id === old_id) || null;
	}

	for (let i = 0; i < missing.length; i++) {
		const p = missing[i];

		if (!p.media_key) {
			throw new Error(`Problem ${p.id} missing media_key`);
		}

		// media_key shape: `${old_article_slug}/${image_name}` — we need image_name (last segment)
		const parts = p.media_key.split("/");
		const image_name = parts.slice(-1)[0];

		if (!image_name) {
			throw new Error(
				`Could not extract image_name from media_key '${p.media_key}' for problem ${p.id}`,
			);
		}

		const legacy_id = p.legacy_id;

		const article = findArticleByOldId(legacy_id);
		if (!article) {
			throw new Error(
				`Article with old_id ${legacy_id} not found (problem ${p.id})`,
			);
		}

		// created_at might be a string or number; ensure we can get year
		const created_at_val = article.created_at;
		let created_date: Date;
		if (typeof created_at_val === "number") {
			// assume epoch ms
			created_date = new Date(created_at_val);
		} else {
			// try Date parse
			created_date = new Date(created_at_val);
		}

		if (Number.isNaN(created_date.getTime())) {
			throw new Error(
				`Invalid created_at for article old_id ${legacy_id}: ${article.created_at}`,
			);
		}

		const year = created_date.getFullYear();

		const rawUrl = `https://www.jknm.si/media/img/novice/${year}/${legacy_id}/${image_name}`;
		const url = encodeURI(rawUrl);

		console.log(`[${i + 1}/${missing.length}] Fetching ${url}`);

		const res = await fetch(url);

		if (res.status !== 200) {
			throw new Error(`Fetch failed for ${url}: status ${res.status}`);
		}

		console.log(`OK ${url}`);

		// throttle 1s between requests, but skip waiting after the last one
		if (i < missing.length - 1) {
			await sleep(1000);
		}
	}

	console.log(
		"All missing media fetched successfully (all returned 200). Done.",
	);
}

// bun run .\scripts\staged_media.ts
main().catch((err) => {
	console.error(err);
	process.exit(1);
});
