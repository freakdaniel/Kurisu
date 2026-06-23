import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const APP_TITLE = process.env.KURISU_APP_TITLE?.trim() || 'Kurisu'

// Rewrites <title>__KURISU_APP_TITLE__</title> in Frontend/index.html to the
// value passed via the KURISU_APP_TITLE environment variable. The csproj's
// <Title> property is forwarded into the npm build invocation so the
// rendered window title stays in sync with the host assembly metadata.
const kurisuTitlePlugin = {
  name: 'kurisu-title',
  transformIndexHtml(html: string): string {
    return html.replace(/<title>__KURISU_APP_TITLE__<\/title>/, `<title>${APP_TITLE}</title>`)
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), kurisuTitlePlugin],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: '../wwwroot',
    emptyOutDir: true,
  },
})