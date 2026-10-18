/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `vite build --mode pages` serves from the GitHub Pages project path; everything else from the root.
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/roam/' : '/',
  plugins: [react(), tailwindcss()],
  server: { port: 5186 },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
}))
