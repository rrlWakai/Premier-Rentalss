import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import {
  clearPendingBooking,
  initializeCheckout,
  fetchBookingStatus,
  getPendingBooking,
  type BookingStatusResponse,
} from "../lib/bookingApi";
import { formatPHP } from "../lib/propertyData";

type ViewState = "loading" | "confirmed" | "processing" | "interrupted" | "failed" | "expired";

function formatDisplayDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDisplayDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function isLockStillActive(lockedUntil: string | null) {
  if (!lockedUntil) return false;
  const time = new Date(lockedUntil).getTime();
  return Number.isFinite(time) && time > Date.now();
}

function deriveViewState(
  booking: BookingStatusResponse | null,
  fallback: "processing" | "failed",
): ViewState {
  if (!booking) return "loading";

  if (booking.payment_status === "paid" && booking.status === "confirmed") {
    return "confirmed";
  }

  if (booking.status === "cancelled" || booking.payment_status === "failed") {
    return isLockStillActive(booking.locked_until) ? "interrupted" : "failed";
  }

  if (booking.status === "pending" && booking.payment_status === "unpaid") {
    return isLockStillActive(booking.locked_until) ? fallback : "expired";
  }

  if (booking.payment_status === "paid") {
    return "processing";
  }

  return fallback;
}

function BookingStatusCard({
  icon,
  title,
  description,
  accent,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  accent: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f4ee] px-4">
      <div className="max-w-md w-full text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: `${accent}12`, border: `2px solid ${accent}` }}
        >
          {icon}
        </div>
        <h1
          style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: "2rem",
            fontWeight: 400,
            color: "#1a1a1a",
          }}
          className="mb-3"
        >
          {title}
        </h1>
        <p
          className="text-[#8a8a7a] text-sm mb-6"
          style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
        >
          {description}
        </p>
        {children}
      </div>
    </div>
  );
}

function BookingMeta({
  booking,
}: {
  booking: BookingStatusResponse | null;
}) {
  if (!booking) return null;

  const metaItems = [
    {
      label: "Guest",
      value: booking.guest_name,
    },
    {
      label: "Date",
      value: formatDisplayDate(booking.booking_date),
    },
    {
      label: "Session",
      value: booking.time_slot,
    },
    {
      label: "Downpayment",
      value: formatPHP(booking.downpayment_amount ?? 0),
    },
  ].filter((item) => item.value);

  return (
    <div className="rounded-xl border border-[#ede8df] bg-white p-4 text-left mb-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {metaItems.map((item) => (
          <div key={item.label}>
            <p
              className="text-[10px] uppercase tracking-[0.18em] text-[#8a8a7a] mb-1"
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              {item.label}
            </p>
            <p
              className="text-sm text-[#1a1a1a]"
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function useResolvedBooking() {
  const [params] = useSearchParams();
  const fallbackBooking = getPendingBooking();
  const bookingId = params.get("booking_id") || fallbackBooking?.bookingId || "";

  const [booking, setBooking] = useState<BookingStatusResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(bookingId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      setError("Booking reference not found.");
      return;
    }

    let cancelled = false;
    let pollTimeout: number | null = null;

    const loadStatus = async (allowPolling = true) => {
      try {
        const status = await fetchBookingStatus(bookingId);
        if (cancelled) return;

        setBooking(status);
        setError("");
        setLoading(false);

        if (status.payment_status === "paid" && status.status === "confirmed") {
          clearPendingBooking();
          return;
        }

        if (
          allowPolling &&
          (status.payment_status === "paid" ||
            (status.status === "pending" && isLockStillActive(status.locked_until)))
        ) {
          pollTimeout = window.setTimeout(() => {
            void loadStatus(status.payment_status === "paid");
          }, status.payment_status === "paid" ? 2500 : 4000);
        }
      } catch (fetchError) {
        if (cancelled) return;
        setLoading(false);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load booking status.",
        );
      }
    };

    void loadStatus();

    return () => {
      cancelled = true;
      if (pollTimeout) {
        window.clearTimeout(pollTimeout);
      }
    };
  }, [bookingId]);

  return {
    bookingId,
    booking,
    loading,
    error,
    fallbackBooking,
    refresh: async () => {
      if (!bookingId) return;
      setLoading(true);
      try {
        const status = await fetchBookingStatus(bookingId);
        setBooking(status);
        setError("");
        if (status.payment_status === "paid" && status.status === "confirmed") {
          clearPendingBooking();
        }
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to refresh booking status.",
        );
      } finally {
        setLoading(false);
      }
    },
  };
}

