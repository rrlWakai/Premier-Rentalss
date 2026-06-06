import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { AvailabilityRow, CalendarDay, PropertySlug } from '../types/availability'

export function useAvailability(
  propertySlug: PropertySlug,
  year:         number,
  month:        number
) {
  const queryClient = useQueryClient()
  const pad = (n: number) => String(n).padStart(2, '0')

  const { data: days = [], isFetching } = useQuery({
    queryKey: ['availability', propertySlug, year, month],
    queryFn: async () => {
      const daysInMonth = new Date(year, month, 0).getDate()
      const from = `${year}-${pad(month)}-01`
      const to = `${year}-${pad(month)}-${pad(daysInMonth)}`

      const { data, error } = await supabase
        .from('availability_public')
        .select('date,status')
        .eq('property_id', propertySlug)
        .gte('date', from)
        .lte('date', to)

      if (error) {
        console.error('useAvailability:', error)
        return Array.from({ length: daysInMonth }, (_, i) => ({
          date: `${year}-${pad(month)}-${pad(i + 1)}`,
          status: 'available' as const,
        }))
      }

      const map = new Map<string, CalendarDay['status']>()
      for (const row of (data as AvailabilityRow[]) ?? []) {
        const existing = map.get(row.date)
        if (row.status === 'unavailable' || !existing) {
          map.set(row.date, row.status)
        }
      }

      return Array.from({ length: daysInMonth }, (_, i) => {
        const d = `${year}-${pad(month)}-${pad(i + 1)}`
        return { date: d, status: map.get(d) ?? 'available' }
      })
    },
    staleTime: 30000,
    gcTime: 300000,
  })

  const [live, setLive] = useState(false)

  useEffect(() => {
    const ch1 = supabase
      .channel(`bookings-${propertySlug}-${year}-${pad(month)}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => { queryClient.invalidateQueries({
          queryKey: ['availability', propertySlug, year, month],
        }) })
      .subscribe(s => setLive(s === 'SUBSCRIBED'))

    const ch2 = supabase
      .channel(`blocked-${propertySlug}-${year}-${pad(month)}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'blocked_dates' },
        () => { queryClient.invalidateQueries({
          queryKey: ['availability', propertySlug, year, month],
        }) })
      .subscribe()

    return () => {
      supabase.removeChannel(ch1)
      supabase.removeChannel(ch2)
    }
  }, [propertySlug, year, month, queryClient])

  return { days, live, loading: isFetching }
}
