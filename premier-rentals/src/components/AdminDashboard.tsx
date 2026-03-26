import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, BookOpen, LogOut,
  TrendingUp, Users, CheckCircle, Clock, ChevronDown,
  Search, Filter, FileText, User, MapPin,
  Calendar, Package, Car, Wallet, AlertCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  fetchBookings, fetchBlockedDates, fetchRetreats,
  updateBookingStatus, updateBookingPayment,
  addBlockedDate, removeBlockedDate, adminSignOut,
  type Booking, type BlockedDate, type Retreat,
  type BookingStatus, type PaymentStatus,
} from '../lib/supabase'
import { formatPHP } from '../lib/propertyData'
import AdminCalendarView from './AdminCalendarView'
import toast from 'react-hot-toast'

type Tab = 'overview' | 'bookings' | 'calendar'

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'text-green-600 bg-green-50 border-green-200',
  pending:   'text-amber-600 bg-amber-50 border-amber-200',
  cancelled: 'text-red-500 bg-red-50 border-red-200',
  completed: 'text-purple-600 bg-purple-50 border-purple-200',
}
const PAYMENT_COLORS: Record<string, string> = {
  paid: 'text-green-600', unpaid: 'text-amber-500', refunded: 'text-blue-500', failed: 'text-red-500',
}
const TIER_LABELS: Record<string, string> = {
  staycation: 'Staycation', family: 'Family', big_group: 'Big Group',
}

