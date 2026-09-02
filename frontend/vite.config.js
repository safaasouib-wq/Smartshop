import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8000' },  // évite les soucis CORS en dev
    allowedHosts: ['.trycloudflare.com']         // autorise l'accès via tunnel cloudflared (test mobile/à distance)
  }
})
