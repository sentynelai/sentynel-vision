import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      stream: 'stream-browserify/index.js',
      buffer: 'buffer',
      process: 'process/browser'
    }
  },
  define: {
    global: 'globalThis',
    'process.env': process.env,
    'process.browser': true
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
      platform: 'browser'
    },
    include: ['buffer', 'stream-browserify', 'inherits', 'process']
  },
  server: {
    // Enable SPA fallback for development server
    historyApiFallback: {
      disableDotRule: true,
      rewrites: [
        { from: /^\/c\/.*$/, to: '/index.html' },
        { from: /./, to: '/index.html' }
      ]
    },
    proxy: {
      // Proxy /c/ paths to handle camera connections in development
      '/c': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': [
            'vue',
            'vue-router',
            'pinia',
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
            'firebase/analytics'
          ]
        }
      }
    }
  }
})