# Tanflow IDAM — Demo Packet 1

A **self-contained, runnable** slice of the Tanflow IDAM console carrying the eleven pages
listed below. The folder structure mirrors the main `Idam Updated` project exactly, so this
packet can be copied anywhere and run on its own, or dropped back over the main project
without any path changes.

Nothing is referenced that is not inside this folder. Every component, hook, style, data
module and image these pages touch was resolved by walking the import graph, so there are no
missing dependencies.

---

## Running it

**Option A — zero install.** Open `dist-idam/standalone.html` in a browser. It is a single
829 kB file with every script, stylesheet and image already inlined as data URIs. No server,
no Node, no network.

**Option B — the dev server.**

```bash
npm install
```

```bash
npm run dev
```

Then open **http://localhost:5181/iam/** — that exact URL, because Vite is configured with
`base: '/iam/'` and `--strictPort`. The root `/` will not serve the app.

To rebuild the standalone file after a change:

```bash
npm run build && DIST=dist-idam node scripts/inline.mjs dist-idam/standalone.html
```

---

## App shell (on every page)

The full chrome ships with the packet and is byte-identical to the main project:

| Part | File | What it does |
|------|------|--------------|
| Navbar / top bar | `components/shell/TopBar.jsx` | Tanflow wordmark, notification bell with unread dot, user menu (change password, settings, log out) |
| Sidebar | `components/shell/Sidebar.jsx` | Grouped navigation with live filter, collapsible sections, per-route badges, collapse/expand toggle, user card at the foot |
| Footer | `components/shell/AppFooter.jsx` | Product + edition, environment, TLS, licensed-to, seat count, copyright |

The sidebar lists **exactly the routes this packet ships**, so there are no dead nav links.
The footer sits inside `.main` under the scrolling canvas, so it stays put while the page
scrolls and never collides with the sidebar's own user card or a page's sticky save bar. It
carries no route links on purpose — a footer link to a page in a later packet would dead-end.

Also included and used across the pages: `PageBar` (heading, subheading, breadcrumbs, chip
rail), `DetailHeader`, `StickyActions` (save/discard bar), `Toasts`, `Modal`, `Drawer`, and the
`DataWorkbench` table.

---

## Pages in this packet

| # | Page | Route | Page component |
|---|------|-------|----------------|
| 1 | My Apps | `/iam/myapps` | `MyAppsPage.jsx` |
| 2 | Users | `/iam/users` | `DirectoryPage.jsx` |
| 3 | MFA | `/iam/mfa` | `AuthenticationPage.jsx` |
| 4 | Organization | `/iam/organizations` | `OrganizationsPage.jsx` |
| 5 | Roles | `/iam/roles` | `RolesPage.jsx` |
| 6 | SSO Applications | `/iam/ssoConfigurations` | `SsoConfigurationsPage.jsx` |
| 7 | Reports | `/iam/reports` | `ReportsPage.jsx` |
| 8 | Jobs | `/iam/jobs` | `JobsPage.jsx` |
| 9 | Email Management | `/iam/emails` | `EmailManagementPage.jsx` |
| 10 | SMS Management | `/iam/sms` | `SmsManagementPage.jsx` |
| 11 | License | `/iam/licenses` | `LicensePage.jsx` |

### Sub-routes that come with them

Users, Organization and Roles are full CRUD pages, so their detail, add and edit routes ship too:

- `/iam/users/:id`, `/iam/users/:id/edit`, `/iam/users/add`
- `/iam/organizations/:id`, `/iam/organizations/:id/edit`, `/iam/organizations/add`
- `/iam/roles/:id`, `/iam/roles/:id/edit`, `/iam/roles/add`

Email Management and SMS Management are tabbed shells over their own sub-pages, all included:

- `/iam/emails`, `/iam/emails/configuration`, `/iam/emails/templates`
- `/iam/sms`, `/iam/sms/providers`, `/iam/sms/templates`, `/iam/sms/clients`

