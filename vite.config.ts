import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Tauri: fixed port so devUrl in tauri.conf.json stays in sync.
// https://v2.tauri.app/start/frontend/vite/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
})
