import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import manifest from './manifest.json'

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    cors: true,
    hmr: {
      clientPort: 5173
    }
  },
  plugins: [
    preact(),
    tailwindcss(),
    crx({ manifest }),
  ],
})
