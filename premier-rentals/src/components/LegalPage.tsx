import { useParams, Link, Navigate } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

type LegalType = "terms" | "privacy";

const SECTIONS: Record<
  LegalType,
  { title: string; effective: string; intro: string; sections: { heading: string; body: string | string[] }[] }
> = {
  terms: {
    title: "Terms of Service",
    effective: "Effective January 1, 2025",
    intro:
      "Welcome to Premier Rentals. By using our website and booking our properties, you agree to the following terms. Please read them carefully before proceeding with any reservation.",
    sections: [
      {
        heading: "1. Properties",
        body: "Premier Rentals offers two rental properties available through this website — Premier Pool House and Premier Patio. Each property has its own pricing, availability, and house rules displayed before booking. Reservations are subject to availability.",
      },
      {
        heading: "2. Booking & Payment",
        body: [
          "A down payment is required to confirm any reservation. Your booking is only secured once the down payment has been received and acknowledged.",
          "The remaining balance must be settled in full prior to check-in. Failure to complete payment of the remaining balance may result in the automatic cancellation of your booking without refund.",
        ],
      },
      {
        heading: "3. No-Refund Policy",
        body: "All payments made to Premier Rentals — including down payments and full payments — are strictly non-refundable. This applies regardless of the reason for cancellation, including personal emergencies or changes in schedule. Please ensure you are certain before completing payment.",
      },
      {
        heading: "4. Guest Responsibility",
        body: "Guests must provide accurate and truthful information when making a booking. Guests are responsible for taking care of the property during their stay. Any damage to the property, fixtures, furnishings, or equipment caused by guests or their companions may result in additional charges.",
      },
      {
        heading: "5. Cancellation by Management",
        body: "Premier Rentals reserves the right to cancel a confirmed booking in the event of unforeseen circumstances beyond our control (e.g., property damage, safety concerns, natural events). In such cases, we will make every reasonable effort to offer an alternative arrangement or reschedule. Any payments made will be reviewed on a case-by-case basis.",
      },
      {
        heading: "6. Liability",
        body: "Premier Rentals shall not be held liable for personal loss, injury, theft, or damages arising from circumstances beyond our reasonable control. Guests assume responsibility for their personal belongings and the safety of their party during the stay.",
      },
      {
        heading: "7. Acceptance of Terms",
        body: "By proceeding with a booking on our website, you confirm that you have read, understood, and agreed to these Terms of Service. These terms may be updated from time to time, and continued use of our services constitutes acceptance of any changes.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    effective: "Effective January 1, 2025",
    intro:
      "Premier Rentals is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, and how we keep it safe.",
    sections: [
      {
        heading: "1. Information We Collect",
        body: [
          "When you use our website or make a booking, we may collect the following:",
          "Full name · Contact number · Email address · Booking details (dates, property, payment method)",
        ],
      },
      {
        heading: "2. How We Use Your Information",
        body: [
          "Your information is used solely for the purposes of:",
          "Processing and confirming your booking · Communicating reservation updates and reminders · Responding to inquiries or support requests · Improving the quality of our services",
        ],
      },
      {
        heading: "3. Data Protection",
        body: "We take the security of your personal data seriously. Reasonable technical and administrative measures are in place to protect your information from unauthorized access, disclosure, or misuse.",
      },
      {
        heading: "4. Data Sharing",
        body: "We do not sell, trade, or rent your personal information to third parties. Your data may only be shared when strictly necessary — such as with payment processors for transaction handling or with legal authorities when required by law.",
      },
      {
        heading: "5. Data Retention",
        body: "We retain your personal information only for as long as necessary to fulfill the purposes outlined in this policy, or as required for legal and record-keeping obligations.",
      },
      {
        heading: "6. Your Rights",
        body: "You have the right to request access to the personal data we hold about you, and to request corrections if any information is inaccurate. To make such a request, please contact us through our website.",
      },
      {
        heading: "7. Consent",
        body: "By using our website and submitting a booking, you consent to the collection and use of your information as described in this Privacy Policy. We may update this policy periodically, and any changes will be reflected on this page.",
      },
    ],
  },
};

export default function LegalPage() {
  const { type } = useParams<{ type: string }>();

  if (type !== "terms" && type !== "privacy") {
    return <Navigate to="/" replace />;
  }

  const page = SECTIONS[type as LegalType];

  return (
    <div className="min-h-screen bg-[#f8f4ee] flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero band */}
        <div
          className="border-b border-[#e8e0d4]"
          style={{ background: "#1a1a1a" }}
        >
          <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20 lg:px-8">
            <p
              className="mb-3 text-[10px] uppercase tracking-[0.3em] text-[#c9a96e]"
              style={{ fontFamily: "Jost, sans-serif", fontWeight: 500 }}
            >
              Premier Rentals
            </p>
            <h1
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "clamp(2rem, 5vw, 2.8rem)",
                fontWeight: 400,
                color: "#ffffff",
                lineHeight: 1.2,
              }}
            >
              {page.title}
            </h1>
            <p
              className="mt-3 text-xs text-white/35"
              style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
            >
              {page.effective}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-3xl px-6 py-14 sm:py-18 lg:px-8">
          {/* Intro */}
          <p
            className="mb-12 text-sm leading-relaxed text-[#4a4a4a] border-l-2 border-[#c9a96e] pl-5"
            style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
          >
            {page.intro}
          </p>

          {/* Sections */}
          <div className="flex flex-col gap-10">
            {page.sections.map((sec) => (
              <div key={sec.heading}>
                <h2
                  className="mb-3"
                  style={{
                    fontFamily: "Cormorant Garamond, serif",
                    fontSize: "1.25rem",
                    fontWeight: 500,
                    color: "#1a1a1a",
                  }}
                >
                  {sec.heading}
                </h2>

                {Array.isArray(sec.body) ? (
                  <div className="flex flex-col gap-2">
                    {sec.body.map((line, i) => (
                      <p
                        key={i}
                        className={`text-sm leading-relaxed ${
                          i === 1
                            ? "bg-white border border-[#ede8df] rounded px-4 py-3 text-[#4a4a4a]"
                            : "text-[#4a4a4a]"
                        }`}
                        style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
                      >
                        {i === 1
                          ? line.split(" · ").map((item, j, arr) => (
                              <span key={j}>
                                <span className="text-[#1a1a1a] font-normal">{item}</span>
                                {j < arr.length - 1 && (
                                  <span className="text-[#c9a96e] mx-2">·</span>
                                )}
                              </span>
                            ))
                          : line}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p
                    className="text-sm leading-relaxed text-[#4a4a4a]"
                    style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
                  >
                    {sec.body}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="my-14 border-t border-[#e8e0d4]" />

          {/* Cross-link */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p
              className="text-xs text-[#8a8a7a]"
              style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
            >
              {type === "terms"
                ? "Also review how we handle your data."
                : "Also review the terms that govern your bookings."}
            </p>
            <Link
              to={type === "terms" ? "/legal/privacy" : "/legal/terms"}
              className="text-xs text-[#c9a96e] hover:underline underline-offset-4 transition-colors"
              style={{ fontFamily: "Jost, sans-serif", fontWeight: 400 }}
            >
              {type === "terms" ? "Privacy Policy →" : "Terms of Service →"}
            </Link>
          </div>

          <div className="mt-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs text-[#8a8a7a] hover:text-[#1a1a1a] transition-colors"
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
