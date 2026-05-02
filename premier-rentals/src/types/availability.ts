// src/types/availability.ts
export type AvailabilityStatus = 'available' | 'pending' | 'unavailable'

// Matches availability_public view columns exactly
export interface AvailabilityRow {
  property_id: string   // retreat slug e.g. 'premier-patio'
  date:        string   // 'YYYY-MM-DD' — one row = one day
  status:      'unavailable' | 'pending'
}

// Used by the calendar grid
export interface CalendarDay {
  date:   string
  status: AvailabilityStatus  // 'available' inferred when no row exists
}

// Retreat slugs seeded in DB
export type PropertySlug =
  | 'premier-patio'
  | 'premier-pool-house'