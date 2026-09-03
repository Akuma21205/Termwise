import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/negotiate': 'http://localhost:8000',
      '/audit': 'http://localhost:8000',
      '/webhooks': 'http://localhost:8000',
      '/evaluate': 'http://localhost:8000',
    }
  }
})

