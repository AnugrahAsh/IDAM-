/**
 * The scheduler service catalogue.
 *
 * This is the contract the whole module renders from — the console equivalent
 * of `GET /apis/api/v1/schedulers/services/get`. Each service declares its own
 * metadata and its own configuration schema; the Service Configuration panel
 * is generated from `configSchema` at runtime rather than hand-written per
 * service. Adding a service, a field or an option is an edit to this file and
 * nothing else.
 *
 * Every field carries `help`: the description shown under it, saying what the
 * field is for and, where it applies, what value to enter — unit, range and an
 * example.
 *
 * `metadata` drives the Execution panel, not just documentation:
 *   retryable            — false locks Retry on failure off
 *   idempotent           — false locks Concurrent Executions off
 *   requiresApplication  — adds a top-level application picker
 *   supportsBatch        — the service reads records in batches
 *   producesItemLogs     — per-record rows land in the execution log
 *
 * Field types in use: string · integer · boolean · date · enum · multi-enum ·
 * string-list · remote-enum. Conditional visibility is `visibleWhen`, a single
 * predicate against another key in the same service's config.
 */

const min = (m) => m * 60000

/* Shared verbatim by the services that report back. Repeating the fields per
   service is how a notification block ends up meaning something slightly
   different on one screen than on the next. */
const notificationGroup = (label = 'Notification') => ({
  group: label,
  fields: [
    {
      key: 'notificationEnabled',
      label: 'Send Notification',
      type: 'boolean',
      default: false,
      help: 'ON emails administrators when the run finishes — for example export ready, run summary or licence findings.',
    },
    {
      key: 'notificationRecipients',
      label: 'Notification Recipients',
      type: 'string-list',
      required: true,
      default: [],
      maxItems: 50,
      placeholder: 'admin, security_team',
      visibleWhen: { key: 'notificationEnabled', equals: true },
      help: 'IDAM usernames to notify; email addresses come from their user profiles. Separate multiple values with commas, e.g. admin, security_team.',
    },
    {
      key: 'notificationTemplate',
      label: 'Email Template Name',
      type: 'string',
      required: true,
      default: '',
      maxLength: 128,
      placeholder: 'Enter template name',
      visibleWhen: { key: 'notificationEnabled', equals: true },
      help: 'Name of an existing email template under Email Management. Enter the exact template name.',
    },
  ],
})

/* Email and SMS queue processors are the same job over two channels. */
const queueProcessorSchema = (channel, provider) => [
  {
    group: 'Throughput',
    fields: [
      {
        key: 'messagesPerRun',
        label: 'Messages Per Run',
        type: 'integer',
        required: true,
        default: 100,
        min: 1,
        max: 5000,
        help: `Maximum stuck ${channel} messages picked up and resent per run. Keep this below your ${provider}’s per-minute limit. 1–5,000, default 100.`,
      },
      {
        key: 'minAgeMinutes',
        label: 'Only Retry Messages Older Than (minutes)',
        type: 'integer',
        default: 2,
        min: 0,
        max: 1440,
        help: 'Only messages waiting longer than this are retried, so brand-new messages go through the normal flow. 0–1,440, e.g. 2.',
      },
    ],
  },
  {
    group: 'Retry',
    fields: [
      {
        key: 'maxDeliveryAttempts',
        label: 'Maximum Delivery Attempts',
        type: 'integer',
        required: true,
        default: 5,
        min: 1,
        max: 20,
        help: 'After this many failed attempts a message is marked permanently failed and no longer retried. 1–20, default 5.',
      },
      {
        key: 'backoffBaseSeconds',
        label: 'Backoff Base (seconds)',
        type: 'integer',
        required: true,
        default: 300,
        min: 10,
        max: 86400,
        help: 'Wait before the first retry, in seconds. It doubles each attempt (300 = 5 min, 10 min, 20 min…). 10–86,400.',
      },
      {
        key: 'backoffCeilingSeconds',
        label: 'Backoff Ceiling (seconds)',
        type: 'integer',
        required: true,
        default: 21600,
        min: 60,
        max: 604800,
        help: 'The longest wait between retries, however many attempts. 21600 = 6 hours. Must be at least the Backoff Base.',
      },
      {
        key: 'staleAttemptMinutes',
        label: 'Treat An Unresolved Attempt As Failed After (minutes)',
        type: 'integer',
        required: true,
        default: 15,
        min: 1,
        max: 1440,
        help: 'A message still "sending" after this long is assumed lost (e.g. a worker crash) and becomes eligible for retry. 1–1,440.',
      },
    ],
  },
  {
    group: 'Behaviour',
    fields: [
      {
        key: 'settleOnly',
        label: 'Settle Only (claim nothing new)',
        type: 'boolean',
        default: false,
        help: `ON only resolves messages already in progress and picks up nothing new. Use while draining the queue or during a ${provider} outage.`,
      },
    ],
  },
]

const SCRIPT_PATTERN = '^[A-Z][A-Z0-9_]{2,63}$'

