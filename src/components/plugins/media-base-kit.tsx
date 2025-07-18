import type { Id } from "@convex/_generated/dataModel";
import { BaseCaptionPlugin } from "@platejs/caption";
import {
	BaseAudioPlugin,
	BaseFilePlugin,
	BaseImagePlugin,
	BaseMediaEmbedPlugin,
	BasePlaceholderPlugin,
	BaseVideoPlugin,
} from "@platejs/media";
import { KEYS } from "platejs";

import { AudioElementStatic } from "~/components/plate-ui/media-audio-node-static";
import { FileElementStatic } from "~/components/plate-ui/media-file-node-static";
import { ImageElementStatic } from "~/components/plate-ui/media-image-node-static";
import { VideoElementStatic } from "~/components/plate-ui/media-video-node-static";

export const ExtendedBasePlaceholderPlugin = BasePlaceholderPlugin.extend(
	() => ({
		options: {
			media_db_id: undefined as Id<"media"> | undefined,
		},
	}),
);

export const BaseMediaKit = [
	BaseImagePlugin.withComponent(ImageElementStatic),
	BaseVideoPlugin.withComponent(VideoElementStatic),
	BaseAudioPlugin.withComponent(AudioElementStatic),
	BaseFilePlugin.withComponent(FileElementStatic),
	BaseCaptionPlugin.configure({
		options: {
			query: {
				allow: [KEYS.img, KEYS.video, KEYS.audio, KEYS.file, KEYS.mediaEmbed],
			},
		},
	}),
	BaseMediaEmbedPlugin,
	// ExtendedBasePlaceholderPlugin,
	BasePlaceholderPlugin,
];
