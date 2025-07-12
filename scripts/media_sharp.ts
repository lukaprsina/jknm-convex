"use node";

import { internalAction } from "../convex/_generated/server";
import { media_validator } from "../convex/schema";

export const optimize_image = internalAction({
	args: {
		image: media_validator,
	},
	async handler(_ctx, _args) {
		const { default: sharp } = await import("sharp");
		// Optimize the image using a third-party service
		// This is just a placeholder implementation

		const image = sharp(
			"https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Example_image.svg/600px-Example_image.svg.png",
		);
		console.log("Optimizing image:", image.metadata());
	},
});
