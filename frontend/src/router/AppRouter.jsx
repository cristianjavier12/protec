import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import AuthLayout from '../layouts/AuthLayout'
import PageLoader from '../components/layout/PageLoader'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import HomePage from '../pages/HomePage'
import { ROUTES } from '../utils/routes'

// Páginas secundarias con carga diferida (code-splitting).
const ServicesPage = lazy(() => import('../pages/ServicesPage'))
const HowItWorksPage = lazy(() => import('../pages/HowItWorksPage'))
const RequestRepairPage = lazy(() => import('../pages/RequestRepairPage'))
const DiagnosisPage = lazy(() => import('../pages/DiagnosisPage'))
const DiagnosisFolioPage = lazy(() => import('../pages/DiagnosisFolioPage'))
const TrackingPage = lazy(() => import('../pages/TrackingPage'))
const AboutPage = lazy(() => import('../pages/AboutPage'))
const HelpPage = lazy(() => import('../pages/HelpPage'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const RegisterPage = lazy(() => import('../pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'))
const VerifyEmailPage = lazy(() => import('../pages/VerifyEmailPage'))
const TermsPage = lazy(() => import('../pages/TermsPage'))
const PrivacyPage = lazy(() => import('../pages/PrivacyPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

// Páginas autenticadas
const MyAccountPage = lazy(() => import('../pages/MyAccountPage'))
const MyRepairsPage = lazy(() => import('../pages/MyRepairsPage'))
const RepairDetailPage = lazy(() => import('../pages/RepairDetailPage'))
const RepairCreatedPage = lazy(() => import('../pages/RepairCreatedPage'))

// Paneles, pagos, notificaciones y cuentas
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'))
const RepairPaymentPage = lazy(() => import('../pages/RepairPaymentPage'))
const TechnicianDashboardPage = lazy(() => import('../pages/TechnicianDashboardPage'))
const TechnicianRepairDetailPage = lazy(() => import('../pages/TechnicianRepairDetailPage'))
const AdminDashboardPage = lazy(() => import('../pages/AdminDashboardPage'))

const withSuspense = (element) => <Suspense fallback={<PageLoader />}>{element}</Suspense>

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path={ROUTES.SERVICES} element={withSuspense(<ServicesPage />)} />
        <Route path={ROUTES.HOW_IT_WORKS} element={withSuspense(<HowItWorksPage />)} />
        <Route path={ROUTES.TRACKING} element={withSuspense(<TrackingPage />)} />
        <Route path={ROUTES.ABOUT} element={withSuspense(<AboutPage />)} />
        <Route path={ROUTES.HELP} element={withSuspense(<HelpPage />)} />
        <Route path={ROUTES.DIAGNOSIS} element={withSuspense(<DiagnosisPage />)} />
        <Route path={ROUTES.TERMS} element={withSuspense(<TermsPage />)} />
        <Route path={ROUTES.PRIVACY} element={withSuspense(<PrivacyPage />)} />

        <Route element={<AuthLayout />}>
          <Route path={ROUTES.LOGIN} element={withSuspense(<LoginPage />)} />
          <Route path={ROUTES.REGISTER} element={withSuspense(<RegisterPage />)} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={withSuspense(<ForgotPasswordPage />)} />
          <Route path={ROUTES.RESET_PASSWORD} element={withSuspense(<ResetPasswordPage />)} />
          <Route path={ROUTES.VERIFY_EMAIL} element={withSuspense(<VerifyEmailPage />)} />
        </Route>

        {/* Rutas protegidas — cualquier usuario autenticado */}
        <Route path={ROUTES.REQUEST_REPAIR} element={<ProtectedRoute>{withSuspense(<RequestRepairPage />)}</ProtectedRoute>} />
        <Route path={ROUTES.REPAIR_CREATED} element={<ProtectedRoute>{withSuspense(<RepairCreatedPage />)}</ProtectedRoute>} />
        <Route path={ROUTES.DIAGNOSIS_FOLIO} element={<ProtectedRoute>{withSuspense(<DiagnosisFolioPage />)}</ProtectedRoute>} />
        <Route path={ROUTES.MY_ACCOUNT} element={<ProtectedRoute>{withSuspense(<MyAccountPage />)}</ProtectedRoute>} />
        <Route path={ROUTES.MY_REPAIRS} element={<ProtectedRoute>{withSuspense(<MyRepairsPage />)}</ProtectedRoute>} />
        <Route path={ROUTES.REPAIR_DETAIL} element={<ProtectedRoute>{withSuspense(<RepairDetailPage />)}</ProtectedRoute>} />
        <Route path={ROUTES.DASHBOARD} element={<ProtectedRoute>{withSuspense(<DashboardPage />)}</ProtectedRoute>} />
        <Route path={ROUTES.NOTIFICATIONS} element={<ProtectedRoute>{withSuspense(<NotificationsPage />)}</ProtectedRoute>} />
        <Route path={ROUTES.REPAIR_PAYMENT} element={<ProtectedRoute>{withSuspense(<RepairPaymentPage />)}</ProtectedRoute>} />

        {/* Rutas del técnico */}
        <Route path={ROUTES.TECH_DASHBOARD} element={<ProtectedRoute roles={['tecnico']}>{withSuspense(<TechnicianDashboardPage />)}</ProtectedRoute>} />
        <Route path={ROUTES.TECH_REPAIR_DETAIL} element={<ProtectedRoute roles={['tecnico']}>{withSuspense(<TechnicianRepairDetailPage />)}</ProtectedRoute>} />

        {/* Rutas del administrador */}
        <Route path={ROUTES.ADMIN_DASHBOARD} element={<ProtectedRoute roles={['admin']}>{withSuspense(<AdminDashboardPage />)}</ProtectedRoute>} />

        <Route path="*" element={withSuspense(<NotFoundPage />)} />
      </Route>
    </Routes>
  )
}
