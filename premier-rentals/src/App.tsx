import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { lazy, Suspense, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './components/HomePage'
import ErrorBoundary from './components/ErrorBoundary'
import IntroLoader from './components/IntroLoader'
import PageSkeleton from './components/PageSkeleton'
import DashboardSkeleton from './components/DashboardSkeleton'

const AdminLogin = lazy(() => import('./components/AdminLogin'))
const AdminDashboard = lazy(() => import('./components/AdminDashboard'))
const AdminSignup = lazy(() => import('./components/AdminSignup'))
const PropertyPage = lazy(() => import('./components/PropertyPage'))
const LegalPage = lazy(() => import('./components/LegalPage'))
const AuthCallback = lazy(() => import('./components/AuthCallback'))
const BookingSuccess = lazy(() => import('./components/BookingPages').then(m => ({ default: m.BookingSuccess })))
const BookingFailed = lazy(() => import('./components/BookingPages').then(m => ({ default: m.BookingFailed })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  const [isPageReady, setIsPageReady] = useState(false)

  const shouldSkipLoader = ['/admin', '/auth', '/booking'].some(p =>
    window.location.pathname.startsWith(p),
  )
  const [showLoader, setShowLoader] = useState(
    !shouldSkipLoader && !sessionStorage.getItem('pr_intro_seen'),
  )

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
    <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          {showLoader && (
            <IntroLoader
              shouldClose={isPageReady}
              onComplete={() => {
                sessionStorage.setItem('pr_intro_seen', '1')
                setShowLoader(false)
              }}
            />
          )}
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
              <Route path="/property/:slug" element={
                <Suspense fallback={<PageSkeleton />}><PropertyPage /></Suspense>
              } />
              <Route path="/booking/success" element={
                <Suspense fallback={<PageSkeleton />}><BookingSuccess /></Suspense>
              } />
              <Route path="/booking/failed" element={
                <Suspense fallback={<PageSkeleton />}><BookingFailed /></Suspense>
              } />
              <Route path="/legal/:type" element={
                <Suspense fallback={<PageSkeleton />}><LegalPage /></Suspense>
              } />
              <Route path="/auth/callback" element={
                <Suspense fallback={<PageSkeleton />}><AuthCallback /></Suspense>
              } />
              {/* Admin */}
              <Route path="/admin" element={
                <Suspense fallback={<PageSkeleton />}><AdminLogin /></Suspense>
              } />
              <Route path="/admin/signup-secret" element={
                <Suspense fallback={<PageSkeleton />}><AdminSignup /></Suspense>
              } />
              <Route
                path="/admin/dashboard"
                element={
                  <Suspense fallback={<DashboardSkeleton />}>
                    <ProtectedRoute>
                      <AdminDashboard />
                    </ProtectedRoute>
                  </Suspense>
                }
              />
            </Routes>
          </motion.div>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
    </QueryClientProvider>
  )
}
