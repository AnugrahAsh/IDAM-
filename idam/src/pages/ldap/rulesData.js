import { USERS } from '../../data/seed'
import { blankModel, modelText } from '../conditions/conditionModel'
import { attributes as identityAttributes, matchUsers } from '../policy/policyPageData'

// ---------------------------------------------------------------------------
// Provisioning rules
//
// "Identities matching this condition belong in this OU of this application."
// The condition is held both as a structured clause list and as the expression
// the engine evaluates, so the builder and the raw text can never disagree.
// ---------------------------------------------------------------------------

// A provisioning rule matches *identities*, exactly as a dynamic policy does,
// so it is written against the same identity attribute registry and evaluated
// by the same engine. It used to carry a fifth hand-written clause list with
// four operators of its own, which meant "contains" behaved differently here
// than three screens away.
export const ruleAttributes = identityAttributes

export const blankCondition = () => blankModel(identityAttributes()[0].id)

export const expressionOf = (model) => modelText(model)

/* The count the rule would provision right now — the answer an operator wants
   before saving a condition, not after the first run. */
export const matchesFor = (model, users = USERS) => matchUsers(model, users)

/* A rule written before the shared model existed carries `clauses` and `join`;
   it reads back as a single group so nothing has to be migrated by hand. */
export const conditionOf = (rule) => {
  if (rule.condition && Array.isArray(rule.condition.groups)) return rule.condition
  const rules = (rule.clauses || []).map((c) => ({
    attribute: c.field,
    operator: c.op === 'startsWith' ? 'starts with' : c.op,
    value: c.value,
  }))
  return { join: rule.join || 'AND', groups: [{ join: rule.join || 'AND', rules }] }
}

export const buildRules = (apps) => {
  const app = apps[0] || { id: 1, displayName: 'Corporate Directory', baseDn: 'dc=tanflow,dc=com' }
  const second = apps[1] || app
  return [
    {
      id: 1,
      name: 'support_desk',
      applicationId: app.id,
      application: app.displayName,
      ouDn: `ou=support,${app.baseDn}`,
      condition: { join: 'AND', groups: [{ join: 'AND', rules: [{ attribute: 'department', operator: '=', value: 'Support' }] }] },
      createdOn: '2026-05-16 15:28',
    },
    {
      id: 2,
      name: 'finance_sox_scope',
      applicationId: app.id,
      application: app.displayName,
      ouDn: `ou=finance,${app.baseDn}`,
      condition: {
        join: 'AND',
        groups: [{
          join: 'AND',
          rules: [
            { attribute: 'department', operator: '=', value: 'Finance' },
            { attribute: 'status', operator: '=', value: 'Active' },
          ],
        }],
      },
      createdOn: '2026-06-02 09:14',
    },
    {
      id: 3,
      name: 'contractor_intake',
      applicationId: second.id,
      application: second.displayName,
      ouDn: `ou=contractors,${second.baseDn}`,
      condition: {
        join: 'OR',
        groups: [{
          join: 'OR',
          rules: [
            { attribute: 'employeeType', operator: '=', value: 'Contractor' },
            { attribute: 'employeeType', operator: '=', value: 'External' },
          ],
        }],
      },
      createdOn: '2026-07-24 11:13',
    },
  ]
}
