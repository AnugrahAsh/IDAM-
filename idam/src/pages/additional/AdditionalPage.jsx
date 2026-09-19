import '../login/LoginPage.css'
import './additional.css'
import DesktopClientPage from './DesktopClientPage'
import EmailMobileLoginPage from './EmailMobileLoginPage'
import EmailTemplatesPage from './EmailTemplatesPage'
import ErrorPagesPage from './ErrorPagesPage'
import LoginMfaPage from './LoginMfaPage'
import LoginPasswordPage from './LoginPasswordPage'
import MfaEnrolmentPage from './MfaEnrolmentPage'

const BY_ROUTE = {
  addLoginPassword: LoginPasswordPage,
  addOtpLogin: EmailMobileLoginPage,
  addLoginMfa: LoginMfaPage,
  addMfa: MfaEnrolmentPage,
  addErrors: ErrorPagesPage,
  addEmailTemplates: EmailTemplatesPage,
  addDesktop: DesktopClientPage,
}

/** Every Additional Pages entry: one set of end-user screens per route. */
export default function AdditionalPage({ route, segments }) {
  const Page = BY_ROUTE[route] || LoginPasswordPage
  return <Page key={route} segments={segments} />
}
