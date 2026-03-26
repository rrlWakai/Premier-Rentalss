import { motion } from 'framer-motion'
import { Waves, Flame, Sparkles, PhoneCall, Home, UtensilsCrossed, Coffee, Star } from 'lucide-react'
import { containerVariant, fadeUpVariant } from '../lib/animations'

const amenities = [
  { icon: Waves,          title: 'Private Pool',      description: 'Your own infinity pool with stunning views, heated to the perfect temperature year-round.' },
  { icon: Flame,          title: 'Private BBQ',       description: 'Equipped outdoor grilling stations for memorable al fresco dining experiences.' },
  { icon: Sparkles,       title: 'In-Villa Spa',      description: 'On-demand wellness treatments including massages, facials, and holistic therapies.' },
  { icon: PhoneCall,      title: 'Chauffeur Service', description: 'Luxury vehicle transfers and a dedicated driver available for every excursion.' },
  { icon: Home,           title: 'Home Cinema',       description: 'Private screening room with 4K projection and a curated entertainment library.' },
  { icon: UtensilsCrossed,title: 'Vitamins & Juices', description: 'Bespoke wellness packages including custom nutrition and morning ritual programs.' },
  { icon: Coffee,         title: 'Barista Coffee',    description: 'Artisan coffee station with a personal barista to start your mornings just right.' },
  { icon: Star,           title: 'Meal Plating',      description: 'Private chef service with curated menus crafted around your dietary preferences.' },
]

export default function Amenities() {
  return (
    <section id="amenities" className="py-24 bg-[#f8f4ee]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <motion.div
          className="mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="section-label mb-3">What We Offer</p>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400, lineHeight: 1.1, color: '#1a1a1a' }}>
            World-Class <span style={{ color: '#c9a96e', fontStyle: 'italic' }}>Amenities</span>
          </h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
          variants={containerVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {amenities.map(({ icon: Icon, title, description }, i) => (
            <motion.div
              key={title}
              variants={fadeUpVariant}
              custom={i}
              className="amenity-card group"
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
            >
              <div className="w-10 h-10 mb-4 flex items-center justify-center rounded-full transition-all duration-300"
                style={{ background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.3)' }}>
                <Icon size={18} color="#c9a96e" strokeWidth={1.5} />
              </div>
              <h3 className="mb-2" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.15rem', fontWeight: 500, color: '#1a1a1a' }}>
                {title}
              </h3>
              <p className="text-[#8a8a7a] text-xs leading-relaxed" style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
                {description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
