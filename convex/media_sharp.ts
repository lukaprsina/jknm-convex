"use node";

import sharp from "sharp";
import { internalAction } from "./_generated/server";
import { media_validator } from "./schema";

export const optimize_image = internalAction({
	args: {
		image: media_validator,
	},
	handler(_ctx, _args) {
		// Optimize the image using a third-party service
		// This is just a placeholder implementation

		const image = sharp(
			"https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Example_image.svg/600px-Example_image.svg.png",
		);
		console.log("Optimizing image:", image.metadata());
	},
});
