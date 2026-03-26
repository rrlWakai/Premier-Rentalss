import { useState, useEffect } from "react";
import { X, Check, Lock } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import BookingCalendar from "./BookingCalendar";
import {
  createBooking,
  updateBookingPayment,
  type Retreat,
} from "../lib/supabase";
import {
  createPaymentIntent,
  createCardPaymentMethod,
  attachPaymentIntent,
  createEWalletSource,
  formatPHP,
} from "../lib/paymongo";
import toast from "react-hot-toast";

type Step = "dates" | "details" | "payment" | "success";
type PayMethod = "card" | "gcash" | "paymaya" | "grab_pay" | "bdo";

const DOWNPAYMENT_RATE = 0.3;

export default function BookingModal({ retreat, open, onClose }: any) {
  const [step, setStep] = useState<Step>("dates");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    gcash_number: "",
    bdo_name: "",
    bdo_number: "",
  });

  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingRef, setBookingRef] = useState("");

  const [method, setMethod] = useState<PayMethod>("gcash");
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [card, setCard] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: "",
  });

  useEffect(() => {
    if (!open) {
      setStep("dates");
      setSelectedDate(null);
      setBookingId(null);
      setIframeUrl(null);
      setMethod("gcash");
    }
  }, [open]);

  useEffect(() => {
    setCard((p) => ({ ...p, name: form.full_name }));
  }, [form.full_name]);

  const totalAmount = retreat.price_day;
  const downpaymentAmount = totalAmount * DOWNPAYMENT_RATE;

  // ================= CREATE BOOKING =================
  async function handleBookingSubmit() {
    if (!selectedDate) return toast.error("Select a date");

    const ref = `PR-${Date.now().toString(36).toUpperCase()}`;
    setBookingRef(ref);

    const booking = await createBooking({
      retreat_id: retreat.id,
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      address: "N/A", // required in schema
      booking_type: "day",
      booking_date: format(selectedDate, "yyyy-MM-dd"),
      guests: 1,
      total_amount: totalAmount,
      downpayment_amount: downpaymentAmount,
      remaining_balance: totalAmount - downpaymentAmount,
      payment_status: "unpaid",
      status: "pending",
    });

    if (!booking) return toast.error("Booking failed");

    setBookingId(booking.id);
    setStep("payment");
  }

  // ================= PAYMENT =================
  async function handlePay() {
    if (!bookingId) return;

    setProcessing(true);
    setStatusMsg(null);

    try {
      // CARD
      if (method === "card") {
        const [m, y] = card.expiry.split("/").map(Number);

        const intent = await createPaymentIntent(downpaymentAmount, "Booking");
        if (!intent) throw new Error("Intent failed");

        const pm = await createCardPaymentMethod({
          number: card.number,
          exp_month: m,
          exp_year: 2000 + y,
          cvc: card.cvc,
          name: card.name,
          email: form.email,
          phone: form.phone,
        });
        if (!pm) throw new Error("Card invalid");

        const result = await attachPaymentIntent(
          intent.id,
          intent.attributes.client_key,
          pm.id,
        );
        if (!result) throw new Error("Payment failed");

        if (result.status === "succeeded") {
          await updateBookingPayment(
            bookingId,
            "partial",
            intent.id,
            downpaymentAmount,
          );
          setStep("success");
        }
      }

      // EWALLETS
      else if (
        method === "gcash" ||
        method === "paymaya" ||
        method === "grab_pay"
      ) {
        const source = await createEWalletSource(
          downpaymentAmount,
          method,
          bookingRef,
          form.email,
          form.full_name,
          form.phone,
        );
        if (!source) throw new Error("Ewallet failed");

        setIframeUrl(source.redirect.checkout_url);
      }

      // BDO MANUAL
      else if (method === "bdo") {
        if (!form.bdo_name || !form.bdo_number) {
          return toast.error("Fill bank details");
        }

        await updateBookingPayment(bookingId, "unpaid", "BDO_MANUAL");

        setStep("success");
      }
    } catch (err: any) {
      setStatusMsg(err.message);
    }

    setProcessing(false);
  }

  const methods: PayMethod[] = ["gcash", "paymaya", "grab_pay", "card", "bdo"];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />

          <div className="relative max-h-[95vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 space-y-4 sm:rounded-xl sm:p-5">
            {/* DATE */}
            {step === "dates" && (
              <>
                <BookingCalendar
                  retreatId={retreat.id}
                  checkIn={selectedDate}
                  checkOut={null}
                  singleDate
                  onSelectDates={(d) => setSelectedDate(d)}
                />
                <button onClick={() => setStep("details")}>Next</button>
              </>
            )}

            {/* DETAILS */}
            {step === "details" && (
              <>
                <input
                  placeholder="Name"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, full_name: e.target.value }))
                  }
                />
                <input
                  placeholder="Email"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                />
                <input
                  placeholder="Phone"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phone: e.target.value }))
                  }
                />
                <button onClick={handleBookingSubmit}>Continue</button>
              </>
            )}

            {/* PAYMENT */}
            {step === "payment" && (
              <>
                <p className="text-center">{formatPHP(downpaymentAmount)}</p>

                <div className="grid grid-cols-3 gap-2">
                  {methods.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMethod(m);
                        setIframeUrl(null);
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* CARD FORM */}
                {method === "card" && (
                  <>
                    <input
                      placeholder="Card Name"
                      onChange={(e) =>
                        setCard((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                    <input
                      placeholder="Card Number"
                      onChange={(e) =>
                        setCard((p) => ({ ...p, number: e.target.value }))
                      }
                    />
                    <input
                      placeholder="MM/YY"
                      onChange={(e) =>
                        setCard((p) => ({ ...p, expiry: e.target.value }))
                      }
                    />
                    <input
                      placeholder="CVC"
                      onChange={(e) =>
                        setCard((p) => ({ ...p, cvc: e.target.value }))
                      }
                    />
                  </>
                )}

                {/* GCASH FORM */}
                {method === "gcash" && (
                  <input
                    placeholder="GCash Number"
                    onChange={(e) =>
                      setForm((p) => ({ ...p, gcash_number: e.target.value }))
                    }
                  />
                )}

                {/* BDO FORM */}
                {method === "bdo" && (
                  <>
                    <input
                      placeholder="Account Name"
                      onChange={(e) =>
                        setForm((p) => ({ ...p, bdo_name: e.target.value }))
                      }
                    />
                    <input
                      placeholder="Account Number"
                      onChange={(e) =>
                        setForm((p) => ({ ...p, bdo_number: e.target.value }))
                      }
                    />
                  </>
                )}

                {iframeUrl && (
                  <iframe
                    src={iframeUrl}
                    title="payment"
                    className="w-full h-[400px]"
                  />
                )}

                {!iframeUrl && (
                  <button onClick={handlePay} disabled={processing}>
                    <Lock size={14} /> {processing ? "Processing..." : "Pay"}
                  </button>
                )}

                {statusMsg && <p>{statusMsg}</p>}
              </>
            )}

            {/* SUCCESS */}
            {step === "success" && (
              <div className="text-center">
                <Check />
                <p>{bookingRef}</p>
                <p>Waiting for admin approval</p>
              </div>
            )}
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
