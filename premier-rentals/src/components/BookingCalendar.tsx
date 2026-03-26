import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  isBefore, startOfDay, getDay,
} from 'date-fns'
import { fetchBlockedDates, type BlockedDate } from '../lib/supabase'

interface Props {
  retreatId: string
  checkIn: Date | null
  checkOut: Date | null
  onSelectDates: (checkIn: Date, checkOut: Date) => void
  singleDate?: boolean // for daytime/nighttime (same-day)
}

export default function BookingCalendar({ retreatId, checkIn, checkOut, onSelectDates, singleDate }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [selecting, setSelecting] = useState<'start' | 'end'>('start')
  const [hoverDate, setHoverDate] = useState<Date | null>(null)

  useEffect(() => {
    fetchBlockedDates(retreatId).then(setBlockedDates)
  }, [retreatId])

  const blocked = blockedDates.map(b => b.date)

  function isBlocked(date: Date) {
    return blocked.includes(format(date, 'yyyy-MM-dd'))
  }

  function isPast(date: Date) {
    return isBefore(startOfDay(date), startOfDay(new Date()))
  }

  function isDisabled(date: Date) {
    return isPast(date) || isBlocked(date)
  }

  function isInRange(date: Date) {
    if (!checkIn) return false
    const end = checkOut ?? hoverDate
    if (!end) return false
    return date > checkIn && date < end
  }

  function handleDayClick(date: Date) {
    if (isDisabled(date)) return

    if (singleDate) {
      // For daytime/nighttime: check-in = check-out = same day
      onSelectDates(date, date)
      return
    }

    if (selecting === 'start' || (checkIn && checkOut)) {
      setSelecting('end')
      onSelectDates(date, date) // temp
    } else {
      if (isBefore(date, checkIn!)) {
        onSelectDates(date, checkIn!)
      } else {
        onSelectDates(checkIn!, date)
      }
      setSelecting('start')
    }
  }

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  const startPadding = getDay(startOfMonth(currentMonth))
  const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  return (
    <div className="bg-white rounded-lg border border-[#ede8df] overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#ede8df]">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1.5 hover:bg-[#f8f4ee] rounded transition-colors"
        >
          <ChevronLeft size={16} color="#8a8a7a" />
        </button>
        <span
          className="text-sm font-medium text-[#1a1a1a]"
          style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1rem' }}
        >
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1.5 hover:bg-[#f8f4ee] rounded transition-colors"
        >
          <ChevronRight size={16} color="#8a8a7a" />
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 px-3 pt-3">
        {WEEKDAYS.map(d => (
          <div
            key={d}
            className="text-center text-[10px] text-[#8a8a7a] tracking-wider pb-2"
            style={{ fontFamily: 'Jost, sans-serif', fontWeight: 500 }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5 px-3 pb-4">
        {/* Padding cells */}
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const isStart = checkIn && isSameDay(day, checkIn)
          const isEnd = checkOut && isSameDay(day, checkOut)
          const inRange = isInRange(day)
          const disabled = isDisabled(day)
          const todayDay = isToday(day)
          const sameMonth = isSameMonth(day, currentMonth)

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => setHoverDate(day)}
              onMouseLeave={() => setHoverDate(null)}
              disabled={disabled}
              className={`
                relative h-9 w-full text-xs rounded transition-all duration-150 font-medium
                ${!sameMonth ? 'opacity-25' : ''}
                ${disabled ? 'cursor-not-allowed opacity-30 line-through' : 'cursor-pointer hover:bg-[#f8f4ee]'}
                ${isStart || isEnd ? '!bg-[#c9a96e] !text-white rounded' : ''}
                ${inRange ? 'bg-[#f0e8d8] text-[#1a1a1a]' : ''}
                ${todayDay && !isStart && !isEnd ? 'border border-[#c9a96e]' : ''}
                ${isBlocked(day) ? 'bg-red-50 text-red-300' : ''}
              `}
              style={{ fontFamily: 'Jost, sans-serif', fontWeight: 400, fontSize: '0.75rem' }}
            >
              {format(day, 'd')}
              {isBlocked(day) && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-300" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-[#ede8df] bg-[#faf8f5]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#c9a96e]" />
          <span className="text-[10px] text-[#8a8a7a]" style={{ fontFamily: 'Jost, sans-serif' }}>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#f0e8d8]" />
          <span className="text-[10px] text-[#8a8a7a]" style={{ fontFamily: 'Jost, sans-serif' }}>Range</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-50 border border-red-200" />
          <span className="text-[10px] text-[#8a8a7a]" style={{ fontFamily: 'Jost, sans-serif' }}>Unavailable</span>
        </div>
      </div>
    </div>
  )
}
