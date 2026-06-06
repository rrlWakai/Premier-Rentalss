import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { AvailabilityRow, PropertySlug, SlotName, SlotStatus } from '../types/availability'

const ALL_SLOTS: SlotName[] = ['daytime', 'nighttime', 'overnight']

const PENDING: SlotStatus = { daytime: 'pending', nighttime: 'pending', overnight: 'pending' }

function computeSlots(rows: AvailabilityRow[]): SlotStatus {
  const slots: SlotStatus = { daytime: 'available', nighttime: 'available', overnight: 'available' }

  for (const row of rows) {
    if (row.time_slot === null) {
      // Blocked date — all slots unavailable
      slots.daytime = 'unavailable'
      slots.nighttime = 'unavailable'
      slots.overnight = 'unavailable'
    } else {
      // 'unavailable' overwrites 'pending' which overwrites 'available'
      const cur = slots[row.time_slot]
      if (row.status === 'unavailable' || cur === 'available') {
        slots[row.time_slot] = row.status as 'unavailable' | 'pending'
      }
    }
  }

  return slots
}

function aggregateStatus(slots: SlotStatus): 'available' | 'pending' | 'unavailable' {
  const vals = ALL_SLOTS.map(s => slots[s])
  if (vals.every(v => v === 'available')) return 'available'
  if (vals.some(v => v === 'pending')) return 'pending'
  return 'unavailable'
}

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
        .select('date,status,time_slot')
        .eq('property_id', propertySlug)
        .gte('date', from)
        .lte('date', to)

      if (error) {
        console.error('useAvailability:', error)
        return Array.from({ length: daysInMonth }, (_, i) => ({
          date: `${year}-${pad(month)}-${pad(i + 1)}`,
          status: 'available' as const,
          slots: PENDING,
        }))
      }

      // Group rows by date
      const grouped = new Map<string, AvailabilityRow[]>()
      for (const row of (data as AvailabilityRow[]) ?? []) {
        const list = grouped.get(row.date)
        if (list) { list.push(row) } else { grouped.set(row.date, [row]) }
      }

      return Array.from({ length: daysInMonth }, (_, i) => {
        const d = `${year}-${pad(month)}-${pad(i + 1)}`
        const rows = grouped.get(d) ?? []
        const slots = rows.length > 0 ? computeSlots(rows) : { daytime: 'available', nighttime: 'available', overnight: 'available' } as SlotStatus
        const status = aggregateStatus(slots)
        return { date: d, status, slots }
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
