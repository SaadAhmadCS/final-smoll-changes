import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Vuetify from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(() => {
  return {
    plugins: [
      vue(),
      Vuetify({
        autoImport: true
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      host: '0.0.0.0',
      port: 5176,
      allowedHosts: ['staging-homesuite.smoll.me', 'homesuite.smoll.me'],
      proxy: {
        '/vet': 'http://localhost:3000',
        '/vets': 'http://localhost:3000',
        '/files': 'http://localhost:3000',
        '/config': 'http://localhost:3000',
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    preview: {
      host: '0.0.0.0',
      port: 5176,
      allowedHosts: ['staging-homesuite.smoll.me', 'homesuite.smoll.me']
    }
  }
})
