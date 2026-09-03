export const slug = (v) => String(v).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

/*
 * Multi-level lookups. The level names are free text typed at creation: they
 * become the CSV column prefixes (`country_option`, `country_value`) and the
 * level labels shown throughout the product, and they cannot be changed
 * afterwards because the table holding the rows was shaped by them.
 */
export const MULTI_LOOKUPS = [
  { id: 1, name: 'Operating structure', levels: ['region', 'business_unit', 'site'], updated: '2026-06-18' },
  { id: 2, name: 'Residential geography', levels: ['country', 'state', 'city'], updated: '2026-05-02' },
  { id: 3, name: 'Office structure', levels: ['office_level', 'department'], updated: '2026-04-21' },
  { id: 4, name: 'Workforce classification', levels: ['employee_type', 'department'], updated: '2026-03-09' },
  { id: 5, name: 'Support routing', levels: ['business_unit', 'department', 'office_level'], updated: '2026-07-14' },
  { id: 6, name: 'Vendor territory', levels: ['country', 'state'], updated: '2025-11-27' },
]

/*
 * A row is one complete path through the hierarchy, not a list per level, so
 * the country repeats on every one of its states. The cascade at form-fill
 * time is derived by filtering these rows.
 */
export const MULTI_ROWS = {
  2: [
    ['India', 'IN', 'Maharashtra', 'MH', 'Mumbai', 'BOM'],
    ['India', 'IN', 'Maharashtra', 'MH', 'Pune', 'PNQ'],
    ['India', 'IN', 'Karnataka', 'KA', 'Bengaluru', 'BLR'],
    ['India', 'IN', 'Karnataka', 'KA', 'Mysuru', 'MYQ'],
    ['India', 'IN', 'Delhi', 'DL', 'New Delhi', 'DEL'],
    ['India', 'IN', 'Tamil Nadu', 'TN', 'Chennai', 'MAA'],
    ['India', 'IN', 'Uttarakhand', 'UK', 'Dehradun', 'DED'],
    ['Singapore', 'SG', 'Central', 'SG-CE', 'Singapore', 'SIN'],
    ['United Arab Emirates', 'AE', 'Dubai', 'AE-DU', 'Dubai', 'DXB'],
    ['United Kingdom', 'GB', 'England', 'GB-EN', 'London', 'LON'],
  ],
  6: [
    ['India', 'IN', 'Maharashtra', 'MH'],
    ['India', 'IN', 'Karnataka', 'KA'],
    ['United Kingdom', 'GB', 'England', 'GB-EN'],
  ],
}

/*
 * Smart-populate rule sets. A rule set is a reusable named object: many
 * attributes may point at the same one, which is why it has its own tab while
 * pre-populate is only an input type on an attribute.
 *
 * Every condition compares against the lookup's stored value rather than its
 * option label. Writing the label parses cleanly and then never matches, which
 * is the failure this module is most often reported for.
 */
export const SMART_RULES = [
  {
    id: 1,
    name: 'Business unit from department',
    conditions: [
      { condition: "department = 'engineering' OR department = 'it_operations'", value: 'technology' },
      { condition: "department = 'sales'", value: 'commercial' },
      { condition: "department = 'finance' OR department = 'compliance'", value: 'corporate' },
    ],
  },
  {
    id: 2,
    name: 'Office level from employee type',
    conditions: [
      { condition: "employeeType = 'contractor'", value: 'field' },
      { condition: "employeeType = 'service_account'", value: 'corporate' },
    ],
  },
  {
    id: 3,
    name: 'Region from country',
    conditions: [
      { condition: "country = 'india' OR country = 'singapore'", value: 'apac' },
      { condition: "country = 'united_arab_emirates' OR country = 'united_kingdom'", value: 'emea' },
    ],
  },
]
