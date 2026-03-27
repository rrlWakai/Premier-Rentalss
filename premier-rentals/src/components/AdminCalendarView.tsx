import { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, addMonths, subMonths, isToday,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import type { Booking, BlockedDate } from '../lib/supabase'

interface Props {
  retreats: { id: string; name: string }[]
  selectedRetreatId: string
  onSelectRetreat: (retreatId: string) => void
  bookings: Booking[]
  blockedDates: BlockedDate[]
  onAddBlock: (date: string, retreatId: string) => void
  onRemoveBlock: (id: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#22c55e',
  pending:   '#f59e0b',
  cancelled: '#ef4444',
  completed: '#8b5cf6',
}

export default function AdminCalendarView({
  retreats,
  selectedRetreatId,
  onSelectRetreat,
  bookings,
  blockedDates,
  onAddBlock,
  onRemoveBlock,
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay]   = useState<Date | null>(null)

  const days      = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const startPad  = getDay(startOfMonth(currentMonth))
  const WEEKDAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Match booking to date using preferred_dates (text field)
  // We do a simple string match — "June 14" will match if today is Jun 14
  function getDayBookings(date: Date) {
    const dateStr  = format(date, 'yyyy-MM-dd')
    const readable = format(date, 'MMMM d')
    const short    = format(date, 'MMM d')
    return bookings.filter(b => {
      if (selectedRetreatId && b.retreat_id !== selectedRetreatId) return false
      const d = b.preferred_dates ?? ''
      return d === dateStr || d.includes(readable) || d.includes(short)
    })
  }

  function getDayBlocked(date: Date): BlockedDate | undefined {
    return blockedDates.find(b => b.retreat_id === selectedRetreatId && b.date === format(date, 'yyyy-MM-dd'))
  }

  const selectedBookings = selectedDay ? getDayBookings(selectedDay) : []
  const selectedBlocked  = selectedDay ? getDayBlocked(selectedDay)  : undefined

  return (
    <div className="bg-white rounded-xl border border-[#ede8df] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#ede8df] px-4 py-4 sm:px-6">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-[#f8f4ee] rounded-lg transition-colors">
          <ChevronLeft size={16} color="#8a8a7a" />
        </button>
        <div className="flex flex-col items-center gap-2">
          <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 400, color: '#1a1a1a' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <select
            value={selectedRetreatId}
            onChange={(e) => onSelectRetreat(e.target.value)}
            className="rounded-full border border-[#ede8df] bg-[#faf8f5] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#4a4a4a] outline-none focus:border-[#c9a96e]"
            style={{ fontFamily: 'Jost, sans-serif' }}
          >
            {retreats.map((retreat) => (
              <option key={retreat.id} value={retreat.id}>
                {retreat.name}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-[#f8f4ee] rounded-lg transition-colors">
          <ChevronRight size={16} color="#8a8a7a" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Calendar grid */}
        <div className="p-3 sm:p-4 lg:col-span-2">
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-2 text-center text-[9px] tracking-wider text-[#8a8a7a] sm:text-[10px]" style={{ fontFamily: 'Jost, sans-serif', fontWeight: 500 }}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: startPad }).map((_, i) => <div key={`p${i}`} />)}
            {days.map(day => {
              const dayBookings = getDayBookings(day)
              const blocked     = getDayBlocked(day)
              const isSelected  = selectedDay && isSameDay(day, selectedDay)
              const todayDay    = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                  className={`
                    relative min-h-[52px] p-1 rounded-lg border text-left transition-all duration-150 sm:min-h-[62px] sm:p-1.5
                    ${isSelected  ? 'border-[#c9a96e] bg-[#faf6ef]'   : 'border-transparent hover:border-[#ede8df] hover:bg-[#faf8f5]'}
                    ${todayDay    ? 'ring-1 ring-[#c9a96e]'            : ''}
                    ${blocked     ? 'bg-red-50'                        : ''}
                  `}
                >
                  <span className={`mb-1 block text-[11px] font-medium sm:text-xs ${todayDay ? 'text-[#c9a96e]' : 'text-[#1a1a1a]'}`}
                    style={{ fontFamily: 'Jost, sans-serif' }}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {dayBookings.slice(0, 2).map(b => (
                      <div key={b.id} className="text-[8px] text-white px-1 py-0.5 rounded truncate leading-tight"
                        style={{ background: STATUS_COLORS[b.status] ?? '#8b5cf6', fontFamily: 'Jost, sans-serif' }}>
                        {b.full_name.split(' ')[0]}
                      </div>
                    ))}
                    {dayBookings.length > 2 && (
                      <div className="text-[8px] text-[#8a8a7a]" style={{ fontFamily: 'Jost, sans-serif' }}>+{dayBookings.length - 2} more</div>
                    )}
                    {blocked && (
                      <div className="text-[8px] text-red-400 font-medium" style={{ fontFamily: 'Jost, sans-serif' }}>Blocked</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-[#ede8df]">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
                <span className="text-[10px] capitalize text-[#8a8a7a]" style={{ fontFamily: 'Jost, sans-serif' }}>{status}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-100 border border-red-200" />
              <span className="text-[10px] text-[#8a8a7a]" style={{ fontFamily: 'Jost, sans-serif' }}>Blocked</span>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="min-h-[320px] border-t border-[#ede8df] p-4 sm:p-5 lg:min-h-[400px] lg:border-l lg:border-t-0">
          {selectedDay ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="section-label text-[9px]">Selected</p>
                  <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', color: '#1a1a1a' }}>
                    {format(selectedDay, 'EEEE, MMM d')}
                  </p>
                </div>
                {!selectedBlocked ? (
                  <button onClick={() => onAddBlock(format(selectedDay, 'yyyy-MM-dd'), selectedRetreatId)}
                    className="flex items-center gap-1.5 text-[10px] text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-2 py-1.5 rounded transition-colors"
                    style={{ fontFamily: 'Jost, sans-serif' }}>
                    <Plus size={11} /> Block
                  </button>
                ) : (
                  <button onClick={() => onRemoveBlock(selectedBlocked.id)}
                    className="flex items-center gap-1.5 text-[10px] text-green-500 hover:text-green-700 border border-green-200 hover:border-green-400 px-2 py-1.5 rounded transition-colors"
                    style={{ fontFamily: 'Jost, sans-serif' }}>
                    <X size={11} /> Unblock
                  </button>
                )}
              </div>

              {selectedBlocked && (
                <div className="p-3 bg-red-50 rounded border border-red-200 mb-4">
                  <p className="text-xs text-red-500 font-medium" style={{ fontFamily: 'Jost, sans-serif' }}>
                    This date is blocked{selectedBlocked.reason ? ` — ${selectedBlocked.reason}` : ''}
                  </p>
                </div>
              )}

              {selectedBookings.length === 0 && !selectedBlocked && (
                <p className="text-xs text-[#8a8a7a] text-center py-8" style={{ fontFamily: 'Jost, sans-serif' }}>
                  No bookings on this date
                </p>
              )}

              <div className="flex flex-col gap-3">
                {selectedBookings.map(booking => (
                  <div key={booking.id} className="p-3 bg-[#faf8f5] rounded border border-[#ede8df]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-[#1a1a1a]" style={{ fontFamily: 'Jost, sans-serif' }}>{booking.full_name}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full text-white capitalize"
                        style={{ background: STATUS_COLORS[booking.status], fontFamily: 'Jost, sans-serif' }}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#8a8a7a] flex flex-col gap-0.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                      <span>{booking.preferred_time} · {booking.preferred_plan} · {booking.num_guests} pax</span>
                      <span>{booking.contact_number}</span>
                      <span>{booking.mode_of_payment}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 gap-3">
              <div className="w-12 h-12 rounded-full bg-[#f0e8d8] flex items-center justify-center">
                <CalendarIcon />
              </div>
              <p className="text-sm text-[#4a4a4a]" style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>
                Select a date to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
