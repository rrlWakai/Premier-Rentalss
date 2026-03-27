import { motion } from 'framer-motion'
import {
  Bath,
  Sofa,
  Wifi,
  UtensilsCrossed,
  CarFront,
  Waves,
  Tv,
  Trees,
} from 'lucide-react'
import { containerVariant, fadeUpVariant } from '../lib/animations'

const amenityGroups = [
  {
    title: 'Comfort',
    items: [
      { icon: Bath, label: 'Air-conditioned Rooms' },
      { icon: Sofa, label: 'Spacious Living Area' },
    ],
  },
  {
    title: 'Essentials',
    items: [
      { icon: Wifi, label: 'Fast Wi-Fi' },
      { icon: UtensilsCrossed, label: 'Fully Equipped Kitchen' },
      { icon: CarFront, label: 'Parking' },
    ],
  },
  {
    title: 'Experience',
    items: [
      { icon: Waves, label: 'Private Pool' },
      { icon: Tv, label: 'Entertainment Area' },
      { icon: Trees, label: 'Outdoor Lounge' },
    ],
  },
]

export default function Amenities() {
  return (
    <section
      id="amenities"
      className="relative overflow-hidden bg-[#f6f1ea] py-18 sm:py-22 lg:py-28"
    >
      <div
        className="absolute inset-x-0 top-0 h-32 opacity-70"
        style={{ background: 'linear-gradient(180deg, rgba(201,169,110,0.08) 0%, rgba(246,241,234,0) 100%)' }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        <motion.div
          className="mb-12 max-w-3xl sm:mb-16"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <p className="section-label mb-3">Amenities</p>
          <h2
            className="text-[#161616]"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.15rem, 4vw, 3.5rem)', fontWeight: 400, lineHeight: 1.02 }}
          >
            Thoughtful essentials for a <span style={{ color: '#b79458', fontStyle: 'italic' }}>premium city stay</span>
          </h2>
          <p
            className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6f6b63] sm:text-[15px]"
            style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}
          >
            Designed for short stays that feel elevated, calm, and effortlessly comfortable.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8 lg:gap-12"
          variants={containerVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {amenityGroups.map((group, index) => (
            <motion.div
              key={group.title}
              variants={fadeUpVariant}
              custom={index}
              className="group"
            >
              <div className="mb-5 h-px w-full bg-[#d9cfbf]" />
              <div className="mb-6">
                <h3
                  className="text-[#1b1b1b]"
                  style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.95rem', fontWeight: 400 }}
                >
                  {group.title}
                </h3>
              </div>

              <div className="flex flex-col gap-4">
                {group.items.map(({ icon: Icon, label }) => (
                  <motion.div
                    key={label}
                    className="flex items-center gap-3.5 text-[#2b2a27]"
                    whileHover={{ x: 4, opacity: 0.9 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fbf8f3]">
                      <Icon size={17} color="#b79458" strokeWidth={1.4} />
                    </div>
                    <p
                      className="text-sm tracking-[0.01em] text-[#35332f]"
                      style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}
                    >
                      {label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
