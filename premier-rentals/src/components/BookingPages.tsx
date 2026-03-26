import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'
// Payment status is handled via webhook in production

export function BookingSuccess() {
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? ''

  // In production, verify the source payment server-side
  useEffect(() => {
    // PayMongo webhook should handle this — this is a fallback UI only
  }, [ref])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f4ee] px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(34,197,94,0.1)', border: '2px solid #22c55e' }}>
          <CheckCircle size={36} color="#22c55e" strokeWidth={1.5} />
        </div>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 400, color: '#1a1a1a' }} className="mb-3">
          Payment Successful
        </h1>
        <p className="text-[#8a8a7a] text-sm mb-2" style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
          Your booking has been confirmed. A receipt has been sent to your email.
        </p>
        {ref && (
          <p className="text-[#c9a96e] text-sm font-medium mb-6" style={{ fontFamily: 'Jost, sans-serif' }}>
            Ref: {ref}
          </p>
        )}
        <Link to="/" className="btn-gold inline-flex items-center gap-2">
          <ArrowLeft size={14} /> Back to Home
        </Link>
      </div>
    </div>
  )
}

export function BookingFailed() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f4ee] px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid #ef4444' }}>
          <XCircle size={36} color="#ef4444" strokeWidth={1.5} />
        </div>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 400, color: '#1a1a1a' }} className="mb-3">
          Payment Failed
        </h1>
        <p className="text-[#8a8a7a] text-sm mb-6" style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
          Your payment could not be processed. No charges have been made. Please try again or contact our team.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="btn-outline-gold inline-flex items-center gap-2">
            <ArrowLeft size={14} /> Home
          </Link>
          <Link to="/#retreats" className="btn-gold">
            Try Again
          </Link>
        </div>
      </div>
    </div>
  )
}
