import { ME } from '../../data/seed'

export const render = (text, tone) => text
  .replace(/\{\{firstName\}\}/g, 'Shubham')
  .replace(/\{\{lastName\}\}/g, 'Jain')
  .replace(/\{\{username\}\}/g, ME.username)
  .replace(/\{\{email\}\}/g, ME.email)
  .replace(/\{\{organization\}\}/g, ME.organization)
  .replace(/\{\{tenantName\}\}/g, 'Tanflow Corp')
  .replace(/\{\{supportEmail\}\}/g, 'support@tanflow.com')
  .replace(/\{\{expiryHours\}\}/g, '24')
  .replace(/\{\{actionUrl\}\}/g, tone === 'plain' ? 'https://id.tanflow.com/a/8f21c4' : 'ACTION_LINK')

