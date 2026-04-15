import { MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { ImgWithFallback } from "../lib/useImage";
import { CONTACT_BG, FALLBACK } from "../lib/images";

type BrandIconProps = { size?: number; color?: string; strokeWidth?: number };

function FacebookIcon({ size = 16, color = "currentColor", strokeWidth = 1.75 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon({ size = 16, color = "currentColor", strokeWidth = 1.75 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

type SocialLink = {
  label: string;
  href: string;
  icon: (props: BrandIconProps) => JSX.Element;
};

type ContactCard = {
  name: string;
  subtitle: string;
  location: string;
  locationNote: string;
  socials: SocialLink[];
};

const CONTACTS: ContactCard[] = [
  {
    name: "Premier Pool House",
    subtitle: "Private resort for big-group escapes and family celebrations.",
    location: "22 Love Bird St, Novaliches, Quezon City, Metro Manila",
    locationNote:
      "A private and accessible space ideal for quick getaways and intimate gatherings.",
    socials: [
      {
        label: "Instagram",
        href: "https://www.instagram.com/premierpoolhouse/",
        icon: InstagramIcon,
      },
      {
        label: "Facebook",
        href: "https://www.facebook.com/premierpoolhouse",
        icon: FacebookIcon,
      },
    ],
  },
  {
    name: "Premier Patio",
    subtitle:
      "Garden estate for intimate stays, gatherings, and special moments.",
    location: "36 Amsterdam, Barangay 167, Caloocan, Metro Manila",
    locationNote:
      "Conveniently located with easy access to major roads, dining spots, and city essentials.",
    socials: [
      {
        label: "Instagram",
        href: "https://www.instagram.com/premierpatiobypph/",
        icon: InstagramIcon,
      },
      {
        label: "Facebook",
        href: "https://www.facebook.com/profile.php?id=61555665219280",
        icon: FacebookIcon,
      },
    ],
  },
];

function ContactInfoCard({ card }: { card: ContactCard }) {
  return (
    <div
      className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 sm:p-6"
      style={{ boxShadow: "0 18px 50px rgba(0,0,0,0.18)" }}
    >
      <div className="mb-5">
        <p
          className="mb-2 text-[10px] uppercase tracking-[0.26em] text-[#c9a96e]"
          style={{ fontFamily: "Jost, sans-serif", fontWeight: 500 }}
        >
          Premier Rentals
        </p>
        <h3
          className="text-white"
          style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: "clamp(1.5rem, 4vw, 1.9rem)",
            fontWeight: 400,
          }}
        >
          {card.name}
        </h3>
        <p
          className="mt-2 max-w-md text-sm leading-relaxed text-white/55"
          style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
        >
          {card.subtitle}
        </p>
      </div>

      <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{
              background: "rgba(201,169,110,0.16)",
              border: "1px solid rgba(201,169,110,0.4)",
            }}
          >
            <MapPin size={16} color="#c9a96e" />
          </div>
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.22em] text-white/35"
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              Location
            </p>
            <p
              className="mt-1 text-sm leading-relaxed text-white/72"
              style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
            >
              {card.location}
            </p>
            <p
              className="mt-2 text-xs leading-relaxed text-white/48"
              style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
            >
              {card.locationNote}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.22em] text-white/35"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            Social Media
          </p>
          <p
            className="mt-1 text-xs text-white/45"
            style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
          >
            Connect with {card.name.toLowerCase()} online.
          </p>
        </div>

        <div className="flex gap-3">
          {card.socials.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={`${card.name} ${label}`}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] transition-all duration-300 hover:border-[#c9a96e] hover:bg-[#c9a96e]/10"
            >
              <Icon
                size={16}
                color="rgba(255,255,255,0.72)"
                strokeWidth={1.75}
              />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Contact() {
  return (
    <section id="contact" className="relative">
      <div className="grid min-h-[700px] grid-cols-1 lg:grid-cols-2">
        <motion.div
          className="relative flex min-h-[260px] flex-col justify-end p-5 sm:min-h-[380px] sm:p-8 lg:min-h-0 lg:p-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <ImgWithFallback
            local={CONTACT_BG}
            fallback={FALLBACK.contact}
            alt="Premier Rentals contact"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: "rgba(10,10,10,0.62)" }}
          />
          <div className="relative z-10">
            <p className="section-label mb-4" style={{ color: "#c9a96e" }}>
              Stay Connected
            </p>
            <h2
              className="mb-5 text-white"
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "clamp(2rem, 3.5vw, 2.8rem)",
                fontWeight: 400,
                lineHeight: 1.15,
              }}
            >
              Reach{" "}
              <span style={{ color: "#c9a96e", fontStyle: "italic" }}>
                Premier Rentals
              </span>
            </h2>
            <p
              className="mb-8 max-w-sm text-sm leading-relaxed text-white/55"
              style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
            >
              Explore the contact details for each property and connect with
              Premier Pool House or Premier Patio through their social channels.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="flex flex-col justify-center px-5 py-12 sm:px-8 lg:px-16 lg:py-16"
          style={{ background: "#1a1a1a" }}
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="mb-8">
            <h3
              className="text-white"
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "1.8rem",
                fontWeight: 400,
              }}
            >
              Contact Information
            </h3>
            <p
              className="mt-2 max-w-xl text-sm leading-relaxed text-white/50"
              style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
            >
              Choose the property you want to follow or inquire about.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {CONTACTS.map((card) => (
              <ContactInfoCard key={card.name} card={card} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
