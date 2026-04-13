import { useEffect, useRef, useState } from "react";
import {
  X,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  Package,
  Users,
  Car,
  Wallet,
  Check,
  ChevronRight,
  AlertCircle,
  Shield,
  Lock,
  CreditCard,
  BadgeCheck,
} from "lucide-react";
const isPaymentReady = !!import.meta.env.VITE_PAYMONGO_READY;
import { motion, AnimatePresence } from "framer-motion";
import {
  createBookingReservation,
  createPayMongoCheckout,
  savePendingBooking,
} from "../lib/bookingApi";
import {
  type PropertyData,
  type RatePackage,
  type PreferredTime,
  type PreferredPlan,
  formatPHP,
} from "../lib/propertyData";
import { getBookingPriceBreakdown } from "../lib/bookingPricing";
import toast from "react-hot-toast";

if (!isPaymentReady) {
  console.warn("Demo mode: Payment is not yet enabled.");
}
interface Props {
  property: PropertyData;
  initialPackage: RatePackage;
  open: boolean;
  onClose: () => void;
}

type Step = "details" | "booking" | "review";
type SupportedPaymentMode = "GCash" | "Card";

const STEPS: { id: Step; label: string }[] = [
  { id: "details", label: "Your Details" },
  { id: "booking", label: "Booking Info" },
  { id: "review", label: "Review" },
];

const modalTransition = {
  duration: 0.48,
  ease: [0.22, 1, 0.36, 1] as const,
};

const stepMotionProps = {
  initial: { opacity: 0, y: 18, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -14, filter: "blur(6px)" },
  transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const },
};

// Map rate label → PreferredTime
// IMPORTANT: check "overnight"/"platinum" BEFORE "night" — "overnight" contains "night" as a substring
function labelToTime(label: string): PreferredTime {
  const l = label.toLowerCase();
  if (l.includes("overnight") || l.includes("platinum")) return "Overnight";
  if (l.includes("night")) return "Night";
  return "Day";
}

// Map rate label → PreferredPlan
function labelToPlan(label: string): PreferredPlan {
  const l = label.toLowerCase();
  if (l.includes("platinum") || l.includes("overnight")) return "Platinum";
  if (l.includes("premium")) return "Premium";
  return "Basic";
}

function formatDisplayDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

interface FormState {
  full_name: string;
  email: string;
  address: string;
  contact_number: string;
  preferred_dates: string;
  preferred_time: PreferredTime;
  preferred_plan: PreferredPlan;
  rate_label: string;
  num_guests: string;
  num_cars: string;
  mode_of_payment: SupportedPaymentMode;
  special_requests: string;
}

type IconComponent = typeof User;

interface SummaryItemData {
  icon: IconComponent;
  label: string;
  value: string;
}

function FieldRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof User;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-[#8a8a7a]"
        style={{ fontFamily: "Jost, sans-serif" }}
      >
        <Icon size={11} color="#c9a96e" />
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryItem({ icon: Icon, label, value }: SummaryItemData) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-3 sm:px-5">
      <Icon
        size={13}
        color="#c9a96e"
        className="mt-0.5 shrink-0"
        strokeWidth={1.5}
      />
      <span
        className="shrink-0 text-[11px] text-[#8a8a7a] sm:w-28"
        style={{ fontFamily: "Jost, sans-serif" }}
      >
        {label}
      </span>
      <span
        className="whitespace-pre-line break-words text-[11px] font-medium text-[#1a1a1a]"
        style={{ fontFamily: "Jost, sans-serif" }}
      >
        {value}
      </span>
    </div>
  );
}

