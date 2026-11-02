import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const sha = (process.env.GITHUB_SHA ?? '').slice(0, 7)
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')

// base './' so the build works under https://<user>.github.io/beautiful-reminders/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 800 },
  define: {
    __BUILD_ID__: JSON.stringify(sha ? `${sha} · ${stamp} UTC` : `local · ${stamp} UTC`),
  },
})