export function BookingSuccess() {
  const { booking, loading, error, refresh } = useResolvedBooking();

  const viewState = useMemo(
    () => deriveViewState(booking, "processing"),
    [booking],
  );

  if (loading) {
    return (
      <BookingStatusCard
        icon={<Loader2 size={36} color="#c9a96e" className="animate-spin" />}
        title="Checking Your Booking"
        description="We're verifying your payment and latest booking status. This usually only takes a moment."
        accent="#c9a96e"
      />
    );
  }

  if (error) {
    return (
      <BookingStatusCard
        icon={<ShieldAlert size={36} color="#f59e0b" strokeWidth={1.5} />}
        title="We Couldn't Verify It Yet"
        description="Your payment return was received, but we couldn't load the booking status just now."
        accent="#f59e0b"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={() => void refresh()} className="btn-gold inline-flex items-center justify-center gap-2">
            <RefreshCw size={14} /> Refresh Status
          </button>
          <Link to="/" className="btn-outline-gold inline-flex items-center justify-center gap-2">
            <ArrowLeft size={14} /> Home
          </Link>
        </div>
      </BookingStatusCard>
    );
  }

  if (viewState === "confirmed") {
    return (
      <BookingStatusCard
        icon={<CheckCircle size={36} color="#22c55e" strokeWidth={1.5} />}
        title="Booking Confirmed"
        description="Your downpayment was verified and your booking is now confirmed."
        accent="#22c55e"
      >
        <BookingMeta booking={booking} />
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={() => void refresh()} className="btn-outline-gold inline-flex items-center justify-center gap-2">
            <RefreshCw size={14} /> Refresh Status
          </button>
          <Link to="/" className="btn-gold inline-flex items-center gap-2 justify-center">
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </BookingStatusCard>
    );
  }

  return (
    <BookingStatusCard
      icon={<Clock3 size={36} color="#c9a96e" strokeWidth={1.5} />}
      title="Payment Received, Confirming Booking"
      description="Your return was successful, but we’re still waiting for the latest confirmation from the payment provider."
      accent="#c9a96e"
    >
      <BookingMeta booking={booking} />
      <p
        className="text-[#8a8a7a] text-xs mb-6"
        style={{ fontFamily: "Jost, sans-serif" }}
      >
        Status: {booking?.payment_status} / {booking?.status}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button onClick={() => void refresh()} className="btn-gold inline-flex items-center justify-center gap-2">
          <RefreshCw size={14} /> Refresh Status
        </button>
        <Link to="/" className="btn-outline-gold inline-flex items-center justify-center gap-2">
          <ArrowLeft size={14} /> Home
        </Link>
      </div>
    </BookingStatusCard>
  );
}

