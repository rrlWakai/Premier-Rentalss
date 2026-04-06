import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLogin from './components/AdminLogin'
import AdminDashboard from './components/AdminDashboard'
import PropertyPage from './components/PropertyPage'
import BookingSuccess from './components/BookingSuccess'
import BookingFailed from './components/BookingFailed'
import HomePage from './components/HomePage'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
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

          {/* Admin */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
