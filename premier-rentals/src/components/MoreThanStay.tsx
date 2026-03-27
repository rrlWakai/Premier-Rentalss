import { motion } from 'framer-motion'
import { slideLeftVariant } from '../lib/animations'
import { ImgWithFallback } from '../lib/useImage'
import { MORE_THAN_BG, FALLBACK } from '../lib/images'

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
            About <span style={{ color: '#c9a96e', fontStyle: 'italic' }}>Premier Rentals</span>
          </h2>
          <p className="text-white/55 text-sm leading-relaxed mb-5 max-w-2xl"
            style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
            Premier Rentals offers private, thoughtfully designed spaces across Metro Manila, each with its own unique experience, but built on the same promise of comfort, privacy, and convenience.
          </p>

          <div className="mb-10 flex flex-col gap-4">
            {[
              'Premier Pool House, located in Novaliches, Quezon City, is designed for fun, gatherings, and shared moments. With its spacious layout, private pool, and entertainment areas, it is the perfect space for celebrations, family time, and group staycations.',
              'Premier Patio, located in Caloocan, offers a more relaxed and intimate setting. With its clean, modern design and cozy atmosphere, it is ideal for small gatherings, quiet stays, and laid-back city escapes.',
              'Whether you are planning a celebration or simply looking for a private space to unwind, Premier Rentals gives you the flexibility to choose the experience that fits your moment, right within the city.',
            ].map((paragraph, i) => (
              <motion.p
                key={paragraph}
                className="max-w-2xl text-sm leading-relaxed text-white/65"
                style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}
                initial={{ opacity: 0, x: 18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
              >
                {paragraph}
              </motion.p>
            ))}
          </div>

          <motion.div
            className="mb-10 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.2 }}
          >
            <p
              className="mb-3 text-[10px] uppercase tracking-[0.24em] text-[#c9a96e]"
              style={{ fontFamily: 'Jost, sans-serif', fontWeight: 500 }}
            >
              Choose Your Stay
            </p>
            <div className="flex flex-col gap-3">
              <p
                className="text-sm leading-relaxed text-white/70"
                style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}
              >
                Looking for a fun, activity-filled space? Go with Premier Pool House.
              </p>
              <p
                className="text-sm leading-relaxed text-white/70"
                style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}
              >
                Prefer something calm and minimal? Premier Patio is perfect for you.
              </p>
            </div>
          </motion.div>

          <a href="#retreats" className="btn-gold w-full justify-center sm:w-fit">Begin Your Experience</a>
        </motion.div>
      </div>
    </section>
  )
}
