// ═══════════════════════════════════════════════════════════════════
// PREMIER RENTALS — Complete Property Data
// Extracted from official rate sheets
// ═══════════════════════════════════════════════════════════════════

export type DayType = 'weekday' | 'weekend'
export type RateTier = 'staycation' | 'family' | 'big_group'

export interface RateEntry {
  label: string
  hours: string
  weekday: number
  weekend: number
}

export interface RatePackage {
  tier: RateTier
  title: string
  subtitle: string
  maxPax: number
  additionalPaxDay: number      // PHP per head
  additionalPaxNight: number    // PHP per head
  maxAdditionalPax: number
  rates: RateEntry[]
  notes: string[]
}

export interface PropertyData {
  slug: string
  name: string
  tagline: string
  description: string
  location: string
  locationDescription: string
  maxGuests: number   // overall max (biggest tier)
  maxCars: number
  coverImage: string
  galleryImages: string[]
  amenities: AmenityGroup[]
  houseRules: string[]
  packages: RatePackage[]
  policies: string[]
}

export interface AmenityGroup {
  group: string
  items: string[]
}

// ═══════════════════════════════════════════════════════════════════
// PREMIER PATIO
// Rate Sheet 1 → Family Rates  (20 pax)
// Rate Sheet 2 → Staycation Rates (12 pax)
// ═══════════════════════════════════════════════════════════════════
export const PATIO_DATA: PropertyData = {
  slug: 'premier-patio',
  name: 'Premier Patio',
  tagline: 'Patio Stay',
  description:
    'A sophisticated garden estate with lush tropical surroundings and open-air entertainment spaces — ideal for intimate celebrations and exclusive family gatherings.',
  location: '36 Amsterdam, Barangay 167, Caloocan, Metro Manila',
  locationDescription:
    'Conveniently located with easy access to major roads, dining spots, and city essentials.',
  maxGuests: 20,
  maxCars: 4,
  coverImage: '/images/properties/premier-patio/cover.jpg',
  galleryImages: [
    '/images/properties/premier-patio/gallery-1.jpg',
    '/images/properties/premier-patio/gallery-2.jpg',
    '/images/properties/premier-patio/gallery-3.jpg',
    '/images/properties/premier-patio/gallery-4.jpg',
    '/images/properties/premier-patio/gallery-5.jpg',
    '/images/properties/premier-patio/gallery-6.jpg',
    '/images/properties/premier-patio/gallery-7.jpg',
    '/images/properties/premier-patio/gallery-8.jpg',
    '/images/properties/premier-patio/gallery-9.jpg',
    '/images/properties/premier-patio/gallery-10.jpg',
    '/images/properties/premier-patio/gallery-11.jpg',
    
  ],
  amenities: [
    {
      group: 'Outdoor Area',
      items: ['Swimming Pool', '2 Toilet & Bath', 'Bar Area', 'Spacious Grass Area', 'Mini Golf', 'Piko', 'Outdoor Dining Area', 'Service Area'],
    },
    {
      group: 'Indoor Ground Floor',
      items: ['Spacious Sunken Living Area', 'Netflix, Prime & Disney+ Access', 'Wifi Access', 'Elegant Dining Area', 'Airconditioned Videoke Room'],
    },
    {
      group: 'Indoor Second Floor',
      items: ['Spacious Lounge Area', 'Balcony Area'],
    },
    {
      group: 'Bedroom 1',
      items: ['Airconditioned Room', '10 Persons Capacity', 'Seating Area', 'Open Cabinet', '1 Private Toilet & Bath with Water Heater', 'Balcony View'],
    },
    {
      group: 'Bedroom 2 (Platinum Only)',
      items: ['Airconditioned Room', '2–5 Persons Capacity', 'Sofa Bed', 'King Size Bed', 'Open Cabinet', '1 Private Toilet & Bath with Water Heater'],
    },
    {
      group: 'Outdoor Kitchen',
      items: ['Rice Cooker', 'Microwave', 'Kettle', 'Refrigerator', '2 Burner Stove', 'Pots & Pans', 'Plates & Utensils', 'Griller', 'Drinking Water'],
    },
  ],
  houseRules: [
    ' Shower Before Swimming — Please rinse off in the shower before entering the pool.',
    'Wear Proper Swimwear.',
    ' No Running — Walk, don’t run. Stay safe around the pool.',
    ' No Diving — Diving is prohibited to prevent injuries.',
    ' No Food or Drinks — Keep snacks and beverages away from the pool area.',
    ' Children Must Be Supervised — Kids must be accompanied by a responsible adult at all times.',
    'No 3rd party suppliers allowed for Staycation Rates. Ask for Family Group Rates.',
    'Additional guests: max 3 pax. Day time: PHP 500/head. Night/Overnight: PHP 1,000/head.',
    'Rates subject to change without prior notice.',
    'Down payment is non-refundable.',
    '50% down payment upon reservation is required to book. First down payment, first reservation.',
    'Automatic weekend rate from December 1 to January 2 bookings.',
  ],
  policies: [
    'Weekday: Sunday Night to Thursday Night',
    'Weekend: Thursday Night to Sunday Night',
    '50% down payment required to confirm reservation',
    'Down payment is non-refundable',
    'Rates subject to change without prior notice',
    'Automatic weekend rate applies December 1 – January 2',
  ],
  packages: [
    // ── Staycation Rates (12 pax) ─────────────────────────────
    {
      tier: 'staycation',
      title: 'Staycation Rates',
      subtitle: 'Good for 12 Pax — Visiting & Staying Guests Included',
      maxPax: 12,
      additionalPaxDay: 500,
      additionalPaxNight: 1000,
      maxAdditionalPax: 3,
      rates: [
        { label: 'Day Premium',       hours: '8AM to 4PM (8 Hours)',  weekday:  9500, weekend: 12500 },
        { label: 'Night Premium',     hours: '6PM to 6AM (12 Hours)', weekday: 15500, weekend: 18500 },
        { label: 'Overnight Platinum',hours: '6PM to 3PM (21 Hours)', weekday: 18500, weekend: 21500 },
      ],
      notes: [
        'Bedroom 2 is ONLY included for Platinum',
        'No 3rd party suppliers for Staycation Rates',
      ],
    },
    // ── Family Rates (20 pax) ─────────────────────────────────
    {
      tier: 'family',
      title: 'Family Rates',
      subtitle: 'Good for 20 Pax — Visiting & Staying Guests Included',
      maxPax: 20,
      additionalPaxDay: 500,
      additionalPaxNight: 1000,
      maxAdditionalPax: 3,
      rates: [
        { label: 'Day Premium',       hours: '8AM to 4PM (8 Hours)',  weekday: 12500, weekend: 16500 },
        { label: 'Night Premium',     hours: '6PM to 6AM (12 Hours)', weekday: 18500, weekend: 21500 },
        { label: 'Overnight Platinum',hours: '6PM to 3PM (21 Hours)', weekday: 23500, weekend: 27500 },
      ],
      notes: [],
    },
  ],
}

