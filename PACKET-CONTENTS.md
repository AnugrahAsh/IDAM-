# Tanflow IDAM — demo packet

This runnable packet retains the 24 built screens from the previous packet and adds the nine requested page areas from the updated IDAM app:

| Page | Route |
|---|---|
| Groups | `/iam/groups` |
| Dynamic Policies | `/iam/dynamicPolicy` |
| Applications | `/iam/applications` |
| SSO Configurations | `/iam/ssoConfigurations` |
| Network Access Policies | `/iam/ip/restriction/policy` |
| Schedulers | `/iam/schedulers` |
| Recertification | `/iam/recertification` |
| My Profile | `/iam/profile` |
| Consent Management | `/iam/consent` |

The Recertification page's public email review link is included. Existing page routes, aliases, and legacy redirects remain in the console navigation. Routes for pages outside this packet render the console's “Screen in progress” placeholder. The sign-in page is outside this packet, so the console starts a demo session automatically, as in the previous packet.

## Additional Pages source hand-off

The Additional Pages section is absent from the sidebar and command palette. Its seven page components are supplied as source only in `idam/src/pages/additional/`; they are not wired into this packet's `App.jsx`. The client can integrate them into its own flows.

| Page | Source file |
|---|---|
| Login & Password | `LoginPasswordPage.jsx` |
| Email & Mobile Login | `EmailMobileLoginPage.jsx` |
| Login MFA | `LoginMfaPage.jsx` |
| MFA Enrolment & Challenge | `MfaEnrolmentPage.jsx` |
| Error Pages | `ErrorPagesPage.jsx` |
| Email Templates | `EmailTemplatesPage.jsx` |
| Desktop Client | `DesktopClientPage.jsx` |

That folder also includes `AdditionalPage.jsx`, `ScreenGallery.jsx`, `authParts.jsx`, `mfaParts.jsx`, and `additional.css`. Its imported `LoginPage.css` is supplied at its original path, `idam/src/pages/login/LoginPage.css`. The other imports resolve to shared components, the app store, and both wordmark assets already in this packet.

## Run locally

Requires Node.js `^20.19.0` or `>=22.12.0` for Vite 8.

```bash
npm ci
npm run dev
```

Open **http://localhost:5181/iam/**. The Vite base is `/iam/` and the development server uses port 5181. `npm run build` writes the production build to `dist-idam/`; `npm run preview` serves that build at the same `/iam/` path.

The source follows the updated app's paths: page folders under `idam/src/pages/`, shared components under `idam/src/components/`, and shared data, libraries, styles, stores, and assets in their original locations. The included page files and their dependencies are byte-identical to the updated source. `idam/src/App.jsx` is the packet-specific file: it enables the earlier screens and these nine new page areas, retains the Recertification public link, and starts a demo session without the excluded sign-in page.

`package.json`, `package-lock.json`, and `vite.config.js` match the updated app. `node_modules/` and `dist-idam/` are generated locally and git-ignored; install on the target machine because Vite uses platform-specific binaries. The source project's production deployment scripts are outside this client demo packet; use `dev`, `build`, and `preview` locally.

The demo uses seeded frontend data and browser storage. It does not include a backend service.
