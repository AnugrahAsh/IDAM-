import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import wordmark from '../../assets/tanflow-wordmark-white.png'
import ScreenGallery from './ScreenGallery'

const BASE = '/iam/additional/emailTemplates'
const SUPPORT = 'business.tanflow@gmail.com'
const SECURITY = 'security.tanflow@gmail.com'

/** A template placeholder, shown the way the sending service receives it. */
const V = ({ n }) => <span className="xp-var">{`{{${n}}}`}</span>

function Mail({ title, sub, badge, badgeTone = 'acc', children, footer = 'This is an automated message. Please do not reply to this email.' }) {
  return (
    <article className="xp-mail">
      <header className="xp-mail-h">
        <img src={wordmark} alt="Tanflow" />
        <h2>{title}</h2>
        {sub && <span style={{ fontSize: 13, color: 'var(--shell-mut)' }}>{sub}</span>}
      </header>
      <div className="xp-mail-b">
        {badge && <span style={{ alignSelf: 'flex-start' }}><Pill tone={badgeTone}>{badge}</Pill></span>}
        {children}
      </div>
      <footer className="xp-mail-f">
        <span>© 2026 Tanflow. All rights reserved.</span>
        <span>{footer}</span>
        <nav><a>Privacy policy</a><a>Terms &amp; conditions</a></nav>
      </footer>
    </article>
  )
}

function Help({ security = true }) {
  return (
    <div className="xp-mail-help">
      <b style={{ color: 'var(--ink)' }}>Need help?</b>
      <span>Email: <a className="link">{SUPPORT}</a></span>
      {security && <span>Security concerns: <a className="link">{SECURITY}</a></span>}
    </div>
  )
}

const Cta = ({ children }) => <span className="xp-mail-cta">{children}</span>

function Kv({ rows }) {
  return (
    <dl className="xp-mail-kv">
      {rows.map(([k, v]) => [<dt key={`${k}-t`}>{k}</dt>, <dd key={`${k}-d`}>{v}</dd>])}
    </dl>
  )
}

function Frame({ screen, children }) {
  return (
    <div style={{ width: '100%' }}>
      <div className="xp-mail-meta">
        <Tag>Subject</Tag>
        <span className="t-sm" style={{ color: 'var(--ink)', fontWeight: 600 }}>{screen.subject}</span>
        <span style={{ flex: 1 }} />
        <span className="t-xs" style={{ color: 'var(--mut)' }}>From no-reply@tanflow.com</span>
      </div>
      {children}
    </div>
  )
}

