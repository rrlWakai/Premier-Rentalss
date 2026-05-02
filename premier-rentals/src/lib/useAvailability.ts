import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { AvailabilityRow, CalendarDay, PropertySlug } from '../types/availability'

export function useAvailability(
  propertySlug: PropertySlug,
  year:         number,
  month:        number   // 1-based
) {
  const [days,  setDays]  = useState<CalendarDay[]>([])
  const [live,  setLive]  = useState(false)
  const [loading, setLoading] = useState(true)

  const pad = (n: number) => String(n).padStart(2, '0')

  const fetchMonth = useCallback(async () => {
    setLoading(true)
    const from = `${year}-${pad(month)}-01`
    const to   = new Date(year, month, 0).toISOString().slice(0, 10)

    const { data } = await supabase
      .from('availability_public')
      .select('date,status')
      .eq('property_id', propertySlug)
      .gte('date', from)
      .lte('date', to)

    // Build a map; days with no row = available
    const map = new Map((data as AvailabilityRow[])
      ?.map(r => [r.date, r.status]) ?? [])

    const daysInMonth = new Date(year, month, 0).getDate()
    setDays(
      Array.from({ length: daysInMonth }, (_, i) => {
        const d = `${year}-${pad(month)}-${pad(i + 1)}`
        return { date: d, status: map.get(d) ?? 'available' }
      })
    )
    setLoading(false)
  }, [propertySlug, year, month])

  useEffect(() => {
    fetchMonth()

    // Channel 1: booking changes
    const ch1 = supabase
      .channel(`bookings-${propertySlug}-${year}-${pad(month)}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        fetchMonth)
      .subscribe(s => setLive(s === 'SUBSCRIBED'))

    // Channel 2: admin-blocked date changes
    const ch2 = supabase
      .channel(`blocked-${propertySlug}-${year}-${pad(month)}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'blocked_dates' },
        fetchMonth)
      .subscribe()

    return () => {
      supabase.removeChannel(ch1)
      supabase.removeChannel(ch2)
    }
  }, [fetchMonth])

  return { days, live, loading }
}