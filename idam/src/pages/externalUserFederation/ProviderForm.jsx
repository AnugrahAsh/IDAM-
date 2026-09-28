import { useId, useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field, { FieldHelp } from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Meter from '../../components/primitives/Meter'
import Pill from '../../components/primitives/Pill'
import SearchSelect from '../../components/primitives/SearchSelect'
import Select from '../../components/primitives/Select'
import Switch from '../../components/primitives/Switch'
import TextInput from '../../components/primitives/TextInput'
import PageBar from '../../components/shell/PageBar'
import StickyActions from '../../components/shell/StickyActions'
import { useApp } from '../../store/AppContext'
import {
  BASE, BIND_TYPES, CACHE_POLICIES, EDIT_MODES, HELP, PLACEHOLDER, REFERRALS, SEARCH_SCOPES,
  SECTIONS, TRUSTSTORE_SPI, VENDORS, blankDraft, canTestAuthentication, canTestConnection,
  draftOf, openSections, providerErrors, requiredEmptyIn, requiredProgress, sectionsWithErrors,
  shows, testAuthentication, testConnection, vendorPatch,
} from './federationData'

/* ---------------------------------------------------------------------------
   Add Provider and Edit Provider.

   One form, two screens. The client's Add Provider *is* the long form — the
   header pair plus all six sections — so there is nothing for a short Add to
   own, and a second copy of thirty-five fields is a second copy to correct
   every time the client moves one. What differs is the page bar, the word on
   the primary button, and whether there is already a provider underneath; the
   body reads `record` for the last of those and nothing else.

   Every ? on the client's screens is answered here by Field's `help`: an icon
   beside the label whose tooltip carries the client's wording, exactly as the
   specification describes it. It used to be Field's `hint`, printed under the
   control — thirty-five paragraphs averaging eighty-three characters, about
   2,900 characters of grey body copy standing permanently between the operator
   and the inputs. The words have not changed; they are asked for now.
   ------------------------------------------------------------------------- */

/* The switch and the word that says which way it is set — the live On / Off
   label the client asks for, in the one place both the grid cells and the
   setting rows read it from. */
function ToggleControl({ label, on, onChange }) {
  return (
    <span className="fed-toggle">
      <Switch checked={on} label={label} onChange={onChange} />
      <span className="fed-toggle-t">{on ? 'On' : 'Off'}</span>
    </span>
  )
}

/* A toggle standing among inputs, in a grid cell: the label and its ? sit where
   every other label on the row sits, and the control keeps an input's height so
   the row has one baseline rather than two. */
function ToggleField({ label, help, on, onChange }) {
  return (
    <Field label={label} help={help}>
      <ToggleControl label={label} on={on} onChange={onChange} />
    </Field>
  )
}

/* A setting row.
 *
 * Synchronization, Kerberos and Advanced are almost nothing but switches —
 * eleven of the fourteen on the form. Laid out as grid cells each one repeats a
 * label line, a control line and a column of air it does not fill, and the
 * section reads as scattered chrome.
 * As rows the label runs along the line and the switch closes it, which is how
 * a list of switches is read everywhere else in this console. The order is the
 * client's order: rows fill left to right, so reading order is the order of the
 * specification even where two columns fit.
 */
function SettingRow({ label, help, htmlFor, error, children }) {
  return (
    <div className="fed-row" data-invalid={!!error || undefined}>
      <span className="fed-row-m">
        {htmlFor
          ? <label className="fed-row-t" htmlFor={htmlFor}>{label}</label>
          : <span className="fed-row-t">{label}</span>}
        <FieldHelp text={help} name={label} />
      </span>
      <span className="fed-row-c">{children}</span>
      {error && (
        <span className="fed-row-e field-err" role="alert">
          <Icon name="warn" size={11} />
          {error}
        </span>
      )}
    </div>
  )
}

function ToggleRow({ label, help, on, onChange }) {
  return (
    <SettingRow label={label} help={help}>
      <ToggleControl label={label} on={on} onChange={onChange} />
    </SettingRow>
  )
}

/* A group inside a section.
 *
 * Thirty-five fields evenly spaced is thirty-five fields with no shape: every
 * gap is the same, so nothing reads as belonging with anything. The groups
 * below are the client's own divisions — "Connection and Authentication
 * Settings" names two halves, and the four vendor-driven attributes are a set
 * the specification already calls out in a note. A caption and a rule cost one
 * line and give the eye somewhere to rest between twelve fields.
 */
function Group({ title, note, rows, children }) {
  return (
    <div className="fed-grp">
      {title && <h4 className="fed-grp-h">{title}</h4>}
      {note && <p className="fed-grp-n">{note}</p>}
      <div className={rows ? 'fed-set' : 'fed-fields'}>{children}</div>
    </div>
  )
}

/* The two test buttons.
 *
 * They sit inline in the grid, beside the fields they test, as the client's
 * layout notes require — but a bare button in a field's slot reads as a field
 * whose label failed to render. Given its own tile and a line saying either
 * what it will do or what it is still waiting for, it reads as the action it
 * is. The reason lives in that line rather than in a `title`: a disabled button
 * takes no pointer events, so a tooltip on one can never be reached.
 */
function TestAction({ icon, label, note, disabled, onClick }) {
  return (
    <div className="fed-act">
      <Button icon={icon} disabled={disabled} onClick={onClick}>{label}</Button>
      <span className="fed-act-n">{note}</span>
    </div>
  )
}

/* The collapsible section.
 *
 * Email Management's health accordion puts its figures on the head because the
 * head *is* the triage there — the numbers are what you came to read. A form
 * section is not read, it is filled, so its head needs to answer one question
 * only: is there anything behind this heading. So: the client's chevron, title
 * and rule, then how many of the thirty-five fields are inside, and — once a
 * save has been refused — how many of them were rejected. A closed section says
 * how many starred fields are still empty, because that is the one thing a
 * closed heading can hide from somebody about to press Submit.
 */
function Section({ section, open, invalid, emptyRequired, onToggle, children }) {
  const headId = `fed-h-${section.id}`
  const bodyId = `fed-b-${section.id}`
  const hiding = !open && emptyRequired > 0
  return (
    <div className="fed-acc" data-open={open || undefined}>
      <button
        type="button"
        id={headId}
        className="fed-acc-h"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <Icon name="chevR" size={14} className="fed-acc-chev" />
        <Icon name={section.icon} size={13} className="fed-acc-ic" />
        <span className="fed-acc-t">{section.title}</span>
        <span className="fed-acc-rule" aria-hidden="true" />
        <span className="fed-acc-n" data-warn={hiding || undefined}>
          {hiding
            ? `${emptyRequired} required empty`
            : `${section.size} ${section.size === 1 ? 'field' : 'fields'}`}
        </span>
        {invalid > 0 && <Pill tone="bad">{invalid} to fix</Pill>}
      </button>
      <div className="fed-acc-b" id={bodyId} role="region" aria-labelledby={headId} hidden={!open}>
        {children}
      </div>
    </div>
  )
}

/* UI display name and Select Option — the pair the client puts above the
   sections. Two fields at a field's own width rather than two cells of a
   four-column grid: stretched across the card they read as the first row of a
   table that never arrives.

   The vendor is an input to the rest of the form, not a note about it: picking
   one re-shapes the four attribute fields in Searching and Updating, which is
   what `vendorPatch` is doing here. */
function Identity({ d, set, errors }) {
  const vendorId = useId()
  return (
    <div className="fed-ident">
      <Field label="UI display name" required help={HELP.name} error={errors.name}>
        <TextInput
          value={d.name}
          autoComplete="off"
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>
      <Field label="Select Option" required htmlFor={vendorId} help={HELP.vendor} error={errors.vendor}>
        <span className="fed-clearable">
          <SearchSelect
            id={vendorId}
            value={d.vendor}
            options={VENDORS}
            placeholder="Select…"
            searchPlaceholder="Search vendors…"
            onChange={(e) => set(vendorPatch(d, e.target.value))}
          />
          {/* Clearing is not choosing: it empties the vendor and leaves the four
              attribute fields where they are. Running the patch for a vendor of ''
              rewrote them to the standards defaults, which reads as the form
              answering a question the operator had just withdrawn. */}
          {d.vendor && (
            <IconButton icon="x" size="sm" label="Clear the selected vendor" onClick={() => set({ vendor: '' })} />
          )}
        </span>
      </Field>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   The form itself. `record` is the provider being edited, or null when one is
   being added — the only thing that tells the two screens apart.
   ------------------------------------------------------------------------- */
function ProviderForm({ record, rows, onSubmit }) {
  const adding = !record
  const { navigate, toast } = useApp()
  const committed = useMemo(() => (record ? draftOf(record) : blankDraft()), [record])
  const [d, setD] = useState(committed)
  const [errors, setErrors] = useState({})
  /* Several may be open at once: a connection URL and the users DN it has to
     contain are read together, and an accordion that closes the first when the
     second opens makes that impossible. Which two start open is the client's
     call, carried on the sections themselves. */
  const [open, setOpen] = useState(openSections)
  const [probe, setProbe] = useState(null)
  const batchId = useId()

  /* The revision the draft stands on. Update commits the draft and the record
     comes back a revision later, trimmed and with the credential moved out of
     reach; the draft rebases on that here, during the render that brings it in,
     rather than the form being thrown away and built again. Remounting would
     close every section the operator opened and wipe the connection test they
     had just read, on the one action they press most. Adding has no record to
     rebase on, so this never fires there. */
  const [syncedRev, setSyncedRev] = useState(record ? record.rev || 0 : 0)
  if (record && (record.rev || 0) !== syncedRev) {
    setSyncedRev(record.rev || 0)
    setD(committed)
    /* Rejections belonged to the draft that has just been replaced. */
    setErrors({})
  }

  /* Editing a field clears that field's rejection and no other. Clearing the
     whole set on the first keystroke would empty the counts on the closed
     headings too, which is where the operator still has work to do. */
  const set = (patch) => {
    setD((p) => ({ ...p, ...patch }))
    setErrors((e) => {
      const keys = Object.keys(patch).filter((k) => e[k])
      if (!keys.length) return e
      const next = { ...e }
      keys.forEach((k) => delete next[k])
      return next
    })
  }

  const dirty = useMemo(() => JSON.stringify(d) !== JSON.stringify(committed), [d, committed])
  const toggleSection = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }))
  const allOpen = SECTIONS.every((s) => open[s.id])
  const setAllSections = (v) => setOpen(SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: v }), {}))

  /* A field switched off by another field is not on screen to be fixed, so it
     neither shows a rejection nor counts against its heading. */
  const err = (key) => (shows(d, key) ? errors[key] : undefined)
  const invalidIn = (section) => section.fields.filter((f) => errors[f] && shows(d, f)).length

  const submit = () => {
    const next = providerErrors(d, rows, record ? record.id : null)
    setErrors(next || {})
    if (next) {
      setOpen((o) => sectionsWithErrors(next).reduce((acc, id) => ({ ...acc, [id]: true }), { ...o }))
      toast('bad', adding ? 'Cannot add provider' : 'Cannot save', 'Fix the highlighted fields.')
      return
    }
    onSubmit(d)
  }

  const runTest = (kind) => {
    const result = kind === 'auth' ? testAuthentication(d) : testConnection(d)
    setProbe({ kind, ...result })
    const label = kind === 'auth' ? 'Authentication' : 'Connection'
    toast(result.ok ? 'ok' : 'warn', `${label} ${result.ok ? 'succeeded' : 'failed'}`, result.summary)
  }

  const canConnect = canTestConnection(d)
  const canAuth = canTestAuthentication(d)
  /* On Edit the stored credential is never sent back to the browser, so the
     bind can only be re-proved against one the operator retypes — which is
     also why the button asks for the same three fields on both screens. */
  const credentialStored = !!record && !!record.credentialStored

  /* What is left to answer. Counted from the starred fields alone, so it never
     disagrees with what Submit will accept, and shown at the top of the
     sections and again on the bar that closes them — the two places somebody
     looks before deciding the form is finished. */
  const progress = requiredProgress(d, credentialStored)
  const leftText = progress.left === 0
    ? 'All required fields answered'
    : `${progress.left} required ${progress.left === 1 ? 'field' : 'fields'} still empty`

  const body = {
    connection: (
      <>
        <Group title="Connection">
          <Field label="Connection URL" required help={HELP.connectionUrl} error={err('connectionUrl')}>
            <TextInput
              className="mono"
              value={d.connectionUrl}
              placeholder={PLACEHOLDER.connectionUrl}
              autoComplete="off"
              onChange={(e) => set({ connectionUrl: e.target.value })}
            />
          </Field>
          <ToggleField
            label="Enable StartTLS"
            help={HELP.startTls}
            on={d.startTls}
            onChange={(v) => set({ startTls: v })}
          />
          <Field label="Use Truststore SPI" help={HELP.truststoreSpi}>
            <Select value={d.truststoreSpi} options={TRUSTSTORE_SPI} onChange={(e) => set({ truststoreSpi: e.target.value })} />
          </Field>
          <ToggleField
            label="Connection pooling"
            help={HELP.connectionPooling}
            on={d.connectionPooling}
            onChange={(v) => set({ connectionPooling: v })}
          />
          <Field label="Connection timeout" help={HELP.connectionTimeout} error={err('connectionTimeout')}>
            <TextInput
              inputMode="numeric"
              value={d.connectionTimeout}
              placeholder={PLACEHOLDER.connectionTimeout}
              onChange={(e) => set({ connectionTimeout: e.target.value })}
            />
          </Field>
          <TestAction
            icon="activity"
            label="Test connection"
            note={canConnect
              ? 'Opens the socket, settles the transport and reads the rootDSE.'
              : 'Enter the connection URL to test it.'}
            disabled={!canConnect}
            onClick={() => runTest('connection')}
          />
        </Group>

        <Group title="Authentication">
          <Field label="Bind type" required help={HELP.bindType}>
            <Select value={d.bindType} options={BIND_TYPES} onChange={(e) => set({ bindType: e.target.value })} />
          </Field>
          <Field
            label="Bind DN"
            required={shows(d, 'bindDn')}
            help={HELP.bindDn}
            error={err('bindDn')}
          >
            <TextInput
              className="mono"
              value={d.bindDn}
              placeholder={PLACEHOLDER.bindDn}
              disabled={!shows(d, 'bindDn')}
              autoComplete="off"
              onChange={(e) => set({ bindDn: e.target.value })}
            />
          </Field>
          {/* The ? carries the client's wording on both screens. The line under
              the control appears only on an Edit that already has a credential,
              where an empty box means "keep it" rather than "not answered". */}
          <Field
            label="Bind credentials"
            required={shows(d, 'bindCredentials')}
            keepHint
            help={HELP.bindCredentials}
            hint={credentialStored
              ? 'The stored credential is hidden. Leave it untouched to keep it, or retype it to change it or to test the authentication.'
              : undefined}
            error={err('bindCredentials')}
          >
            <TextInput
              type="password"
              value={d.bindCredentials}
              disabled={!shows(d, 'bindCredentials')}
              placeholder={credentialStored ? '••••••••••' : ''}
              autoComplete="new-password"
              onChange={(e) => set({ bindCredentials: e.target.value })}
            />
          </Field>
          <TestAction
            icon="key"
            label="Test authentication"
            note={canAuth
              ? 'Connects first, then binds with the DN and credentials above.'
              : 'Enter the connection URL, bind DN and bind credentials to test the bind.'}
            disabled={!canAuth}
            onClick={() => runTest('auth')}
          />
        </Group>

        {probe && (
          <div className="fed-probe">
            <div className="fed-probe-h">
              <Icon name={probe.kind === 'auth' ? 'key' : 'activity'} size={13} />
              <span className="fed-probe-t">
                {probe.kind === 'auth' ? 'Authentication test' : 'Connection test'}
              </span>
              <Pill tone={probe.ok ? 'ok' : 'bad'}>{probe.ok ? 'Passed' : 'Failed'}</Pill>
              <IconButton
                icon="x"
                size="sm"
                className="fed-probe-x"
                label="Dismiss the test result"
                onClick={() => setProbe(null)}
              />
            </div>
            <div className="log-view">
              {probe.steps.map((l, i) => <div className={`lg-${l.tone}`} key={i}>{l.text}</div>)}
            </div>
            <Banner tone={probe.ok ? 'ok' : 'bad'}>
              {probe.kind === 'auth'
                ? probe.ok
                  ? `Authentication succeeded — ${probe.summary}.`
                  : `Authentication failed. ${probe.summary}`
                : probe.ok
                  ? `Connection succeeded — ${probe.summary}.`
                  : `Connection failed. ${probe.summary}`}
            </Banner>
          </div>
        )}
      </>
    ),

    searching: (
      <>
        <Group title="Directory location">
          <Field label="Edit mode" required help={HELP.editMode} error={err('editMode')}>
            <Select
              value={d.editMode}
              options={EDIT_MODES}
              placeholder={PLACEHOLDER.editMode}
              onChange={(e) => set({ editMode: e.target.value })}
            />
          </Field>
          <Field label="Users DN" required help={HELP.usersDn} error={err('usersDn')}>
            <TextInput
              className="mono"
              value={d.usersDn}
              placeholder={PLACEHOLDER.usersDn}
              autoComplete="off"
              onChange={(e) => set({ usersDn: e.target.value })}
            />
          </Field>
          <Field label="Relative user creation DN" help={HELP.relativeCreationDn}>
            <TextInput className="mono" value={d.relativeCreationDn} autoComplete="off" onChange={(e) => set({ relativeCreationDn: e.target.value })} />
          </Field>
        </Group>

        {/* The specification's own note about these four, said where they are
            rather than in a paragraph under the section. */}
        <Group
          title="User attributes"
          note="These four defaults follow the vendor chosen in Select Option. A value you have typed is kept when the vendor changes."
        >
          <Field label="Username LDAP attribute" required help={HELP.usernameAttr} error={err('usernameAttr')}>
            <TextInput className="mono" value={d.usernameAttr} autoComplete="off" onChange={(e) => set({ usernameAttr: e.target.value })} />
          </Field>
          <Field label="RDN LDAP attribute" required help={HELP.rdnAttr} error={err('rdnAttr')}>
            <TextInput className="mono" value={d.rdnAttr} autoComplete="off" onChange={(e) => set({ rdnAttr: e.target.value })} />
          </Field>
          <Field label="UUID LDAP attribute" required help={HELP.uuidAttr} error={err('uuidAttr')}>
            <TextInput className="mono" value={d.uuidAttr} autoComplete="off" onChange={(e) => set({ uuidAttr: e.target.value })} />
          </Field>
          <Field label="User object classes" required help={HELP.userObjectClasses} error={err('userObjectClasses')}>
            <TextInput
              className="mono"
              value={d.userObjectClasses}
              placeholder={PLACEHOLDER.userObjectClasses}
              autoComplete="off"
              onChange={(e) => set({ userObjectClasses: e.target.value })}
            />
          </Field>
        </Group>

        <Group title="Search behaviour">
          <Field label="User LDAP filter" help={HELP.userLdapFilter} error={err('userLdapFilter')}>
            <TextInput
              className="mono"
              value={d.userLdapFilter}
              placeholder={PLACEHOLDER.userLdapFilter}
              autoComplete="off"
              onChange={(e) => set({ userLdapFilter: e.target.value })}
            />
          </Field>
          <Field label="Search scope" help={HELP.searchScope}>
            <Select value={d.searchScope} options={SEARCH_SCOPES} onChange={(e) => set({ searchScope: e.target.value })} />
          </Field>
          <Field label="Read timeout" help={HELP.readTimeout} error={err('readTimeout')}>
            <TextInput
              inputMode="numeric"
              value={d.readTimeout}
              placeholder={PLACEHOLDER.readTimeout}
              onChange={(e) => set({ readTimeout: e.target.value })}
            />
          </Field>
          <ToggleField label="Pagination" help={HELP.pagination} on={d.pagination} onChange={(v) => set({ pagination: v })} />
          <Field label="Referral" help={HELP.referral}>
            <Select
              value={d.referral}
              options={REFERRALS}
              placeholder={PLACEHOLDER.referral}
              onChange={(e) => set({ referral: e.target.value })}
            />
          </Field>
        </Group>
      </>
    ),

    sync: (
      <Group rows>
        <ToggleRow label="Import users" help={HELP.importUsers} on={d.importUsers} onChange={(v) => set({ importUsers: v })} />
        <ToggleRow label="Sync Registrations" help={HELP.syncRegistrations} on={d.syncRegistrations} onChange={(v) => set({ syncRegistrations: v })} />
        {/* The one field in this section that is not a switch keeps its place in
            the client's order — it is a row like the rest, with a number box
            where the switch would be. */}
        <SettingRow label="Batch size" help={HELP.batchSize} htmlFor={batchId} error={err('batchSize')}>
          <TextInput
            id={batchId}
            className="fed-row-num"
            inputMode="numeric"
            value={d.batchSize}
            onChange={(e) => set({ batchSize: e.target.value })}
          />
        </SettingRow>
        <ToggleRow
          label="Remove invalid users during searches"
          help={HELP.removeInvalid}
          on={d.removeInvalid}
          onChange={(v) => set({ removeInvalid: v })}
        />
        <ToggleRow
          label="Periodic full sync"
          help={HELP.periodicFullSync}
          on={d.periodicFullSync}
          onChange={(v) => set({ periodicFullSync: v })}
        />
        <ToggleRow
          label="Periodic changed users sync"
          help={HELP.periodicChangedSync}
          on={d.periodicChangedSync}
          onChange={(v) => set({ periodicChangedSync: v })}
        />
      </Group>
    ),

    kerberos: (
      <Group rows>
        <ToggleRow
          label="Allow Kerberos authentication"
          help={HELP.allowKerberos}
          on={d.allowKerberos}
          onChange={(v) => set({ allowKerberos: v })}
        />
        <ToggleRow
          label="Use Kerberos for password authentication"
          help={HELP.kerberosPasswordAuth}
          on={d.kerberosPasswordAuth}
          onChange={(v) => set({ kerberosPasswordAuth: v })}
        />
      </Group>
    ),

    cache: (
      <Group>
        <Field label="Cache policy" help={HELP.cachePolicy}>
          <Select value={d.cachePolicy} options={CACHE_POLICIES} onChange={(e) => set({ cachePolicy: e.target.value })} />
        </Field>
      </Group>
    ),

    advanced: (
      <Group rows>
        <ToggleRow
          label="Enable the LDAPv3 password modify extended operation"
          help={HELP.ldapv3PasswordModify}
          on={d.ldapv3PasswordModify}
          onChange={(v) => set({ ldapv3PasswordModify: v })}
        />
        <ToggleRow
          label="Validate password policy"
          help={HELP.validatePasswordPolicy}
          on={d.validatePasswordPolicy}
          onChange={(v) => set({ validatePasswordPolicy: v })}
        />
        <ToggleRow label="Trust Email" help={HELP.trustEmail} on={d.trustEmail} onChange={(v) => set({ trustEmail: v })} />
        <ToggleRow
          label="Connection trace"
          help={HELP.connectionTrace}
          on={d.connectionTrace}
          onChange={(v) => set({ connectionTrace: v })}
        />
      </Group>
    ),
  }

  return (
    <>
      <PageBar
        title={adding ? 'Add Provider' : `Edit Provider - ${record.name}`}
        crumbs={[{ label: 'External User Federation', to: BASE }, { label: adding ? 'Add' : record.name }]}
      />
      <div className="stack">
        <Card>
          <Identity d={d} set={set} errors={errors} />
        </Card>

        <Card flush>
          {/* The form's own top edge: what is left, and one control for six
              headings. Without it the only way to see a closed section is to
              press each one. */}
          <div className="fed-form-h">
            <div className="fed-form-p">
              <span className="fed-form-t" data-done={progress.left === 0 || undefined}>{leftText}</span>
              <Meter value={progress.total ? (progress.done / progress.total) * 100 : 0} tone={progress.left === 0 ? 'ok' : undefined} />
            </div>
            <Button size="sm" variant="ghost" onClick={() => setAllSections(!allOpen)}>
              {allOpen ? 'Collapse all' : 'Expand all'}
            </Button>
          </div>

          {SECTIONS.map((s) => (
            <Section
              key={s.id}
              section={s}
              open={!!open[s.id]}
              invalid={invalidIn(s)}
              emptyRequired={requiredEmptyIn(d, s.required, credentialStored)}
              onToggle={() => toggleSection(s.id)}
            >
              {body[s.id]}
            </Section>
          ))}
        </Card>

        <StickyActions
          flow
          dirty={dirty}
          message={progress.left > 0
            ? leftText
            : (adding
              ? (dirty ? 'Ready to submit' : 'Nothing entered yet')
              : (dirty ? 'Unsaved changes' : 'No changes'))}
        >
          <Button variant="pri" onClick={submit}>{adding ? 'Submit' : 'Update'}</Button>
          <Button onClick={() => navigate(BASE)}>Cancel</Button>
        </StickyActions>
      </div>
    </>
  )
}

export function AddProvider({ rows, onCreate }) {
  return <ProviderForm record={null} rows={rows} onSubmit={onCreate} />
}

export default function EditProvider({ record, rows, onSave }) {
  return <ProviderForm record={record} rows={rows} onSubmit={(draft) => onSave(record.id, draft)} />
}
