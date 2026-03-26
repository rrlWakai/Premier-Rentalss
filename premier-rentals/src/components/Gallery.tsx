import { motion } from 'framer-motion'
import { containerVariant, scaleVariant } from '../lib/animations'
import { ImgWithFallback } from '../lib/useImage'
import { GALLERY_IMAGES, FALLBACK } from '../lib/images'

// Merge local paths with Unsplash fallbacks
const images = GALLERY_IMAGES.map((img, i) => ({
  ...img,
  fallback: FALLBACK.gallery[i] ?? FALLBACK.gallery[0],
}))

export default function Gallery() {
  return (
    <section id="gallery" className="py-24 bg-[#f8f4ee]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">

        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="section-label mb-3">Visual Journey</p>
          <h2 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 400,
            lineHeight: 1.1,
            color: '#1a1a1a',
          }}>
            Life at <span style={{ color: '#c9a96e', fontStyle: 'italic' }}>Premier</span>
          </h2>
        </motion.div>

        {/* Desktop mosaic — 3-col, first item spans 2 rows */}
        <motion.div
          className="hidden md:grid gap-2"
          style={{ gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: 'auto auto' }}
          variants={containerVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {/* Tall item */}
          <motion.div
            className="overflow-hidden group cursor-pointer"
            style={{ gridRow: 'span 2' }}
            variants={scaleVariant}
            custom={0}
          >
            <ImgWithFallback
              local={images[0].src}
              fallback={images[0].fallback}
              alt={images[0].alt}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              style={{ minHeight: '400px' }}
            />
          </motion.div>

          {/* Normal items */}
          {images.slice(1).map((img, i) => (
            <motion.div
              key={img.src}
              className="overflow-hidden group cursor-pointer aspect-[4/3]"
              variants={scaleVariant}
              custom={i + 1}
            >
              <ImgWithFallback
                local={img.src}
                fallback={img.fallback}
                alt={img.alt}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile grid — 2 columns */}
        <div className="md:hidden grid grid-cols-2 gap-2">
          {images.map((img, i) => (
            <motion.div
              key={img.src}
              className={`overflow-hidden rounded ${i === 0 ? 'col-span-2' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <ImgWithFallback
                local={img.src}
                fallback={img.fallback}
                alt={img.alt}
                className={`w-full object-cover ${i === 0 ? 'h-52' : 'h-36'}`}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
