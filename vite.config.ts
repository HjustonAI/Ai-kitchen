/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'state-vendor': ['zustand', 'zundo'],
          'ui-vendor': ['framer-motion', 'lucide-react', 'clsx', 'tailwind-merge', 'react-draggable', 'react-rnd', 'react-textarea-autosize'],
          'utils-vendor': ['dagre', 'html-to-image'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
  },
})
