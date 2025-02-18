// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import vue from "file:///home/project/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    // Enable SPA fallback for development server
    historyApiFallback: {
      disableDotRule: true,
      rewrites: [
        { from: /^\/c\/.*$/, to: "/index.html" },
        { from: /./, to: "/index.html" }
      ]
    },
    proxy: {
      // Proxy /c/ paths to handle camera connections in development
      "/c": {
        target: "http://localhost:5173",
        changeOrigin: true,
        rewrite: (path2) => path2
      }
    }
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor": [
            "vue",
            "vue-router",
            "pinia",
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/storage",
            "firebase/analytics"
          ]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbdnVlKCldLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJylcbiAgICB9XG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIC8vIEVuYWJsZSBTUEEgZmFsbGJhY2sgZm9yIGRldmVsb3BtZW50IHNlcnZlclxuICAgIGhpc3RvcnlBcGlGYWxsYmFjazoge1xuICAgICAgZGlzYWJsZURvdFJ1bGU6IHRydWUsXG4gICAgICByZXdyaXRlczogW1xuICAgICAgICB7IGZyb206IC9eXFwvY1xcLy4qJC8sIHRvOiAnL2luZGV4Lmh0bWwnIH0sXG4gICAgICAgIHsgZnJvbTogLy4vLCB0bzogJy9pbmRleC5odG1sJyB9XG4gICAgICBdXG4gICAgfSxcbiAgICBwcm94eToge1xuICAgICAgLy8gUHJveHkgL2MvIHBhdGhzIHRvIGhhbmRsZSBjYW1lcmEgY29ubmVjdGlvbnMgaW4gZGV2ZWxvcG1lbnRcbiAgICAgICcvYyc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo1MTczJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aFxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgICd2ZW5kb3InOiBbXG4gICAgICAgICAgICAndnVlJyxcbiAgICAgICAgICAgICd2dWUtcm91dGVyJyxcbiAgICAgICAgICAgICdwaW5pYScsXG4gICAgICAgICAgICAnZmlyZWJhc2UvYXBwJyxcbiAgICAgICAgICAgICdmaXJlYmFzZS9hdXRoJyxcbiAgICAgICAgICAgICdmaXJlYmFzZS9maXJlc3RvcmUnLFxuICAgICAgICAgICAgJ2ZpcmViYXNlL3N0b3JhZ2UnLFxuICAgICAgICAgICAgJ2ZpcmViYXNlL2FuYWx5dGljcydcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxPQUFPLFNBQVM7QUFDaEIsT0FBTyxVQUFVO0FBRmpCLElBQU0sbUNBQW1DO0FBSXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxJQUFJLENBQUM7QUFBQSxFQUNmLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQTtBQUFBLElBRU4sb0JBQW9CO0FBQUEsTUFDbEIsZ0JBQWdCO0FBQUEsTUFDaEIsVUFBVTtBQUFBLFFBQ1IsRUFBRSxNQUFNLGFBQWEsSUFBSSxjQUFjO0FBQUEsUUFDdkMsRUFBRSxNQUFNLEtBQUssSUFBSSxjQUFjO0FBQUEsTUFDakM7QUFBQSxJQUNGO0FBQUEsSUFDQSxPQUFPO0FBQUE7QUFBQSxNQUVMLE1BQU07QUFBQSxRQUNKLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQ0EsVUFBU0E7QUFBQSxNQUNyQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixVQUFVO0FBQUEsWUFDUjtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbInBhdGgiXQp9Cg==
