import { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  fetchAvailability,
  type AvailabilitySlot,
  type Retreat,
} from "../lib/supabase";
import { supabase } from "../lib/supabase";

interface Props {
  retreats: Retreat[];
  selectedRetreatId: string;
  onSelectRetreat: (retreatId: string) => void;
  onBookDate?: (date: Date, retreatId: string) => void;
}

const AVAILABILITY_COLORS = {
  available: "#22c55e", // green
  pending: "#f59e0b", // amber
  unavailable: "#ef4444", // red
};

const AVAILABILITY_LABELS = {
  available: "Available",
  pending: "Pending",
  unavailable: "Unavailable",
};

export default function ClientCalendarView({
  retreats,
  selectedRetreatId,
  onSelectRetreat,
  onBookDate,
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<
    "connecting" | "connected" | "error"
  >("connecting");
  const [loading, setLoading] = useState(true);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  const startPad = getDay(startOfMonth(currentMonth));
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Load availability data
  useEffect(() => {
    const loadAvailability = async () => {
      setLoading(true);
      try {
        const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
        const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
        const data = await fetchAvailability(selectedRetreatId, start, end);
        setAvailability(data);
      } catch (error) {
        console.error("Failed to load availability:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAvailability();
  }, [currentMonth, selectedRetreatId]);

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("client-availability-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        async () => {
          console.log("Client availability realtime update");
          const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
          const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
          const data = await fetchAvailability(selectedRetreatId, start, end);
          setAvailability(data);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "blocked_dates",
        },
        async () => {
          console.log("Client blocked dates realtime update");
          const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
          const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
          const data = await fetchAvailability(selectedRetreatId, start, end);
          setAvailability(data);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Client availability realtime subscribed");
          setRealtimeStatus("connected");
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          console.log("Client availability realtime error:", status);
          setRealtimeStatus("error");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentMonth, selectedRetreatId]);

  function getDayAvailability(date: Date): AvailabilitySlot | null {
    const targetDate = format(date, "yyyy-MM-dd");
    return (
      availability.find(
        (slot) =>
          slot.property_id === selectedRetreatId &&
          slot.start_date === targetDate,
      ) ?? null
    );
  }

  const selectedAvailability = selectedDay
    ? getDayAvailability(selectedDay)
    : null;

  return (
    <div className="bg-white rounded-xl border border-[#ede8df] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#ede8df] px-4 py-4 sm:px-6">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-[#f8f4ee] rounded-lg transition-colors"
        >
          <ChevronLeft size={16} color="#8a8a7a" />
        </button>
        <div className="flex flex-col items-center gap-2">
          <h3
            style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "1.2rem",
              fontWeight: 400,
              color: "#1a1a1a",
            }}
          >
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <select
            value={selectedRetreatId}
            onChange={(e) => onSelectRetreat(e.target.value)}
            className="rounded-full border border-[#ede8df] bg-[#faf8f5] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#4a4a4a] outline-none focus:border-[#d4a853]"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            {retreats.map((retreat) => (
              <option key={retreat.id} value={retreat.id}>
                {retreat.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-[#f8f4ee] rounded-lg transition-colors"
        >
          <ChevronRight size={16} color="#8a8a7a" />
        </button>
      </div>

      {/* Status indicator */}
      <div className="px-4 py-2 border-b border-[#ede8df] bg-[#faf8f4]">
        <div
          className="flex items-center gap-1.5 text-[10px] text-[#8a8a7a]"
          style={{ fontFamily: "Jost, sans-serif" }}
        >
          <span
            className={`h-2 w-2 rounded-full transition-colors ${
              realtimeStatus === "connected"
                ? "bg-[#d4a853] animate-pulse"
                : realtimeStatus === "error"
                  ? "bg-red-400"
                  : "bg-gray-300 animate-pulse"
            }`}
          />
          <span>
            {realtimeStatus === "connected"
              ? "Live"
              : realtimeStatus === "error"
                ? "Reconnecting..."
                : "Connecting..."}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Calendar grid */}
        <div className="p-3 sm:p-4 lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#d4a853] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="py-2 text-center text-[9px] tracking-wider text-[#8a8a7a] sm:text-[10px]"
                    style={{ fontFamily: "Jost, sans-serif", fontWeight: 500 }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: startPad }).map((_, i) => (
                  <div key={`p${i}`} />
                ))}
                {days.map((day) => {
                  const availability = getDayAvailability(day);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  const todayDay = isToday(day);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() =>
                        setSelectedDay(
                          isSameDay(day, selectedDay ?? new Date(0))
                            ? null
                            : day,
                        )
                      }
                      className={`
                        relative min-h-[52px] p-1 rounded-lg border text-left transition-all duration-150 sm:min-h-[62px] sm:p-1.5
                        ${isSelected ? "border-[#d4a853] bg-[#faf6ef]" : "border-transparent hover:border-[#ede8df] hover:bg-[#faf8f5]"}
                        ${todayDay ? "ring-1 ring-[#d4a853]" : ""}
                      `}
                    >
                      <span
                        className={`mb-1 block text-[11px] font-medium sm:text-xs ${todayDay ? "text-[#d4a853]" : "text-[#1a1a1a]"}`}
                        style={{ fontFamily: "Jost, sans-serif" }}
                      >
                        {format(day, "d")}
                      </span>
                      {availability && (
                        <div className="flex flex-col gap-0.5">
                          <div
                            className="text-[8px] text-white px-1 py-0.5 rounded truncate leading-tight text-center"
                            style={{
                              background:
                                AVAILABILITY_COLORS[availability.status],
                              fontFamily: "Jost, sans-serif",
                            }}
                          >
                            {availability.status === "available"
                              ? "✓"
                              : availability.status === "pending"
                                ? "~"
                                : "✗"}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-[#ede8df]">
                {Object.entries(AVAILABILITY_COLORS).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ background: color }}
                    />
                    <span
                      className="text-[10px] capitalize text-[#8a8a7a]"
                      style={{ fontFamily: "Jost, sans-serif" }}
                    >
                      {
                        AVAILABILITY_LABELS[
                          status as keyof typeof AVAILABILITY_LABELS
                        ]
                      }
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Side panel */}
        <div className="min-h-[320px] border-t border-[#ede8df] p-4 sm:p-5 lg:min-h-[400px] lg:border-l lg:border-t-0">
          {selectedDay ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="section-label text-[9px]">Selected Date</p>
                  <p
                    style={{
                      fontFamily: "Cormorant Garamond, serif",
                      fontSize: "1.1rem",
                      color: "#1a1a1a",
                    }}
                  >
                    {format(selectedDay, "EEEE, MMM d")}
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <p
                  className="text-[10px] text-[#8a8a7a] mb-2 tracking-wider uppercase"
                  style={{ fontFamily: "Jost, sans-serif" }}
                >
                  Availability
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{
                      background: selectedAvailability
                        ? AVAILABILITY_COLORS[selectedAvailability.status]
                        : AVAILABILITY_COLORS.available,
                    }}
                  />
                  <span
                    className="text-sm text-[#1a1a1a]"
                    style={{ fontFamily: "Jost, sans-serif" }}
                  >
                    {selectedAvailability
                      ? AVAILABILITY_LABELS[selectedAvailability.status]
                      : "Available"}
                  </span>
                </div>
              </div>
              {onBookDate && selectedAvailability?.status === "available" && (
                <button
                  onClick={() => onBookDate(selectedDay, selectedRetreatId)}
                  className="w-full py-3 px-4 bg-[#d4a853] text-white rounded-lg hover:bg-[#c2995a] transition-colors text-sm font-medium"
                  style={{ fontFamily: "Jost, sans-serif" }}
                >
                  Book this date
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-[#f0e8d8] flex items-center justify-center">
                <span className="text-[#d4a853] text-xl">📅</span>
              </div>
              <p
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  fontStyle: "italic",
                  color: "#4a4a4a",
                }}
              >
                Select a date to check availability
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
