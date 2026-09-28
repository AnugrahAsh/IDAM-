# Tanflow IDAM — demo packet

This runnable packet retains the 24 screens and nine page areas from the previous packets and adds three requested page areas from the updated IDAM app:

| Page | Route |
|---|---|
| Dashboard | `/iam/dashboard` |
| Identity Threat Detection | `/iam/itdr` |
| External User Federation | `/iam/externalUserFederation` |

Dashboard is the first item in the Core section. Identity Threat Detection is in the Logging section; its Detection Rules, Alerts, and Blocked IPs tabs open at `/iam/itdr`, `/iam/itdr/alerts`, and `/iam/itdr/blocked`. External User Federation is in the Applications section: **Add Application** opens the Connector Hub at `/iam/externalUserFederation/new`, and each connector's setup form opens at `/iam/externalUserFederation/new/<connector>`.

The Recertification page's public email review link is included. Existing page routes, aliases, and legacy redirects remain in the console navigation. Routes for pages outside this packet render the console's “Screen in progress” placeholder.

The sign-in page and the Self-Enrollment page it opens are now included. Opening the packet starts a demo session, so it lands in the console rather than on the sign-in form, and a deep link is carried through. **Log Out** ends that session and returns to the sign-in page, where the administrator card signs back in with one click. The demo session starts once per page load, so reloading enters the console again.

Two addresses open on their own, without a session:

| Address | Opens |
|---|---|
| `/iam/login` | the sign-in page. **Sign in with credentials** opens the method picker — **Password**, **Phone / Email OTP**, **SAML**, **OAuth** |
| `/iam/selfEnrollment` | the four-step enrollment |
| `/iam/consentInitiate` | the tokenised registration a consent invitation links to |

## Updates to included screens

- **Toast notifications** appear in the top-right corner, below the header.
- **Text and controls** follow the browser's own font-size setting, and layouts reflow at every screen width and scaling level without CSS zoom.
- **Reports** open from a library: headline figures, then the category filters across the top of the page, pinned and recently viewed reports, search, and three layouts — cards, table and list. Each report card shows what is actually in that report — the split of the column it is read by, such as delivered against failed, the clients a sign-in came through or the severities in an audit trail — beside the records it holds, the window it covers and a count of anything that failed. A **download** reports its own progress and then names the file it wrote.
- **Connector logos** appear in the connector catalogue of the Applications registration wizard (Connector step) and the Trust Reconciliation source form.
- **Registers** fill the canvas and scroll their own rows: the page bar, the toolbar, the column header and the pager stay where they are however many rows are shown, and a wide table scrolls sideways inside its own panel.
- **Type sizes** are fixed. They follow the browser's own font-size setting, never the width of the window.
- **Sign-in** offers a one-time password beside the password itself: **Phone / Email OTP** takes a mobile number or an email address, sends a code, and verifies it with resend and start-over.
- **Schedulers** carry four add-on services — Approval Escalation, Approval Reminder, Audit Log Cleanup and Recertification Campaign — under their own heading in the service picker, each with a full configuration panel.
- **An application's image** can be chosen, replaced and removed from the application record's **Change image** button, the **Change** link on its SSO tab, the **Change image** row action in the application register, and the registration wizard. It is shown wherever that application appears — the register, the record header, the launchpad and the sign-in screen.
- **Consent** appears on both profiles: **My Profile → Privacy & consent** gives and withdraws consent against each notice, and an identity record's **Consent** tab shows the same record read-only, with re-consent requests.
- **Requests and approvals** show **User information** after the request summary — for a joiner, the identity being created; for anything else, the directory record with the request's own changes against it. An approver may correct any of it before signing, and a **Change log** records who changed what, from what to what, when, and at which level.
- **Settings → Approval flow rules** scopes requests and approvals by organization or by the office hierarchy, with a default per side and per-level exceptions.

- **Consent** is asked for at the door. After signing in, an identity with an outstanding notice meets the consent screen before the console: the document and its version, a language selector that swaps the text, the terms in a bounded panel, and **Accept & Continue** which stays disabled until the box is ticked. **Decline** says what declining means and offers to sign out rather than dropping the visitor somewhere.
- **A consent invitation** opens at `/iam/consentInitiate` — the recipient half of Consent Management's own User Consent Initiative. It carries the registration form the administrator sent, with the tenant's own attributes marked as such, and its agreement checkbox stays disabled until the Terms & Policy have actually been opened and acknowledged with **I Understand**. Expired and already-used links each get their own screen.
- **Loading has a shape.** Registers, card grids, stat tiles and page bars draw skeletons while they settle, so a page arrives as one thing instead of flickering in pieces, and a cold start shows a branded boot screen — the wordmark, the product name and a progress bar — which stays away entirely on a load fast enough not to need it.
- **The account lives in one place.** The chip in the header opens a profile panel carrying the identity, every role held with the active one switchable, My Profile, the theme and Log Out. The role no longer sits under the name where only one of several could ever be shown, and the duplicate account chip has left the sidebar, which is navigation for its whole height now.
- **Reports** cards carry no figures at all — no counts, no charts, no progress bars. A card is the report's mark, name, what it evidences and the way in; the catalogue is filtered from the bar across the top.
- **Email Management's SMTP** tab is divided into sub-tabs — Configuration, Retry policy, Connection test, Test message — the same nesting the Delivery log tab uses, rather than one long scroll. **Health check** keeps the default relay expanded and adds an accordion per client, each holding the same connection status and queue tiles, so an administrator can read another tenant's health without leaving the screen.
- **SMS Management** forms are built the way the email ones are: grouped sections with their own titles, helper text under the fields that need it, and the full width used. Adding or editing a **client** happens in a drawer over the register instead of on a page of its own.

- **Self-Enrollment** is reached from the **Self-Enrollment** button on the sign-in page. It is its own four-step enrollment — About you, Your role, Verification, Review — with document attachments, consent confirmations and a summary of everything before it is sent. A submitted enrollment appears in Users as a Pending identity.

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
