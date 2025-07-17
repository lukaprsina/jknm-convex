"use node";

import sharp from "sharp";
import { internalAction } from "./_generated/server";
import { media_validator } from "./schema";

export const optimize_image = internalAction({
	args: { image: media_validator },
	handler: async (_ctx, args) => {
		const semiTransparentRedPng = await sharp({
			create: {
				width: 48,
				height: 48,
				channels: 4,
				background: { r: 255, g: 0, b: 0, alpha: 0.5 },
			},
		})
			.png()
			.toBuffer();

		console.log(
			"optimize_image",
			semiTransparentRedPng.BYTES_PER_ELEMENT,
			args.image,
		);
	},
});
