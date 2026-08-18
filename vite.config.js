import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'idam',
  base: '/iam/',
  plugins: [react()],
  build: { outDir: '../dist-idam', emptyOutDir: true, assetsInlineLimit: 4096 },
})
