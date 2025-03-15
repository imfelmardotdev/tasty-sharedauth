import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  build: {
    target: 'esnext',
    modulePreload: {
      polyfill: true
    },
    sourcemap: false,
    reportCompressedSize: false,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  optimizeDeps: {
    include: [
      'zod',
      'react',
      'react-dom',
      'react-router-dom',
      '@hookform/resolvers/zod',
      'react-hook-form',
      '@supabase/supabase-js'
    ],
    esbuildOptions: {
      target: 'es2020',
      supported: { 
        'top-level-await': true 
      },
    }
  },
  plugins: [
    react(),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  server: {
    host: true, // This enables listening on all addresses
    cors: true, // Enable CORS
    strictPort: true, // Fail if port is already in use
    port: 5173,
    hmr: {
      host: 'localhost',
      port: 5173,
    },
    watch: {
      usePolling: true,
    },
  }
});
