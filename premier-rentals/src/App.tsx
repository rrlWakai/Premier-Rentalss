import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLogin from './components/AdminLogin'
import AdminDashboard from './components/AdminDashboard'
import PropertyPage from './components/PropertyPage'
import { BookingSuccess, BookingFailed } from './components/BookingPages'
import HomePage from './components/HomePage'
import LegalPage from './components/LegalPage'
import ErrorBoundary from './components/ErrorBoundary'
import AuthCallback from './components/AuthCallback'
import AdminSignup from './components/AdminSignup'
import IntroLoader from './components/IntroLoader'

export default function App() {
  const [isPageReady, setIsPageReady] = useState(false)
  const [showLoader, setShowLoader] = useState(true)

  useEffect(() => {
    const markReady = () => setIsPageReady(true)

    if (document.readyState === 'complete') {
      markReady()
    } else {
      window.addEventListener('load', markReady, { once: true })
    }

    const fallbackTimer = window.setTimeout(markReady, 4000)

    return () => {
      window.removeEventListener('load', markReady)
      window.clearTimeout(fallbackTimer)
    }
  }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          {showLoader && <IntroLoader shouldClose={isPageReady} onComplete={() => setShowLoader(false)} />}
          <motion.div
            initial={{ opacity: 0.92 }}
            animate={{ opacity: showLoader ? 0.92 : 1 }}
            transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
          >
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1a1a1a',
                  color: '#fff',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.8rem',
                  letterSpacing: '0.03em',
                  border: '1px solid rgba(201,169,110,0.3)',
                  borderRadius: '4px',
                },
                success: {
                  iconTheme: { primary: '#c9a96e', secondary: '#fff' },
                },
              }}
            />
            <Routes>
              {/* Public */}
              <Route path="/" element={<HomePage />} />
              <Route path="/property/:slug" element={<PropertyPage />} />
              <Route path="/booking/success" element={<BookingSuccess />} />
              <Route path="/booking/failed" element={<BookingFailed />} />
              <Route path="/legal/:type" element={<LegalPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              {/* Admin */}
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/signup-secret" element={<AdminSignup />} />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </motion.div>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
