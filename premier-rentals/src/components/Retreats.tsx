import { useState } from 'react'
import { ArrowRight, Users, Car } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { POOL_HOUSE_DATA, PATIO_DATA, formatPHP, getStartingPrice, type PropertyData, type RatePackage } from '../lib/propertyData'
import { ImgWithFallback } from '../lib/useImage'
import { POOL_HOUSE, PATIO, FALLBACK } from '../lib/images'
import { containerVariant, fadeUpVariant } from '../lib/animations'
import BookingFormModal from './BookingFormModal'

const PROPERTIES: { data: PropertyData; local: string; fallback: string }[] = [
  { data: POOL_HOUSE_DATA, local: POOL_HOUSE.cover, fallback: FALLBACK.poolHouseCover },
  { data: PATIO_DATA,      local: PATIO.cover,      fallback: FALLBACK.patioCover },
]

export default function Retreats() {
  const [bookingState, setBookingState] = useState<{ property: PropertyData; pkg: RatePackage } | null>(null)

  return (
    <section id="retreats" className="py-24 bg-[#f8f4ee]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">

        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p className="section-label mb-3">Our Properties</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400, lineHeight: 1.1, color: '#1a1a1a' }}>
              Exclusive <span style={{ color: '#c9a96e', fontStyle: 'italic' }}>Retreats</span>
            </h2>
          </motion.div>
        </div>

        {/* Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={containerVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {PROPERTIES.map(({ data, local, fallback }, i) => (
            <motion.div key={data.slug} variants={fadeUpVariant} custom={i} className="retreat-card group cursor-pointer">
              <div className="relative aspect-[4/3] overflow-hidden">
                <ImgWithFallback local={local} fallback={fallback} alt={data.name} className="w-full h-full object-cover" />
                <div className="retreat-card-overlay absolute inset-0" />

                {/* Tag */}
                <div className="absolute top-4 left-4">
                  <span className="text-white/90 text-[10px] tracking-[0.2em] uppercase px-3 py-1 border border-white/30 backdrop-blur-sm"
                    style={{ background: 'rgba(0,0,0,0.25)', fontFamily: 'Jost, sans-serif' }}>
                    {data.tagline}
                  </span>
                </div>

                {/* Package count badge */}
                <div className="absolute top-4 right-4">
                  <span className="text-white/80 text-[10px] tracking-wider px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.35)', fontFamily: 'Jost, sans-serif' }}>
                    {data.packages.length} Packages
                  </span>
                </div>

                {/* Bottom overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-white mb-1" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 400 }}>
                    {data.name}
                  </h3>
                  <p className="text-white/60 text-xs mb-3 line-clamp-2" style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
                    {data.description}
                  </p>

                  {/* Capacity row */}
                  <div className="flex items-center gap-4 mb-4 text-[10px] text-white/50" style={{ fontFamily: 'Jost, sans-serif' }}>
                    <span className="flex items-center gap-1.5"><Users size={11} />Up to {data.maxGuests} guests</span>
                    <span className="flex items-center gap-1.5"><Car size={11} />Max {data.maxCars} cars</span>
                  </div>

                  {/* Starting price */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider" style={{ fontFamily: 'Jost, sans-serif' }}>Starting from</span>
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', color: '#c9a96e', fontWeight: 500 }}>
                      {formatPHP(getStartingPrice(data))}
                    </span>
                  </div>

                  {/* Action buttons — reveal on hover */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => setBookingState({ property: data, pkg: data.packages[0] })}
                      className="btn-gold text-[10px] py-2 px-4"
                    >
                      Book Now
                    </button>
                    <Link
                      to={`/property/${data.slug}`}
                      className="text-[10px] py-2 px-4 bg-white/10 border border-white/30 text-white hover:bg-white hover:text-[#1a1a1a] transition-all flex items-center gap-1.5"
                      style={{ fontFamily: 'Jost, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                    >
                      View Details <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Booking Modal */}
      {bookingState && (
        <BookingFormModal
          property={bookingState.property}
          initialPackage={bookingState.pkg}
          open={!!bookingState}
          onClose={() => setBookingState(null)}
        />
      )}
    </section>
  )
}
