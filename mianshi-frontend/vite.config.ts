import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['html2canvas-pro'],
  },
  build: {
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-dom') || id.includes('react-router') || /\/react\//.test(id)) {
            return 'vendor-react'
          }
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('react-markdown') || id.includes('remark-gfm') || id.includes('micromark')) {
            return 'vendor-markdown'
          }
        },
      },
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
    },
  },
})