function PaymentMethodCard({
  mode,
  active,
  onSelect,
}: {
  mode: SupportedPaymentMode;
  active: boolean;
  onSelect: (mode: SupportedPaymentMode) => void;
}) {
  const meta = PAYMENT_METHOD_META[mode];
  const Icon = meta.icon;

  return (
    <motion.button
      type="button"
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onSelect(mode)}
      className={`relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all duration-300 ${
        active
          ? "border-[#c9a96e] bg-[linear-gradient(180deg,#fffaf1_0%,#f7efdf_100%)] shadow-[0_16px_34px_rgba(201,169,110,0.18)]"
          : "border-[#e7ded2] bg-white hover:border-[#d8c3a0] hover:shadow-[0_12px_28px_rgba(17,14,10,0.06)]"
      }`}
      style={{ fontFamily: "Jost, sans-serif" }}
    >
      {meta.recommended && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#f3ead7] px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-[#a8833e]">
          <BadgeCheck size={10} />
          Recommended
        </span>
      )}
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-full ${
            active ? "bg-[#c9a96e]/16" : "bg-[#f5f0e8]"
          }`}
        >
          <Icon
            size={18}
            color={active ? "#c9a96e" : "#8a8a7a"}
            strokeWidth={1.6}
          />
        </div>
        <div className="pr-12">
          <p className="text-sm font-medium text-[#1a1a1a]">{mode}</p>
          <p className="mt-1 text-[12px] leading-5 text-[#7e776b]">
            {meta.description}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

const INPUT_CLS =
  "w-full rounded-xl border border-[#e9e2d7] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none transition-all duration-300 focus:border-[#c9a96e] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.10)]";
const SELECT_CLS = INPUT_CLS + " appearance-none cursor-pointer";

const SUPPORTED_PAYMENT_METHODS: SupportedPaymentMode[] = ["GCash", "Card"];

const PAYMENT_METHOD_META: Record<
  SupportedPaymentMode,
  {
    description: string;
    icon: typeof Wallet;
    recommended?: boolean;
  }
> = {
  GCash: {
    description: "Fast mobile checkout with PayMongo",
    icon: Wallet,
    recommended: true,
  },
  Card: {
    description: "Debit or credit card via secure checkout",
    icon: CreditCard,
  },
};

const PAYMENT_DETAILS: Record<SupportedPaymentMode, string> = {
  GCash:
    "Complete your downpayment using GCash on PayMongo's secure checkout page.",
  Card: "Use your debit or credit card securely on PayMongo's encrypted checkout page.",
};


function createInitialFormState(initialPackage: RatePackage): FormState {
  return {
    full_name: "",
    email: "",
    address: "",
    contact_number: "",
    preferred_dates: "",
    preferred_time: labelToTime(initialPackage.rates[0]?.label ?? "Day"),
    preferred_plan: labelToPlan(initialPackage.rates[0]?.label ?? "Basic"),
    rate_label: initialPackage.rates[0]?.label ?? "",
    num_guests: "",
    num_cars: "",
    mode_of_payment: "GCash",
    special_requests: "",
  };
}

function getFriendlyErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("booking expired")) {
    return "Your booking hold expired. Please review your details and try again.";
  }

  if (
    normalized.includes("slot already booked") ||
    normalized.includes("slot already taken")
  ) {
    return "This time slot was just taken. Please choose another date or session.";
  }

  if (
    normalized.includes("checkout already initialized") ||
    normalized.includes("failed to initialize payment checkout")
  ) {
    return "Payment initialization failed. Please try again in a moment.";
  }

  if (normalized.includes("failed to save checkout details")) {
    return "We couldn't prepare secure checkout right now. Please try again.";
  }

  return "We couldn't start secure checkout. Please try again.";
}

export default function BookingFormModal({
  property,
  initialPackage,
  open,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>("details");
  const [submitting, setSubmitting] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<RatePackage>(initialPackage);
  const scrollableRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormState>(() =>
    createInitialFormState(initialPackage),
  );

  const stepIndex = STEPS.findIndex((item) => item.id === step);

  const set = (field: keyof FormState, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  useEffect(() => {
    if (!open) return;
    setStep("details");
    setSubmitting(false);
    setSelectedPkg(initialPackage);
    setForm(createInitialFormState(initialPackage));
  }, [open, initialPackage, property.slug]);

  // Scroll focused field into view after keyboard opens (~300 ms delay)
  useEffect(() => {
    const el = scrollableRef.current;
    if (!el) return;
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 320);
      }
    };
    el.addEventListener("focusin", onFocusIn);
    return () => el.removeEventListener("focusin", onFocusIn);
  }, []);

  // When rate changes, auto-set preferred_time and preferred_plan
  function handleRateChange(label: string) {
    set("rate_label", label);
    set("preferred_time", labelToTime(label));
    set("preferred_plan", labelToPlan(label));
  }

  const selectedRate = selectedPkg.rates.find(
    (r) => r.label === form.rate_label,
  );
  const {
    priceType,
    totalAmount,
    downpaymentAmount,
    remainingBalance,
  } = getBookingPriceBreakdown(selectedRate, form.preferred_dates);
  const priceTypeLabel =
    priceType === "weekend" ? "Weekend Rate Applied" : "Weekday Rate Applied";

  const canProceedDetails =
    form.full_name.trim() &&
    form.email.trim() &&
    form.address.trim() &&
    form.contact_number.trim();
  const canProceedBooking =
    form.preferred_dates.trim() &&
    form.rate_label &&
    form.num_guests &&
    Number(form.num_guests) >= 1 &&
    Number(form.num_guests) <= selectedPkg.maxPax &&
    form.num_cars &&
    Number(form.num_cars) >= 1 &&
    Number(form.num_cars) <= property.maxCars;

  const reviewSummaryItems: SummaryItemData[] = [
    {
      icon: User,
      label: "Full Name",
      value: form.full_name,
    },
    {
      icon: Mail,
      label: "Email",
      value: form.email,
    },
    {
      icon: MapPin,
      label: "Address",
      value: form.address,
    },
    {
      icon: Phone,
      label: "Contact Number",
      value: form.contact_number,
    },
    {
      icon: Calendar,
      label: "Preferred Date(s)",
      value: formatDisplayDate(form.preferred_dates),
    },
    {
      icon: Clock,
      label: "Session",
      value: `${form.rate_label} (${form.preferred_time})`,
    },
    {
      icon: Package,
      label: "Package",
      value: selectedPkg.title,
    },
    {
      icon: Users,
      label: "Guests",
      value: `${form.num_guests} pax`,
    },
    {
      icon: Car,
      label: "Cars",
      value: `${form.num_cars} car(s)`,
    },
    {
      icon: Wallet,
      label: "Payment Method",
      value: form.mode_of_payment,
    },
  ];

  async function handleSubmit() {
    setSubmitting(true);

    try {
      const timeSlot =
        form.preferred_time === "Day"
          ? "daytime"
          : form.preferred_time === "Night"
            ? "nighttime"
            : "overnight";

      const booking = await createBookingReservation({
        property_id: property.slug,
        date: form.preferred_dates,
        time_slot: timeSlot,
        guests: Number(form.num_guests),
        cars: Number(form.num_cars),
        full_name: form.full_name,
        email: form.email,
        phone: form.contact_number,
        address: form.address,
        rate_tier: selectedPkg.tier,
        rate_label: form.rate_label,
        mode_of_payment: form.mode_of_payment,
        special_requests: form.special_requests.trim() || undefined,
      });

      savePendingBooking({
        bookingId: booking.booking_id,
        propertyId: property.slug,
        propertyName: property.name,
        guestName: form.full_name,
        lockedUntil: booking.locked_until,
        createdAt: new Date().toISOString(),
      });

      const checkout = await createPayMongoCheckout(booking.booking_id);
      toast.success("Redirecting to secure checkout...");
      window.location.href = checkout.checkout_url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (
        message.toLowerCase().includes("network") ||
        message.toLowerCase().includes("failed to fetch") ||
        message.toLowerCase().includes("internal server error")
      ) {
        toast.error(
          "We couldn't complete checkout right now. If your reservation hold was created, you can resume from the return page after refreshing.",
        );
      } else {
        toast.error(getFriendlyErrorMessage(message));
      }
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-[rgba(12,12,10,0.56)] backdrop-blur-[10px]"
            onClick={submitting ? undefined : onClose}
          />

          <motion.div
            className="booking-modal-content relative flex max-h-[95dvh] w-full max-w-[42rem] flex-col overflow-hidden rounded-t-[1.75rem] bg-[#fcfaf7] shadow-[0_32px_90px_rgba(20,18,14,0.24)] sm:rounded-[1.75rem]"
            initial={{ y: 42, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.99 }}
            transition={modalTransition}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#ede8df] px-5 py-5 shrink-0 sm:px-7">
              <div>
                <p className="section-label text-[9px]">Reservation</p>
                <h3
                  style={{
                    fontFamily: "Cormorant Garamond, serif",
                    fontSize: "1.55rem",
                    fontWeight: 400,
                    color: "#1a1a1a",
                    lineHeight: 1,
                  }}
                >
                  {property.name}
                </h3>
                <p
                  className="mt-2 text-[12px] text-[#7b7468]"
                  style={{ fontFamily: "Jost, sans-serif" }}
                >
                  Private city stay with secure online checkout
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={submitting}
                className="rounded-full border border-[#ece5da] bg-white/80 p-2 transition-all duration-300 hover:border-[#d8c3a0] hover:bg-[#f8f4ee] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X size={17} color="#8a8a7a" />
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto border-b border-[#ede8df] bg-[linear-gradient(180deg,#fcfaf7_0%,#f7f2ea_100%)] px-5 py-4 shrink-0 sm:px-7">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-2 ${i <= stepIndex ? "opacity-100" : "opacity-40"}`}
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold transition-all duration-300 ${
                        i < stepIndex
                          ? "bg-[#c9a96e] text-white shadow-[0_8px_20px_rgba(201,169,110,0.28)]"
                          : i === stepIndex
                            ? "bg-[#1a1a1a] text-white shadow-[0_10px_24px_rgba(26,26,26,0.18)]"
                            : "border border-[#e8e0d4] bg-white text-[#8a8a7a]"
                      }`}
                    >
                      {i < stepIndex ? <Check size={10} /> : i + 1}
                    </div>
                    <div className="hidden sm:flex sm:flex-col">
                      <span
                        className="text-[9px] uppercase tracking-[0.24em] text-[#a0988b]"
                        style={{ fontFamily: "Jost, sans-serif" }}
                      >
                        Step {i + 1}
                      </span>
                      <span
                        className="text-[12px] text-[#1a1a1a]"
                        style={{
                          fontFamily: "Jost, sans-serif",
                          fontWeight: i === stepIndex ? 600 : 400,
                        }}
                      >
                        {s.label}
                      </span>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="h-px w-6 bg-[#dfd5c8]" />
                  )}
                </div>
              ))}
            </div>

            {/* Content */}
            <div ref={scrollableRef} className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* STEP 1 — Your Details */}
                {step === "details" && (
                  <motion.div
                    key="details"
                    {...stepMotionProps}
                    className="flex flex-col gap-6 p-5 sm:p-7"
                  >
                    <div className="space-y-2">
                      <p className="section-label text-[9px]">Step One</p>
                      <h4
                        style={{
                          fontFamily: "Cormorant Garamond, serif",
                          fontSize: "1.65rem",
                          fontWeight: 400,
                          color: "#1a1a1a",
                          lineHeight: 1,
                        }}
                      >
                        Guest Details
                      </h4>
                    </div>
                    <p
                      className="max-w-lg text-[13px] leading-6 text-[#8a8a7a]"
                      style={{
                        fontFamily: "Jost, sans-serif",
                        fontWeight: 300,
                      }}
                    >
                      Share your details to prepare your reservation and secure
                      checkout.
                    </p>

                    <FieldRow icon={User} label="Full Name *">
                      <input
                        type="text"
                        value={form.full_name}
                        onChange={(e) => set("full_name", e.target.value)}
                        placeholder="Juan Dela Cruz"
                        autoComplete="name"
                        className={INPUT_CLS}
                        style={{ fontFamily: "Jost, sans-serif" }}
                      />
                    </FieldRow>

                    <FieldRow icon={Mail} label="Email Address *">
                      <input
                        type="email"
                        inputMode="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="name@example.com"
                        autoComplete="email"
                        className={INPUT_CLS}
                        style={{ fontFamily: "Jost, sans-serif" }}
                      />
                    </FieldRow>

                    <FieldRow icon={MapPin} label="Address *">
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => set("address", e.target.value)}
                        placeholder="Street, City, Province"
                        autoComplete="street-address"
                        className={INPUT_CLS}
                        style={{ fontFamily: "Jost, sans-serif" }}
                      />
                    </FieldRow>

                    <FieldRow icon={Phone} label="Contact Number *">
                      <input
                        type="tel"
                        inputMode="tel"
                        value={form.contact_number}
                        onChange={(e) => set("contact_number", e.target.value)}
                        placeholder="+63 9XX XXX XXXX"
                        autoComplete="tel"
                        className={INPUT_CLS}
                        style={{ fontFamily: "Jost, sans-serif" }}
                      />
                    </FieldRow>
                  </motion.div>
                )}

                {/* STEP 2 — Booking Info */}
                {step === "booking" && (
                  <motion.div
                    key="booking"
                    {...stepMotionProps}
                    className="flex flex-col gap-6 p-5 sm:p-7"
                  >
                    <div className="space-y-2">
                      <p className="section-label text-[9px]">Step Two</p>
                      <h4
                        style={{
                          fontFamily: "Cormorant Garamond, serif",
                          fontSize: "1.65rem",
                          fontWeight: 400,
                          color: "#1a1a1a",
                          lineHeight: 1,
                        }}
                      >
                        Booking Preferences
                      </h4>
                    </div>
                    {/* Package selector */}
                    <FieldRow icon={Package} label="Rate Package *">
                      <select
                        value={selectedPkg.tier}
                        onChange={(e) => {
                          const pkg = property.packages.find(
                            (p) => p.tier === e.target.value,
                          );
                          if (pkg) {
                            setSelectedPkg(pkg);
                            handleRateChange(pkg.rates[0]?.label ?? "");
                          }
                        }}
                        className={SELECT_CLS}
                        style={{ fontFamily: "Jost, sans-serif" }}
                      >
                        {property.packages.map((pkg) => (
                          <option key={pkg.tier} value={pkg.tier}>
                            {pkg.title} — up to {pkg.maxPax} pax
                          </option>
                        ))}
                      </select>
                    </FieldRow>

                    {/* Session selector */}
                    <FieldRow icon={Clock} label="Preferred Session *">
                      <select
                        value={form.rate_label}
                        onChange={(e) => handleRateChange(e.target.value)}
                        className={SELECT_CLS}
                        style={{ fontFamily: "Jost, sans-serif" }}
                      >
                        {selectedPkg.rates.map((r) => (
                          <option key={r.label} value={r.label}>
                            {r.label} — {r.hours} (Weekday{" "}
                            {formatPHP(r.weekday)} / Weekend{" "}
                            {formatPHP(r.weekend)})
                          </option>
                        ))}
                      </select>
                    </FieldRow>

                    <FieldRow icon={Calendar} label="Preferred Date(s) *">
                      <input
                        type="date"
                        value={form.preferred_dates}
                        onChange={(e) => set("preferred_dates", e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className={INPUT_CLS}
                        style={{ fontFamily: "Jost, sans-serif" }}
                      />
                      <p
                        className="text-[10px] text-[#8a8a7a] mt-0.5"
                        style={{ fontFamily: "Jost, sans-serif" }}
                      >
                        Pick your preferred reservation date from the calendar.
                      </p>
                    </FieldRow>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FieldRow
                        icon={Users}
                        label={`Guests (max ${selectedPkg.maxPax}) *`}
                      >
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={selectedPkg.maxPax}
                          value={form.num_guests}
                          onChange={(e) => set("num_guests", e.target.value)}
                          placeholder={`1–${selectedPkg.maxPax}`}
                          className={INPUT_CLS}
                          style={{ fontFamily: "Jost, sans-serif" }}
                        />
                      </FieldRow>
                      <FieldRow
                        icon={Car}
                        label={`Cars (max ${property.maxCars}) *`}
                      >
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={property.maxCars}
                          value={form.num_cars}
                          onChange={(e) => set("num_cars", e.target.value)}
                          placeholder={`1–${property.maxCars}`}
                          className={INPUT_CLS}
                          style={{ fontFamily: "Jost, sans-serif" }}
                        />
                      </FieldRow>
                    </div>

                    <FieldRow icon={Wallet} label="Payment Method *">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {SUPPORTED_PAYMENT_METHODS.map((mode) => (
                          <PaymentMethodCard
                            key={mode}
                            mode={mode}
                            active={form.mode_of_payment === mode}
                            onSelect={(selectedMode) =>
                              set("mode_of_payment", selectedMode)
                            }
                          />
                        ))}
                      </div>
                      <p
                        className="text-[11px] text-[#8a8a7a] mt-1"
                        style={{
                          fontFamily: "Jost, sans-serif",
                          fontWeight: 300,
                        }}
                      >
                        {PAYMENT_DETAILS[form.mode_of_payment]}
                      </p>

                      <div className="mt-3 rounded-xl border border-[#ede8df] bg-[#faf8f5] px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <Lock
                            size={14}
                            color="#c9a96e"
                            className="mt-0.5 shrink-0"
                          />
                          <div className="space-y-1">
                            <p
                              className="text-[11px] font-medium text-[#1a1a1a]"
                              style={{ fontFamily: "Jost, sans-serif" }}
                            >
                              Secure payment powered by PayMongo
                            </p>
                            <p
                              className="text-[11px] leading-relaxed text-[#6d6d61]"
                              style={{ fontFamily: "Jost, sans-serif" }}
                            >
                              You will be redirected to a secure payment page.
                              Only 50% is required today to secure your booking.
                            </p>
                            <p
                              className="text-[10px] uppercase tracking-[0.24em] text-[#8a8a7a]"
                              style={{ fontFamily: "Jost, sans-serif" }}
                            >
                              Payments are encrypted and processed securely
                            </p>
                          </div>
                        </div>
                      </div>
                    </FieldRow>

                    <FieldRow icon={Package} label="Special Requests">
                      <textarea
                        value={form.special_requests}
                        onChange={(e) =>
                          set("special_requests", e.target.value)
                        }
                        rows={3}
                        placeholder="Any special arrangements or requests..."
                        className={INPUT_CLS + " resize-none"}
                        style={{ fontFamily: "Jost, sans-serif" }}
                      />
                    </FieldRow>
                  </motion.div>
                )}

                {/* STEP 3 — Review */}
                {step === "review" && (
                  <motion.div
                    key="review"
                    {...stepMotionProps}
                    className="flex flex-col gap-6 p-5 sm:p-7"
                  >
                    <div className="space-y-2">
                      <p className="section-label text-[9px]">Step Three</p>
                      <h4
                        style={{
                          fontFamily: "Cormorant Garamond, serif",
                          fontSize: "1.65rem",
                          fontWeight: 400,
                          color: "#1a1a1a",
                          lineHeight: 1,
                        }}
                      >
                        Confirm And Pay
                      </h4>
                    </div>
                    <p
                      className="max-w-lg text-[13px] leading-6 text-[#8a8a7a]"
                      style={{
                        fontFamily: "Jost, sans-serif",
                        fontWeight: 300,
                      }}
                    >
                      Review your booking details before continuing to secure
                      payment.
                    </p>

                    {/* Summary card */}
                    <div className="overflow-hidden rounded-[1.25rem] border border-[#e6ddd1] bg-white shadow-[0_18px_45px_rgba(17,14,10,0.05)]">
                      <div className="bg-[#1a1a1a] px-5 py-4">
                        <p
                          className="text-[10px] tracking-widest uppercase text-[#c9a96e]"
                          style={{ fontFamily: "Jost, sans-serif" }}
                        >
                          Booking Summary
                        </p>
                      </div>
                      <div className="divide-y divide-[#ede8df]">
                        {reviewSummaryItems.map((item) => (
                          <SummaryItem key={item.label} {...item} />
                        ))}
                        {form.special_requests && (
                          <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-3 sm:px-5">
                            <Package
                              size={13}
                              color="#c9a96e"
                              className="mt-0.5 shrink-0"
                              strokeWidth={1.5}
                            />
                            <span
                              className="shrink-0 text-[11px] text-[#8a8a7a] sm:w-28"
                              style={{ fontFamily: "Jost, sans-serif" }}
                            >
                              Requests
                            </span>
                            <span
                              className="text-[11px] text-[#1a1a1a]"
                              style={{ fontFamily: "Jost, sans-serif" }}
                            >
                              {form.special_requests}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="grid gap-3 border-t border-[#ede8df] bg-[linear-gradient(180deg,#fcfaf7_0%,#f6f1e9_100%)] px-4 py-5 sm:grid-cols-3 sm:px-5">
                        <div>
                          <p
                            className="text-[10px] text-[#8a8a7a] tracking-wider uppercase"
                            style={{ fontFamily: "Jost, sans-serif" }}
                          >
                            Total Amount
                          </p>
                          <p
                            style={{
                              fontFamily: "Cormorant Garamond, serif",
                              fontSize: "1.35rem",
                              fontWeight: 500,
                              color: "#1a1a1a",
                            }}
                          >
                            {formatPHP(totalAmount)}
                          </p>
                          <p
                            className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#8a8a7a]"
                            style={{ fontFamily: "Jost, sans-serif" }}
                          >
                            {priceTypeLabel}
                          </p>
                        </div>
                        <div>
                          <p
                            className="text-[10px] text-[#8a8a7a] tracking-wider uppercase"
                            style={{ fontFamily: "Jost, sans-serif" }}
                          >
                            Downpayment
                          </p>
                          <p
                            style={{
                              fontFamily: "Cormorant Garamond, serif",
                              fontSize: "1.35rem",
                              fontWeight: 500,
                              color: "#c9a96e",
                            }}
                          >
                            {formatPHP(downpaymentAmount)}
                          </p>
                        </div>
                        <div>
                          <p
                            className="text-[10px] text-[#8a8a7a] tracking-wider uppercase"
                            style={{ fontFamily: "Jost, sans-serif" }}
                          >
                            Remaining Balance
                          </p>
                          <p
                            style={{
                              fontFamily: "Cormorant Garamond, serif",
                              fontSize: "1.35rem",
                              fontWeight: 500,
                              color: "#1a1a1a",
                            }}
                          >
                            {formatPHP(remainingBalance)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-[1.1rem] border border-amber-200 bg-amber-50/90 px-4 py-4 shadow-[0_12px_30px_rgba(217,119,6,0.08)]">
                      <AlertCircle
                        size={14}
                        color="#d97706"
                        className="mt-0.5 shrink-0"
                      />
                      <p
                        className="text-[11px] text-amber-700 leading-relaxed"
                        style={{ fontFamily: "Jost, sans-serif" }}
                      >
                        After confirming, you will be redirected to PayMongo's
                        secure checkout. Only 50% is required today to secure
                        your booking. No bank or card details are collected on
                        this page.{" "}
                        <strong>Downpayment is non-refundable.</strong>
                      </p>
                    </div>

                    <div className="rounded-[1.1rem] border border-[#e6ddd1] bg-white px-4 py-3">
                      <p
                        className="text-[10px] uppercase tracking-[0.18em] text-[#8a8a7a]"
                        style={{ fontFamily: "Jost, sans-serif" }}
                      >
                        Pricing Applied
                      </p>
                      <p
                        className="mt-1 text-[12px] text-[#4a4a4a]"
                        style={{ fontFamily: "Jost, sans-serif" }}
                      >
                        {priceTypeLabel}
                      </p>
                    </div>

                    <div className="flex items-start gap-3 rounded-[1.1rem] border border-[#e6ddd1] bg-[#faf8f5] px-4 py-4 shadow-[0_12px_28px_rgba(17,14,10,0.04)]">
                      <Shield
                        size={14}
                        color="#c9a96e"
                        className="mt-0.5 shrink-0"
                      />
                      <p
                        className="text-[11px] text-[#4a4a4a] leading-relaxed"
                        style={{ fontFamily: "Jost, sans-serif" }}
                      >
                        Secure Checkout. Payments are encrypted and processed
                        securely through PayMongo. By continuing, you agree to
                        our House Rules and acknowledge the required
                        downpayment.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#ede8df] bg-[linear-gradient(180deg,#fcfaf7_0%,#f6f1e9_100%)] px-5 py-5 shrink-0 sm:px-7" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
              <button
                onClick={() => {
                  if (submitting) return;
                  if (step === "details") onClose();
                  else if (step === "booking") setStep("details");
                  else if (step === "review") setStep("booking");
                }}
                disabled={submitting}
                className="min-h-[44px] px-3 text-xs tracking-wider uppercase text-[#8a8a7a] hover:text-[#1a1a1a] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                style={{ fontFamily: "Jost, sans-serif" }}
              >
                {step === "details" ? "Cancel" : "← Back"}
              </button>

              {step === "review" ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-gold min-h-[44px] flex-1 max-w-[20rem] justify-center disabled:opacity-60 disabled:cursor-not-allowed text-[11px] sm:text-xs"
                >
                  {submitting ? (
                    <>
                      <Lock size={14} />
                      <span className="hidden sm:inline">Redirecting to secure checkout...</span>
                      <span className="sm:hidden">Redirecting...</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Proceed to Secure Payment ({formatPHP(downpaymentAmount)})</span>
                      <span className="sm:hidden">Pay {formatPHP(downpaymentAmount)}</span>
                      <ChevronRight size={14} />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (step === "details" && canProceedDetails)
                      setStep("booking");
                    else if (step === "booking" && canProceedBooking)
                      setStep("review");
                    else toast.error("Please fill in all required fields.");
                  }}
                  className="btn-gold min-h-[44px] min-w-[8rem] justify-center"
                >
                  Continue <ChevronRight size={14} />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