export const CATALOG = [
  {
    serviceCode: 'CUSTOM_SCRIPT',
    displayName: 'Custom Script',
    legacyQueueName: null,
    permissionCode: 'execute_custom_scripts',
    description: 'Runs a script from the server-side approved script registry. Arbitrary commands are not supported by design.',
    defaultTimeoutMs: min(60),
    metadata: {
      retryable: false,
      requiresApplication: false,
      idempotent: false,
      supportsBatch: false,
      producesItemLogs: true,
    },
    configSchema: [
      {
        group: 'Script',
        fields: [
          {
            key: 'scriptId',
            label: 'Approved Script',
            type: 'remote-enum',
            required: true,
            default: '',
            source: 'scripts',
            maxLength: 64,
            pattern: SCRIPT_PATTERN,
            help: 'The pre-approved script to run. Server operators add scripts to the registry; they can’t be added here. Select a script from the list.',
          },
          {
            key: 'parameters',
            label: 'Script Parameters',
            type: 'string-list',
            default: [],
            maxItems: 30,
            placeholder: 'env=prod, days=30',
            help: 'Values passed to the script as key=value pairs; only parameters the script declares are accepted. Separate multiple values with commas, e.g. env=prod, days=30.',
          },
        ],
      },
      {
        group: 'Execution',
        fields: [
          {
            key: 'timeoutSeconds',
            label: 'Timeout (seconds)',
            type: 'integer',
            required: true,
            default: 600,
            min: 5,
            max: 21600,
            help: 'Maximum time the script process may run, e.g. 600 = 10 minutes. The registry entry’s own limit applies if lower. The run timeout under Execution limits the whole execution.',
          },
          {
            key: 'treatNonZeroExitAsFailure',
            label: 'Non-Zero Exit Code Is A Failure',
            type: 'boolean',
            default: true,
            help: 'ON marks the run as Failed when the script exits with a non-zero code. Turn OFF only if the script uses non-zero codes for information, not errors.',
          },
          {
            key: 'captureOutput',
            label: 'Record Script Output',
            type: 'boolean',
            default: true,
            help: 'ON saves the script’s output and error messages (truncated) to the execution log. Turn OFF if the script prints passwords, tokens or personal data.',
          },
        ],
      },
    ],
  },

  {
    serviceCode: 'DATA_EXPORT',
    displayName: 'Data Export',
    legacyQueueName: null,
    permissionCode: null,
    description: 'Streams IAM data (users, applications, roles, access, audit) to a CSV/Excel/JSON file on a schedule.',
    defaultTimeoutMs: min(240),
    metadata: {
      retryable: true,
      requiresApplication: false,
      idempotent: true,
      supportsBatch: true,
      producesItemLogs: true,
    },
    configSchema: [
      {
        group: 'Selection',
        fields: [
          {
            key: 'dataset',
            label: 'Dataset',
            type: 'enum',
            required: true,
            default: 'USERS',
            options: [
              { value: 'USERS', label: 'Users' },
              { value: 'APPLICATIONS', label: 'Applications' },
              { value: 'ROLES', label: 'Roles' },
              { value: 'ROLE_PERMISSIONS', label: 'Role permissions' },
              { value: 'APPLICATION_GROUP_ACCESS', label: 'Application group access' },
              { value: 'AUDIT_LOGS', label: 'Audit history' },
            ],
            help: 'The type of IAM data to export.',
          },
          {
            key: 'columns',
            label: 'Columns',
            type: 'string-list',
            default: [],
            maxItems: 200,
            placeholder: 'username, email, organization',
            help: 'The columns to include, in order. Leave empty for the dataset’s default columns. Separate multiple values with commas, e.g. username, email, organization. Unknown columns are skipped and reported.',
          },
          {
            key: 'activeOnly',
            label: 'Active Records Only',
            type: 'boolean',
            default: false,
            visibleWhen: { key: 'dataset', equals: 'USERS' },
            help: 'ON exports only active, non-deleted records.',
          },
          {
            key: 'lastNDays',
            label: 'Only Records From The Last N Days',
            type: 'integer',
            default: 0,
            min: 0,
            max: 3650,
            help: 'Export only records created or changed in the last N days. 0 exports all records. 0–3,650; applies to datasets with a timestamp.',
          },
          {
            key: 'maxRecords',
            label: 'Maximum Records',
            type: 'integer',
            required: true,
            default: 1000000,
            min: 1,
            max: 50000000,
            help: 'Safety limit on how many rows are written to one file. Lower it to keep files manageable. 1–50,000,000, default 1,000,000.',
          },
        ],
      },
      {
        group: 'Output',
        fields: [
          {
            key: 'format',
            label: 'Output Format',
            type: 'enum',
            required: true,
            default: 'csv',
            options: [
              { value: 'csv', label: 'CSV' },
              { value: 'xlsx', label: 'Excel (XLSX)' },
              { value: 'jsonl', label: 'JSON Lines' },
              { value: 'json', label: 'JSON' },
            ],
            help: 'File format of the export. CSV for large data or system imports, Excel for people, JSON for integrations.',
          },
          {
            key: 'filenameTemplate',
            label: 'Filename Template',
            type: 'string',
            default: '{name}_{datetime}',
            maxLength: 120,
            help: 'Pattern for the file name. Tokens: {name} {date} {datetime} {timestamp} {executionId}, e.g. users_{date}. The extension is added automatically.',
          },
          {
            key: 'subdirectory',
            label: 'Sub-folder',
            type: 'string',
            default: 'exports',
            maxLength: 60,
            pattern: '^[A-Za-z0-9_\\-/]*$',
            help: 'Folder inside the server’s export directory where files are saved. Letters, numbers, - and _ only, e.g. hr/monthly.',
          },
          {
            key: 'maskSensitiveFields',
            label: 'Mask Sensitive Columns',
            type: 'boolean',
            default: true,
            help: 'ON replaces password- or secret-like values with ********. Turn OFF only with a documented, approved reason.',
          },
          {
            key: 'additionalMaskedFields',
            label: 'Additional Columns To Mask',
            type: 'string-list',
            default: [],
            maxItems: 50,
            placeholder: 'mobile_no, dor',
            help: 'Other columns to hide in the file. Separate multiple values with commas, e.g. mobile_no, dor.',
          },
          {
            key: 'fileRetentionDays',
            label: 'Delete Export Files After (days)',
            type: 'integer',
            default: 30,
            min: 0,
            max: 3650,
            help: 'Exported files are deleted automatically after this many days. 0 keeps them forever. Keep this short — exports contain IAM data.',
          },
        ],
      },
      notificationGroup(),
    ],
  },

  {
    serviceCode: 'DATABASE_BACKUP',
    displayName: 'Database Backup Trigger',
    legacyQueueName: null,
    permissionCode: 'trigger_database_backup',
    description: 'Triggers the deployment’s own backup mechanism (approved script or allow-listed webhook). IDAM never performs the backup itself.',
    defaultTimeoutMs: min(240),
    metadata: {
      retryable: true,
      requiresApplication: false,
      idempotent: false,
      supportsBatch: false,
      producesItemLogs: true,
    },
    configSchema: [
      {
        group: 'Trigger',
        fields: [
          {
            key: 'triggerMode',
            label: 'Trigger Mode',
            type: 'enum',
            required: true,
            default: 'APPROVED_COMMAND',
            options: [
              { value: 'APPROVED_COMMAND', label: 'Run an approved backup script on this server' },
              { value: 'WEBHOOK', label: 'Call an allow-listed backup webhook' },
            ],
            help: 'How the backup is started. IDAM only triggers your existing backup tool; it doesn’t take the backup itself.',
          },
          {
            key: 'scriptId',
            label: 'Approved Backup Script',
            type: 'remote-enum',
            required: true,
            default: '',
            source: 'scripts',
            maxLength: 64,
            pattern: SCRIPT_PATTERN,
            visibleWhen: { key: 'triggerMode', equals: 'APPROVED_COMMAND' },
            help: 'The registered backup script to run. Server operators add scripts; they can’t be added here.',
          },
          {
            key: 'scriptParameters',
            label: 'Additional Script Parameters',
            type: 'string-list',
            default: [],
            maxItems: 20,
            placeholder: 'target=s3, compress=true',
            visibleWhen: { key: 'triggerMode', equals: 'APPROVED_COMMAND' },
            help: 'Extra key=value values for the script; only declared parameters are accepted. Separate multiple values with commas, e.g. target=s3, compress=true.',
          },
          {
            key: 'webhookUrl',
            label: 'Backup Webhook',
            type: 'string',
            required: true,
            default: '',
            maxLength: 500,
            placeholder: 'https://backup.company.com/hooks/idam',
            visibleWhen: { key: 'triggerMode', equals: 'WEBHOOK' },
            help: 'The URL that starts the backup. It must exactly match a URL in SCHEDULER_BACKUP_WEBHOOK_URLS on the server, e.g. https://backup.company.com/hooks/idam.',
          },
        ],
      },
      {
        group: 'Backup',
        fields: [
          {
            key: 'engine',
            label: 'Database Engine',
            type: 'enum',
            required: true,
            default: 'POSTGRESQL',
            options: [
              { value: 'POSTGRESQL', label: 'PostgreSQL' },
              { value: 'MYSQL', label: 'MySQL / MariaDB' },
              { value: 'ORACLE', label: 'Oracle' },
              { value: 'MSSQL', label: 'Microsoft SQL Server' },
              { value: 'DB2', label: 'IBM Db2' },
              { value: 'OTHER', label: 'Other / managed service' },
            ],
            help: 'The database being backed up. It’s recorded on the run and passed to the script if the script accepts it.',
          },
          {
            key: 'backupType',
            label: 'Backup Type',
            type: 'enum',
            required: true,
            default: 'FULL',
            options: [
              { value: 'FULL', label: 'Full' },
              { value: 'INCREMENTAL', label: 'Incremental' },
              { value: 'DIFFERENTIAL', label: 'Differential' },
              { value: 'SNAPSHOT', label: 'Snapshot' },
            ],
            help: 'Full copies everything; Incremental copies changes since the last backup; Differential copies changes since the last full backup; Snapshot takes a storage-level snapshot.',
          },
          {
            key: 'retentionDays',
            label: 'Requested Retention (days)',
            type: 'integer',
            default: 30,
            min: 1,
            max: 3650,
            help: 'How long the backup should be kept, 1–3,650 days. It’s passed as a request; your backup system enforces it.',
          },
        ],
      },
      {
        group: 'Execution',
        fields: [
          {
            key: 'timeoutSeconds',
            label: 'Timeout (seconds)',
            type: 'integer',
            required: true,
            default: 3600,
            min: 30,
            max: 21600,
            help: 'Maximum time to wait for the backup script or webhook to finish, e.g. 3600 = 1 hour. 30–21,600. The run timeout under Execution limits the whole execution.',
          },
          {
            key: 'verifyExitCode',
            label: 'Require A Successful Exit Code',
            type: 'boolean',
            default: true,
            visibleWhen: { key: 'triggerMode', equals: 'APPROVED_COMMAND' },
            help: 'ON marks the run as Failed unless the script exits with 0 or the webhook returns a success status.',
          },
        ],
      },
    ],
  },

  {
    serviceCode: 'DORMANT_ACCOUNT_DETECTION',
    displayName: 'Dormant Account Detection',
    legacyQueueName: null,
    permissionCode: null,
    description: 'Detects accounts inactive beyond a threshold, warns them, and optionally deactivates them when policy allows.',
    defaultTimeoutMs: min(60),
    metadata: {
      retryable: true,
      requiresApplication: false,
      idempotent: true,
      supportsBatch: true,
      producesItemLogs: true,
    },
    configSchema: [
      {
        group: 'Detection',
        fields: [
          {
            key: 'lastActivityAttribute',
            label: 'Last Activity Attribute',
            type: 'string',
            required: true,
            default: 'last_login',
            pattern: '^[a-zA-Z][a-zA-Z0-9_]*$',
            help: 'The user attribute that stores the date of last activity. Must be an existing date attribute, e.g. last_login.',
          },
          {
            key: 'dormancyDays',
            label: 'Dormancy Threshold (days)',
            type: 'integer',
            required: true,
            default: 90,
            min: 1,
            max: 3650,
            help: 'Accounts with no activity for this many days are treated as dormant. 1–3,650, e.g. 90.',
          },
          {
            key: 'treatNeverLoggedInAsDormant',
            label: 'Treat Never-Logged-In Accounts As Dormant',
            type: 'boolean',
            default: false,
            help: 'ON also flags accounts that have never logged in (last activity is empty).',
          },
          {
            key: 'createdOnGraceDays',
            label: 'New Account Grace Period (days)',
            type: 'integer',
            default: 30,
            min: 0,
            max: 3650,
            help: 'Accounts created within this many days are never flagged. 0 means no grace period.',
          },
          {
            key: 'neverDeactivateUsernames',
            label: 'Protected Accounts',
            type: 'string-list',
            default: [],
            maxItems: 200,
            placeholder: 'admin, svc_backup',
            help: 'Usernames that are reported but never deactivated, such as break-glass and service accounts. Separate multiple values with commas, e.g. admin, svc_backup.',
          },
        ],
      },
      {
        group: 'Warning',
        fields: [
          {
            key: 'notifyDormantUsers',
            label: 'Warn Dormant Users',
            type: 'boolean',
            default: false,
            help: 'ON emails each dormant user before their account is deactivated.',
          },
          {
            key: 'warningTemplate',
            label: 'Warning Email Template',
            type: 'string',
            required: true,
            default: '',
            maxLength: 128,
            placeholder: 'Enter template name',
            visibleWhen: { key: 'notifyDormantUsers', equals: true },
            help: 'Name of an existing email template (under Email Management) used for the warning. Enter the exact template name.',
          },
          {
            key: 'warningDaysBefore',
            label: 'Warn This Many Days Before Deactivation',
            type: 'integer',
            required: true,
            default: 14,
            min: 0,
            max: 365,
            visibleWhen: { key: 'notifyDormantUsers', equals: true },
            help: 'How many days before deactivation the warning is sent. 0–365, e.g. 14.',
          },
        ],
      },
      {
        group: 'Deactivation',
        fields: [
          {
            key: 'deactivationEnabled',
            label: 'Deactivate Dormant Accounts',
            type: 'boolean',
            default: false,
            help: 'ON deactivates an account once inactivity passes the threshold plus the warning period. Keep OFF to only detect and report.',
          },
          {
            key: 'syncAccessManager',
            label: 'Sync Access Manager On Deactivation',
            type: 'boolean',
            default: true,
            visibleWhen: { key: 'deactivationEnabled', equals: true },
            help: 'ON also disables the account in the Access Manager (SSO), not only in IDAM.',
          },
        ],
      },
      {
        group: 'Behaviour',
        fields: [
          {
            key: 'maxUsersPerRun',
            label: 'Maximum Users Per Run',
            type: 'integer',
            required: true,
            default: 5000,
            min: 1,
            max: 1000000,
            help: 'Safety limit on accounts processed per run, 1–1,000,000. Any remaining accounts are handled next run.',
          },
          {
            key: 'dryRun',
            label: 'Dry Run',
            type: 'boolean',
            default: false,
            help: 'ON only detects and reports: no warnings are sent and no accounts change. Recommended for the first run.',
          },
        ],
      },
      notificationGroup('Summary Notification'),
    ],
  },

  {
    serviceCode: 'EMAIL_QUEUE_PROCESSOR',
    displayName: 'Email Queue Processor',
    legacyQueueName: null,
    permissionCode: null,
    description: 'Retries undelivered emails with attempt limits, backoff and a dead-letter state.',
    defaultTimeoutMs: min(15),
    metadata: {
      retryable: true,
      requiresApplication: false,
      idempotent: true,
      supportsBatch: true,
      producesItemLogs: true,
    },
    configSchema: queueProcessorSchema('email', 'email provider'),
    note: 'Message retries here are separate from Retry on failure under Execution, which retries the whole scheduler run.',
  },

  {
    serviceCode: 'INACTIVE_USER_CLEANUP',
    displayName: 'Inactive User Cleanup',
    legacyQueueName: null,
    permissionCode: null,
    description: 'Applies an action (report, notify, disable) to users past an inactivity threshold, honouring exclusions.',
    defaultTimeoutMs: min(60),
    metadata: {
      retryable: true,
      requiresApplication: false,
      idempotent: true,
      supportsBatch: true,
      producesItemLogs: true,
    },
    configSchema: [
      {
        group: 'Detection',
        fields: [
          {
            key: 'inactivityDays',
            label: 'Inactivity Threshold (days)',
            type: 'enum',
            required: true,
            default: '90',
            options: [
              { value: '30', label: '30 days' },
              { value: '60', label: '60 days' },
              { value: '90', label: '90 days' },
              { value: '180', label: '180 days' },
              { value: '365', label: '365 days' },
            ],
            help: 'Users with no activity for this long are included.',
          },
          {
            key: 'lastActivityAttribute',
            label: 'Last Activity Attribute',
            type: 'string',
            required: true,
            default: 'last_login',
            pattern: '^[a-zA-Z][a-zA-Z0-9_]*$',
            help: 'The user attribute that stores last activity. Must be an existing date attribute, e.g. last_login.',
          },
          {
            key: 'includeNeverActive',
            label: 'Include Never-Active Accounts',
            type: 'boolean',
            default: false,
            help: 'ON also includes users who have never logged in.',
          },
          {
            key: 'createdOnGraceDays',
            label: 'New Account Grace Period (days)',
            type: 'integer',
            default: 30,
            min: 0,
            max: 3650,
            help: 'Users created within this many days are never included. 0–3,650, default 30.',
          },
        ],
      },
      {
        group: 'Action',
        fields: [
          {
            key: 'action',
            label: 'Action To Perform',
            type: 'enum',
            required: true,
            default: 'REPORT_ONLY',
            options: [
              { value: 'REPORT_ONLY', label: 'Report only (take no action)' },
              { value: 'NOTIFY', label: 'Notify the user only' },
              { value: 'DISABLE', label: 'Disable the account' },
              { value: 'NOTIFY_AND_DISABLE', label: 'Notify the user, then disable the account' },
            ],
            help: 'What happens to each inactive user. Start with "Report only" and change it only after reviewing the report.',
          },
          {
            key: 'userNotificationTemplate',
            label: 'User Notification Template',
            type: 'string',
            required: true,
            default: '',
            maxLength: 128,
            placeholder: 'Enter template name',
            visibleWhen: { key: 'action', in: ['NOTIFY', 'NOTIFY_AND_DISABLE'] },
            help: 'Name of the existing email template sent to affected users. This is separate from the admin summary template.',
          },
          {
            key: 'syncAccessManager',
            label: 'Sync Access Manager On Disable',
            type: 'boolean',
            default: true,
            visibleWhen: { key: 'action', in: ['DISABLE', 'NOTIFY_AND_DISABLE'] },
            help: 'ON also disables the account in the Access Manager (SSO).',
          },
          {
            key: 'terminateSessions',
            label: 'Terminate Active Sessions On Disable',
            type: 'boolean',
            default: true,
            visibleWhen: { key: 'action', in: ['DISABLE', 'NOTIFY_AND_DISABLE'] },
            help: 'ON logs the user out of all active sessions straight away when the account is disabled.',
          },
          {
            key: 'reportRemainingAccess',
            label: 'Report Remaining Application Access',
            type: 'boolean',
            default: true,
            help: 'ON lists the group and application access each processed user still has, so it can be revoked through provisioning.',
          },
        ],
      },
      {
        group: 'Exclusions',
        fields: [
          {
            key: 'excludedUsernames',
            label: 'Never Process These Users',
            type: 'string-list',
            default: [],
            maxItems: 200,
            placeholder: 'admin, svc_sync',
            help: 'Usernames that are always skipped. Separate multiple values with commas, e.g. admin, svc_sync.',
          },
          {
            key: 'excludedRoles',
            label: 'Never Process These Roles',
            type: 'string-list',
            default: [],
            maxItems: 100,
            placeholder: 'Super Admin, Auditor',
            help: 'Users holding these roles are skipped. Separate multiple values with commas, e.g. Super Admin, Auditor.',
          },
          {
            key: 'excludedOrganizations',
            label: 'Never Process These Organizations',
            type: 'string-list',
            default: [],
            maxItems: 100,
            placeholder: 'Tanflow, Support',
            help: 'Members of these organisations are skipped. Enter organisation names or IDs, separated by commas.',
          },
        ],
      },
      {
        group: 'Behaviour',
        fields: [
          {
            key: 'batchSize',
            label: 'Batch Size',
            type: 'integer',
            default: 200,
            min: 1,
            max: 10000,
            help: 'Users fetched and processed per batch, 1–10,000. This overrides the Batch Size under Execution.',
          },
          {
            key: 'maxUsersPerRun',
            label: 'Maximum Users Per Run',
            type: 'integer',
            required: true,
            default: 5000,
            min: 1,
            max: 1000000,
            help: 'Safety limit per run, 1–1,000,000. Any remaining users are processed next run.',
          },
          {
            key: 'dryRun',
            label: 'Dry Run',
            type: 'boolean',
            default: false,
            help: 'ON reports who would be affected without notifying or disabling anyone.',
          },
        ],
      },
      notificationGroup('Summary Notification'),
    ],
  },

  {
    serviceCode: 'LICENSE_VALIDATION',
    displayName: 'License Validation',
    legacyQueueName: null,
    permissionCode: null,
    description: 'Validates the product licence signature, validity window, seat limit and licensed modules, and warns before expiry.',
    defaultTimeoutMs: min(2),
    metadata: {
      retryable: false,
      requiresApplication: false,
      idempotent: true,
      supportsBatch: false,
      producesItemLogs: true,
    },
    configSchema: [
      {
        group: 'Thresholds',
        fields: [
          {
            key: 'expiryWarningDays',
            label: 'Warn Before Expiry (days)',
            type: 'integer',
            required: true,
            default: 30,
            min: 1,
            max: 365,
            help: 'Start warning this many days before the licence expires. 1–365, e.g. 30.',
          },
          {
            key: 'seatWarningPercent',
            label: 'Warn At Seat Usage (%)',
            type: 'integer',
            required: true,
            default: 85,
            min: 1,
            max: 100,
            help: 'Warn when active users reach this percentage of licensed seats. 1–100, e.g. 85.',
          },
        ],
      },
      {
        group: 'Checks',
        fields: [
          {
            key: 'verifySignature',
            label: 'Verify Licence Signature',
            type: 'boolean',
            default: true,
            help: 'ON checks that the licence file is genuine and unaltered. Keep ON in production.',
          },
          {
            key: 'verifyFingerprint',
            label: 'Verify Machine Fingerprint',
            type: 'boolean',
            default: false,
            help: 'ON checks this server is listed in the licence. Turn ON in production; leave OFF in test environments.',
          },
        ],
      },
      {
        group: 'Behaviour',
        fields: [
          {
            key: 'failExecutionOnCritical',
            label: 'Fail The Execution On A Critical Finding',
            type: 'boolean',
            default: false,
            help: 'ON marks the run as Failed if the licence is expired or invalid, so monitoring picks it up. OFF records findings on a successful run.',
          },
        ],
      },
      notificationGroup(),
    ],
  },

  {
    serviceCode: 'RECONCILIATION',
    displayName: 'Reconciliation',
    legacyQueueName: 'reconcileQueue',
    permissionCode: null,
    description: 'Reconciles users of a provisioned application against IDAM using the existing reconciliation engine.',
    defaultTimeoutMs: min(120),
    metadata: {
      retryable: true,
      requiresApplication: true,
      idempotent: false,
      supportsBatch: false,
      producesItemLogs: false,
      applicationField: {
        label: 'Provision Application',
        source: 'provisionApplications',
        placeholder: 'Select a provisioned application',
        help: 'The provisioning application whose user accounts will be compared with IDAM. Select one configured application.',
      },
    },
    configSchema: [
      {
        group: 'Behaviour',
        fields: [
          {
            key: 'skipIfRunning',
            label: 'Skip If Already Running',
            type: 'boolean',
            default: true,
            help: 'ON skips this run if a reconciliation for the same application is still in progress, so jobs don’t overlap.',
          },
        ],
      },
    ],
  },

  {
    serviceCode: 'REPORT_GENERATION',
    displayName: 'Report Generation',
    legacyQueueName: null,
    permissionCode: null,
    description: 'Generates a scheduled IAM report (CSV/Excel/JSON) from the existing report queries and stores it on the server.',
    defaultTimeoutMs: min(60),
    metadata: {
      retryable: true,
      requiresApplication: false,
      idempotent: true,
      supportsBatch: false,
      producesItemLogs: true,
    },
    configSchema: [
      {
        group: 'Report',
        fields: [
          {
            key: 'reportType',
            label: 'Report',
            type: 'enum',
            required: true,
            default: 'AUDIT_LOGS',
            options: [
              { value: 'FAILED_LOGINS', label: 'Failed Login Report' },
              { value: 'SUCCESSFUL_LOGINS', label: 'Successful Login Report' },
              { value: 'LAST_LOGIN', label: 'Last Login Report' },
              { value: 'AUDIT_LOGS', label: 'Audit Log Report' },
              { value: 'GROUP_LOGS', label: 'Group Activity Report' },
              { value: 'EMAIL_LOGS', label: 'Email Delivery Report' },
              { value: 'PAM_LOGS', label: 'PAM Activity Report' },
              { value: 'USER_ROLE_MAPPING', label: 'User / Role Mapping Report' },
              { value: 'SMS_OTP_LOGS', label: 'SMS OTP Report' },
              { value: 'SMS_LOGS', label: 'SMS Delivery Report' },
            ],
            help: 'The report to generate, using the same queries as the Reports page.',
          },
          {
            key: 'dateRangeMode',
            label: 'Date Range',
            type: 'enum',
            required: true,
            default: 'RELATIVE',
            options: [
              { value: 'RELATIVE', label: 'Rolling window (last N days)' },
              { value: 'FIXED', label: 'Fixed start and end date' },
            ],
            help: 'Rolling always covers the latest N days (best for recurring reports). Fixed covers a set period.',
          },
          {
            key: 'lastNDays',
            label: 'Window (days)',
            type: 'integer',
            required: true,
            default: 1,
            min: 1,
            max: 3650,
            visibleWhen: { key: 'dateRangeMode', equals: 'RELATIVE' },
            help: 'Number of days before the run date to include. 1 = yesterday and today; 7 = last week. 1–3,650.',
          },
          {
            key: 'startDate',
            label: 'Start Date',
            type: 'date',
            required: true,
            default: '',
            visibleWhen: { key: 'dateRangeMode', equals: 'FIXED' },
            help: 'First day included in the report.',
          },
          {
            key: 'endDate',
            label: 'End Date',
            type: 'date',
            required: true,
            default: '',
            visibleWhen: { key: 'dateRangeMode', equals: 'FIXED' },
            help: 'Last day included in the report. Must be on or after the Start Date.',
          },
          {
            key: 'filters',
            label: 'Filters',
            type: 'string-list',
            default: [],
            maxItems: 20,
            placeholder: 'entity_type=user, organization=support',
            help: 'Optional key=value filters to narrow the report. Separate multiple values with commas, e.g. entity_type=user, organization=support. Unsupported keys are ignored and reported.',
          },
        ],
      },
      {
        group: 'Output',
        fields: [
          {
            key: 'format',
            label: 'Output Format',
            type: 'enum',
            required: true,
            default: 'csv',
            options: [
              { value: 'csv', label: 'CSV' },
              { value: 'xlsx', label: 'Excel (XLSX)' },
              { value: 'json', label: 'JSON' },
            ],
            help: 'File format of the generated report.',
          },
          {
            key: 'filenameTemplate',
            label: 'Filename Template',
            type: 'string',
            default: '{name}_{datetime}',
            maxLength: 120,
            help: 'File name pattern. Tokens: {name} {date} {datetime} {timestamp} {executionId}. The extension is added automatically.',
          },
          {
            key: 'subdirectory',
            label: 'Sub-folder',
            type: 'string',
            default: '',
            maxLength: 60,
            pattern: '^[A-Za-z0-9_\\-/]*$',
            placeholder: 'security/weekly',
            help: 'Optional folder inside the reports directory, e.g. security/weekly.',
          },
          {
            key: 'fileRetentionDays',
            label: 'Delete Generated Files After (days)',
            type: 'integer',
            default: 90,
            min: 0,
            max: 3650,
            help: 'Report files are deleted automatically after this many days. 0 keeps them forever.',
          },
          {
            key: 'maskedFields',
            label: 'Mask These Columns',
            type: 'string-list',
            default: [],
            maxItems: 50,
            placeholder: 'ip_address, email',
            help: 'Columns whose values are replaced with ********. Separate multiple values with commas, e.g. ip_address, email.',
          },
        ],
      },
      notificationGroup(),
    ],
  },

  {
    serviceCode: 'SCHEDULER_LOG_CLEANUP',
    displayName: 'Scheduler Log Cleanup',
    legacyQueueName: null,
    permissionCode: null,
    description: 'Deletes or archives scheduler execution history older than the configured retention period, in safe batches.',
    defaultTimeoutMs: min(360),
    metadata: {
      retryable: true,
      requiresApplication: false,
      idempotent: true,
      supportsBatch: true,
      producesItemLogs: true,
    },
    configSchema: [
      {
        group: 'Retention',
        fields: [
          {
            key: 'retentionValue',
            label: 'Retention Period',
            type: 'integer',
            required: true,
            default: 90,
            min: 1,
            max: 3650,
            help: 'How long to keep scheduler history before cleanup. Use with Retention Unit, e.g. 90 Days. 1–3,650.',
          },
          {
            key: 'retentionUnit',
            label: 'Retention Unit',
            type: 'enum',
            required: true,
            default: 'days',
            options: [
              { value: 'days', label: 'Days' },
              { value: 'weeks', label: 'Weeks' },
              { value: 'months', label: 'Months (30 days)' },
            ],
            help: 'Unit for the retention period. A month counts as 30 days.',
          },
          {
            key: 'mode',
            label: 'Cleanup Mode',
            type: 'enum',
            required: true,
            default: 'DELETE',
            options: [
              { value: 'DELETE', label: 'Delete' },
              { value: 'ARCHIVE', label: 'Archive only (keep rows)' },
              { value: 'ARCHIVE_AND_DELETE', label: 'Archive then delete' },
            ],
            help: 'Delete removes old rows. Archive only saves them to a compressed file and keeps the rows. Archive then delete saves, checks, then deletes — use it if you need an audit trail.',
          },
          {
            key: 'targets',
            label: 'Tables To Clean',
            type: 'multi-enum',
            required: true,
            default: ['SCHEDULER_EXECUTIONS', 'LEGACY_SCHEDULER_JOBS'],
            options: [
              { value: 'SCHEDULER_EXECUTIONS', label: 'Execution history' },
              { value: 'SCHEDULER_EXECUTION_LOGS', label: 'Per-item execution logs' },
              { value: 'LEGACY_SCHEDULER_JOBS', label: 'Legacy scheduler job rows' },
              { value: 'LEGACY_DEACTIVATION_LOGS', label: 'Legacy deactivation logs' },
            ],
            help: 'Which history tables to clean. Deleting execution history also deletes its per-item logs, so execution history alone is usually enough.',
          },
        ],
      },
      {
        group: 'Performance',
        fields: [
          {
            key: 'batchSize',
            label: 'Rows Per Batch',
            type: 'integer',
            required: true,
            default: 1000,
            min: 100,
            max: 50000,
            help: 'Rows deleted or archived per batch, 100–50,000. Use smaller batches on a busy database.',
          },
          {
            key: 'interBatchSleepMs',
            label: 'Pause Between Batches (ms)',
            type: 'integer',
            default: 200,
            min: 0,
            max: 60000,
            help: 'Wait between batches, in milliseconds, to reduce database load. 0 means no pause.',
          },
          {
            key: 'maxRuntimeSeconds',
            label: 'Maximum Runtime (seconds)',
            type: 'integer',
            required: true,
            default: 600,
            min: 10,
            max: 21600,
            help: 'The cleanup stops safely at this point and the rest is cleaned next run. 10–21,600. Should be less than the run timeout under Execution.',
          },
        ],
      },
    ],
    note: 'Archiving streams rows to a gzipped JSON-Lines file and verifies the checksum before anything is deleted.',
  },

  {
    serviceCode: 'SMS_QUEUE_PROCESSOR',
    displayName: 'SMS Queue Processor',
    legacyQueueName: null,
    permissionCode: null,
    description: 'Retries undelivered SMS with attempt limits, backoff and a dead-letter state.',
    defaultTimeoutMs: min(15),
    metadata: {
      retryable: true,
      requiresApplication: false,
      idempotent: true,
      supportsBatch: true,
      producesItemLogs: true,
    },
    configSchema: queueProcessorSchema('SMS', 'SMS gateway'),
    note: 'Message retries here are separate from Retry on failure under Execution, which retries the whole scheduler run.',
  },

  {
    serviceCode: 'TRUST_RECONCILIATION',
    displayName: 'Trust Reconciliation',
    legacyQueueName: 'trustReconciliationSchedularQueue',
    permissionCode: null,
    description: 'Synchronises users from a trusted source application into IDAM using the existing trust reconciliation engine.',
    defaultTimeoutMs: min(120),
    metadata: {
      retryable: true,
      requiresApplication: true,
      idempotent: false,
      supportsBatch: false,
      producesItemLogs: false,
      applicationField: {
        label: 'Trust Reconciliation Source',
        source: 'trustSources',
        placeholder: 'Select a trusted source',
        help: 'The trusted source application (e.g. HRMS) that IDAM users are created and updated from. Select the application configured under Trust Reconciliation.',
      },
    },
    configSchema: [
      {
        group: 'Behaviour',
        fields: [
          {
            key: 'skipIfRunning',
            label: 'Skip If Already Running',
            type: 'boolean',
            default: true,
            help: 'ON skips this run if a trust reconciliation is still in progress.',
          },
        ],
      },
    ],
  },

  {
    serviceCode: 'USER_DEPROVISIONING_DATE_PROCESSOR',
    displayName: 'User Deprovisioning Date Processor',
    legacyQueueName: 'deactivateUsersQueue',
    permissionCode: null,
    description: 'Deactivates users whose end date / DOR has been reached, terminating sessions and syncing the Access Manager.',
    defaultTimeoutMs: min(30),
    metadata: {
      retryable: true,
      requiresApplication: false,
      idempotent: true,
      supportsBatch: true,
      producesItemLogs: true,
    },
    configSchema: [
      {
        group: 'Selection',
        fields: [
          {
            key: 'endDateAttribute',
            label: 'End Date Attribute',
            type: 'string',
            required: true,
            default: 'dor',
            pattern: '^[a-zA-Z][a-zA-Z0-9_]*$',
            help: 'The user attribute that holds the last working day or date of retirement. Must be an existing date attribute, e.g. dor.',
          },
          {
            key: 'graceDays',
            label: 'Backfill Window (days)',
            type: 'integer',
            default: 7,
            min: 0,
            max: 3650,
            help: 'How many past days to check for end dates that were missed (e.g. during downtime). 0 checks today only.',
          },
          {
            key: 'includeSameDay',
            label: 'Deactivate On The End Date',
            type: 'boolean',
            default: true,
            help: 'ON deactivates the user on the end date itself. OFF deactivates them the day after.',
          },
        ],
      },
      {
        group: 'Cleanup',
        fields: [
          { key: 'syncAccessManager', label: 'Sync Access Manager', type: 'boolean', default: true, help: 'ON also disables the user in the Access Manager (SSO).' },
          { key: 'terminateSessions', label: 'Terminate Active Sessions', type: 'boolean', default: true, help: 'ON logs the user out of all live sessions straight away.' },
          { key: 'reportOutstandingAccess', label: 'Report Outstanding Access', type: 'boolean', default: true, help: 'ON lists the application and group access each deactivated user still has, so it can be revoked.' },
        ],
      },
      {
        group: 'Behaviour',
        fields: [
          {
            key: 'maxUsersPerRun',
            label: 'Maximum Users Per Run',
            type: 'integer',
            required: true,
            default: 5000,
            min: 1,
            max: 1000000,
            help: 'Safety limit per run, 1–1,000,000. Any remaining users are processed next run.',
          },
          { key: 'dryRun', label: 'Dry Run', type: 'boolean', default: false, help: 'ON reports who would be deactivated without changing anything.' },
        ],
      },
    ],
  },

  {
    serviceCode: 'USER_PROVISIONING_DATE_PROCESSOR',
    displayName: 'User Provisioning Date Processor',
    legacyQueueName: null,
    permissionCode: null,
    description: 'Activates users once their joining date is reached, syncing the Access Manager and recording each result.',
    defaultTimeoutMs: min(30),
    metadata: {
      retryable: true,
      requiresApplication: false,
      idempotent: true,
      supportsBatch: true,
      producesItemLogs: true,
    },
    configSchema: [
      {
        group: 'Selection',
        fields: [
          {
            key: 'joiningDateAttribute',
            label: 'Joining Date Attribute',
            type: 'string',
            required: true,
            default: 'doj',
            pattern: '^[a-zA-Z][a-zA-Z0-9_]*$',
            help: 'The user attribute that holds the joining date. Must be an existing date attribute, e.g. doj.',
          },
          {
            key: 'graceDays',
            label: 'Backfill Window (days)',
            type: 'integer',
            default: 7,
            min: 0,
            max: 3650,
            help: 'How many past days to check for missed joining dates. 0 checks today only.',
          },
          {
            key: 'includeFutureSameDay',
            label: 'Include Same-Day Joiners',
            type: 'boolean',
            default: true,
            help: 'ON activates users whose joining date is today. OFF activates them the next day.',
          },
        ],
      },
      {
        group: 'Behaviour',
        fields: [
          { key: 'syncAccessManager', label: 'Sync Access Manager', type: 'boolean', default: true, help: 'ON also enables the user in the Access Manager (SSO).' },
          {
            key: 'maxUsersPerRun',
            label: 'Maximum Users Per Run',
            type: 'integer',
            required: true,
            default: 5000,
            min: 1,
            max: 1000000,
            help: 'Safety limit per run, 1–1,000,000. Any remaining users are processed next run.',
          },
          { key: 'dryRun', label: 'Dry Run', type: 'boolean', default: false, help: 'ON reports who would be activated without changing anything.' },
        ],
      },
    ],
  },

  {
    serviceCode: 'USER_RECONCILIATION',
    displayName: 'User Reconciliation (Existing Applications)',
    legacyQueueName: null,
    permissionCode: null,
    description: 'Compares users between IDAM and configured provisioning apps and creates, updates or removes them by rule.',
    defaultTimeoutMs: min(240),
    metadata: {
      retryable: true,
      requiresApplication: true,
      idempotent: false,
      supportsBatch: true,
      producesItemLogs: true,
      applicationField: {
        label: 'Provision Application',
        source: 'provisionApplications',
        placeholder: 'Select a provisioned application',
        help: 'The provisioning application whose user accounts will be compared with IDAM. Select one configured application.',
        // Reconciling every active application needs no single application.
        optionalWhen: { key: 'applicationScope', equals: 'ALL_ACTIVE' },
      },
    },
    configSchema: [
      {
        group: 'Scope',
        fields: [
          {
            key: 'applicationScope',
            label: 'Applications',
            type: 'enum',
            required: true,
            default: 'SELECTED',
            options: [
              { value: 'SELECTED', label: 'The application selected for this scheduler' },
              { value: 'ALL_ACTIVE', label: 'Every active configured application' },
            ],
            help: 'Which applications to reconcile. One application per scheduler is recommended, so logs, retries and locks stay separate.',
          },
          {
            key: 'applicationTypes',
            label: 'Limit To Application Types',
            type: 'multi-enum',
            default: [],
            options: [
              { value: 'DATABASE', label: 'Database' },
              { value: 'ACTIVE_DIRECTORY', label: 'Active Directory' },
              { value: 'LDAP', label: 'LDAP' },
              { value: 'SCIM', label: 'SCIM' },
              { value: 'REST', label: 'REST / API' },
            ],
            visibleWhen: { key: 'applicationScope', equals: 'ALL_ACTIVE' },
            help: 'Only reconcile applications of these connector types. Leave empty for all types.',
          },
        ],
      },
      {
        group: 'Reconciliation Rules',
        fields: [
          {
            key: 'createMissing',
            label: 'Create Users Missing From The Application',
            type: 'boolean',
            default: false,
            help: 'ON creates accounts in the application for users assigned in IDAM but missing there. The application must allow account creation.',
          },
          {
            key: 'updateChanged',
            label: 'Update Changed Attributes',
            type: 'boolean',
            default: false,
            help: 'ON updates attributes that differ from IDAM. Only attributes marked updatable are compared.',
          },
          {
            key: 'removeInactive',
            label: 'Remove Users Whose IDAM Account Is Inactive',
            type: 'boolean',
            default: false,
            help: 'ON removes accounts from the application when the user is disabled in IDAM. The application must allow removal.',
          },
        ],
      },
      {
        group: 'Performance',
        fields: [
          {
            key: 'pageSize',
            label: 'Users Per Page',
            type: 'integer',
            required: true,
            default: 500,
            min: 50,
            max: 10000,
            help: 'Users read from the application per request, 50–10,000. Lower it if the application is slow or rate-limited.',
          },
          {
            key: 'maxUsersPerApplication',
            label: 'Maximum Users Per Application',
            type: 'integer',
            required: true,
            default: 100000,
            min: 1,
            max: 10000000,
            help: 'Safety limit for very large applications, 1–10,000,000. Users beyond it are skipped this run.',
          },
        ],
      },
      {
        group: 'Behaviour',
        fields: [
          {
            key: 'reportOnly',
            label: 'Report Only (dry run)',
            type: 'boolean',
            default: false,
            help: 'ON records every difference and what would be done, without changing anything. Recommended for the first run.',
          },
        ],
      },
      notificationGroup('Summary Notification'),
    ],
  },
]

