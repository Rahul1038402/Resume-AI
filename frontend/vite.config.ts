import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // Bundle report, off by default. It used to run on every build with
    // open: true, which popped a browser tab on each compile and shipped
    // dist/stats.html to production. `npm run build:analyze` turns it on -
    // a --mode flag rather than an env var, because inline env assignment
    // does not work in the cmd shell npm uses on Windows.
    mode === 'analyze' &&
      visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    mode === 'development' && (() => {
      try {
        const { componentTagger } = require("lovable-tagger");
        return componentTagger();
      } catch (e) {
        console.warn('lovable-tagger not available, skipping...');
        return null;
      }
    })(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // React Query
          'query-vendor': ['@tanstack/react-query'],
          
          // UI libraries
          'ui-vendor': ['lucide-react'],
          
          // Radix UI components
          'radix-vendor': [
            '@radix-ui/react-label',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],
          
          // Analytics (separate since it's non-critical)
          'analytics': ['@vercel/analytics'],
        },
      },
    },
    // Adjust chunk size warning limit
    chunkSizeWarningLimit: 600,
    
    // Enable minification (terser is more aggressive than esbuild)
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },
  },
}));