export function BookingFailed() {
  const { booking, loading, error, refresh, bookingId } = useResolvedBooking();
  const [resumingCheckout, setResumingCheckout] = useState(false);
  const [resumeError, setResumeError] = useState("");

  const viewState = useMemo(
    () => deriveViewState(booking, "failed"),
    [booking],
  );

  useEffect(() => {
    if (viewState === "confirmed" || viewState === "expired" || viewState === "failed") {
      clearPendingBooking();
    }
  }, [viewState]);

  const handleResumeCheckout = async () => {
    if (!bookingId) return;

    setResumeError("");
    setResumingCheckout(true);

    try {
      const checkout = await initializeCheckout(payload);
      window.location.href = checkout.checkout_url;
    } catch (resumeCheckoutError) {
      setResumeError(
          resumeCheckoutError instanceof Error
            ? resumeCheckoutError.message
            : "Unable to resume checkout.",
        );
        setResumingCheckout(false);
    }
  };
  

  if (loading) {
    return (
      <BookingStatusCard
        icon={<Loader2 size={36} color="#c9a96e" className="animate-spin" />}
        title="Checking Booking Status"
        description="We're checking whether your payment was interrupted, failed, or already completed."
        accent="#c9a96e"
      />
    );
  }

  if (error) {
    return (
      <BookingStatusCard
        icon={<ShieldAlert size={36} color="#f59e0b" strokeWidth={1.5} />}
        title="We Couldn't Verify The Booking"
        description="We couldn't load the booking status from the server yet."
        accent="#f59e0b"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={() => void refresh()} className="btn-gold inline-flex items-center justify-center gap-2">
            <RefreshCw size={14} /> Refresh Status
          </button>
          <Link to="/" className="btn-outline-gold inline-flex items-center justify-center gap-2">
            <ArrowLeft size={14} /> Home
          </Link>
        </div>
      </BookingStatusCard>
    );
  }

  if (viewState === "confirmed") {
    return (
      <BookingStatusCard
        icon={<CheckCircle size={36} color="#22c55e" strokeWidth={1.5} />}
        title="Booking Already Confirmed"
        description="This booking is already confirmed, so no further payment action is needed."
        accent="#22c55e"
      >
        <BookingMeta booking={booking} />
        <Link to="/" className="btn-gold inline-flex items-center gap-2 justify-center">
          <ArrowLeft size={14} /> Back to Home
        </Link>
      </BookingStatusCard>
    );
  }

  if (viewState === "interrupted") {
    return (
      <BookingStatusCard
        icon={<Clock3 size={36} color="#f59e0b" strokeWidth={1.5} />}
        title="Payment Was Interrupted"
        description="Your booking hold is still active. You can resume checkout before it expires."
        accent="#f59e0b"
      >
        <BookingMeta booking={booking} />
        {booking?.locked_until && (
          <p
            className="text-[#8a8a7a] text-xs mb-4"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            Hold active until {formatDisplayDateTime(booking.locked_until)}
          </p>
        )}
        {resumeError && (
          <p
            className="text-red-500 text-xs mb-4"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            {resumeError}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => void handleResumeCheckout()}
            disabled={resumingCheckout}
            className="btn-gold inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {resumingCheckout ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Resuming Checkout...
              </>
            ) : (
              <>
                <RefreshCw size={14} /> Resume Secure Payment
              </>
            )}
          </button>
          <button onClick={() => void refresh()} className="btn-outline-gold inline-flex items-center justify-center gap-2">
            <RefreshCw size={14} /> Refresh Status
          </button>
        </div>
      </BookingStatusCard>
    );
  }

  if (viewState === "expired") {
    return (
      <BookingStatusCard
        icon={<XCircle size={36} color="#ef4444" strokeWidth={1.5} />}
        title="Booking Hold Expired"
        description="The reservation hold expired before payment could be completed. No booking was confirmed."
        accent="#ef4444"
      >
        <Link to="/#retreats" className="btn-gold inline-flex items-center justify-center gap-2">
          Try Again
        </Link>
      </BookingStatusCard>
    );
  }

  return (
    <BookingStatusCard
      icon={<XCircle size={36} color="#ef4444" strokeWidth={1.5} />}
      title="Payment Not Completed"
      description="Your payment could not be confirmed. No booking has been marked as paid."
      accent="#ef4444"
    >
      <BookingMeta booking={booking} />
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button onClick={() => void refresh()} className="btn-outline-gold inline-flex items-center justify-center gap-2">
          <RefreshCw size={14} /> Refresh Status
        </button>
        <Link to="/#retreats" className="btn-gold inline-flex items-center justify-center gap-2">
          Try Again
        </Link>
      </div>
    </BookingStatusCard>
  );
}