function ClockSm() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [tab, setTab]                         = useState<Tab>('overview')
  const [bookings, setBookings]               = useState<Booking[]>([])
  const [blockedDates, setBlockedDates]       = useState<BlockedDate[]>([])
  const [retreats, setRetreats]               = useState<Retreat[]>([])
  const [loading, setLoading]                 = useState(true)
  const [search, setSearch]                   = useState('')
  const [statusFilter, setStatusFilter]       = useState<string>('all')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  useEffect(() => {
    Promise.all([fetchBookings(), fetchBlockedDates(), fetchRetreats()])
      .then(([b, bd, r]) => { setBookings(b); setBlockedDates(bd); setRetreats(r); setLoading(false) })
  }, [])

  async function handleSignOut() {
    await adminSignOut(); navigate('/admin'); toast.success('Signed out')
  }

  async function handleStatusUpdate(id: string, status: BookingStatus) {
    const ok = await updateBookingStatus(id, status)
    if (ok) {
      setBookings(p => p.map(b => b.id === id ? { ...b, status } : b))
      setSelectedBooking(p => p?.id === id ? { ...p, status } : p)
      toast.success(`Marked as ${status}`)
    }
  }

  async function handlePaymentUpdate(id: string, payment_status: PaymentStatus) {
    const ok = await updateBookingPayment(id, payment_status)
    if (ok) {
      setBookings(p => p.map(b => b.id === id ? { ...b, payment_status } : b))
      setSelectedBooking(p => p?.id === id ? { ...p, payment_status } : p)
      toast.success(`Payment marked as ${payment_status}`)
    }
  }

  async function handleAddBlock(date: string) {
    const ok = await addBlockedDate(retreats[0]?.id ?? '', date)
    if (ok) { const bd = await fetchBlockedDates(); setBlockedDates(bd); toast.success(`${date} blocked`) }
  }

  async function handleRemoveBlock(id: string) {
    await removeBlockedDate(id)
    setBlockedDates(p => p.filter(b => b.id !== id))
    toast.success('Date unblocked')
  }

  const totalRevenue = bookings.filter(b => b.payment_status === 'paid').reduce((s, b) => s + b.total_amount, 0)
  const confirmed    = bookings.filter(b => b.status === 'confirmed').length
  const pending      = bookings.filter(b => b.status === 'pending').length
  const totalGuests  = bookings.reduce((s, b) => s + (b.num_guests ?? 0), 0)

  const filteredBookings = bookings.filter(b => {
    const q = search.toLowerCase()
    const matchSearch = b.full_name.toLowerCase().includes(q) || (b.contact_number ?? '').includes(q)
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  const STATS = [
    { label: 'Total Revenue', value: formatPHP(totalRevenue), icon: TrendingUp,  color: '#c9a96e' },
    { label: 'Confirmed',     value: confirmed,               icon: CheckCircle, color: '#22c55e' },
    { label: 'Pending',       value: pending,                 icon: Clock,       color: '#f59e0b' },
    { label: 'Total Guests',  value: totalGuests,             icon: Users,       color: '#8b5cf6' },
  ]

  const NAV: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', icon: BookOpen },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  ]

  return (
    <div className="min-h-screen flex bg-[#f8f4ee]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1a1a] flex-col shrink-0 hidden lg:flex">
        <div className="px-6 py-6 border-b border-white/10">
          <Link to="/">
            <p className="text-white text-xl tracking-[0.15em] uppercase hover:text-[#c9a96e] transition-colors"
              style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300 }}>Premier</p>
          </Link>
          <p className="section-label text-[9px] mt-1" style={{ color: '#c9a96e' }}>Admin Dashboard</p>
        </div>
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-left w-full
                ${tab === id ? 'bg-[#c9a96e]/15 text-[#c9a96e] border border-[#c9a96e]/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
              style={{ fontFamily: 'Jost, sans-serif' }}>
              <Icon size={16} strokeWidth={1.5} />{label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-5 border-t border-white/10">
          <button onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 text-white/40 hover:text-white transition-colors w-full text-sm"
            style={{ fontFamily: 'Jost, sans-serif' }}>
            <LogOut size={15} strokeWidth={1.5} />Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-[#ede8df] px-5 lg:px-8 py-4 flex items-center justify-between">
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 400, color: '#1a1a1a' }}>
            {NAV.find(n => n.id === tab)?.label}
          </h1>
          <div className="flex lg:hidden items-center gap-1">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`p-2 rounded-lg transition-colors ${tab === id ? 'bg-[#f0e8d8] text-[#c9a96e]' : 'text-[#8a8a7a]'}`}
                title={label}>
                <Icon size={18} strokeWidth={1.5} />
              </button>
            ))}
            <button onClick={handleSignOut} className="p-2 text-[#8a8a7a] hover:text-red-400 transition-colors">
              <LogOut size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="p-5 lg:p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* OVERVIEW */}
              {tab === 'overview' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {STATS.map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="bg-white rounded-xl border border-[#ede8df] p-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] tracking-widest uppercase text-[#8a8a7a]" style={{ fontFamily: 'Jost, sans-serif' }}>{label}</p>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${color}18` }}>
                            <Icon size={15} color={color} strokeWidth={1.5} />
                          </div>
                        </div>
                        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', fontWeight: 400, color: '#1a1a1a', lineHeight: 1 }}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white rounded-xl border border-[#ede8df] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#ede8df] flex items-center justify-between">
                      <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontWeight: 400, color: '#1a1a1a' }}>Recent Bookings</h3>
                      <button onClick={() => setTab('bookings')} className="text-xs text-[#c9a96e] hover:underline" style={{ fontFamily: 'Jost, sans-serif' }}>View all</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs" style={{ fontFamily: 'Jost, sans-serif' }}>
                        <thead>
                          <tr className="border-b border-[#ede8df] bg-[#faf8f5]">
                            {['Guest', 'Property', 'Session', 'Date', 'Amount', 'Status'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-[10px] tracking-widest uppercase text-[#8a8a7a] font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.slice(0, 8).map(b => (
                            <tr key={b.id} className="border-b border-[#ede8df] hover:bg-[#faf8f5] transition-colors cursor-pointer"
                              onClick={() => { setTab('bookings'); setSelectedBooking(b) }}>
                              <td className="px-4 py-3">
                                <p className="font-medium text-[#1a1a1a]">{b.full_name}</p>
                                <p className="text-[#8a8a7a] text-[10px]">{b.contact_number}</p>
                              </td>
                              <td className="px-4 py-3 text-[#4a4a4a]">{b.retreat?.name ?? '—'}</td>
                              <td className="px-4 py-3 text-[#4a4a4a]">{b.preferred_time} · {b.preferred_plan}</td>
                              <td className="px-4 py-3 text-[#4a4a4a] max-w-[100px] truncate">{b.preferred_dates}</td>
                              <td className="px-4 py-3 font-medium text-[#c9a96e]">{formatPHP(b.total_amount)}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] border capitalize font-medium ${STATUS_COLORS[b.status]}`}>{b.status}</span>
                              </td>
                            </tr>
                          ))}
                          {bookings.length === 0 && (
                            <tr><td colSpan={6} className="text-center py-12 text-[#8a8a7a]">No bookings yet</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* BOOKINGS */}
              {tab === 'bookings' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8a7a]" />
                      <input type="text" placeholder="Search by name or contact..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#ede8df] rounded-lg bg-white outline-none focus:border-[#c9a96e] transition-colors"
                        style={{ fontFamily: 'Jost, sans-serif' }} />
                    </div>
                    <div className="relative">
                      <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8a7a]" />
                      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="pl-9 pr-8 py-2.5 text-sm border border-[#ede8df] rounded-lg bg-white outline-none focus:border-[#c9a96e] appearance-none cursor-pointer"
                        style={{ fontFamily: 'Jost, sans-serif' }}>
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8a7a] pointer-events-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 bg-white rounded-xl border border-[#ede8df] overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs" style={{ fontFamily: 'Jost, sans-serif' }}>
                          <thead>
                            <tr className="bg-[#faf8f5] border-b border-[#ede8df]">
                              {['Guest', 'Package', 'Date', 'Amount', 'Payment', 'Status', ''].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-[10px] tracking-widest uppercase text-[#8a8a7a] font-medium">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredBookings.map(b => (
                              <tr key={b.id}
                                className={`border-b border-[#ede8df] cursor-pointer transition-colors ${selectedBooking?.id === b.id ? 'bg-[#faf6ef]' : 'hover:bg-[#faf8f5]'}`}
                                onClick={() => setSelectedBooking(b)}>
                                <td className="px-4 py-3">
                                  <p className="font-medium text-[#1a1a1a]">{b.full_name}</p>
                                  <p className="text-[#8a8a7a] text-[10px]">{b.num_guests} pax · {b.num_cars} car(s)</p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-[#4a4a4a]">{b.preferred_time} · {b.preferred_plan}</p>
                                  <p className="text-[#8a8a7a] text-[10px]">{b.rate_tier ? (TIER_LABELS[b.rate_tier] ?? b.rate_tier) : '—'}</p>
                                </td>
                                <td className="px-4 py-3 text-[#4a4a4a] max-w-[110px] truncate text-[10px]">{b.preferred_dates}</td>
                                <td className="px-4 py-3 font-medium text-[#c9a96e]">{formatPHP(b.total_amount)}</td>
                                <td className="px-4 py-3">
                                  <span className={`capitalize text-[10px] font-medium ${PAYMENT_COLORS[b.payment_status]}`}>{b.payment_status}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] border capitalize font-medium ${STATUS_COLORS[b.status]}`}>{b.status}</span>
                                </td>
                                <td className="px-4 py-3"><FileText size={14} color="#8a8a7a" /></td>
                              </tr>
                            ))}
                            {filteredBookings.length === 0 && (
                              <tr><td colSpan={7} className="text-center py-12 text-[#8a8a7a]">No bookings found</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Detail panel */}
                    <div className="bg-white rounded-xl border border-[#ede8df] p-5 overflow-y-auto max-h-[620px]">
                      {selectedBooking ? (
                        <div>
                          <p className="section-label mb-3 text-[9px]">Booking Detail</p>
                          <h3 className="mb-4" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.15rem', fontWeight: 400, color: '#1a1a1a' }}>
                            {selectedBooking.full_name}
                          </h3>
                          <div className="flex flex-col gap-0 mb-4 text-[11px]" style={{ fontFamily: 'Jost, sans-serif' }}>
                            {([
                              [User,        'Contact',   selectedBooking.contact_number],
                              [MapPin,      'Address',   selectedBooking.address],
                              [Package,     'Property',  selectedBooking.retreat?.name ?? '—'],
                              [FileText,    'Package',   selectedBooking.rate_tier ? (TIER_LABELS[selectedBooking.rate_tier] ?? selectedBooking.rate_tier) : '—'],
                              [null,        'Session',   `${selectedBooking.preferred_time} · ${selectedBooking.preferred_plan}`],
                              [Calendar,    'Date(s)',   selectedBooking.preferred_dates],
                              [Users,       'Guests',    `${selectedBooking.num_guests} pax`],
                              [Car,         'Cars',      `${selectedBooking.num_cars} car(s)`],
                              [Wallet,      'Payment',   selectedBooking.mode_of_payment],
                              [AlertCircle, 'Amount',    formatPHP(selectedBooking.total_amount)],
                            ] as [typeof User | null, string, string][]).map(([Icon, label, value]) => (
                              <div key={label} className="flex items-center gap-2.5 py-2 border-b border-[#ede8df] last:border-0">
                                {Icon ? <Icon size={12} color="#c9a96e" strokeWidth={1.5} className="shrink-0" /> : <ClockSm />}
                                <span className="text-[#8a8a7a] text-[10px] w-16 shrink-0">{label}</span>
                                <span className="text-[#1a1a1a] font-medium">{value}</span>
                              </div>
                            ))}
                          </div>
                          {selectedBooking.special_requests && (
                            <div className="p-3 bg-[#f8f4ee] rounded mb-4 text-xs text-[#4a4a4a]" style={{ fontFamily: 'Jost, sans-serif' }}>
                              <span className="text-[#8a8a7a] block mb-1 text-[10px] uppercase tracking-wider">Special Requests</span>
                              {selectedBooking.special_requests}
                            </div>
                          )}
                          <p className="text-[10px] text-[#8a8a7a] mb-2 tracking-wider uppercase" style={{ fontFamily: 'Jost, sans-serif' }}>Booking Status</p>
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            {(['confirmed', 'pending', 'cancelled', 'completed'] as BookingStatus[]).map(s => (
                              <button key={s} onClick={() => handleStatusUpdate(selectedBooking.id, s)}
                                className={`text-[10px] py-2 px-3 rounded border capitalize transition-all font-medium
                                  ${selectedBooking.status === s ? STATUS_COLORS[s] : 'border-[#ede8df] text-[#8a8a7a] hover:border-[#c9a96e] hover:text-[#c9a96e]'}`}
                                style={{ fontFamily: 'Jost, sans-serif' }}>{s}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-[#8a8a7a] mb-2 tracking-wider uppercase" style={{ fontFamily: 'Jost, sans-serif' }}>Payment Status</p>
                          <div className="grid grid-cols-2 gap-2">
                            {(['unpaid', 'paid', 'refunded', 'failed'] as PaymentStatus[]).map(s => (
                              <button key={s} onClick={() => handlePaymentUpdate(selectedBooking.id, s)}
                                className={`text-[10px] py-2 px-3 rounded border capitalize transition-all font-medium
                                  ${selectedBooking.payment_status === s
                                    ? s === 'paid'     ? 'bg-green-50 text-green-600 border-green-200'
                                    : s === 'unpaid'   ? 'bg-amber-50 text-amber-600 border-amber-200'
                                    : s === 'refunded' ? 'bg-blue-50 text-blue-600 border-blue-200'
                                                       : 'bg-red-50 text-red-500 border-red-200'
                                    : 'border-[#ede8df] text-[#8a8a7a] hover:border-[#c9a96e] hover:text-[#c9a96e]'}`}
                                style={{ fontFamily: 'Jost, sans-serif' }}>{s}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full py-16 gap-3 text-center">
                          <div className="w-12 h-12 rounded-full bg-[#f0e8d8] flex items-center justify-center">
                            <FileText size={20} color="#c9a96e" strokeWidth={1.5} />
                          </div>
                          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: '#4a4a4a' }}>
                            Select a booking to view details
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* CALENDAR */}
              {tab === 'calendar' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <AdminCalendarView
                    bookings={bookings}
                    blockedDates={blockedDates}
                    onAddBlock={handleAddBlock}
                    onRemoveBlock={handleRemoveBlock}
                  />
                </motion.div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