export const SERVICES = CATALOG.map((s) => ({
  serviceCode: s.serviceCode,
  displayName: s.displayName,
  legacyQueueName: s.legacyQueueName,
}))

export const BY_CODE = Object.fromEntries(CATALOG.map((s) => [s.serviceCode, s]))

export const serviceFor = (code) => BY_CODE[code] || null

export const serviceName = (code) => (BY_CODE[code] ? BY_CODE[code].displayName : code || '—')

export const SERVICE_OPTIONS = CATALOG.map((s) => ({ value: s.serviceCode, label: s.displayName }))

/** Every field of a service, flattened out of its groups. */
export const fieldsOf = (code) =>
  (serviceFor(code)?.configSchema || []).flatMap((g) => g.fields.map((f) => ({ ...f, group: g.group })))

export const fieldFor = (code, key) => fieldsOf(code).find((f) => f.key === key)

/**
 * The visibility rule the schema uses.
 *
 * `visibleWhen: { key, equals }` or `{ key, in: [...] }` — against another key
 * in the same service's config.
 */
export const matchesRule = (rule, config = {}) => {
  if (!rule) return true
  const v = String(config[rule.key])
  if (Array.isArray(rule.in)) return rule.in.map(String).includes(v)
  return v === String(rule.equals)
}

export const isVisible = (field, config = {}) => matchesRule(field.visibleWhen, config)

/** Whether a service needs its top-level application chosen for this config. */
export const applicationRequired = (code, config = {}) => {
  const meta = serviceFor(code)?.metadata
  if (!meta?.requiresApplication) return false
  const optional = meta.applicationField?.optionalWhen
  return !(optional && matchesRule(optional, config))
}

/** A service's declared defaults, materialised as a config object. */
export const defaultConfig = (code) => {
  const out = {}
  fieldsOf(code).forEach((f) => {
    out[f.key] = Array.isArray(f.default) ? [...f.default] : f.default
  })
  return out
}

/** Required fields that are visible and empty — what blocks a save. */
export const configIssues = (code, config = {}) =>
  fieldsOf(code)
    .filter((f) => f.required && isVisible(f, config))
    .filter((f) => {
      const v = config[f.key]
      if (Array.isArray(v)) return v.length === 0
      return v === '' || v == null
    })
    .map((f) => f.label)
