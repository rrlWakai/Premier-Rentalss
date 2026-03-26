import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Users, MapPin, Car, ShieldCheck,
  Wifi, UtensilsCrossed, Waves, BedDouble,
  ChevronDown, ChevronUp, Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { POOL_HOUSE_DATA, PATIO_DATA, formatPHP, type PropertyData, type RatePackage } from '../lib/propertyData'
import { ImgWithFallback } from '../lib/useImage'
import { FALLBACK, POOL_HOUSE, PATIO } from '../lib/images'
import BookingFormModal from './BookingFormModal'
import { fadeUpVariant, containerVariant } from '../lib/animations'

const PROPERTIES: Record<string, PropertyData> = {
  'premier-pool-house': POOL_HOUSE_DATA,
  'premier-patio': PATIO_DATA,
}

const COVER_FALLBACKS: Record<string, string> = {
  'premier-pool-house': FALLBACK.poolHouseCover,
  'premier-patio': FALLBACK.patioCover,
}
const GALLERY_FALLBACKS: Record<string, string[]> = {
  'premier-pool-house': FALLBACK.poolHouseGallery,
  'premier-patio': FALLBACK.patioGallery,
}

const AMENITY_ICONS: Record<string, typeof Wifi> = {
  'Wifi Access': Wifi,
  'Swimming Pool': Waves, 'Pool Deck': Waves, 'Kiddie Pool': Waves,
  'Indoor Kitchen': UtensilsCrossed, 'Outdoor Kitchen': UtensilsCrossed,
  'Bedroom 1': BedDouble, 'Bedroom 2': BedDouble,
}

const TIER_COLORS: Record<string, string> = {
  staycation: '#4a7c9e',
  family:     '#c9a96e',
  big_group:  '#6b5b8a',
}
const TIER_LABELS: Record<string, string> = {
  staycation: 'Staycation',
  family:     'Family',
  big_group:  'Big Group',
}

