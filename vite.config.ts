import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_INSTANCE_MODE === 'central' ? 'http://localhost:4001' : 'http://localhost:3001',
        secure: false,
        changeOrigin: true
      },
      '/ws': {
        target: process.env.VITE_INSTANCE_MODE === 'central' ? 'ws://localhost:4001' : 'ws://localhost:3001',
        ws: true
      }
    }
  }
})
