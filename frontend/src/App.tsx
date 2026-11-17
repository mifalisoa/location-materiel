import AdminApp from './features/admin/AdminApp'
import LandingPage from './features/storefront/LandingPage'
import StorefrontPage from './features/storefront/StorefrontPage'

export default function App() {
  const path = window.location.pathname
  if (path.startsWith('/admin')) return <AdminApp />
  if (path === '/catalogue') return <StorefrontPage />
  return <LandingPage />
}
