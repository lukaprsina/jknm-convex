import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Article } from "../src/lib/converter/types";

const IN_PATH = path.resolve("src", "content", "articles.json");
const OUT_PATH = path.resolve("src", "content", "new_articles.json");

async function main() {
	const raw = await readFile(IN_PATH, "utf8");
	const articles = JSON.parse(raw) as Article[];

	if (!Array.isArray(articles)) {
		throw new Error("Input file does not contain an array of articles");
	}

	// Find the last index where old_id is not null
	let lastNonNullIdx = -1;
	for (let i = 0; i < articles.length; i++) {
		if (articles[i].old_id !== null) lastNonNullIdx = i;
	}

	if (lastNonNullIdx === -1) {
		throw new Error("No articles with non-null old_id found");
	}

	const lastOldId = articles[lastNonNullIdx].old_id;
	if (lastOldId !== 657) {
		throw new Error(
			`Expectation failed: expected last non-null old_id to be 657, but found ${lastOldId} at index ${lastNonNullIdx}`,
		);
	}

	// Ensure every article after lastNonNullIdx has old_id === null
	for (let i = lastNonNullIdx + 1; i < articles.length; i++) {
		if (articles[i].old_id !== null) {
			throw new Error(
				`Expectation failed: found non-null old_id ${articles[i].old_id} at index ${i} after index ${lastNonNullIdx}`,
			);
		}
	}

	// Assign sequential old_id values starting from 658 to entries with null old_id
	let nextId = 658;
	const updated = articles.map((a) => {
		if (a.old_id === null) {
			return { ...a, old_id: nextId++ } as Article;
		}
		return a;
	});

	await writeFile(OUT_PATH, JSON.stringify(updated, null, 2), "utf8");
	console.log(
		`Wrote ${updated.length} articles to ${OUT_PATH}. Assigned ${nextId - 658} ids starting at 658.`,
	);
}

if (import.meta.main) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
