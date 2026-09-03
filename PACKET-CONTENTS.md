# Tanflow IDAM — Demo Packet

A **runnable** Vite + React app. The full console shell and the complete navigation ship as
they are. Fourteen screens are built:

| Screen | Route |
|--------|-------|
| Notification Center | `/iam/notifications` |
| Users | `/iam/users` |
| Organizations | `/iam/organizations` |
| Roles | `/iam/roles` |
| Approvals | `/iam/approvals` |
| Organization Structure | `/iam/organizationHierarchy` |
| Orphan Accounts | `/iam/orphanedpolicy` |
| Access Requests | `/iam/requests` |
| Multi-Factor Authentication | `/iam/mfa` |
| LDAP Applications | `/iam/ldapapplications` |
| Password Policy | `/iam/passwordPolicy` |
| Background Jobs | `/iam/jobs` |
| SSO Configurations | `/iam/ssoConfigurations` |
| License | `/iam/licenses` |

Every other route renders the console's own "Screen in progress" card under its proper title.

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

Everything else — all 228 remaining files — is a **byte-identical copy** at its original path,
including the full route table in `data/nav.js`, `store/AppContext.jsx`, `package.json` and
`package-lock.json`.

| File | Change | Why |
|------|--------|-----|
| `idam/src/App.jsx` | `PAGES` maps the fourteen routes above; the other 22 `lazy()` imports, the `LoginPage` import and the `if (route === 'login')` branch removed | those page files are not in this packet, so importing them would break the build. Every route not in `PAGES` already falls through to `PlaceholderPage` — that is the "work in progress" screen, unchanged console behaviour. The rest of the file, including the role-based module gate (`moduleFor` / `can`), is untouched |
| `idam/src/data/nav.js` | two lines: `LEGACY['/iam']` and `LEGACY['/iam/']` point at `/iam/users` instead of `/iam/myapps` | so `/iam/` lands on a screen this packet delivers rather than a placeholder. `ROUTES`, `NAV`, `NAV_BADGES`, `TITLES`, `pathFor`, `BY_ID`, `BY_PATH`, `DETAIL_ROUTES` and the rest of `LEGACY` are byte-identical |

Every page, component, hook, style, data module and image is otherwise untouched.

---

## What the navigation does

The sidebar shows **every** section the full console has — Core, Groups, Applications,
Schedulers, Reports, Communications, Logging, System — with live badge counts driven from the
seed data (Approvals 22, Orphan Accounts 18, Segregation of Duties 6, Notification Center 6,
Background Jobs 5, Recertification 2). The command palette (`⌘K` / `Ctrl+K`) lists every route.

The fourteen built screens carry their full behaviour — registers, detail views, tabs, drawers,
wizards and sticky save bars. **Every other entry** opens that route's own title over the
"Screen in progress" card — for example *Segregation of Duties*, *Reports*, *Configurations*.
Nothing errors, nothing dead-ends.

Each one lights up as its page joins a later packet: add the page files and one line to
`PAGES` in `App.jsx`.

---

## What ships

**230 files.** The list is the transitive import closure of the fourteen page components plus
the shell reachable from `main.jsx`, minus the login subtree.

**Pages** (`pages/`) — the fourteen page components above, plus `PlaceholderPage` and
`PasswordDictionaryPage` (the Dictionary tab of Password Policy), each with its own stylesheet
in `pages/styles/` (17 files), plus their feature folders:

| Folder | Contents |
|--------|----------|
| `pages/directory/` | AdvancedFilters, IdentityCard, IdentityDetail, IdentityForm, ResetPasswordForm, SelectionSync, UploadForm, UploadResult, UserAdd, UserEdit, UserNotFound, UserView, UsersList, identityData, posture, uploadData, usersStore |
| `pages/organizations/` | OrgDetail, OrgForm, OrgTabs, orgModel |
| `pages/roles/` | PermissionPicker, RoleAdd, RoleDetail, RoleEdit, RoleForm, RoleList, RoleNotFound, RoleTabs, RoleView, roleModel, rolesStore, useRoleActions |
| `pages/approvals/` | ApproverTimeline, ChangesPanel, RequestRecord, data |
| `pages/hierarchy/` | HierarchyForm, NodeForm, SourceConfig, TreeNode, UnitUsersPanel, hierarchyData |
| `pages/orphaned/` | AccountsTable, AssignForm, ConditionBuilder, OrphanList, RuleBuilder, RuleDetail, orphanedData |
| `pages/requests/` | FormControls, RequestForm, RequestRail, RequestTracking, data |
| `pages/authentication/` | Control, MethodConfig, MfaEnforcement, ProviderBlock, ProviderPage, TestResult, authData, mfaData |
| `pages/ldap/` | LdapAuthTest, LdapCard, LdapDetail, LdapDirectory, LdapEntryDrawer, LdapForm, LdapList, LdapProvisioning, LdapRules, LdapSchema, LdapShared, LdapUsers, directoryTree, ldapModel, rulesData, schemaData |
| `pages/password/` | PolicyDetail, PolicyForm, PolicyMappings, StrengthPreview, passwordData |
| `pages/jobs/` | JobDetail, JobExchange, jobData, jobDetailData |
| `pages/notifications/` | AnnouncementRegister, NotificationInbox, announcementStore, inboxModel, notificationAccess, readStore |
| `pages/notificationMgmt/` | AnnouncementEditor, announcementData |
| `pages/comms/` | AudiencePicker, audienceModel, commsData |
| `pages/ssoConfigurations/` | AdminApplicationForm |
| `pages/conditions/` | ConditionBuilder, conditionModel |
| `pages/configurations/` | configData, schemaStore |
| `pages/applications/` | TestResult |
| `pages/policy/` | policyPageData |
| `pages/settings/` | settingsStore |

