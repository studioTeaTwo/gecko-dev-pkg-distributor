import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), splitVendorChunkPlugin()],
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      }
    },
  },
  base: './',
  build: {
    outDir: 'content',
    emptyOutDir: false,
    minify: false,
    watch: {
      include: 'src/**',
      exclude: 'node_modules/**, .git/**, .vscode/**, src/content/**, src/actors/**'
    },
    assetsDir: 'assets',
    cssCodeSplit: false,
    sourcemap: false,
    ssr: false,
    rollupOptions: {
      treeshake: true,
      input: {
        app: './selfsovereignidentity.html',
      },
      output: {
        // inlineDynamicImports : true,
        entryFileNames: `js/main.bundle.js`,
        chunkFileNames: `js/vendor.bundle.js`,
        assetFileNames: function (file) {
          if (file.names && file.names[0].includes('.css')) {
            return `css/[name].[ext]`
          } else if (file.names && file.names[0].match(/png|jpg|svg|webp|/)) {
            return `img/[name].[ext]`
          }
          return `[name].[ext]`
        },
      },
    },
  },
})