import { promises as fs } from "node:fs";

type LinkToIdMap = Record<string, string[]>;

export interface LinksType {
	absolute_urls: LinkToIdMap;
	cdn_urls: LinkToIdMap;
	article_links: LinkToIdMap;
	relative_links: LinkToIdMap;
}

async function main() {
	const input_path = "converter/links.json";
	const output_path = "converter/links_deduped.json";

	const raw = await fs.readFile(input_path, "utf8");
	const data = JSON.parse(raw) as LinksType;

	// Deduplicate links
	const deduped: LinksType = {
		absolute_urls: deduplicateLinks(data.absolute_urls),
		cdn_urls: deduplicateLinks(data.cdn_urls),
		article_links: deduplicateLinks(data.article_links),
		relative_links: deduplicateLinks(data.relative_links),
	};

	// Write deduplicated links to output file
	await fs.writeFile(output_path, JSON.stringify(deduped, null, 2));
}

main();

function deduplicateLinks(absolute_urls: LinkToIdMap): LinkToIdMap {
	const deduped: LinkToIdMap = {};
	for (const [url, ids] of Object.entries(absolute_urls)) {
		deduped[url] = Array.from(new Set(ids));
	}
	return deduped;
}
