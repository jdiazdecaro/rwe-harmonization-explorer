import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base is applied only for the production build (GitHub Pages serves the
// site under /rwe-harmonization-explorer/); `npm run dev` stays at "/".
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/rwe-harmonization-explorer/' : '/',
}))
