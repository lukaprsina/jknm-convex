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
		host: true, // This enables listening on all network interfaces
		allowedHosts: [".jknm.site", ".jknm.org"],
		// allowedHosts: true,
	},
	server: {
		// Also add this for development server
		host: true, // This enables listening on all network interfaces
		port: 3000,
		allowedHosts: [".jknm.site", ".jknm.org"],
		// allowedHosts: true,
	},
	plugins: [
		tailwindcss(),
		tsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
		tanstackStart(),
		viteReact(),
	],
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "./src"),
			"@convex": path.resolve(__dirname, "./convex"),
		},
	},
	/* build: {
		rollupOptions: {
			// temp fix: https://github.com/rollup/rollup/issues/6012
			treeshake: false,
		},
	}, */
});
