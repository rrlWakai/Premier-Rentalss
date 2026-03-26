import { useState } from 'react'
import { Send, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { submitInquiry } from '../lib/supabase'
import { ImgWithFallback } from '../lib/useImage'
import { CONTACT_BG, FALLBACK } from '../lib/images'
import toast from 'react-hot-toast'

export default function Contact() {
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '',
    message: '', check_in: '', check_out: '', guests: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const ok = await submitInquiry({
      full_name: form.full_name, email: form.email,
      phone: form.phone || undefined, message: form.message || undefined,
      check_in: form.check_in || undefined, check_out: form.check_out || undefined,
      guests: form.guests ? parseInt(form.guests) : undefined,
    })
    setSubmitting(false)
    if (ok) { setSubmitted(true); toast.success("Inquiry sent! We'll be in touch.") }
    else toast.error('Something went wrong. Please try again.')
  }

  return (
    <section id="contact" className="relative">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[700px]">

        {/* Left — image + text */}
        <motion.div
          className="relative flex flex-col justify-end p-10 lg:p-16 min-h-[400px] lg:min-h-0"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* LOCAL /public/images/gallery/villa.jpg */}
          <ImgWithFallback
            local={CONTACT_BG}
            fallback={FALLBACK.contact}
            alt="Begin your journey"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: 'rgba(10,10,10,0.62)' }} />
          <div className="relative z-10">
            <p className="section-label mb-4" style={{ color: '#c9a96e' }}>Reserve Your Escape</p>
            <h2 className="text-white mb-5"
              style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 400, lineHeight: 1.15 }}>
              Begin Your <span style={{ color: '#c9a96e', fontStyle: 'italic' }}>Journey</span>
            </h2>
            <p className="text-white/55 text-sm leading-relaxed max-w-sm mb-8"
              style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
              Our reservations team is ready to craft your ideal escape. Share your vision and we'll handle every detail.
            </p>
            <div className="flex flex-col gap-3">
              {['Personalized itinerary planning', 'Private transfer arrangements', 'Special occasion experiences'].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(201,169,110,0.2)', border: '1px solid #c9a96e' }}>
                    <Check size={8} color="#c9a96e" strokeWidth={3} />
                  </div>
                  <span className="text-white/60 text-xs"
                    style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right — form */}
        <motion.div
          className="flex flex-col justify-center px-10 lg:px-16 py-16"
          style={{ background: '#1a1a1a' }}
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h3 className="text-white mb-8"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', fontWeight: 400 }}>
            Request Information
          </h3>

          {submitted ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(201,169,110,0.15)', border: '1px solid #c9a96e' }}>
                <Check size={24} color="#c9a96e" />
              </div>
              <p className="text-white text-lg"
                style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>
                Thank you for reaching out.
              </p>
              <p className="text-white/50 text-xs max-w-xs" style={{ fontFamily: 'Jost, sans-serif' }}>
                Our reservations team will be in touch within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text"  name="full_name" placeholder="Full Name"      required value={form.full_name} onChange={handleChange} className="form-input" />
                <input type="email" name="email"     placeholder="Email Address"  required value={form.email}     onChange={handleChange} className="form-input" />
              </div>
              <input type="tel"    name="phone"     placeholder="Phone Number"             value={form.phone}     onChange={handleChange} className="form-input" />
              <div className="grid grid-cols-2 gap-4">
                <input type="date" name="check_in"  value={form.check_in}  onChange={handleChange} className="form-input" />
                <input type="date" name="check_out" value={form.check_out} onChange={handleChange} className="form-input" />
              </div>
              <input type="number" name="guests"    placeholder="Number of Guests" min={1} value={form.guests} onChange={handleChange} className="form-input" />
              <textarea name="message" placeholder="Tell us about your ideal experience..." rows={4}
                value={form.message} onChange={handleChange} className="form-input resize-none" />
              <motion.button
                type="submit" disabled={submitting}
                className="btn-gold justify-center mt-2 disabled:opacity-60"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {submitting ? 'Sending...' : <><Send size={13} /> Send Inquiry</>}
              </motion.button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  )
}
