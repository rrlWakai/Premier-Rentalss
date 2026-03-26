import { useState } from "react";
import {
  X,
  User,
  MapPin,
  Phone,
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createBooking } from "../lib/supabase";
import {
  type PropertyData,
  type RatePackage,
  type PaymentMode,
  type PreferredTime,
  type PreferredPlan,
  formatPHP,
} from "../lib/propertyData";
import toast from "react-hot-toast";

interface Props {
  property: PropertyData;
  initialPackage: RatePackage;
  open: boolean;
  onClose: () => void;
}

type Step = "details" | "booking" | "review" | "success";

const STEPS: { id: Step; label: string }[] = [
  { id: "details", label: "Your Details" },
  { id: "booking", label: "Booking Info" },
  { id: "review", label: "Review" },
];

// Map rate label → PreferredTime
function labelToTime(label: string): PreferredTime {
  const l = label.toLowerCase();
  if (l.includes("night") || l.includes("night")) return "Night";
  if (l.includes("overnight") || l.includes("platinum")) return "Overnight";
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
  address: string;
  contact_number: string;
  preferred_dates: string;
  preferred_time: PreferredTime;
  preferred_plan: PreferredPlan;
  rate_label: string;
  num_guests: string;
  num_cars: string;
  mode_of_payment: PaymentMode;
  special_requests: string;
}

