import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* The address a consent invitation carries.

   The console is served under /iam/, but the link that goes out in the mail is
   the bare /consent-initiate?token=… the product has always sent — it is
   printed in the invitation, and the people who follow it are not console
   users who would know to add a prefix. Outside the base path Vite has no SPA
   to hand them, so the request is moved to the route that answers it, with the
   token carried across. The deployed build does the same thing in its own
   redirect rules. */
const consentInvitationLink = {
  name: 'consent-invitation-link',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const [path, query] = String(req.url || '').split('?')
      if (!/^\/consent-?initiate\/?$/i.test(path)) return next()
      res.writeHead(302, { Location: `/iam/consentInitiate${query ? `?${query}` : ''}` })
      res.end()
    })
  },
}

export default defineConfig({
  root: 'idam',
  base: '/iam/',
  plugins: [react(), consentInvitationLink],
  build: { outDir: '../dist-idam', emptyOutDir: true, assetsInlineLimit: 4096 },
})
