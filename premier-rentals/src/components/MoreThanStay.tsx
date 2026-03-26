import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { slideLeftVariant } from '../lib/animations'
import { ImgWithFallback } from '../lib/useImage'
import { MORE_THAN_BG, FALLBACK } from '../lib/images'

const features = [
  'Dedicated personal concierge from arrival to departure',
  'Chef-prepared private dining experiences on request',
  'Curated local excursions and cultural immersions',
  'Luxury transfers and private airport pickups',
  '24/7 on-call support for every need',
]

export default function MoreThanStay() {
  return (
    <section id="about" className="relative overflow-hidden">
      <div className="grid min-h-[600px] grid-cols-1 lg:grid-cols-2">

        {/* Image — local /public/images/gallery/spa.jpg */}
        <motion.div
          className="relative overflow-hidden min-h-[400px] lg:min-h-0"
          variants={slideLeftVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <ImgWithFallback
            local={MORE_THAN_BG}
            fallback={FALLBACK.spa}
            alt="Resort spa experience"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Content */}
        <motion.div
          className="flex flex-col justify-center px-5 py-14 sm:px-8 lg:px-16 lg:py-20"
          style={{ background: '#1a1a1a' }}
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <p className="section-label mb-4" style={{ color: '#c9a96e' }}>The Premier Difference</p>
          <h2 className="text-white mb-6"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 400, lineHeight: 1.15 }}>
            More Than a <span style={{ color: '#c9a96e', fontStyle: 'italic' }}>Stay</span>
          </h2>
          <p className="text-white/55 text-sm leading-relaxed mb-8 max-w-md"
            style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
            At Premier Rentals, we don't simply offer a place to sleep — we craft immersive luxury experiences
            that transform your time into lasting memories. Each detail is considered, each moment designed.
          </p>

          <ul className="mb-10 flex flex-col gap-3">
            {features.map((feature, i) => (
              <motion.li
                key={feature}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(201,169,110,0.15)', border: '1px solid #c9a96e' }}>
                  <Check size={10} color="#c9a96e" strokeWidth={2.5} />
                </span>
                <span className="text-white/65 text-xs leading-relaxed"
                  style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
                  {feature}
                </span>
              </motion.li>
            ))}
          </ul>

          <a href="#retreats" className="btn-gold w-full justify-center sm:w-fit">Begin Your Experience</a>
        </motion.div>
      </div>
    </section>
  )
}
