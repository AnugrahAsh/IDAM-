import { useMemo } from 'react'
import Banner from '../../components/primitives/Banner'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Pill from '../../components/primitives/Pill'
import SearchSelect from '../../components/primitives/SearchSelect'
import Select from '../../components/primitives/Select'
import Avatar from '../../components/primitives/Avatar'
import { num } from '../../lib/format'
import { USERS } from '../../data/seed'
import ConditionBuilder from '../conditions/ConditionBuilder'
import { buildAttributes } from '../conditions/conditionModel'
import { OPERATORS, attributes } from '../policy/policyPageData'
import { AUDIENCES } from './commsData'
import {
  AUDIENCE_MODES, audienceIssue, describeAudience, matchedUsers, reachIsExact, reachOf, userOptions,
} from './audienceModel'

// ---------------------------------------------------------------------------
// One audience control, shared by announcements and quick links.
//
// The three modes are laid out as a choice rather than hidden behind a sentinel
// option in a dropdown, because "specific people" and "matching a condition"
// are not more members of the list of standing groups — they are different
// kinds of answer, and burying them in the same select is what made the old
// "Match an attribute…" entry so easy to miss.
// ---------------------------------------------------------------------------

export default function AudiencePicker({
  value, onChange, idPrefix = 'aud', label = 'Audience', hint,
}) {
  const catalog = useMemo(() => buildAttributes(attributes()), [])
  const options = useMemo(() => userOptions(), [])
  const set = (patch) => onChange({ ...value, ...patch })

  const reach = reachOf(value)
  const exact = reachIsExact(value)
  const issue = audienceIssue(value)
  const picked = matchedUsers(value)

  return (
    <div className="stack aud">
      <Field label={label} hint={hint}>
        <div className="aud-modes" role="radiogroup" aria-label={label}>
          {AUDIENCE_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={value.mode === m.id}
              className="aud-mode"
              data-on={value.mode === m.id || undefined}
              onClick={() => set({ mode: m.id })}
            >
              <span className="aud-mode-ic"><Icon name={m.icon} size={14} /></span>
              <span className="aud-mode-m">
                <span className="aud-mode-t">{m.label}</span>
                <span className="aud-mode-s">{m.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </Field>

      {value.mode === 'audience' && (
        <Field label="Standing group" htmlFor={`${idPrefix}-group`} hint="Maintained by the platform, and resolved each time the audience is evaluated.">
          <Select
            id={`${idPrefix}-group`}
            value={value.audience}
            options={AUDIENCES}
            onChange={(e) => set({ audience: e.target.value })}
          />
        </Field>
      )}

      {value.mode === 'users' && (
        <>
          <Field
            label="People"
            required
            htmlFor={`${idPrefix}-users`}
            hint="Search by name or username. Everyone chosen here sees it; nobody else does."
          >
            <SearchSelect
              id={`${idPrefix}-users`}
              multiple
              value={value.users || []}
              options={options}
              placeholder="Select people"
              searchPlaceholder="Search by name or username…"
              onChange={(e) => set({ users: e.target.value })}
            />
          </Field>
          {picked.length > 0 && (
            <div className="aud-chips">
              {picked.map((u) => (
                <span className="aud-chip" key={u.id}>
                  <Avatar first={u.firstName} last={u.lastName} size="sm" />
                  <span className="aud-chip-m">
                    <b>{u.firstName} {u.lastName}</b>
                    <span className="mono">{u.username}</span>
                  </span>
                  <IconButton
                    icon="x"
                    size="sm"
                    label={`Remove ${u.firstName} ${u.lastName}`}
                    onClick={() => set({ users: (value.users || []).filter((id) => String(id) !== String(u.id)) })}
                  />
                </span>
              ))}
              <button
                type="button"
                className="link aud-clear"
                onClick={() => set({ users: [] })}
              >
                Clear all
              </button>
            </div>
          )}
        </>
      )}

      {value.mode === 'condition' && (
        /* The same builder as Dynamic Policy and Orphan Accounts, over the same
           identity attribute registry — an operator who can write one rule can
           write all of them, and reads them the same way. */
        <ConditionBuilder
          model={value.condition}
          onChange={(next) => set({ condition: next })}
          catalog={catalog}
          operators={OPERATORS}
          noun="condition"
          nounPlural="conditions"
          idPrefix={`${idPrefix}-cond`}
          summary={(
            <span className="t-xs t-mut">
              <b className="num">{num(matchedUsers(value).length)}</b> of {num(USERS.length)} identities match right now
            </span>
          )}
        />
      )}

      <div className="aud-reach">
        <span className="aud-reach-ic"><Icon name="users" size={14} /></span>
        <span className="aud-reach-m">
          <b className="num">{num(reach)}</b>
          <span>{exact ? 'identities in scope' : 'identities, estimated by the platform'}</span>
        </span>
        <span className="spacer" />
        <Pill tone={issue ? 'warn' : 'acc'}>{describeAudience(value)}</Pill>
      </div>

      {issue && <Banner tone="warn">{issue}</Banner>}
    </div>
  )
}
