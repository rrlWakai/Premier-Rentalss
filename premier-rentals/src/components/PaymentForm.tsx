import { useState } from "react";
import { CreditCard, Smartphone, Lock } from "lucide-react";
import {
  createPaymentIntent,
  createCardPaymentMethod,
  attachPaymentIntent,
  createEWalletSource,
  formatPHP,
} from "../lib/paymongo";

type PayMethod = "card" | "gcash" | "paymaya" | "grab_pay";

interface Props {
  amount: number;
  bookingId: string;
  bookingRef: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  description: string;
  onSuccess: (paymentId: string) => void;
  onError: (msg: string) => void;
}

export default function PaymentForm({
  amount,
  bookingId,
  bookingRef,
  guestName,
  guestEmail,
  guestPhone,
  description,
  onSuccess,
  onError,
}: Props) {
  const [method, setMethod] = useState<PayMethod>("gcash");
  const [processing, setProcessing] = useState(false);
  const [card, setCard] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: guestName,
  });
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const ewallets: {
    id: PayMethod;
    label: string;
    color: string;
    emoji: string;
  }[] = [
    { id: "gcash", label: "GCash", color: "#007AFF", emoji: "💙" },
    { id: "paymaya", label: "Maya", color: "#00C080", emoji: "💚" },
    { id: "grab_pay", label: "GrabPay", color: "#00B14F", emoji: "🟢" },
  ];

  function formatCardNumber(val: string) {
    return val
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  }

  function formatExpiry(val: string) {
    const clean = val.replace(/\D/g, "").slice(0, 4);
    return clean.length >= 3
      ? clean.slice(0, 2) + " / " + clean.slice(2)
      : clean;
  }

  async function handlePay() {
    setProcessing(true);
    setStatusMsg(null);
    setIframeUrl(null);

    try {
      if (method === "card") {
        const [expMonth, expYear] = card.expiry
          .split("/")
          .map((s) => parseInt(s.trim()));
        const intent = await createPaymentIntent(amount, description);
        if (!intent) throw new Error("Failed to initialize payment.");

        const pm = await createCardPaymentMethod({
          number: card.number,
          exp_month: expMonth,
          exp_year: 2000 + expYear,
          cvc: card.cvc,
          name: card.name,
          email: guestEmail,
          phone: guestPhone,
        });
        if (!pm) throw new Error("Invalid card details.");

        const result = await attachPaymentIntent(
          intent.id,
          intent.attributes.client_key,
          pm.id,
        );
        if (!result) throw new Error("Payment failed.");

        if (result.status === "succeeded") {
          onSuccess(intent.id);
        } else if (result.next_action?.redirect?.url) {
          // Open 3DS popup
          window.open(
            result.next_action.redirect.url,
            "_blank",
            "width=400,height=600",
          );
          setStatusMsg("Please complete 3DS verification in the popup.");
        } else {
          throw new Error("Payment could not be completed.");
        }
      } else {
        // E-wallet source flow inline
        const source = await createEWalletSource(
          amount,
          method,
          bookingRef,
          guestEmail,
          guestName,
          guestPhone,
        );
        if (!source) throw new Error("Failed to initialize e-wallet payment.");
        setIframeUrl(source.redirect.checkout_url);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg(err.message || "An unexpected error occurred.");
      onError(err.message || "Payment failed.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Amount summary */}
      <div className="flex items-center justify-between py-3 px-4 bg-[#f8f4ee] rounded border border-[#ede8df]">
        <span className="text-xs text-[#8a8a7a] tracking-wider uppercase">
          Total Amount
        </span>
        <span className="text-[#c9a96e] text-xl font-medium">
          {formatPHP(amount)}
        </span>
      </div>

      {/* Payment method selector */}
      <div>
        <p className="text-[10px] tracking-widest uppercase text-[#8a8a7a] mb-3">
          Payment Method
        </p>
        <div className="grid grid-cols-4 gap-2">
          {ewallets.map((ew) => (
            <button
              key={ew.id}
              onClick={() => setMethod(ew.id)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded border transition-all duration-200 ${
                method === ew.id
                  ? "border-[#c9a96e] bg-[#faf6ef]"
                  : "border-[#ede8df] hover:border-[#c9a96e]/40"
              }`}
            >
              <span className="text-lg">{ew.emoji}</span>
              <span className="text-[10px] font-medium text-[#4a4a4a]">
                {ew.label}
              </span>
            </button>
          ))}
          <button
            onClick={() => setMethod("card")}
            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded border transition-all duration-200 ${
              method === "card"
                ? "border-[#c9a96e] bg-[#faf6ef]"
                : "border-[#ede8df] hover:border-[#c9a96e]/40"
            }`}
          >
            <CreditCard
              size={18}
              color={method === "card" ? "#c9a96e" : "#8a8a7a"}
              strokeWidth={1.5}
            />
            <span className="text-[10px] font-medium text-[#4a4a4a]">Card</span>
          </button>
        </div>
      </div>

      {/* Card form */}
      {method === "card" && (
        <div className="flex flex-col gap-3">
          <input
            placeholder="Cardholder Name"
            value={card.name}
            onChange={(e) => setCard((p) => ({ ...p, name: e.target.value }))}
            className="w-full border px-3 py-2 rounded outline-none focus:border-[#c9a96e]"
          />
          <input
            placeholder="Card Number"
            value={card.number}
            onChange={(e) =>
              setCard((p) => ({
                ...p,
                number: formatCardNumber(e.target.value),
              }))
            }
            maxLength={19}
            className="w-full border px-3 py-2 rounded outline-none focus:border-[#c9a96e] font-mono"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="MM / YY"
              value={card.expiry}
              onChange={(e) =>
                setCard((p) => ({ ...p, expiry: formatExpiry(e.target.value) }))
              }
              maxLength={7}
              className="w-full border px-3 py-2 rounded outline-none focus:border-[#c9a96e] font-mono"
            />
            <input
              placeholder="CVC"
              value={card.cvc}
              onChange={(e) =>
                setCard((p) => ({
                  ...p,
                  cvc: e.target.value.replace(/\D/g, "").slice(0, 4),
                }))
              }
              maxLength={4}
              className="w-full border px-3 py-2 rounded outline-none focus:border-[#c9a96e] font-mono"
            />
          </div>
        </div>
      )}

      {/* E-wallet iframe */}
      {iframeUrl && (
        <iframe
          src={iframeUrl}
          className="w-full h-[500px] border-none rounded"
          title="E-wallet Payment"
        />
      )}

      {/* Status message */}
      {statusMsg && (
        <p className="text-sm text-center text-[#c9a96e]">{statusMsg}</p>
      )}

      {/* Pay button */}
      {!iframeUrl && (
        <button
          onClick={handlePay}
          disabled={processing}
          className="btn-gold w-full justify-center gap-2 flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Lock size={13} />
          {processing ? "Processing..." : `Pay ${formatPHP(amount)}`}
        </button>
      )}

      <p className="text-center text-[10px] text-[#aaa]">
        Secured by PayMongo · SSL Encrypted
      </p>
    </div>
  );
}