**Shell** (`components/shell/`, 10) — CommandPalette, DetailHeader, NavLink, PageBar,
RouteBoundary, Sidebar, StatusBar, StickyActions, Toasts, TopBar.

**Components** — 26 primitives (`components/primitives/`); 6 workbench (ColumnPicker,
DataWorkbench, RecordCard, RegisterHeader, RegisterSummary, StatCards); 2 viz (Charts,
TooltipProvider).

**Store / lib / data** — `store/AppContext.jsx`; `lib/` (access, clock, format, moduleRouter,
permissions, series, useBadges, useDialogFocus, useHotkeys, useLocalState); `data/`
(brandMarks, dictionary, icons, nav, permissionCatalog, seed).

**Styles** — 9 shared stylesheets in `idam/src/styles/` (index, tokens, base, layout, shell,
components, workbench, patterns, horizon) plus the 17 page-owned ones in `pages/styles/`.

**Assets** — `tanflow-wordmark-white.png` and 13 brand SVGs in `assets/logos/`.

**App files** — `idam/index.html`, `package.json`, `package-lock.json`, `vite.config.js`.

---

## Notes

**The sign-in screen is a placeholder like the rest.** Its page files are not in this packet,
so the app opens straight on Users with no authentication step. Dropping it also drops
`d3-geo`, `d3-timer` and the ~87 kB globe geometry (`data/worldLand.js`); `package.json` is
unchanged, so those packages still install, they are simply unused.

**Data is fictional and in-memory.** `data/seed.js` generates a deterministic dataset from a
fixed seed, so every run shows identical numbers. There is no backend: edits, deletes and
imports change React state and raise a toast, and a refresh restores the seed. Only UI
preferences (column visibility, sidebar collapse, density, theme) persist, in `localStorage`.

---

## Verified before hand-off

Everything below was run against this packet and observed.

- **`npm ci` from a clean folder** on the shipped `package-lock.json` — succeeds, 27 packages,
  lockfile untouched afterwards. `npm install` from clean also succeeds (29 packages). The
  lockfile ships byte-identical to the main project; it needed no repair.
- **`npm run build`** — succeeds, 232 modules transformed, one lazy chunk per page:
  Users 144 kB, LDAP 138 kB, Password Policy 66 kB, MFA 57 kB, Orphan Accounts 44 kB,
  Roles 40 kB, Organizations 39 kB, Access Requests 39 kB, Organization Structure 34 kB,
  Notification Center 31 kB, Background Jobs 29 kB, Approvals 28 kB, SSO 16 kB, License 15 kB,
  over a 310 kB shell chunk.
- **Dev server driven in a real browser** (Vite on a spare port, `/iam/` base). All fourteen
  screens opened and rendered, plus:
  - Users: identity detail with its six tabs (Overview, Access, Applications, Activity,
    Security, Audit), the eight-step Add User wizard advancing past step 1, and the CSV
    Import drawer with its file-drop zone.
  - Organizations: organization detail with the hierarchy panel.
  - Roles: role detail with the permission matrix — 417 permissions, 41 of 41 modules.
  - MFA: the MFA Configuration sub-route, all four tabs (Factors, Providers, Policy,
    Enrollment).
  - Access Requests: request detail with its three-level approval chain, and the Add-request
    form reached from the "Add user" card.
  - LDAP: directory detail with all eight tabs, and the Directory tree reading its root level
    on demand (10 entries).
  - Password Policy: the Dictionary tab, reached both directly and through the
    `/iam/passwordDictionary` legacy redirect.
  - An unbuilt route (Segregation of Duties) renders its own title over "Screen in progress".
  - `/iam/` lands on Users, and the full sidebar renders every section with live badge counts.
- **Browser console clean — zero errors across every route and flow exercised.**
- **Byte-identity audit** — every one of the 230 files compared against the main project:
  228 byte-identical, and the only two that differ are `App.jsx` and `data/nav.js` as
  described above.
