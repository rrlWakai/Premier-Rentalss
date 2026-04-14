import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  LogOut,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  ChevronDown,
  Search,
  Filter,
  FileText,
  User,
  MapPin,
  Calendar,
  Package,
  Car,
  Wallet,
  AlertCircle,
  RefreshCw,
  Trash2,
  UserCog,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  fetchBookings,
  fetchBlockedDates,
  fetchRetreats,
  fetchAdminStats,
  updateBookingStatus,
  updateBookingPayment,
  deleteBooking,
  addBlockedDate,
  removeBlockedDate,
  adminSignOut,
  fetchStaff,
  inviteStaff,
  removeStaff,
  type Booking,
  type BlockedDate,
  type Retreat,
  type BookingStatus,
  type PaymentStatus,
  type AdminStats,
  type StaffUser,
  supabase,
} from "../lib/supabase";
import { STATUS_TAILWIND, PAYMENT_ACTIVE_CLS, PAYMENT_TEXT_CLS } from "../lib/constants";
import { formatPHP } from "../lib/propertyData";
import AdminCalendarView from "./AdminCalendarView";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

type Tab = "overview" | "bookings" | "calendar" | "staff";

const TIER_LABELS: Record<string, string> = {
  staycation: "Staycation",
  family: "Family",
  big_group: "Big Group",
};