export const EMAIL_SCREENS = [
  {
    id: 'password-reset', group: 'Account & password', label: 'Password reset request', subject: 'Password modification request',
    render: () => (
      <Mail title="Password modification" badge="Password reset">
        <p className="xp-mail-hello">Hello <V n="username" />,</p>
        <p>We received a request to reset the password for your Tanflow account. Click the button below to choose a new password.</p>
        <Cta>Reset password</Cta>
        <p>Or copy this link into your browser:</p>
        <div className="xp-mail-url"><V n="resetPasswordLink" /></div>
        <div className="xp-mail-box" data-tone="warn"><b>Didn't request this?</b><span>You can ignore this email — your password will not change. The link expires in <V n="linkExpire" />.</span></div>
        <Help />
      </Mail>
    ),
  },
  {
    id: 'otp-code', group: 'Account & password', label: 'OTP verification code', subject: 'Your verification code',
    render: () => (
      <Mail title="OTP verification code" badge="Verification">
        <p className="xp-mail-hello">Hello <V n="username" />,</p>
        <p>Use the one-time password below to continue.</p>
        <Kv rows={[['Purpose', 'Forgot password request']]} />
        <span className="xp-mail-code"><V n="otpCode" /></span>
        <p style={{ textAlign: 'center' }}>Valid for <V n="validityMinutes" /> minutes. Never share this code with anyone, including Tanflow staff.</p>
        <Help />
      </Mail>
    ),
  },
  {
    id: 'password-setup', group: 'Account & password', label: 'Password setup', subject: 'Set up your Tanflow password',
    render: () => (
      <Mail title="Set up your password" badge="Action required" badgeTone="warn">
        <p className="xp-mail-hello">Hello <V n="username" />,</p>
        <p>Your Tanflow account has been created. Set a password to activate it.</p>
        <Cta>Set password</Cta>
        <div className="xp-mail-url"><V n="setPasswordLink" /></div>
        <div className="xp-mail-box" data-tone="warn"><span>This link expires in <V n="linkExpire" />. After that, ask your administrator for a new one.</span></div>
        <Help />
      </Mail>
    ),
  },
  {
    id: 'account-recovery', group: 'Account & password', label: 'Account recovery', subject: 'We found your account',
    render: () => (
      <Mail title="Account recovery" sub="Your account information has been located" badge="Account found" badgeTone="ok">
        <p className="xp-mail-hello">We found your account!</p>
        <p>Based on the information you provided during the recovery process, we've located the following account associated with you.</p>
        <div className="xp-mail-box">
          <b>Your account credentials</b>
          <Kv rows={[['Username', <V key="u" n="username" />], ['Email address', <V key="e" n="email" />], ['Account created', <V key="c" n="accountCreatedDate" />]]} />
        </div>
        <div className="xp-mail-box" data-tone="warn">
          <b>Forgot your password too?</b>
          <span>No worries. Use the button below to reset your password — you'll need your username or email address.</span>
        </div>
        <Cta>Reset your password</Cta>
        <p style={{ fontSize: 12 }}>Or copy this link: <V n="passwordResetLink" /></p>
        <div className="xp-mail-box">
          <b>Next steps to log in</b>
          <ol className="xp-mail-list">
            <li>Go to the login page: <V n="loginPageUrl" /></li>
            <li>Enter your username <V n="username" /> or email <V n="email" /></li>
            <li>If you remember your password, enter it and log in</li>
            <li>If you forgot your password, use “Reset your password” above</li>
          </ol>
        </div>
        <div className="xp-mail-box" data-tone="bad">
          <b>Important security information</b>
          <ul className="xp-mail-list">
            <li>Didn't request this recovery? Someone may have tried to access your account. Secure your account now.</li>
            <li>Save this email in a secure place, or remove it after noting down your credentials.</li>
            <li>Never share your username or email with anyone you don't trust.</li>
            <li>For additional security, enable two-factor authentication after logging in.</li>
          </ul>
        </div>
        <div className="xp-mail-help">
          <b style={{ color: 'var(--ink)' }}>Still having trouble?</b>
          <span>If you're unable to access your account after trying these steps, our support team can help.</span>
          <span>Account recovery support: <a className="link">recovery@tanflow.com</a></span>
          <span>Phone support: +1 (555) 123-4567</span>
        </div>
        <div className="xp-mail-ip">
          <span>Requested from IP <V n="requestIpAddress" /></span>
          <span>On <V n="requestDate" /></span>
          <span>Recovery reference <V n="recoveryReferenceId" /></span>
        </div>
      </Mail>
    ),
  },
  {
    id: 'welcome', group: 'Account & password', label: 'Welcome user', subject: 'Welcome to Tanflow',
    render: () => (
      <Mail title="Welcome to Tanflow" badge="New account" badgeTone="ok">
        <p className="xp-mail-hello">Welcome, <V n="username" />!</p>
        <p>Your account is ready. Here are your sign-in details.</p>
        <div className="xp-mail-box"><Kv rows={[['Username', <V key="u" n="username" />], ['Email', <V key="e" n="email" />]]} /></div>
        <div className="xp-mail-box">
          <b>What's next</b>
          <ol className="xp-mail-list">
            <li>Sign in and set your password.</li>
            <li>Set up multi-factor authentication.</li>
            <li>Review the applications assigned to you.</li>
          </ol>
        </div>
        <Cta>Sign in to Tanflow</Cta>
        <Help />
      </Mail>
    ),
  },
  {
    id: 'profile-updated', group: 'Security', label: 'Profile updated', subject: 'Your profile was updated',
    render: () => (
      <Mail title="Profile updated" badge="Account change">
        <p className="xp-mail-hello">Hello <V n="username" />,</p>
        <p>Details on your Tanflow profile were changed.</p>
        <div className="xp-mail-box"><Kv rows={[['Modified by', <V key="b" n="last_modified_by" />], ['Modified on', <V key="o" n="last_modified_on" />]]} /></div>
        <div className="xp-mail-box">
          <b>Security checklist</b>
          <ul className="xp-mail-list">
            <li>Review your profile and confirm the change is expected.</li>
            <li>If you don't recognise it, reset your password straight away.</li>
            <li>Contact your administrator or our security team.</li>
          </ul>
        </div>
        <Help />
      </Mail>
    ),
  },
  {
    id: 'password-changed', group: 'Security', label: 'Security alert: password change', subject: 'Security alert: your password was changed',
    render: () => (
      <Mail title="Security alert" sub="Password change" badge="Security alert" badgeTone="bad">
        <p className="xp-mail-hello">Hello <V n="username" />,</p>
        <p>The password for your <V n="organization" /> account was just changed.</p>
        <div className="xp-mail-box">
          <b>Change details</b>
          <Kv rows={[['Changed on', <V key="d" n="changeDate" />], ['IP address', <V key="i" n="ipAddress" />], ['Device', <V key="v" n="device" />]]} />
        </div>
        <div className="xp-mail-box" data-tone="bad"><b>Wasn't you?</b><span>Reset your password immediately and contact the security team.</span></div>
        <div className="xp-mail-box">
          <b>Recommendations</b>
          <ul className="xp-mail-list">
            <li>Use a unique password you don't use elsewhere.</li>
            <li>Turn on multi-factor authentication.</li>
            <li>Review recent sign-in activity.</li>
          </ul>
        </div>
        <Cta>Review account activity</Cta>
        <Help />
      </Mail>
    ),
  },
  {
    id: 'failed-logins', group: 'Security', label: 'Multiple failed login attempts', subject: 'Multiple failed login attempts on your account',
    render: () => (
      <Mail title="Failed login attempts" badge="Security alert" badgeTone="bad">
        <p className="xp-mail-hello">Hello <V n="username" />,</p>
        <p>We detected several unsuccessful attempts to sign in to your account.</p>
        <div className="xp-mail-box" data-tone="warn">
          <Kv rows={[
            ['Failed attempts', <V key="a" n="failed_attempts" />],
            ['Account status', <V key="s" n="active_status" />],
            ['Account locked', <V key="l" n="account_lock" />],
            ['Last attempt', <V key="t" n="failed_attempt_time" />],
          ]}
          />
        </div>
        <p>If this was you, you can try again once the lock period ends or reset your password. If not, reset your password now.</p>
        <Cta>Reset password</Cta>
        <Help />
      </Mail>
    ),
  },
  {
    id: 'smtp-test', group: 'Security', label: 'Email configuration test', subject: 'Tanflow email configuration test',
    render: () => (
      <Mail title="Email configuration test" badge="Success" badgeTone="ok" footer="Sent from Settings › Email configuration.">
        <p>This is a test email to confirm that the email configuration is working.</p>
        <div className="xp-mail-box" data-tone="ok">
          <Kv rows={[['Protocol', 'SMTP'], ['Status', 'Success'], ['Host', <V key="h" n="smtpHost" />], ['Sent at', <V key="t" n="sentAt" />]]} />
        </div>
        <p>No action is needed.</p>
      </Mail>
    ),
  },
  {
    id: 'consent-required', group: 'Consent', label: 'Consent action required', subject: 'Action required: complete registration and sign consent',
    render: () => (
      <Mail title="Consent action required" badge="Action required" badgeTone="warn">
        <p className="xp-mail-hello">Hello <V n="username" />,</p>
        <p>Please complete your registration and review and sign the required consent to continue using your account.</p>
        <Cta>Complete registration &amp; sign consent</Cta>
        <div className="xp-mail-box" data-tone="warn"><b>Important notice</b><span>Access stays restricted until the consent is signed.</span></div>
        <Help />
      </Mail>
    ),
  },
  {
    id: 'consent', group: 'Consent', label: 'Consent', subject: 'Consent confirmation',
    render: () => (
      <Mail title="Consent" badge="Consent recorded" badgeTone="ok">
        <p className="xp-mail-hello">Hello TEST USER,</p>
        <p>Thank you. Your consent has been recorded. A copy of the terms you agreed to is kept on your account.</p>
        <div className="xp-mail-box"><Kv rows={[['Consent', <V key="c" n="consentName" />], ['Version', <V key="v" n="consentVersion" />], ['Signed on', <V key="s" n="signedOn" />]]} /></div>
        <p>You can withdraw consent at any time from your profile.</p>
        <Help />
      </Mail>
    ),
  },
  {
    id: 'recert-reminder', group: 'Recertification', label: 'Recertification reminder', subject: 'Reminder: recertification due',
    render: () => (
      <Mail title="Recertification reminder" badge="Reminder" badgeTone="warn">
        <p className="xp-mail-hello">Hello <V n="userFirstName" />,</p>
        <p>You have recertification items waiting for review.</p>
        <div className="xp-mail-box" data-tone="warn"><Kv rows={[['Campaign', <V key="c" n="campaignName" />], ['Deadline', <V key="d" n="deadline" />]]} /></div>
        <Cta>Review now</Cta>
        <Help />
      </Mail>
    ),
  },
  ...[
    ['user-recert', 'User recertification', 'Your account recertification is due soon. Please complete the required steps to keep your account active and secure.', 'Complete recertification'],
    ['manager-recert', 'Manager recertification', 'Access for members of your team is due for recertification. Review each person\'s access and approve or revoke it.', 'Review team access'],
    ['auditor-recert', 'Auditor recertification', 'A recertification campaign is ready for audit. Review the decisions made at each approval level.', 'Open campaign'],
  ].map(([id, title, text, cta]) => ({
    id,
    group: 'Recertification',
    label: title,
    subject: `Action required: ${title.toLowerCase()}`,
    render: () => (
      <Mail title={title} badge="Action required" badgeTone="warn" footer="This is an automated reminder. Please do not reply to this email.">
        <p className="xp-mail-hello">Hello <V n="userFirstName" /> <V n="userLastName" />!</p>
        <p>{text}</p>
        <div className="xp-mail-box">
          <b>Account details</b>
          <Kv rows={[['Username', <V key="u" n="userUsername" />], ['Email', <V key="e" n="userEmail" />], ['Deadline', <V key="d" n="deadline" />]]} />
        </div>
        <div className="xp-mail-box" data-tone="warn">
          <b>Important notice</b>
          <span>If recertification isn't completed by the deadline, access may be suspended. Please act now to avoid any interruption.</span>
        </div>
        <Cta>{cta}</Cta>
        <p style={{ fontSize: 13 }}>Having trouble? Contact our support team for assistance.</p>
        <Help />
      </Mail>
    ),
  })),
].map((s) => ({ ...s, state: undefined, path: 'Email', note: `Subject: ${s.subject}` }))

export default function EmailTemplatesPage({ segments }) {
  return (
    <ScreenGallery
      base={BASE}
      title="Email Templates"
      sub="Transactional emails sent to users, with template placeholders highlighted."
      screens={EMAIL_SCREENS}
      segments={segments}
      stage="email"
      renderFrame={(screen, body) => <Frame screen={screen}>{body}</Frame>}
    />
  )
}
