import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function calibrateSavePlugin(): Plugin {
  return {
    name: 'signlens-calibrate-save',
    configureServer(server) {
      server.middlewares.use('/__save-fsl-calibrated', (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body)
            const outPath = path.resolve(process.cwd(), 'src/engine/fsl105_calibrated.json')
            fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2) + '\n', 'utf-8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, count: Object.keys(parsed).length }))
          } catch (err) {
            res.statusCode = 400
            res.end(JSON.stringify({ ok: false, error: String(err) }))
          }
        })
      })
    },
  }
}

// Tauri: fixed port so devUrl in tauri.conf.json stays in sync.
// https://v2.tauri.app/start/frontend/vite/
export default defineConfig({
  plugins: [react(), calibrateSavePlugin()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
})
