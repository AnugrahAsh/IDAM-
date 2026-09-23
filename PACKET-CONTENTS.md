# Tanflow IDAM — demo packet

This runnable packet retains the 24 screens and nine page areas from the previous packets and adds three requested page areas from the updated IDAM app:

| Page | Route |
|---|---|
| Dashboard | `/iam/dashboard` |
| Identity Threat Detection | `/iam/itdr` |
| External User Federation | `/iam/externalUserFederation` |

Dashboard is the first item in the Core section. Identity Threat Detection is in the Logging section; its Detection Rules, Alerts, and Blocked IPs tabs open at `/iam/itdr`, `/iam/itdr/alerts`, and `/iam/itdr/blocked`. External User Federation is in the Applications section: **Add Application** opens the Connector Hub at `/iam/externalUserFederation/new`, and each connector's setup form opens at `/iam/externalUserFederation/new/<connector>`.

The Recertification page's public email review link is included. Existing page routes, aliases, and legacy redirects remain in the console navigation. Routes for pages outside this packet render the console's “Screen in progress” placeholder.

The sign-in page and the Self-Enrollment page it opens are now included. Opening the packet still starts a demo session, so it lands in the console rather than on the sign-in form, and a deep link is carried through. **Log Out** ends that session and returns to the sign-in page, where the administrator card signs back in with one click. The demo session starts once per page load, so reloading enters the console again. `/iam/selfEnrollment` is public: it opens on its own, without a session.

## Updates to included screens

- **Toast notifications** appear in the top-right corner, below the header.
- **Text size** is adjustable from the header's **Text size** button (the Aa icon): Small (94%), Default (100%), Large (113%), or Extra large (125%). Text and controls also follow the browser's own font-size setting, and layouts reflow at every screen width and scaling level without CSS zoom. The choice is remembered in the browser.
- **Reports catalogue** is redesigned with a category rail, pinned reports, search, card and list views, and each report's last 14 days of activity.
- **Connector logos** appear in the connector catalogue of the Applications registration wizard (Connector step) and the Trust Reconciliation source form.

- **Self-Enrollment** is reached from the **Self-Enrollment** button on the sign-in page. Its registration form is the Add User form (`idam/src/pages/users/IdentityForm.jsx`) without the sections only an administrator fills in; a submitted enrollment appears in Users as a Pending identity.

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

That folder also includes `AdditionalPage.jsx`, `ScreenGallery.jsx`, `authParts.jsx`, `mfaParts.jsx`, and `additional.css`. Its other imports — including the sign-in page's `LoginPage.css` — resolve to files already in this packet.

## Run locally

Requires Node.js `^20.19.0` or `>=22.12.0` for Vite 8.

```bash
npm ci
npm run dev
```

Open **http://localhost:5181/iam/**. The Vite base is `/iam/` and the development server uses port 5181. `npm run build` writes the production build to `dist-idam/`; `npm run preview` serves that build at the same `/iam/` path.

The source follows the updated app's paths: page folders under `idam/src/pages/`, shared components under `idam/src/components/`, and shared data, libraries, styles, stores, and assets in their original locations. The included page files and their dependencies are byte-identical to the updated source. `idam/src/App.jsx` is the packet-specific file: it enables the earlier screens and page areas and the three new page areas, retains the Recertification public link, and starts the demo session on each page load — the only difference from the updated app's own `App.jsx`, which opens on the sign-in page instead.

`package.json`, `package-lock.json`, and `vite.config.js` match the updated app. `node_modules/` and `dist-idam/` are generated locally and git-ignored; install on the target machine because Vite uses platform-specific binaries. The source project's production deployment scripts are outside this client demo packet; use `dev`, `build`, and `preview` locally.

The demo uses seeded frontend data and browser storage. It does not include a backend service.
