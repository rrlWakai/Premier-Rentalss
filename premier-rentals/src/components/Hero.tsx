import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { ImgWithFallback } from '../lib/useImage'
import { HERO_BG, FALLBACK } from '../lib/images'

export default function Hero() {
  const [checkIn, setCheckIn]   = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests]     = useState('')
  const [property, setProperty] = useState('')

  const container = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } },
  }
  const item = {
    hidden:  { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] } },
  }

  return (
    <section id="home" className="relative min-h-screen flex flex-col">

      {/* Background — local file, Unsplash fallback */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="w-full h-full"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: 'easeOut' }}
        >
          <ImgWithFallback
            local={HERO_BG}
            fallback={FALLBACK.heroBg}
            alt="Premier Rentals resort"
            className="w-full h-full object-cover object-center"
          />
        </motion.div>
        <div className="hero-overlay absolute inset-0" />
      </div>

      {/* Hero Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6 pt-24 pb-40 sm:pb-32">
        <motion.div
          className="flex flex-col items-center gap-4"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          <motion.p variants={item} className="section-label text-xs tracking-[0.3em]" style={{ color: '#c9a96e' }}>
            Luxury Private Experiences
          </motion.p>

          <motion.h1
            variants={item}
            className="text-white"
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(3.5rem, 10vw, 7.5rem)',
              fontWeight: 300,
              lineHeight: 1.0,
            }}
          >
            Premier
            <br />
            <span style={{ color: '#c9a96e', fontStyle: 'italic' }}>Rentals</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="text-white/70 max-w-md mx-auto text-sm leading-relaxed"
            style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, letterSpacing: '0.05em' }}
          >
            Curated private resort villas where every detail is tailored to your vision of paradise.
          </motion.p>

          <motion.div variants={item} className="flex flex-col sm:flex-row gap-3 mt-3">
            <a href="#retreats" className="btn-gold">Explore Properties</a>
            <a href="#about" className="btn-outline-gold border-white/40 text-white hover:bg-white hover:text-[#1a1a1a]">
              Learn More
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Booking Bar */}
      <div className="relative w-full" style={{ background: '#1a1a1a' }}>
        <div className="max-w-6xl mx-auto px-5 lg:px-12 py-5">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6 items-end">
            <div className="flex flex-col gap-1">
              <label className="section-label text-[9px]">Property</label>
              <select
                value={property}
                onChange={(e) => setProperty(e.target.value)}
                className="booking-input bg-transparent appearance-none cursor-pointer"
              >
                <option value="">All Properties</option>
                <option value="pool-house">Premier Pool House</option>
                <option value="patio">Premier Patio</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="section-label text-[9px]">Check In</label>
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="booking-input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="section-label text-[9px]">Check Out</label>
              <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="booking-input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="section-label text-[9px]">Guests</label>
              <input type="number" placeholder="2 Guests" min={1} value={guests}
                onChange={(e) => setGuests(e.target.value)} className="booking-input" />
            </div>
            <div className="col-span-2 lg:col-span-1">
              <a href="#retreats" className="btn-gold w-full justify-center block text-center">
                Check Availability
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <motion.a
        href="#stats"
        className="absolute bottom-48 sm:bottom-36 left-1/2 -translate-x-1/2 text-white/30 hover:text-white/60 transition-colors"
        animate={{ y: [0, 6, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      >
        <ChevronDown size={20} />
      </motion.a>
    </section>
  )
}
