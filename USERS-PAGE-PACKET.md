# Tanflow IDAM — Users Page Packet

A **runnable** Vite + React app. The full console shell and the complete navigation ship as
they are; **Users** (`/iam/users`) is the screen that is built. Every other route renders the
console's own "Screen in progress" card under its proper title.

Folder structure mirrors the main project exactly, so this can be run on its own or copied
back over the main tree without a single path change.

---

## Running it

```bash
npm install
```

```bash
npm run dev
```

Then open **http://localhost:5181/iam/** — that exact URL. Vite is configured with
`base: '/iam/'` and `--strictPort`, so plain `/` will not serve the app. `/iam/` opens
straight on Users.

Production build: `npm run build` (outputs to `dist-idam/`).

---

## Only two files differ from the main project

Everything else — all 93 remaining files — is a **byte-identical copy** at its original path,
including `data/nav.js`'s full route table and `store/AppContext.jsx`.

| File | Change | Why |
|------|--------|-----|
| `idam/src/App.jsx` | `PAGES` maps `users` only; the other 46 lazy imports and the login branch removed | those page files are not in this packet, so importing them would break the build. Every route not in `PAGES` already falls through to `PlaceholderPage` — that is the "work in progress" screen, unchanged console behaviour |
| `idam/src/data/nav.js` | two lines: `LEGACY['/iam']` and `LEGACY['/iam/']` point at `/iam/users` instead of `/iam/myapps` | so `/iam/` lands on the screen this packet delivers rather than a placeholder. The route table, nav groups and badges are otherwise untouched |

The Users page itself, its feature folder, every component, hook, style, data module and image
it touches are all untouched.

---

## What the navigation does

The sidebar shows **every** section the full console has — Core, Groups, Applications,
Schedulers, Reports, Communications, Logging, System — with live badge counts driven from the
seed data (Approvals 22, Orphaned Accounts 18, Segregation of Duties 6, and so on). The
command palette (`⌘K` / `Ctrl+K`) lists every route too.

- **Users** opens the register, identity detail, the add-identity wizard and the CSV import.
- **Every other entry** opens that route's own title over the "Screen in progress" card —
  for example *Roles*, *Reports*, *Segregation of Duties*. Nothing errors, nothing dead-ends.

Each one lights up as its page joins a later packet: add the page files and one line to
`PAGES` in `App.jsx`.

---

## What ships

**Page** — `pages/DirectoryPage.jsx`, `pages/styles/DirectoryPage.css`, and the
`pages/directory/` folder (AdvancedFilters, IdentityCard, IdentityDetail, IdentityForm,
ResetPasswordForm, SelectionSync, UploadForm, UploadResult, identityData, posture, uploadData).

**Shell** — TopBar, Sidebar, StatusBar, Toasts, CommandPalette, RouteBoundary, PageBar,
DetailHeader, StickyActions, NavLink, TooltipProvider, PlaceholderPage.

**Components** — 24 primitives, 3 workbench (DataWorkbench, ColumnPicker, StatCards).

**Store / lib / data** — AppContext, format, useLocalState, useBadges, useDialogFocus,
useHotkeys, seed, icons, brandMarks, nav, permissionCatalog, notifications/readStore,
configurations/schemaStore.

**Styles** — 9 shared stylesheets (`idam/src/styles/`) plus the page's own. The data table's
classes live in `workbench.css` and `components.css`, so the shared set is required.

**Assets** — the wordmark and 13 brand SVGs.

**App files** — `idam/index.html`, `package.json`, `package-lock.json`, `vite.config.js`.

---

## Notes

**The sign-in screen is a placeholder like the rest.** Its page files are not in this packet,
so the app opens straight on Users with no authentication step. Dropping it also drops
`d3-geo`, `d3-timer` and the 87 kB globe geometry; `package.json` is unchanged, so those
packages still install, they are simply unused.

**Data is fictional and in-memory.** `data/seed.js` generates a deterministic dataset from a
fixed seed, so every run shows identical numbers. There is no backend: edits, deletes and
imports change React state and raise a toast, and a refresh restores the seed. Only UI
preferences (column visibility, sidebar collapse, density, theme) persist, in `localStorage`.

---

## Verified before hand-off

- `npm install` from a clean folder — 29 packages, no warnings.
- `npm run build` — succeeds, 286 kB shell + 174 kB page chunk.
- Dev server started and driven in a browser:
  - `/iam/` opens on Users; the register renders all five stat cards, filters, saved views and
    46 seeded identities.
  - Identity detail opens (`/iam/users/:id`) with Overview, Access, Applications, Activity,
    Security and Audit tabs.
  - "Add User" opens the eight-step identity wizard; "Import Users" opens the CSV drawer.
  - Full sidebar renders with all groups and live badge counts.
  - Non-Users routes (Roles, My Apps) render their own title over "Screen in progress".
- **Browser console clean — zero errors across every route and flow exercised.**

**95 files.**