const PAGE_SIZE = 50;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { session, isOwner } = useAuth();
  
  const [tab, setTab] = useState<Tab>("overview");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  
  const [selectedRetreatId, setSelectedRetreatId] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [page, setPage] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);

  useEffect(() => {
    const basePromise = Promise.all([
      fetchBookings(page, PAGE_SIZE),
      fetchBlockedDates(),
      fetchRetreats(),
      fetchAdminStats(),
    ]);

    const staffPromise = isOwner
      ? fetchStaff()
      : Promise.resolve([] as StaffUser[]);

    Promise.all([basePromise, staffPromise])
      .then(([[{ bookings: b, total }, bd, r, stats], staffList]) => {
        setBookings(b);
        setTotalBookings(total);
        setBlockedDates(bd);
        setRetreats(r);
        if (isOwner) setStaffUsers(staffList);
        setSelectedRetreatId(r[0]?.id ?? "");
        setAdminStats(stats);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load admin data:", error);
        setLoading(false);
      });
  }, [page, isOwner]);

  useEffect(() => {
  const channel = supabase
    .channel("bookings-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings",
      },
      () => {
        console.log("Realtime update triggered");

        // 🔥 reuse your existing refresh logic
        refreshData();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  async function handleSignOut() {
    await adminSignOut();
    navigate("/admin");
    toast.success("Signed out");
  }

  async function refreshData() {
    setLoading(true);
    try {
      const basePromise = Promise.all([
        fetchBookings(page, PAGE_SIZE),
        fetchBlockedDates(),
        fetchRetreats(),
        fetchAdminStats(),
      ]);

      const staffPromise = isOwner
        ? fetchStaff()
        : Promise.resolve([] as StaffUser[]);

      const [[{ bookings: b, total }, bd, r, stats], staffList] =
        await Promise.all([basePromise, staffPromise]);

      setBookings(b);
      setTotalBookings(total);
      setBlockedDates(bd);
      setRetreats(r);
      if (isOwner) setStaffUsers(staffList);
      setAdminStats(stats);
      toast.success("Data refreshed");
    } catch (error) {
      console.error("Failed to refresh data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(id: string, status: BookingStatus) {
    if (status === "cancelled") {
      if (!window.confirm("Are you sure you want to cancel this booking? This cannot be undone.")) return;
    }
    try {
      const ok = await updateBookingStatus(id, status);
      if (ok) {
        setBookings((p) => p.map((b) => (b.id === id ? { ...b, status } : b)));
        setSelectedBooking((p) => (p?.id === id ? { ...p, status } : p));
        toast.success(`Marked as ${status}`);
      } else {
        toast.error("Failed to update booking status");
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
      toast.error("Failed to update booking status");
    }
  }

  async function handlePaymentUpdate(
    id: string,
    payment_status: PaymentStatus,
  ) {
    try {
      const ok = await updateBookingPayment(id, payment_status);
      if (ok) {
        setBookings((p) =>
          p.map((b) => (b.id === id ? { ...b, payment_status } : b)),
        );
        setSelectedBooking((p) =>
          p?.id === id ? { ...p, payment_status } : p,
        );
        toast.success(`Payment marked as ${payment_status}`);
      } else {
        toast.error("Failed to update payment status");
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("Failed to update payment status");
    }
  }

  async function handleDeleteBooking(id: string) {
    if (!window.confirm("Permanently delete this booking? This cannot be undone.")) return;
    try {
      const ok = await deleteBooking(id);
      if (ok) {
        setBookings((p) => p.filter((b) => b.id !== id));
        setTotalBookings((p) => p - 1);
        setSelectedBooking(null);
        toast.success("Booking deleted");
      } else {
        toast.error("Failed to delete booking");
      }
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast.error("Failed to delete booking");
    }
  }

  async function handleAddBlock(date: string, retreatId: string, reason?: string) {
    if (!retreatId) {
      toast.error("Select a property first");
      return;
    }
    try {
      const ok = await addBlockedDate(retreatId, date, reason);
      if (ok) {
        const bd = await fetchBlockedDates();
        setBlockedDates(bd);
        toast.success(`${date} blocked`);
      } else {
        toast.error("Failed to block date");
      }
    } catch (error) {
      console.error("Error blocking date:", error);
      toast.error("Failed to block date");
    }
  }

  async function handleRemoveBlock(id: string) {
    try {
      const ok = await removeBlockedDate(id);
      if (ok) {
        setBlockedDates((p) => p.filter((b) => b.id !== id));
        toast.success("Date unblocked");
      } else {
        toast.error("Failed to unblock date");
      }
    } catch (error) {
      console.error("Error unblocking date:", error);
      toast.error("Failed to unblock date");
    }
  }

  const filteredBookings = bookings.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      b.full_name.toLowerCase().includes(q) ||
      (b.contact_number ?? "").includes(q);
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const STATS = [
    ...(isOwner
      ? [
          {
            label: "Total Revenue",
            value: formatPHP(adminStats?.totalRevenue ?? 0),
            icon: TrendingUp,
            color: "#c9a96e",
          },
        ]
      : []),
    {
      label: "Confirmed",
      value: adminStats?.confirmed ?? 0,
      icon: CheckCircle,
      color: "#22c55e",
    },
    { label: "Pending", value: adminStats?.pending ?? 0, icon: Clock, color: "#f59e0b" },
    {
      label: "Total Guests",
      value: adminStats?.totalGuests ?? 0,
      icon: Users,
      color: "#8b5cf6",
    },
  ];

  const NAV: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "bookings", label: "Bookings", icon: BookOpen },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    ...(isOwner ? [{ id: "staff" as Tab, label: "Staff", icon: UserCog }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#f8f4ee] lg:flex overflow-x-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1a1a] flex-col shrink-0 hidden lg:flex">
        <div className="px-6 py-6 border-b border-white/10">
          <Link to="/">
            <p
              className="text-white text-xl tracking-[0.15em] uppercase hover:text-[#c9a96e] transition-colors"
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontWeight: 300,
              }}
            >
              Premier
            </p>
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-medium text-[#1a1a1a]"
              style={{ background: "#c9a96e" }}
            >
              {isOwner ? "Owner" : "Staff"}
            </span>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-left w-full
                ${tab === id ? "bg-[#c9a96e]/15 text-[#c9a96e] border border-[#c9a96e]/20" : "text-white/50 hover:text-white hover:bg-white/5"}`}
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              <Icon size={16} strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-5 border-t border-white/10 flex flex-col gap-3">
          <div className="px-3 text-[10px] text-white/40 truncate">
            {session?.user?.email}
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 text-white/40 hover:text-white transition-colors w-full text-sm"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            <LogOut size={15} strokeWidth={1.5} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-[#ede8df] bg-white px-4 py-4 sm:px-5 lg:px-8">
          <h1
            style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "1.4rem",
              fontWeight: 400,
              color: "#1a1a1a",
            }}
          >
            {NAV.find((n) => n.id === tab)?.label}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              disabled={loading}
              className="p-2 text-[#8a8a7a] hover:text-[#c9a96e] transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw
                size={18}
                strokeWidth={1.5}
                className={loading ? "animate-spin" : ""}
              />
            </button>
            <div className="flex lg:hidden items-center gap-1">
              {NAV.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`p-2 rounded-lg transition-colors ${tab === id ? "bg-[#f0e8d8] text-[#c9a96e]" : "text-[#8a8a7a]"}`}
                  title={label}
                >
                  <Icon size={18} strokeWidth={1.5} />
                </button>
              ))}
              <button
                onClick={handleSignOut}
                className="p-2 text-[#8a8a7a] hover:text-red-400 transition-colors"
              >
                <LogOut size={18} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 lg:p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* OVERVIEW */}
              {tab === "overview" && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-6"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {STATS.map(({ label, value, icon: Icon, color }) => (
                      <div
                        key={label}
                        className="bg-white rounded-xl border border-[#ede8df] p-5"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p
                            className="text-[10px] tracking-widest uppercase text-[#8a8a7a]"
                            style={{ fontFamily: "Jost, sans-serif" }}
                          >
                            {label}
                          </p>
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ background: `${color}18` }}
                          >
                            <Icon size={15} color={color} strokeWidth={1.5} />
                          </div>
                        </div>
                        <p
                          style={{
                            fontFamily: "Cormorant Garamond, serif",
                            fontSize: "1.6rem",
                            fontWeight: 400,
                            color: "#1a1a1a",
                            lineHeight: 1,
                          }}
                        >
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white rounded-xl border border-[#ede8df] overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[#ede8df] px-4 py-4 sm:px-6">
                      <h3
                        style={{
                          fontFamily: "Cormorant Garamond, serif",
                          fontSize: "1.1rem",
                          fontWeight: 400,
                          color: "#1a1a1a",
                        }}
                      >
                        Recent Bookings
                      </h3>
                      <button
                        onClick={() => setTab("bookings")}
                        className="text-xs text-[#c9a96e] hover:underline"
                        style={{ fontFamily: "Jost, sans-serif" }}
                      >
                        View all
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table
                        className="w-full text-xs"
                        style={{ fontFamily: "Jost, sans-serif" }}
                      >
                        <thead>
                          <tr className="border-b border-[#ede8df] bg-[#faf8f5]">
                            {[
                              "Guest",
                              "Property",
                              "Session",
                              "Date",
                              "Amount",
                              "Status",
                            ].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-3 text-left text-[10px] tracking-widest uppercase text-[#8a8a7a] font-medium"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.slice(0, 8).map((b) => (
                            <tr
                              key={b.id}
                              className="border-b border-[#ede8df] hover:bg-[#faf8f5] transition-colors cursor-pointer"
                              onClick={() => {
                                setTab("bookings");
                                setSelectedBooking(b);
                              }}
                            >
                              <td className="px-4 py-3">
                                <p className="font-medium text-[#1a1a1a]">
                                  {b.full_name}
                                </p>
                                <p className="text-[#8a8a7a] text-[10px]">
                                  {b.contact_number}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-[#4a4a4a]">
                                {b.retreat?.name ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-[#4a4a4a]">
                                {b.preferred_time} · {b.preferred_plan}
                              </td>
                              <td className="px-4 py-3 text-[#4a4a4a] max-w-[100px] truncate">
                                {b.preferred_dates}
                              </td>
                              <td className="px-4 py-3 font-medium text-[#c9a96e]">
                                {formatPHP(b.total_amount)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] border capitalize font-medium ${STATUS_TAILWIND[b.status]}`}
                                >
                                  {b.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {bookings.length === 0 && (
                            <tr>
                              <td
                                colSpan={6}
                                className="text-center py-12 text-[#8a8a7a]"
                              >
                                No bookings yet
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* BOOKINGS */}
              {tab === "bookings" && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8a7a]"
                      />
                      <input
                        type="text"
                        placeholder="Search by name or contact..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#ede8df] rounded-lg bg-white outline-none focus:border-[#c9a96e] transition-colors"
                        style={{ fontFamily: "Jost, sans-serif" }}
                      />
                    </div>
                    <div className="relative sm:w-[180px]">
                      <Filter
                        size={13}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8a7a]"
                      />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="pl-9 pr-8 py-2.5 text-sm border border-[#ede8df] rounded-lg bg-white outline-none focus:border-[#c9a96e] appearance-none cursor-pointer"
                        style={{ fontFamily: "Jost, sans-serif" }}
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                      </select>
                      <ChevronDown
                        size={12}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8a7a] pointer-events-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <div className="bg-white rounded-xl border border-[#ede8df] overflow-hidden xl:col-span-2">
                      <div className="overflow-x-auto">
                        <table
                          className="w-full text-xs"
                          style={{ fontFamily: "Jost, sans-serif" }}
                        >
                          <thead>
                            <tr className="bg-[#faf8f5] border-b border-[#ede8df]">
                              {[
                                "Guest",
                                "Package",
                                "Date",
                                "Amount",
                                "Payment",
                                "Status",
                                "",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="px-4 py-3 text-left text-[10px] tracking-widest uppercase text-[#8a8a7a] font-medium"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredBookings.map((b) => (
                              <tr
                                key={b.id}
                                className={`border-b border-[#ede8df] cursor-pointer transition-colors ${selectedBooking?.id === b.id ? "bg-[#faf6ef]" : "hover:bg-[#faf8f5]"}`}
                                onClick={() => setSelectedBooking(b)}
                              >
                                <td className="px-4 py-3">
                                  <p className="font-medium text-[#1a1a1a]">
                                    {b.full_name}
                                  </p>
                                  <p className="text-[#8a8a7a] text-[10px]">
                                    {b.num_guests} pax · {b.num_cars} car(s)
                                  </p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-[#4a4a4a]">
                                    {b.preferred_time} · {b.preferred_plan}
                                  </p>
                                  <p className="text-[#8a8a7a] text-[10px]">
                                    {b.rate_tier
                                      ? (TIER_LABELS[b.rate_tier] ??
                                        b.rate_tier)
                                      : "—"}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-[#4a4a4a] max-w-[110px] truncate text-[10px]">
                                  {b.preferred_dates}
                                </td>
                                <td className="px-4 py-3 font-medium text-[#c9a96e]">
                                  {formatPHP(b.total_amount)}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`capitalize text-[10px] font-medium ${PAYMENT_TEXT_CLS[b.payment_status]}`}
                                  >
                                    {b.payment_status}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] border capitalize font-medium ${STATUS_TAILWIND[b.status]}`}
                                  >
                                    {b.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <FileText size={14} color="#8a8a7a" />
                                </td>
                              </tr>
                            ))}
                            {filteredBookings.length === 0 && (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="text-center py-12 text-[#8a8a7a]"
                                >
                                  No bookings found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {totalBookings > PAGE_SIZE && (
                        <div
                          className="flex items-center justify-between border-t border-[#ede8df] px-4 py-3"
                          style={{ fontFamily: "Jost, sans-serif" }}
                        >
                          <span className="text-[11px] text-[#8a8a7a]">
                            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalBookings)} of {totalBookings}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPage((p) => Math.max(1, p - 1))}
                              disabled={page === 1}
                              className="px-3 py-1 text-[11px] border border-[#ede8df] rounded hover:border-[#c9a96e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Prev
                            </button>
                            <button
                              onClick={() => setPage((p) => p + 1)}
                              disabled={page * PAGE_SIZE >= totalBookings}
                              className="px-3 py-1 text-[11px] border border-[#ede8df] rounded hover:border-[#c9a96e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Detail panel */}
                    <div className="max-h-[620px] overflow-y-auto rounded-xl border border-[#ede8df] bg-white p-4 sm:p-5 xl:sticky xl:top-6">
                      {selectedBooking ? (
                        <div>
                          <p className="section-label mb-3 text-[9px]">
                            Booking Detail
                          </p>
                          <h3
                            className="mb-4"
                            style={{
                              fontFamily: "Cormorant Garamond, serif",
                              fontSize: "1.15rem",
                              fontWeight: 400,
                              color: "#1a1a1a",
                            }}
                          >
                            {selectedBooking.full_name}
                          </h3>
                          <div
                            className="flex flex-col gap-0 mb-4 text-[11px]"
                            style={{ fontFamily: "Jost, sans-serif" }}
                          >
                            {(
                              [
                                [
                                  User,
                                  "Contact",
                                  selectedBooking.contact_number,
                                ],
                                [MapPin, "Address", selectedBooking.address],
                                [
                                  Package,
                                  "Property",
                                  selectedBooking.retreat?.name ?? "—",
                                ],
                                [
                                  FileText,
                                  "Package",
                                  selectedBooking.rate_tier
                                    ? (TIER_LABELS[selectedBooking.rate_tier] ??
                                      selectedBooking.rate_tier)
                                    : "—",
                                ],
                                [
                                  null,
                                  "Session",
                                  `${selectedBooking.preferred_time} · ${selectedBooking.preferred_plan}`,
                                ],
                                [
                                  Calendar,
                                  "Date(s)",
                                  selectedBooking.preferred_dates,
                                ],
                                [
                                  Users,
                                  "Guests",
                                  `${selectedBooking.num_guests} pax`,
                                ],
                                [
                                  Car,
                                  "Cars",
                                  `${selectedBooking.num_cars} car(s)`,
                                ],
                                [
                                  Wallet,
                                  "Payment",
                                  selectedBooking.mode_of_payment,
                                ],
                                [
                                  AlertCircle,
                                  "Amount",
                                  formatPHP(selectedBooking.total_amount),
                                ],
                              ] as [typeof User | null, string, string][]
                            ).map(([Icon, label, value]) => (
                              <div
                                key={label}
                                className="flex items-start gap-2.5 border-b border-[#ede8df] py-2 last:border-0"
                              >
                                {Icon ? (
                                  <Icon
                                    size={12}
                                    color="#c9a96e"
                                    strokeWidth={1.5}
                                    className="shrink-0"
                                  />
                                ) : (
                                  <Clock size={12} color="#c9a96e" strokeWidth={1.5} className="shrink-0" />
                                )}
                                <span className="w-16 shrink-0 text-[10px] text-[#8a8a7a]">
                                  {label}
                                </span>
                                <span className="break-words text-[#1a1a1a] font-medium">
                                  {value}
                                </span>
                              </div>
                            ))}
                          </div>
                          {selectedBooking.special_requests && (
                            <div
                              className="p-3 bg-[#f8f4ee] rounded mb-4 text-xs text-[#4a4a4a]"
                              style={{ fontFamily: "Jost, sans-serif" }}
                            >
                              <span className="text-[#8a8a7a] block mb-1 text-[10px] uppercase tracking-wider">
                                Special Requests
                              </span>
                              {selectedBooking.special_requests}
                            </div>
                          )}
                          <p
                            className="text-[10px] text-[#8a8a7a] mb-2 tracking-wider uppercase"
                            style={{ fontFamily: "Jost, sans-serif" }}
                          >
                            Booking Status
                          </p>
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            {(
                              [
                                "confirmed",
                                "pending",
                                "cancelled",
                                "completed",
                              ] as BookingStatus[]
                            ).map((s) => (
                              <button
                                key={s}
                                onClick={() =>
                                  handleStatusUpdate(selectedBooking.id, s)
                                }
                                className={`text-[10px] py-2 px-3 rounded border capitalize transition-all font-medium
                                  ${selectedBooking.status === s ? STATUS_TAILWIND[s] : "border-[#ede8df] text-[#8a8a7a] hover:border-[#c9a96e] hover:text-[#c9a96e]"}`}
                                style={{ fontFamily: "Jost, sans-serif" }}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                          {isOwner && (
                            <>
                              <p
                                className="text-[10px] text-[#8a8a7a] mb-2 tracking-wider uppercase"
                                style={{ fontFamily: "Jost, sans-serif" }}
                              >
                                Payment Status
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {(
                                  [
                                    "unpaid",
                                    "paid",
                                    "refunded",
                                    "failed",
                                  ] as PaymentStatus[]
                                ).map((s) => (
                                  <button
                                    key={s}
                                    onClick={() =>
                                      handlePaymentUpdate(selectedBooking.id, s)
                                    }
                                    className={`text-[10px] py-2 px-3 rounded border capitalize transition-all font-medium
                                      ${selectedBooking.payment_status === s
                                        ? (PAYMENT_ACTIVE_CLS[s] ?? "border-[#ede8df] text-[#8a8a7a]")
                                        : "border-[#ede8df] text-[#8a8a7a] hover:border-[#c9a96e] hover:text-[#c9a96e]"
                                      }`}
                                    style={{ fontFamily: "Jost, sans-serif" }}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                              <div className="mt-5 pt-4 border-t border-[#ede8df]">
                                <button
                                  onClick={() => handleDeleteBooking(selectedBooking.id)}
                                  className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400 transition-all text-[10px] font-medium"
                                  style={{ fontFamily: "Jost, sans-serif" }}
                                >
                                  <Trash2 size={12} strokeWidth={1.5} />
                                  Delete Booking
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full py-16 gap-3 text-center">
                          <div className="w-12 h-12 rounded-full bg-[#f0e8d8] flex items-center justify-center">
                            <FileText
                              size={20}
                              color="#c9a96e"
                              strokeWidth={1.5}
                            />
                          </div>
                          <p
                            style={{
                              fontFamily: "Cormorant Garamond, serif",
                              fontStyle: "italic",
                              color: "#4a4a4a",
                            }}
                          >
                            Select a booking to view details
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* CALENDAR */}
              {tab === "calendar" && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AdminCalendarView
                    retreats={retreats}
                    selectedRetreatId={selectedRetreatId}
                    onSelectRetreat={setSelectedRetreatId}
                    bookings={bookings}
                    blockedDates={blockedDates}
                    onAddBlock={handleAddBlock}
                    onRemoveBlock={handleRemoveBlock}
                  />
                </motion.div>
              )}

              {/* STAFF MANAGEMENT */}
              {tab === "staff" && isOwner && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-5"
                >
                  <div className="bg-white rounded-xl border border-[#ede8df] overflow-hidden p-5">
                    <h3 className="font-medium text-[#1a1a1a] mb-4" style={{ fontFamily: "Jost, sans-serif" }}>Invite New Staff</h3>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const emailInput = form.elements.namedItem('email') as HTMLInputElement;
                      const passInput = form.elements.namedItem('password') as HTMLInputElement;
                      const email = emailInput.value;
                      const password = passInput.value;
                      
                      const t = toast.loading('Inviting staff...');
                      const { user, error } = await inviteStaff(email, password);
                      if(error) {
                        toast.error(error, { id: t });
                      } else if(user) {
                        toast.success('Staff invited!', { id: t });
                        setStaffUsers(prev => [...prev, user]);
                        form.reset();
                      }
                    }} className="flex flex-col sm:flex-row gap-3">
                      <input type="email" name="email" required placeholder="staff@example.com" className="flex-1 px-3 py-2 text-sm border border-[#ede8df] rounded outline-none focus:border-[#c9a96e]" />
                      <input type="password" name="password" required placeholder="Password (min 8 char)" minLength={8} className="flex-1 px-3 py-2 text-sm border border-[#ede8df] rounded outline-none focus:border-[#c9a96e]" />
                      <button type="submit" className="px-4 py-2 bg-[#c9a96e] text-white rounded text-sm hover:bg-[#b09460] transition-colors">Invite Staff</button>
                    </form>
                  </div>

                  <div className="bg-white rounded-xl border border-[#ede8df] overflow-hidden">
                    <table className="w-full text-xs" style={{ fontFamily: "Jost, sans-serif" }}>
                      <thead>
                        <tr className="bg-[#faf8f5] border-b border-[#ede8df]">
                          <th className="px-4 py-3 text-left text-[10px] tracking-widest uppercase text-[#8a8a7a]">Email</th>
                          <th className="px-4 py-3 text-left text-[10px] tracking-widest uppercase text-[#8a8a7a]">Created At</th>
                          <th className="px-4 py-3 text-right"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffUsers.map((su) => (
                          <tr key={su.id} className="border-b border-[#ede8df] hover:bg-[#faf8f5]">
                            <td className="px-4 py-3 font-medium text-[#1a1a1a]">{su.email}</td>
                            <td className="px-4 py-3 text-[#4a4a4a]">{new Date(su.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={async () => {
                                  if(window.confirm(`Revoke access for ${su.email}?`)) {
                                    const ok = await removeStaff(su.id);
                                    if(ok) setStaffUsers(p => p.filter(u => u.id !== su.id));
                                  }
                                }}
                                className="text-red-400 hover:text-red-500 transition-colors px-2 py-1 border border-red-200 rounded text-[10px]"
                              >
                                Revoke Access
                              </button>
                            </td>
                          </tr>
                        ))}
                        {staffUsers.length === 0 && (
                          <tr><td colSpan={3} className="text-center py-12 text-[#8a8a7a]">No staff members found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
