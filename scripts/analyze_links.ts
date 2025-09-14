import { promises as fs } from "node:fs";

type LinkToIdMap = Record<string, string[]>;

export interface LinksType {
	absolute_urls: LinkToIdMap;
	cdn_urls: LinkToIdMap;
	article_links: LinkToIdMap;
	relative_links: LinkToIdMap;
}

const MEDIA_DIRECTORY = "D:/misc/JKNM/served/media";

function normalize_filename(filename: string): string {
	// Replace multiple underscores with a single underscore
	return filename.replace(/_+/g, "_").toLowerCase();
}

async function main() {
	const input_path = "converter/links_deduped.json";

	const raw = await fs.readFile(input_path, "utf8");
	const data = JSON.parse(raw) as LinksType;

	// Get maps of filenames -> absolute path in MEDIA_DIRECTORY/pdf and MEDIA_DIRECTORY/DK
	const pdf_dir = `${MEDIA_DIRECTORY}/pdf`;
	const pdf_map = await walk_and_map_files(pdf_dir);

	// Get all filenames in MEDIA_DIRECTORY/DK
	const dk_dir = `${MEDIA_DIRECTORY}/DK`;
	const dk_map = await walk_and_map_files(dk_dir);

	// Result map: url -> absolute path
	const link_map: Record<string, string> = {};
	const full_urls: LinkToIdMap = {};

	// Resolve absolute_urls (only CDN S3 links)
	for (const [url, ids] of Object.entries(data.absolute_urls)) {
		if (!url.includes(".amazonaws.com")) {
			full_urls[url] = ids;
			continue; // only check CDN URLs
		}
		// strip query string or fragment from last path segment
		const raw_last = url.split("/").slice(-1)[0].split(/[?#]/)[0];
		const filename = normalize_filename(raw_last);

		const in_pdf = pdf_map.has(filename);
		const in_dk = dk_map.has(filename);

		const matches = (in_pdf ? 1 : 0) + (in_dk ? 1 : 0);
		if (matches === 0) {
			console.warn(`No match for URL ${url} (filename=${filename})`);
			continue;
		}
		if (matches > 1) {
			throw new Error(
				`Expected exactly one match for URL ${url} (filename=${filename}), found ${matches}`,
			);
		}

		if (in_pdf) {
			link_map[url] = pdf_map.get(filename)!;
		} else {
			link_map[url] = dk_map.get(filename)!;
		}
	}

	// Recursively walk through MEDIA_DIRECTORY/img/novice
	const img_novice_dir = `${MEDIA_DIRECTORY}/img/novice`;
	const filename_to_path_map = await walk_and_map_files(img_novice_dir);

	// Resolve cdn_urls
	for (const [url] of Object.entries(data.cdn_urls)) {
		const raw_last = url.split("/").slice(-1)[0].split(/[?#]/)[0];
		const filename = normalize_filename(raw_last);

		const in_pdf = pdf_map.has(filename);
		const in_dk = dk_map.has(filename);
		const img_path = filename_to_path_map.get(filename);

		const matches = (in_pdf ? 1 : 0) + (in_dk ? 1 : 0) + (img_path ? 1 : 0);
		if (matches !== 1) {
			throw new Error(
				`Expected exactly one match for URL ${url} (filename=${filename}), found ${matches}`,
			);
		}

		if (in_pdf) {
			link_map[url] = pdf_map.get(filename)!;
		} else if (in_dk) {
			link_map[url] = dk_map.get(filename)!;
		} else {
			link_map[url] = img_path!;
		}
	}

	// Write mapping to file
	const out_path = "converter/link_map.json";
	await fs.writeFile(out_path, JSON.stringify(link_map, null, 2), "utf8");
	console.log(`Wrote ${Object.keys(link_map).length} mappings to ${out_path}`);

	// Write full URLs to file
	const full_out_path = "converter/full_urls.json";
	await fs.writeFile(full_out_path, JSON.stringify(full_urls, null, 2), "utf8");
	console.log(
		`Wrote ${Object.keys(full_urls).length} full URLs to ${full_out_path}`,
	);
}

main();

/**
 * Recursively walks through a directory and returns a Map where
 * key = filename, value = absolute path.
 */
async function walk_and_map_files(
	dir_path: string,
): Promise<Map<string, string>> {
	const result = new Map<string, string>();
	async function walk(current_dir: string) {
		const entries = await fs.readdir(current_dir, { withFileTypes: true });
		for (const entry of entries) {
			const abs_path = `${current_dir}/${entry.name}`;
			if (entry.isDirectory()) {
				await walk(abs_path);
			} else {
				const filename = normalize_filename(entry.name);
				result.set(filename, abs_path);
			}
		}
	}
	await walk(dir_path);
	return result;
}

/* 
bun run .\scripts\analyze_links.ts
No match for URL http://www.jknm.sihttps//jknm.s3.eu-central-1.amazonaws.com/kocevski-rog-je-ociscen-pnevmatik-05-06-2022/si (filename=si)
No match for URL https://https//jknm.s3.eu-central-1.amazonaws.com/kocevski-rog-je-ociscen-pnevmatik-05-06-2022/sidg.si/ (filename=)
No match for URL https://www.jknm.sihttps//jknm.s3.eu-central-1.amazonaws.com/studenti-biologije-na-obisku-pri-letecih-dolenjcih-16-01-2024/dk8_43_presetnik_hudoklin_tri_desetletja_spremljanja_zatocisc_netopirjev.pdf (filename=dk8_43_presetnik_hudoklin_tri_desetletja_spremljanja_zatocisc_netopirjev.pdf)
Wrote 69 mappings to converter/link_map.json
*/

/* 
Missing URLs:
  link to an image 606
  http://www.jknm.sihttps//jknm.s3.eu-central-1.amazonaws.com/kocevski-rog-je-ociscen-pnevmatik-05-06-2022/si
  https://https//jknm.s3.eu-central-1.amazonaws.com/kocevski-rog-je-ociscen-pnevmatik-05-06-2022/sidg.si/
*/