interface PaymentDetailField {
  key: "account_name" | "account_number" | "bank_branch";
  label: string;
  placeholder: string;
  type?: "text" | "tel";
  optional?: boolean;
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
    <div className="flex flex-col gap-1.5">
      <label
        className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-[#8a8a7a]"
        style={{ fontFamily: "Jost, sans-serif" }}
      >
        <Icon size={11} color="#c9a96e" />
        {label}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLS =
  "w-full border border-[#ede8df] px-3 py-2.5 text-sm rounded-lg outline-none focus:border-[#c9a96e] transition-colors bg-white text-[#1a1a1a]";
const SELECT_CLS = INPUT_CLS + " appearance-none cursor-pointer";

const PAYMENT_FORM_FIELDS: Record<PaymentMode, PaymentDetailField[]> = {
  GCash: [
    {
      key: "account_name",
      label: "GCash Account Name *",
      placeholder: "Name registered in GCash",
    },
    {
      key: "account_number",
      label: "GCash Number *",
      placeholder: "09XX XXX XXXX",
      type: "tel",
    },
  ],
  BDO: [
    {
      key: "account_name",
      label: "Account Name *",
      placeholder: "Name on the bank account",
    },
    {
      key: "account_number",
      label: "Account Number *",
      placeholder: "Enter your BDO account number",
      type: "tel",
    },
    {
      key: "bank_branch",
      label: "Branch",
      placeholder: "Optional branch name",
      optional: true,
    },
  ],
};

export default function BookingFormModal({
  property,
  initialPackage,
  open,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>("details");
  const [selectedPkg, setSelectedPkg] = useState<RatePackage>(initialPackage);
  const [bookingRef, setBookingRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormState>({
    full_name: "",
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
  });
  const [paymentForm, setPaymentForm] = useState({
    account_name: "",
    account_number: "",
    bank_branch: "",
  });

  const stepIndex = ["details", "booking", "review", "success"].indexOf(step);

  const set = (field: keyof FormState, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  // When rate changes, auto-set preferred_time and preferred_plan
  function handleRateChange(label: string) {
    set("rate_label", label);
    set("preferred_time", labelToTime(label));
    set("preferred_plan", labelToPlan(label));
  }

  // Compute estimated amount
  const selectedRate = selectedPkg.rates.find(
    (r) => r.label === form.rate_label,
  );
  const isWeekend = false; // user picks — show both; admin confirms actual rate
  const estimatedAmount =
    selectedRate?.weekday ?? selectedPkg.rates[0]?.weekday ?? 0;
  const downPayment = estimatedAmount * 0.5;

  const canProceedDetails =
    form.full_name.trim() && form.address.trim() && form.contact_number.trim();
  const canProceedBooking =
    form.preferred_dates.trim() &&
    form.rate_label &&
    form.num_guests &&
    Number(form.num_guests) >= 1 &&
    Number(form.num_guests) <= selectedPkg.maxPax &&
    form.num_cars &&
    Number(form.num_cars) >= 1 &&
    Number(form.num_cars) <= property.maxCars &&
    PAYMENT_FORM_FIELDS[form.mode_of_payment].every(
      (field) => field.optional || paymentForm[field.key].trim(),
    );

  const paymentDetailsSummary = PAYMENT_FORM_FIELDS[form.mode_of_payment]
    .filter((field) => paymentForm[field.key].trim())
    .map(
      (field) => `${field.label.replace(" *", "")}: ${paymentForm[field.key]}`,
    )
    .join("\n");

  const mergedSpecialRequests = [
    form.special_requests.trim(),
    paymentDetailsSummary
      ? `Payment Details:\n${paymentDetailsSummary}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  async function handleSubmit() {
    setSubmitting(true);
    const ref = `PR-${Date.now().toString(36).toUpperCase()}`;
    setBookingRef(ref);

    // Find retreat_id by matching slug (fallback to known slugs)
    const retreat_id =
      property.slug === "premier-pool-house"
        ? "premier-pool-house"
        : "premier-patio";

    const ok = await createBooking({
      retreat_id,
      full_name: form.full_name,
      address: form.address,
      phone: form.contact_number,
      contact_number: form.contact_number,
      preferred_dates: form.preferred_dates,
      preferred_plan: form.preferred_plan,
      num_guests: Number(form.num_guests),
      num_cars: Number(form.num_cars),
      mode_of_payment: form.mode_of_payment,
      rate_tier: selectedPkg.tier,
      total_amount: estimatedAmount,
      status: "pending",
      payment_status: "unpaid",
      special_requests: mergedSpecialRequests || undefined,
    });

    setSubmitting(false);
    if (ok) {
      setStep("success");
      toast.success("Booking request submitted!");
    } else {
      toast.error("Failed to submit. Please try again.");
    }
  }

  const PAYMENT_DETAILS: Record<PaymentMode, string> = {
    GCash:
      "GCash — Our team will send you the payment link after confirmation.",
    BDO: "BDO Bank Transfer — Account details will be sent via your contact number.",
  };

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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            className="relative w-full max-w-xl bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[95vh] flex flex-col"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#ede8df] shrink-0">
              <div>
                <p className="section-label text-[9px]">Reservation</p>
                <h3
                  style={{
                    fontFamily: "Cormorant Garamond, serif",
                    fontSize: "1.2rem",
                    fontWeight: 400,
                    color: "#1a1a1a",
                  }}
                >
                  {property.name}
                </h3>
              </div>
              {step !== "success" && (
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-[#f8f4ee] rounded-full transition-colors"
                >
                  <X size={17} color="#8a8a7a" />
                </button>
              )}
            </div>

            {/* Step indicator */}
            {step !== "success" && (
              <div className="flex items-center gap-2 px-6 py-3 bg-[#faf8f5] border-b border-[#ede8df] shrink-0">
                {STEPS.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <div
                      className={`flex items-center gap-1.5 ${i <= stepIndex ? "opacity-100" : "opacity-30"}`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors
                        ${i < stepIndex ? "bg-[#c9a96e] text-white" : i === stepIndex ? "bg-[#1a1a1a] text-white" : "bg-[#ede8df] text-[#8a8a7a]"}`}
                      >
                        {i < stepIndex ? <Check size={10} /> : i + 1}
                      </div>
                      <span
                        className="text-[10px] tracking-wide hidden sm:inline"
                        style={{
                          fontFamily: "Jost, sans-serif",
                          fontWeight: i === stepIndex ? 600 : 400,
                        }}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="w-4 h-px bg-[#ede8df]" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* STEP 1 — Your Details */}
                {step === "details" && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-6 flex flex-col gap-4"
                  >
                    <p
                      className="text-xs text-[#8a8a7a] mb-1"
                      style={{
                        fontFamily: "Jost, sans-serif",
                        fontWeight: 300,
                      }}
                    >
                      Please fill in your personal information.
                    </p>

                    <FieldRow icon={User} label="Full Name *">
                      <input
                        type="text"
                        value={form.full_name}
                        onChange={(e) => set("full_name", e.target.value)}
                        placeholder="Juan Dela Cruz"
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
                        className={INPUT_CLS}
                        style={{ fontFamily: "Jost, sans-serif" }}
                      />
                    </FieldRow>

                    <FieldRow icon={Phone} label="Contact Number *">
                      <input
                        type="tel"
                        value={form.contact_number}
                        onChange={(e) => set("contact_number", e.target.value)}
                        placeholder="+63 9XX XXX XXXX"
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
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-6 flex flex-col gap-4"
                  >
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

                    <div className="grid grid-cols-2 gap-4">
                      <FieldRow
                        icon={Users}
                        label={`Guests (max ${selectedPkg.maxPax}) *`}
                      >
                        <input
                          type="number"
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

                    <FieldRow icon={Wallet} label="Mode of Payment *">
                      <div className="grid grid-cols-2 gap-3">
                        {(["GCash", "BDO"] as PaymentMode[]).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              set("mode_of_payment", mode);
                              setPaymentForm({
                                account_name: "",
                                account_number: "",
                                bank_branch: "",
                              });
                            }}
                            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${
                              form.mode_of_payment === mode
                                ? "border-[#c9a96e] bg-[#faf6ef] text-[#1a1a1a]"
                                : "border-[#ede8df] text-[#8a8a7a] hover:border-[#c9a96e]/50"
                            }`}
                            style={{ fontFamily: "Jost, sans-serif" }}
                          >
                            <Wallet
                              size={14}
                              color={
                                form.mode_of_payment === mode
                                  ? "#c9a96e"
                                  : "#8a8a7a"
                              }
                            />
                            {mode}
                          </button>
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

                      <div className="mt-3 grid gap-3">
                        {PAYMENT_FORM_FIELDS[form.mode_of_payment].map(
                          (field) => (
                            <div key={field.key} className="flex flex-col gap-1.5">
                              <label
                                className="text-[10px] tracking-widest uppercase text-[#8a8a7a]"
                                style={{ fontFamily: "Jost, sans-serif" }}
                              >
                                {field.label}
                              </label>
                              <input
                                type={field.type ?? "text"}
                                value={paymentForm[field.key]}
                                onChange={(e) =>
                                  setPaymentForm((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                placeholder={field.placeholder}
                                className={INPUT_CLS}
                                style={{ fontFamily: "Jost, sans-serif" }}
                              />
                            </div>
                          ),
                        )}
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
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-6 flex flex-col gap-4"
                  >
                    <p
                      className="text-xs text-[#8a8a7a] mb-1"
                      style={{
                        fontFamily: "Jost, sans-serif",
                        fontWeight: 300,
                      }}
                    >
                      Please review your booking details before submitting.
                    </p>

                    {/* Summary card */}
                    <div className="rounded-xl border border-[#ede8df] overflow-hidden">
                      <div className="px-5 py-3 bg-[#1a1a1a]">
                        <p
                          className="text-[10px] tracking-widest uppercase text-[#c9a96e]"
                          style={{ fontFamily: "Jost, sans-serif" }}
                        >
                          Booking Summary
                        </p>
                      </div>
                      <div className="divide-y divide-[#ede8df]">
                        {[
                          {
                            icon: User,
                            label: "Full Name",
                            value: form.full_name,
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
                            label: "Payment Mode",
                            value: form.mode_of_payment,
                          },
                          {
                            icon: Wallet,
                            label: "Payment Details",
                            value: paymentDetailsSummary || "Not provided",
                          },
                        ].map(({ icon: Icon, label, value }) => (
                          <div
                            key={label}
                            className="flex items-start gap-3 px-5 py-3"
                          >
                            <Icon
                              size={13}
                              color="#c9a96e"
                              className="mt-0.5 shrink-0"
                              strokeWidth={1.5}
                            />
                            <span
                              className="text-[11px] text-[#8a8a7a] w-28 shrink-0"
                              style={{ fontFamily: "Jost, sans-serif" }}
                            >
                              {label}
                            </span>
                            <span
                              className="text-[11px] text-[#1a1a1a] font-medium whitespace-pre-line"
                              style={{ fontFamily: "Jost, sans-serif" }}
                            >
                              {value}
                            </span>
                          </div>
                        ))}
                        {form.special_requests && (
                          <div className="flex items-start gap-3 px-5 py-3">
                            <Package
                              size={13}
                              color="#c9a96e"
                              className="mt-0.5 shrink-0"
                              strokeWidth={1.5}
                            />
                            <span
                              className="text-[11px] text-[#8a8a7a] w-28 shrink-0"
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
                      {/* Price estimate */}
                      <div className="px-5 py-4 bg-[#faf8f5] border-t border-[#ede8df] flex items-center justify-between">
                        <div>
                          <p
                            className="text-[10px] text-[#8a8a7a] tracking-wider uppercase"
                            style={{ fontFamily: "Jost, sans-serif" }}
                          >
                            Estimated Amount
                          </p>
                          <p
                            style={{
                              fontFamily: "Cormorant Garamond, serif",
                              fontSize: "1.4rem",
                              fontWeight: 500,
                              color: "#c9a96e",
                            }}
                          >
                            {formatPHP(estimatedAmount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className="text-[10px] text-[#8a8a7a] tracking-wider uppercase"
                            style={{ fontFamily: "Jost, sans-serif" }}
                          >
                            50% Down Payment
                          </p>
                          <p
                            style={{
                              fontFamily: "Cormorant Garamond, serif",
                              fontSize: "1.1rem",
                              fontWeight: 500,
                              color: "#1a1a1a",
                            }}
                          >
                            {formatPHP(downPayment)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Payment note */}
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
                      <AlertCircle
                        size={14}
                        color="#d97706"
                        className="mt-0.5 shrink-0"
                      />
                      <p
                        className="text-[11px] text-amber-700 leading-relaxed"
                        style={{ fontFamily: "Jost, sans-serif" }}
                      >
                        Final rate may vary based on weekday/weekend. Our team
                        will confirm the exact amount and send payment
                        instructions via your contact number.{" "}
                        <strong>Down payment is non-refundable.</strong>
                      </p>
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-lg border border-[#ede8df] bg-[#faf8f5]">
                      <Shield
                        size={14}
                        color="#c9a96e"
                        className="mt-0.5 shrink-0"
                      />
                      <p
                        className="text-[11px] text-[#4a4a4a] leading-relaxed"
                        style={{ fontFamily: "Jost, sans-serif" }}
                      >
                        By submitting, you agree to our House Rules and confirm
                        that 50% down payment will be sent to secure your
                        reservation.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* SUCCESS */}
                {step === "success" && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-10 flex flex-col items-center text-center gap-5"
                  >
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{
                        background: "rgba(201,169,110,0.12)",
                        border: "2px solid #c9a96e",
                      }}
                    >
                      <Check size={36} color="#c9a96e" strokeWidth={2} />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontFamily: "Cormorant Garamond, serif",
                          fontSize: "1.8rem",
                          fontWeight: 400,
                          color: "#1a1a1a",
                        }}
                      >
                        Request Submitted!
                      </h3>
                      <p
                        className="text-[#8a8a7a] text-sm mt-2"
                        style={{
                          fontFamily: "Jost, sans-serif",
                          fontWeight: 300,
                        }}
                      >
                        Thank you,{" "}
                        <strong className="text-[#4a4a4a]">
                          {form.full_name}
                        </strong>
                        . Our team will contact you at{" "}
                        <strong className="text-[#4a4a4a]">
                          {form.contact_number}
                        </strong>{" "}
                        to confirm your booking and send payment details.
                      </p>
                    </div>
                    <div
                      className="w-full p-4 bg-[#f8f4ee] rounded-lg border border-[#ede8df] text-xs text-left"
                      style={{ fontFamily: "Jost, sans-serif" }}
                    >
                      <div className="flex justify-between mb-2">
                        <span className="text-[#8a8a7a]">Reference</span>
                        <span className="font-semibold text-[#1a1a1a]">
                          {bookingRef}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-[#8a8a7a]">Property</span>
                        <span className="text-[#1a1a1a]">{property.name}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-[#8a8a7a]">Package</span>
                        <span className="text-[#1a1a1a]">
                          {selectedPkg.title}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8a8a7a]">Down Payment Due</span>
                        <span
                          className="font-semibold"
                          style={{ color: "#c9a96e" }}
                        >
                          {formatPHP(downPayment)}
                        </span>
                      </div>
                    </div>
                    <p
                      className="text-[11px] text-[#8a8a7a] text-center max-w-xs"
                      style={{
                        fontFamily: "Jost, sans-serif",
                        fontWeight: 300,
                      }}
                    >
                      First down payment, first reservation. Please send your
                      down payment promptly to secure your date.
                    </p>
                    <button
                      onClick={onClose}
                      className="btn-gold w-full justify-center"
                    >
                      Done
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer nav */}
            {step !== "success" && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#ede8df] bg-[#faf8f5] shrink-0">
                <button
                  onClick={() => {
                    if (step === "details") onClose();
                    else if (step === "booking") setStep("details");
                    else if (step === "review") setStep("booking");
                  }}
                  className="text-xs tracking-wider uppercase text-[#8a8a7a] hover:text-[#1a1a1a] transition-colors"
                  style={{ fontFamily: "Jost, sans-serif" }}
                >
                  {step === "details" ? "Cancel" : "← Back"}
                </button>

                {step === "review" ? (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn-gold disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Submitting..." : "Submit Booking"}
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
                    className="btn-gold"
                  >
                    Continue <ChevronRight size={14} />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
