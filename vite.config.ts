import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  optimizeDeps: {
    exclude:
      [
        "D:/dev/js/jknm-convex/node_modules/.vite/deps/FloatingTanStackRouterDevtools-O3GU54LF.js?v=d4ea31ab"
      ]
  },
  server: {
    port: 3000,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart(),
  ],
})
