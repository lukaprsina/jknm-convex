import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const problematicPackages = [
	"@platejs/math",
	"react-lite-youtube-embed",
	"react-tweet",
	"katex", // KaTeX CSS is often problematic too
];

/*
This plugin ignores CSS files from specific packages in the SSR build which causes an "unknown extension error".
The offending packages are: @platejs/math, react-lite-youtube-embed, react-tweet
*/
/* function ssrIgnoreCss(): Plugin {
	return {
		name: "ssr-ignore-css",
		load(id, options) {
			if (options?.ssr && id.endsWith(".css")) {
				// Only ignore CSS from problematic packages, allow Tailwind and other CSS through
				if (problematicPackages.some(pkg => id.includes(pkg))) {
					return "";
				}
			}
		},
	};
} */

export default defineConfig({
	ssr: {
		noExternal: problematicPackages,
	},
	optimizeDeps: {
		exclude: ["@tanstack/react-router-devtools"], // warning when running dev server
	},
	preview: {
		port: 3000,
		// host: true,
		allowedHosts: [".jknm.site"],
		// allowedHosts: true,
	},
	server: {
		host: true,
		port: 3000,
		allowedHosts: [".jknm.site"],
		// allowedHosts: true,
	},
	plugins: [tailwindcss(), tsConfigPaths(), tanstackStart(), viteReact()],
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "./src"),
			"@convex": path.resolve(__dirname, "./convex"),
		},
	},
});
