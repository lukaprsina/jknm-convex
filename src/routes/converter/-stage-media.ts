import { basename, extname } from "~/lib/browser-path";
import {
	getMediaEntry,
	normalizeLegacyMediaKey,
	putMediaEntry,
} from "~/lib/converter-db";

export async function stage_media(
	imgUrl: string,
	legacyId: number,
	order: number,
): Promise<string> {
	// Normalize the legacy media key
	let legacyMediaKey: string;
	try {
		const url = new URL(imgUrl);
		legacyMediaKey = normalizeLegacyMediaKey(url.pathname);
	} catch {
		// If it's not a URL, treat it as a path
		legacyMediaKey = normalizeLegacyMediaKey(imgUrl);
	}

	// Check if media is already cached
	const existingMedia = await getMediaEntry(legacyMediaKey);
	if (existingMedia) {
		return `${existingMedia.base_url}/original${extname(existingMedia.filename)}`;
	}

	// TODO: This is where we would:
	// 1. Check if file exists in OLD_MEDIA_DIRECTORY + legacyMediaKey
	// 2. Call the convex stage_legacy_media mutation
	// 3. Copy file to NEW_MEDIA_DIRECTORY/<media_id>/original<ext>
	// 4. Store in media cache
	// 5. Call link_media_to_article mutation

	// For now, return a placeholder URL that follows the final pattern
	const mockMediaId = `media_${legacyId}_${order}`;
	const ext = extname(legacyMediaKey) || ".jpg";
	const finalUrl = `https://gradivo.jknm.site/${mockMediaId}/original${ext}`;

	// Cache this for consistency
	await putMediaEntry({
		legacy_media_key: legacyMediaKey,
		media_id: mockMediaId,
		type: "image",
		filename: basename(legacyMediaKey),
		content_type: "image/jpeg", // TODO: infer from extension
		base_url: `https://gradivo.jknm.site/${mockMediaId}`,
	});

	return finalUrl;
}
