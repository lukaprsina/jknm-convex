import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig, Plugin } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

const problematicPackages = [
	"@platejs/math",
	"react-lite-youtube-embed",
	"react-tweet",
	"katex" // KaTeX CSS is often problematic too
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
	// Set base path for GitHub Pages deployment
	/* base: process.env.NODE_ENV === 'production' ? '/jknm-convex/' : '/',
	build: {
		outDir: 'dist',
	}, */
	ssr: {
		noExternal: problematicPackages,
	},
	optimizeDeps: {
		exclude: ["@tanstack/react-router-devtools"], // warning when running dev server
	},
	server: {
		port: 3000,
	},
	plugins: [
		tailwindcss(),
		tsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
		tanstackStart({
			target: process.env.NODE_ENV === 'production' ?"vercel":"node"
		}),
	],	
});
