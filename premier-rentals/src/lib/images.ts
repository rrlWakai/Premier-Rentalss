/**
 * Centralized image paths — all served from /public/images/
 *
 * Folder structure:
 *   public/
 *   └── images/
 *       ├── hero/
 *       │   └── hero-bg.jpg
 *       ├── properties/
 *       │   ├── premier-pool-house/
 *       │   │   ├── cover.jpg
 *       │   │   ├── gallery-1.jpg
 *       │   │   ├── gallery-2.jpg
 *       │   │   ├── gallery-3.jpg
 *       │   │   └── gallery-4.jpg
 *       │   └── premier-patio/
 *       │       ├── cover.jpg
 *       │       ├── gallery-1.jpg
 *       │       ├── gallery-2.jpg
 *       │       ├── gallery-3.jpg
 *       │       └── gallery-4.jpg
 *       └── gallery/
 *           ├── beach.jpg
 *           ├── spa.jpg
 *           ├── dining.jpg
 *           ├── pool-sunset.jpg
 *           └── villa.jpg
 *
 * Simply drop your .jpg / .webp / .png files into the matching folders
 * and they'll be picked up automatically — no code changes needed.
 */

// ── Hero ──────────────────────────────────────────────────────────────────────
export const HERO_BG = '/images/hero/hero-bg.jpg'

// ── Premier Pool House ────────────────────────────────────────────────────────
export const POOL_HOUSE = {
  cover:   '/images/properties/premier-pool-house/cover.jpg',
  gallery: [
    '/images/properties/premier-pool-house/gallery-1.jpg',
    '/images/properties/premier-pool-house/gallery-2.jpg',
    '/images/properties/premier-pool-house/gallery-3.jpg',
    '/images/properties/premier-pool-house/gallery-4.jpg',
  ],
}

// ── Premier Patio ─────────────────────────────────────────────────────────────
export const PATIO = {
  cover:   '/images/properties/premier-patio/cover.jpg',
  gallery: [
    '/images/properties/premier-patio/gallery-1.jpg',
    '/images/properties/premier-patio/gallery-2.jpg',
    '/images/properties/premier-patio/gallery-3.jpg',
    '/images/properties/premier-patio/gallery-4.jpg',
  ],
}

// ── Homepage Gallery ──────────────────────────────────────────────────────────
export const GALLERY_IMAGES = [
  { src: '/images/gallery/beach.jpg',       alt: 'Tropical beach',  tall: true },
  { src: '/images/gallery/spa.jpg',         alt: 'Spa treatment' },
  { src: '/images/gallery/dining.jpg',      alt: 'Fine dining' },
  { src: '/images/gallery/pool-sunset.jpg', alt: 'Pool at sunset' },
  { src: '/images/gallery/villa.jpg',       alt: 'Luxury villa' },
]

// ── Ambient / section backgrounds ────────────────────────────────────────────
export const TESTIMONIAL_BG  = '/images/gallery/pool-sunset.jpg'
export const MORE_THAN_BG    = '/images/gallery/spa.jpg'
export const CONTACT_BG      = '/images/gallery/villa.jpg'

// ── Fallback (Unsplash) used only when local files are missing ────────────────
export const FALLBACK = {
  heroBg:         'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1800&q=85&auto=format&fit=crop',
  poolHouseCover: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&q=80&auto=format&fit=crop',
  patioCover:     'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80&auto=format&fit=crop',
  gallery: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=700&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=700&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=700&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=700&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=700&q=80&auto=format&fit=crop',
  ],
  poolHouseGallery: [
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80',
    'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
  ],
  patioGallery: [
    'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
    'https://images.unsplash.com/photo-1529290130-4ca3753253ae?w=600&q=80',
    'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=600&q=80',
  ],
  spa:     'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=900&q=80&auto=format&fit=crop',
  resort:  'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=1600&q=75&auto=format&fit=crop',
  contact: 'https://images.unsplash.com/photo-1529290130-4ca3753253ae?w=1200&q=75&auto=format&fit=crop',
}