MFA, Jobs, Reports and SSO carry their own in-page tabs, detail drawers and record views.

---

## What is in the folder

```
demo packets/
  package.json              trimmed to the deps these pages actually import
  package-lock.json         pinned install
  vite.config.js            root: 'idam', base: '/iam/', out: dist-idam
  scripts/inline.mjs        folds a build into one standalone.html
  dist-idam/standalone.html prebuilt, zero-install preview
  idam/
    index.html
    src/
      main.jsx              entry
      App.jsx               route map — packet build, only the 11 pages
      store/AppContext.jsx  the only store: route, density, nav, toasts, drawer, modal
      data/                 nav.js (packet routes), seed.js, icons.js, brandMarks.jsx
      lib/                  format, permissions, useLocalState, useBadges,
                            useHotkeys, useDialogFocus
      components/
        primitives/         24 presentational components
        shell/              TopBar, Sidebar, AppFooter, PageBar, DetailHeader,
                            StickyActions, Toasts, NavLink
        workbench/          DataWorkbench (the table on every list page)
      pages/                17 page files + 5 feature folders
        comms/              shared email + SMS data
        directory/          identity detail, form, reset password
        organizations/      org detail, form, tabs, model
        reports/            report definitions, data, CSV export
        roles/              role detail, form, tabs, permission picker
        styles/             17 page-owned stylesheets
      styles/               tokens, base, layout, shell, components,
                            workbench, patterns (+ index.css)
      assets/               wordmark + 13 brand logos
```

**119 source files.** No `public/` directory — every asset is an ES import, so the bundler
fingerprints and inlines them.

---

## Notes worth reading before you demo

**Dependencies were trimmed.** `d3-geo`, `d3-timer` and `lucide-react` are dependencies of the
full console's login screen, which is not in this packet. They are gone from `package.json`, so
`npm install` pulls **react + react-dom** only (22 packages, a few seconds). If you later add
the login page back, restore those three.

**The sign-in screen is not included.** The app opens straight onto My Apps. There is no
authentication step to click through.

**Navigation is trimmed to match.** `data/nav.js` in this packet lists only the eleven routes,
so the sidebar shows exactly what ships — no dead links in the nav.

**Links that point outside the packet land on My Apps.** A handful of in-page buttons and menu
items cross-reference pages the full console has but this packet does not — for example
"Check for duty conflicts" in the Roles detail kebab menu (Segregation of Duties), and
cross-links to Password Policy, Recertification, Access Requests, Org Hierarchy and Logging.
These resolve to My Apps rather than erroring, so nothing breaks, but the button will not go
where its label suggests. They light up as soon as those pages join a later packet.

**Data is fictional and in-memory.** `data/seed.js` generates a deterministic dataset from a
fixed seed (tenant *Tanflow Corp*, `@tanflow.com` addresses, current-date anchor 2026-08-05).
Every demo run shows identical numbers. There is no backend: edits, deletes and imports change
React state and raise a toast, and a refresh restores the seed. The only thing that persists is
UI preference — table column visibility, sidebar collapse and row density — in `localStorage`.

---

## Verified before hand-off

- `npm install` from a clean folder — 22 packages, no warnings that matter.
- `npm run build` — succeeds, 649 kB JS / 79 kB CSS.
- `scripts/inline.mjs` — standalone build passes its own external-reference check.
- Dev server started and **all 11 pages plus all 16 routes loaded**, each rendering its heading,
  subheading and chip rail, with correct styling applied.
- Detail, add and edit routes opened for Users, Organizations and Roles.
- Browser console clean — zero errors across every route.
- Top bar, sidebar and footer confirmed present on all 15 routes checked.
- Every packet file diffed against the main project: **117 of 119 byte-identical**.
  Only `App.jsx` and `data/nav.js` differ, and only because they are generated to list
  this packet's routes.
