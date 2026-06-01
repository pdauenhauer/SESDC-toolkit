import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import preact from '@preact/preset-vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact(), tailwindcss()],
  server: {
    fs: {
      // Allow importing files from the repo root (e.g. USER-GUIDE.md)
      allow: [path.resolve(__dirname, '..')],
    },
  },
})
