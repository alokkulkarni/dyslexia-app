import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Note: Vite 8 uses rolldown + oxc (not Rollup/esbuild).
//   • manualChunks must be a function (not an object) in rolldown.
//   • console/debugger stripping is handled by oxc's minifier automatically.
export default defineConfig({
  plugins: [react()],

  build: {
    target: 'es2020',
    sourcemap: false,       // no source maps in prod
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // Split react/react-dom into a long-lived vendor chunk
        manualChunks(id) {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'react-vendor';
          }
        },
        chunkFileNames:  'assets/[name]-[hash].js',
        entryFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash][extname]',
      },
    },
  },
})