function RateTable({ pkg }: { pkg: RatePackage }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#ede8df]">
      <div className="overflow-x-auto">
      <table className="min-w-[560px] w-full text-xs" style={{ fontFamily: 'Jost, sans-serif' }}>
        <thead>
          <tr style={{ background: '#1a1a1a' }}>
            <th className="px-4 py-3 text-left text-[10px] tracking-widest uppercase text-white/60 font-medium">Session</th>
            <th className="px-4 py-3 text-left text-[10px] tracking-widest uppercase text-white/60 font-medium">Hours</th>
            <th className="px-4 py-3 text-right text-[10px] tracking-widest uppercase text-white/60 font-medium">Weekday</th>
            <th className="px-4 py-3 text-right text-[10px] tracking-widest uppercase text-[#c9a96e] font-medium">Weekend</th>
          </tr>
        </thead>
        <tbody>
          {pkg.rates.map((rate, i) => (
            <tr key={rate.label} className={`border-t border-[#ede8df] ${i % 2 === 0 ? 'bg-white' : 'bg-[#faf8f5]'}`}>
              <td className="px-4 py-3 font-medium text-[#1a1a1a] text-xs">{rate.label}</td>
              <td className="px-4 py-3 text-[#8a8a7a] text-[10px]">{rate.hours}</td>
              <td className="px-4 py-3 text-right font-medium text-[#4a4a4a]">{formatPHP(rate.weekday)}</td>
              <td className="px-4 py-3 text-right font-medium" style={{ color: '#c9a96e' }}>{formatPHP(rate.weekend)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {/* Additional pax note */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-[#ede8df] bg-[#faf8f5] px-4 py-3">
        <span className="text-[10px] text-[#8a8a7a]" style={{ fontFamily: 'Jost, sans-serif' }}>
          <Info size={10} className="inline mr-1" />
          Max {pkg.maxAdditionalPax} additional pax:
          <strong className="text-[#4a4a4a] ml-1">Day {formatPHP(pkg.additionalPaxDay)}/head</strong>
          <strong className="text-[#4a4a4a] ml-2">Night/Overnight {formatPHP(pkg.additionalPaxNight)}/head</strong>
        </span>
      </div>
    </div>
  )
}

function PackageCard({ pkg, onBook }: { pkg: RatePackage; onBook: (pkg: RatePackage) => void }) {
  const [open, setOpen] = useState(false)
  const color = TIER_COLORS[pkg.tier] ?? '#c9a96e'

  return (
    <div className="bg-white rounded-xl border border-[#ede8df] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <div>
            <span
              className="text-[10px] font-medium tracking-widest uppercase px-2 py-0.5 rounded-full text-white"
              style={{ background: color, fontFamily: 'Jost, sans-serif' }}
            >
              {TIER_LABELS[pkg.tier]}
            </span>
            <h3
              className="mt-1"
              style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 400, color: '#1a1a1a' }}
            >
              {pkg.title}
            </h3>
            <p className="text-[11px] text-[#8a8a7a] mt-0.5" style={{ fontFamily: 'Jost, sans-serif' }}>
              <Users size={10} className="inline mr-1" />{pkg.subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <button
            onClick={() => onBook(pkg)}
            className="btn-gold text-[10px] py-2 px-4 hidden sm:flex"
          >
            Reserve
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="w-8 h-8 rounded-full border border-[#ede8df] flex items-center justify-center hover:border-[#c9a96e] transition-colors"
          >
            {open ? <ChevronUp size={14} color="#8a8a7a" /> : <ChevronDown size={14} color="#8a8a7a" />}
          </button>
        </div>
      </div>

      {/* Starting from */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4 sm:px-6">
        <span className="text-[10px] text-[#8a8a7a] uppercase tracking-wider" style={{ fontFamily: 'Jost, sans-serif' }}>Starting from</span>
        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', color: '#c9a96e', fontWeight: 500 }}>
          {formatPHP(Math.min(...pkg.rates.map(r => r.weekday)))}
        </span>
      </div>

      {/* Expandable table */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-[#ede8df]"
          >
            <div className="p-4">
              <RateTable pkg={pkg} />
              {pkg.notes.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1">
                  {pkg.notes.map(note => (
                    <li key={note} className="flex items-start gap-2 text-[11px] text-[#8a8a7a]" style={{ fontFamily: 'Jost, sans-serif' }}>
                      <Info size={10} className="mt-0.5 shrink-0" color="#c9a96e" />
                      {note}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="px-4 pb-4 sm:hidden">
              <button onClick={() => onBook(pkg)} className="btn-gold w-full justify-center">
                Reserve This Package
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function PropertyPage() {
  const { slug } = useParams<{ slug: string }>()
  const [activeImage, setActiveImage] = useState(0)
  const [bookingPkg, setBookingPkg] = useState<RatePackage | null>(null)
  const [rulesOpen, setRulesOpen] = useState(false)

  const property = slug ? PROPERTIES[slug] : null

  useEffect(() => { window.scrollTo(0, 0) }, [slug])

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f8f4ee]">
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem' }}>Property not found</p>
        <Link to="/" className="btn-gold">Back to Home</Link>
      </div>
    )
  }

  const allLocal    = [property.coverImage, ...property.galleryImages]
  const allFallback = [COVER_FALLBACKS[slug!] ?? FALLBACK.poolHouseCover, ...(GALLERY_FALLBACKS[slug!] ?? FALLBACK.poolHouseGallery)]

  return (
    <div className="min-h-screen bg-[#f8f4ee]">

      {/* ── Sticky top nav ───────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-[#ede8df]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-5 lg:px-12">
          <Link to="/" className="flex items-center gap-2 text-[#8a8a7a] hover:text-[#1a1a1a] transition-colors text-xs tracking-wider uppercase"
            style={{ fontFamily: 'Jost, sans-serif' }}>
            <ArrowLeft size={14} /> Back
          </Link>
          <span className="truncate text-center" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', color: '#1a1a1a' }}>
            {property.name}
          </span>
          <button onClick={() => setBookingPkg(property.packages[0])} className="btn-gold shrink-0 text-xs py-2 px-3 sm:px-4">
            Book Now
          </button>
        </div>
      </div>

      {/* ── Hero gallery ─────────────────────────────── */}
      <div className="relative h-[52vh] overflow-hidden sm:h-[55vh] lg:h-[68vh]">
        <ImgWithFallback
          local={allLocal[activeImage]}
          fallback={allFallback[activeImage] ?? allFallback[0]}
          alt={property.name}
          className="w-full h-full object-cover transition-opacity duration-500"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.45) 100%)' }} />

        {/* Tag badge */}
        <div className="absolute left-4 top-4 sm:left-5 sm:top-5">
          <span className="border border-white/30 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm sm:px-3 sm:text-[10px]"
            style={{ background: 'rgba(0,0,0,0.25)', fontFamily: 'Jost, sans-serif' }}>
            {property.tagline}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-7xl px-4 pb-5 sm:px-5 lg:px-12 lg:pb-8">
            {allLocal.length > 1 && (
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
                {allLocal.map((localSrc, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-300
                      ${i === activeImage
                        ? 'border-[#c9a96e] shadow-[0_0_0_1px_rgba(201,169,110,0.45)]'
                        : 'border-white/35 hover:border-white/80'}`}
                  >
                    <ImgWithFallback
                      local={localSrc}
                      fallback={allFallback[i] ?? allFallback[0]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div
                      className={`absolute inset-0 transition-colors ${
                        i === activeImage ? 'bg-transparent' : 'bg-black/20'
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Hero title overlay */}
            <div>
              <h1 className="text-white" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 300, lineHeight: 1.1 }}>
                {property.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-white/60" style={{ fontFamily: 'Jost, sans-serif' }}>
                <span className="flex items-center gap-1.5"><Users size={12} />Up to {property.maxGuests} guests</span>
                <span className="flex items-center gap-1.5"><Car size={12} />Max {property.maxCars} cars</span>
                <span className="flex items-center gap-1.5"><MapPin size={12} />Private Estate</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-5 lg:px-12 py-14">
        <motion.div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10" variants={containerVariant} initial="hidden" animate="visible">

          {/* LEFT: main content */}
          <motion.div className="lg:col-span-2 flex flex-col gap-12" variants={fadeUpVariant} custom={0}>

            {/* Description */}
            <div>
              <p className="section-label mb-3">About</p>
              <p className="text-[#4a4a4a] text-sm leading-relaxed" style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, lineHeight: 1.9 }}>
                {property.description}
              </p>
            </div>

            {/* Amenities */}
            <div>
              <p className="section-label mb-4">Amenities & Features</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {property.amenities.map(group => {
                  const Icon = AMENITY_ICONS[group.group] ?? Wifi
                  return (
                    <div key={group.group} className="bg-white rounded-xl border border-[#ede8df] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Icon size={14} color="#c9a96e" strokeWidth={1.5} />
                        <p className="text-xs font-medium text-[#1a1a1a] tracking-wide"
                          style={{ fontFamily: 'Jost, sans-serif' }}>{group.group}</p>
                      </div>
                      <ul className="flex flex-col gap-1">
                        {group.items.map(item => (
                          <li key={item} className="text-[11px] text-[#8a8a7a] flex items-start gap-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                            <span className="mt-1 w-1 h-1 rounded-full shrink-0" style={{ background: '#c9a96e' }} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Rate packages */}
            <div>
              <p className="section-label mb-2">Rates & Packages</p>
              <h2 className="mb-2" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 400, color: '#1a1a1a' }}>
                Choose Your <span style={{ color: '#c9a96e', fontStyle: 'italic' }}>Package</span>
              </h2>
              <p className="text-xs text-[#8a8a7a] mb-6" style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
                Weekday: Sun–Thu Night &nbsp;·&nbsp; Weekend: Thu–Sun Night &nbsp;·&nbsp; Auto weekend rate Dec 1–Jan 2
              </p>
              <div className="flex flex-col gap-4">
                {property.packages.map(pkg => (
                  <PackageCard key={pkg.tier} pkg={pkg} onBook={setBookingPkg} />
                ))}
              </div>
            </div>

            {/* House Rules */}
            <div>
              <button
                onClick={() => setRulesOpen(!rulesOpen)}
                className="w-full flex items-center justify-between px-6 py-4 bg-[#1a1a1a] rounded-t-xl text-left"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck size={16} color="#c9a96e" strokeWidth={1.5} />
                  <span className="text-white text-sm font-medium" style={{ fontFamily: 'Jost, sans-serif', letterSpacing: '0.05em' }}>
                    House Rules & Policies
                  </span>
                </div>
                {rulesOpen ? <ChevronUp size={16} color="#8a8a7a" /> : <ChevronDown size={16} color="#8a8a7a" />}
              </button>
              <AnimatePresence>
                {rulesOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden bg-[#242424] rounded-b-xl"
                  >
                    <div className="px-6 py-5">
                      <ul className="flex flex-col gap-3">
                        {property.houseRules.map((rule, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#c9a96e' }} />
                            <span className="text-white/65 text-xs leading-relaxed" style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
                              {rule}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {property.policies.map((policy, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Info size={11} color="#c9a96e" className="mt-0.5 shrink-0" />
                            <span className="text-[#c9a96e] text-[11px]" style={{ fontFamily: 'Jost, sans-serif' }}>{policy}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Gallery grid */}
            {property.galleryImages.length > 0 && (
              <div>
                <p className="section-label mb-4">Gallery</p>
                <div className="grid grid-cols-2 gap-2">
                  {property.galleryImages.map((localSrc, i) => (
                    <button key={i} onClick={() => setActiveImage(i + 1)} className="overflow-hidden rounded-lg aspect-[4/3] group">
                      <ImgWithFallback
                        local={localSrc}
                        fallback={(GALLERY_FALLBACKS[slug!] ?? FALLBACK.poolHouseGallery)[i] ?? FALLBACK.poolHouseGallery[0]}
                        alt={`${property.name} ${i + 1}`}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* RIGHT: sticky booking card */}
          <motion.div variants={fadeUpVariant} custom={1}>
            <div className="rounded-xl border border-[#ede8df] bg-white overflow-hidden shadow-sm lg:sticky lg:top-20">
              <div className="px-6 py-5 border-b border-[#ede8df]">
                <p className="section-label mb-2">Quick Rates</p>
                <div className="flex flex-col gap-3">
                  {property.packages.map(pkg => (
                    <div key={pkg.tier} className="flex items-center justify-between py-2 border-b border-[#ede8df] last:border-0">
                      <div>
                        <p className="text-xs font-medium text-[#1a1a1a]" style={{ fontFamily: 'Jost, sans-serif' }}>{pkg.title}</p>
                        <p className="text-[10px] text-[#8a8a7a]" style={{ fontFamily: 'Jost, sans-serif' }}>Up to {pkg.maxPax} pax</p>
                      </div>
                      <div className="text-right">
                        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1rem', fontWeight: 500, color: '#c9a96e' }}>
                          {formatPHP(Math.min(...pkg.rates.map(r => r.weekday)))}
                        </span>
                        <p className="text-[9px] text-[#8a8a7a]" style={{ fontFamily: 'Jost, sans-serif' }}>starting from</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <button onClick={() => setBookingPkg(property.packages[0])} className="btn-gold w-full justify-center">
                  Reserve Now
                </button>
                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <Info size={11} color="#c9a96e" className="mt-0.5 shrink-0" />
                    <p className="text-[10px] text-[#8a8a7a]" style={{ fontFamily: 'Jost, sans-serif' }}>50% down payment required to confirm booking</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info size={11} color="#c9a96e" className="mt-0.5 shrink-0" />
                    <p className="text-[10px] text-[#8a8a7a]" style={{ fontFamily: 'Jost, sans-serif' }}>Down payment is non-refundable</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Booking Form Modal */}
      {bookingPkg && (
        <BookingFormModal
          property={property}
          initialPackage={bookingPkg}
          open={!!bookingPkg}
          onClose={() => setBookingPkg(null)}
        />
      )}
    </div>
  )
}