// ═══════════════════════════════════════════════════════════════════
// PREMIER POOL HOUSE
// Rate Sheet 3 → Staycation Rates (20 pax)
// Rate Sheet 4 → Family Rates     (30 pax)
// Rate Sheet 5 → Big Group Rates  (40 pax)
// ═══════════════════════════════════════════════════════════════════
export const POOL_HOUSE_DATA: PropertyData = {
  slug: 'premier-pool-house',
  name: 'Premier Pool House',
  tagline: 'Private Pool Stay',
  description:
    'An expansive private pool estate with resort-grade amenities — ideal for staycations, large family gatherings, and exclusive big-group events.',
  location: '22 Love Bird St, Novaliches, Quezon City, Metro Manila',
  locationDescription:
    'A private and accessible space ideal for quick getaways and intimate gatherings.',
  maxGuests: 40,
  maxCars: 8,
  coverImage: '/images/properties/premier-pool-house/cover.jpg',
  galleryImages: [
    '/images/properties/premier-pool-house/gallery-1.jpg',
    '/images/properties/premier-pool-house/gallery-2.jpg',
    '/images/properties/premier-pool-house/gallery-3.jpg',
    '/images/properties/premier-pool-house/gallery-4.jpg',
    '/images/properties/premier-pool-house/gallery-5.jpg',
    '/images/properties/premier-pool-house/gallery-6.jpg',
    '/images/properties/premier-pool-house/gallery-7.jpg',
    '/images/properties/premier-pool-house/gallery-8.jpg',
    '/images/properties/premier-pool-house/gallery-9.jpg',
  ],
  amenities: [
    {
      group: 'Outdoor Area',
      items: ['Pool Deck', 'Swimming Pool', 'Kiddie Pool', 'Poolside Day Beds', 'Outdoor Shower Area', '2 Toilet & Bath', 'Outdoor Dining Area', 'Bar Area', 'Parking Area', 'Spacious Grass Area', 'Wifi Access', 'Indoor Parking'],
    },
    {
      group: 'Indoor Ground Floor',
      items: ['Spacious Living Room', 'Bohemian Style Table Set Up', 'Airconditioned Multipurpose/Videoke Room', 'Netflix Access', '2 Toilets'],
    },
    {
      group: 'Indoor Second Floor',
      items: ['Spacious Living Room', 'Game Lounge', 'Balcony View'],
    },
    {
      group: 'Bedroom 1',
      items: ['Airconditioned Room', '20 Persons Capacity', 'Bed Space / Floor Cushions & Table', '1 Private Toilet & Bath', 'Spacious Balcony', 'Balcony View'],
    },
    {
      group: 'Bedroom 2 (Premium & Platinum)',
      items: ['Airconditioned Room', '4 Persons Capacity', 'Hotel-like Twin Beds', 'Cabinet & Drawers', '1 Private Toilet & Bath'],
    },
    {
      group: 'Indoor Kitchen',
      items: ['Microwave', 'Oven Toaster', 'Kettle', 'Coffee Maker', 'Refrigerator', 'Stove', 'Pots & Pans', 'Plates & Utensils', 'Glass Cups', 'Griller', 'Rice Cooker'],
    },
  ],
  houseRules: [
    'Shower Before Swimming — Please rinse off in the shower before entering the pool.',
    'Wear Proper Swimwear.',
    'No Running — Walk, don’t run. Stay safe around the pool.',
    'No Diving — Diving is prohibited to prevent injuries.',
    'No Food or Drinks — Keep snacks and beverages away from the pool area.',
    'Children Must Be Supervised — Kids must be accompanied by a responsible adult at all times.',
    'Strictly up to the package pax limit. Sleeping capacity is 25 pax only.',
    'Strictly up to 8 cars only. Additional fees will apply for more than 8 cars.',
    'Reservation should cover the entire day time, night time, or overnight hours (including ingress & egress). Additional fees apply for early check-in.',
    'Lights and sounds are strictly prohibited.',
    'Designs with confetti are not allowed.',
    'Night parties are strictly prohibited. Only allowed for Day Time.',
    'No 3rd party suppliers for Staycation Rates. Ask for Family or Big Group Rates.',
    'Down payment is non-refundable.',
    '50% down payment upon reservation is required. First down payment, first reservation.',
    'Automatic weekend rate applies December 1 – January 2.',
  ],
  policies: [
    'Weekday: Sunday Night to Thursday Night',
    'Weekend: Thursday Night to Sunday Night',
    '50% down payment required to confirm reservation',
    'Down payment is non-refundable',
    'Rates subject to change without prior notice',
    'Automatic weekend rate applies December 1 – January 2',
  ],
  packages: [
    // ── Staycation Rates (20 pax) ─────────────────────────────
    {
      tier: 'staycation',
      title: 'Staycation Rates',
      subtitle: 'Good for 20 Pax — Visiting & Staying Guests Included',
      maxPax: 20,
      additionalPaxDay: 500,
      additionalPaxNight: 1000,
      maxAdditionalPax: 5,
      rates: [
        { label: 'Day Basic',    hours: '9AM to 5PM',  weekday: 12500, weekend: 16500 },
        { label: 'Day Premium',  hours: '9AM to 5PM',  weekday: 14500, weekend: 18500 },
        { label: 'Night Basic',  hours: '8PM to 6AM',  weekday: 14500, weekend: 18500 },
        { label: 'Night Premium',hours: '8PM to 6AM',  weekday: 16500, weekend: 20500 },
        { label: 'Platinum',     hours: '8PM–5PM or 9AM–6AM', weekday: 23500, weekend: 27500 },
      ],
      notes: [
        'Day Basic: outdoor area + indoor floors (no bedroom)',
        'Day/Night Premium: + Bedroom 1',
        'Platinum: all areas including Bedroom 2',
        'No 3rd party suppliers for Staycation Rates',
      ],
    },
    // ── Family Rates (30 pax) ─────────────────────────────────
    {
      tier: 'family',
      title: 'Family Rates',
      subtitle: 'Good for 30 Pax — Visiting & Staying Guests Included',
      maxPax: 30,
      additionalPaxDay: 500,
      additionalPaxNight: 1000,
      maxAdditionalPax: 5,
      rates: [
        { label: 'Day Time',  hours: '9AM to 5PM',            weekday: 20500, weekend: 30500 },
        { label: 'Night Time',hours: '8PM to 6AM',            weekday: 25500, weekend: 35500 },
        { label: 'Overnight', hours: '9AM–6AM or 8PM–5PM',    weekday: 35500, weekend: 45500 },
      ],
      notes: [
        'Family rate applies for groups of more than 25 pax up to 30 pax',
        'Sleeping capacity is 25 pax max',
        'Maximum 8 cars only',
        'Night parties are strictly prohibited — Day Time only',
      ],
    },
    // ── Big Group Rates (40 pax) ──────────────────────────────
    {
      tier: 'big_group',
      title: 'Big Group Rates',
      subtitle: 'Good for 40 Pax — Visiting & Staying Guests Included',
      maxPax: 40,
      additionalPaxDay: 500,
      additionalPaxNight: 1000,
      maxAdditionalPax: 10,
      rates: [
        { label: 'Day Time',  hours: '9AM to 5PM',          weekday: 25500, weekend: 35500 },
        { label: 'Night Time',hours: '8PM to 6AM',          weekday: 30500, weekend: 40500 },
        { label: 'Overnight', hours: '9AM–6AM or 8PM–5PM',  weekday: 40500, weekend: 50500 },
      ],
      notes: [
        'Big Group rate applies for groups of more than 25 pax up to 40 pax',
        'Sleeping capacity is 25 pax max',
        'Maximum 8 cars only',
        'Night parties are strictly prohibited — Day Time only',
      ],
    },
  ],
}

// ── Helper: get cheapest starting price for a property ───────────────────────
export function getStartingPrice(data: PropertyData): number {
  return Math.min(...data.packages.flatMap(p => p.rates.map(r => r.weekday)))
}

// ── Helper: format PHP ────────────────────────────────────────────────────────
export function formatPHP(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
  }).format(amount)
}

// ── Booking form types ────────────────────────────────────────────────────────
export type PaymentMode = 'GCash' | 'BDO'
export type PreferredTime = 'Day' | 'Night' | 'Overnight'
export type PreferredPlan = 'Basic' | 'Premium' | 'Platinum'

export interface BookingFormData {
  full_name: string
  address: string
  contact_number: string
  preferred_dates: string
  preferred_time: PreferredTime
  preferred_plan: PreferredPlan
  num_guests: number
  num_cars: number
  mode_of_payment: PaymentMode
  property_slug: string
  rate_tier: RateTier
  special_requests?: string
}
