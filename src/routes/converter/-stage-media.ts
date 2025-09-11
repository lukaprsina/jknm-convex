import { basename, extname } from "~/lib/browser-path";
import {
	get_media_entry,
	normalize_legacy_media_key,
	put_media_entry,
} from "~/lib/converter-db";

export async function stage_media(
	img_url: string,
	legacy_id: number,
	order: number,
): Promise<string> {
	// Normalize the legacy media key
	let legacy_media_key: string;
	try {
		const url = new URL(img_url);
		legacy_media_key = normalize_legacy_media_key(url.pathname);
	} catch {
		// If it's not a URL, treat it as a path
		legacy_media_key = normalize_legacy_media_key(img_url);
	}

	// Check if media is already cached
	const existing_media = await get_media_entry(legacy_media_key);
	if (existing_media) {
		return `${existing_media.base_url}/original${extname(existing_media.filename)}`;
	}

	// TODO: This is where we would:
	// 1. Check if file exists in OLD_MEDIA_DIRECTORY + legacyMediaKey
	// 2. Call the convex stage_legacy_media mutation
	// 3. Copy file to NEW_MEDIA_DIRECTORY/<media_id>/original<ext>
	// 4. Store in media cache
	// 5. Call link_media_to_article mutation

	// For now, return a placeholder URL that follows the final pattern
	const mock_media_id = `media_${legacy_id}_${order}`;
	const ext = extname(legacy_media_key) || ".jpg";
	const final_url = `https://gradivo.jknm.site/${mock_media_id}/original${ext}`;

	// Cache this for consistency
	await put_media_entry({
		legacy_media_key: legacy_media_key,
		media_id: mock_media_id,
		type: "image",
		filename: basename(legacy_media_key),
		content_type: "image/jpeg", // TODO: infer from extension
		base_url: `https://gradivo.jknm.site/${mock_media_id}`,
	});

	return final_url;
}
