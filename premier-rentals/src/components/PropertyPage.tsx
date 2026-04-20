import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  MapPin,
  Car,
  ShieldCheck,
  Wifi,
  UtensilsCrossed,
  Waves,
  BedDouble,
  Sofa,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  POOL_HOUSE_DATA,
  PATIO_DATA,
  formatPHP,
  type PropertyData,
  type RatePackage,
} from "../lib/propertyData";
import { ImgWithFallback } from "../lib/useImage";
import { FALLBACK } from "../lib/images";
import BookingFormModal from "./BookingFormModal";
import { fadeUpVariant, containerVariant } from "../lib/animations";
import DiscountBadge from "./DiscountBadge";
import { useActiveDiscounts } from "../lib/useActiveDiscounts";

const PROPERTIES: Record<string, PropertyData> = {
  "premier-pool-house": POOL_HOUSE_DATA,
  "premier-patio": PATIO_DATA,
};

const COVER_FALLBACKS: Record<string, string> = {
  "premier-pool-house": FALLBACK.poolHouseCover,
  "premier-patio": FALLBACK.patioCover,
};
const GALLERY_FALLBACKS: Record<string, string[]> = {
  "premier-pool-house": FALLBACK.poolHouseGallery,
  "premier-patio": FALLBACK.patioGallery,
};

const AMENITY_ICONS: Record<string, typeof Wifi> = {
  "Outdoor Experience": Waves,
  "Indoor Comfort": Sofa,
  "Rooms & Accommodation": BedDouble,
  "Kitchen & Essentials": UtensilsCrossed,
  // patio fallbacks
  "Outdoor Area": Waves,
  "Indoor Ground Floor": Sofa,
  "Indoor Second Floor": Sofa,
  "Outdoor Kitchen": UtensilsCrossed,
  "Bedroom 1": BedDouble,
  "Bedroom 2": BedDouble,
};

const TIER_COLORS: Record<string, string> = {
  staycation: "#4a7c9e",
  family: "#c9a96e",
  big_group: "#6b5b8a",
};
const TIER_LABELS: Record<string, string> = {
  staycation: "Staycation",
  family: "Family",
  big_group: "Big Group",
};

function getGoogleMapsEmbedUrl(address: string) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}


function RateTable({ pkg }: { pkg: RatePackage }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#ede8df]">
      <div className="overflow-x-auto">
        <table
          className="min-w-[560px] w-full text-xs"
          style={{ fontFamily: "Jost, sans-serif" }}
        >
          <thead>
            <tr style={{ background: "#1a1a1a" }}>
              <th className="px-4 py-3 text-left text-[10px] tracking-widest uppercase text-white/60 font-medium">
                Session
              </th>
              <th className="px-4 py-3 text-left text-[10px] tracking-widest uppercase text-white/60 font-medium">
                Hours
              </th>
              <th className="px-4 py-3 text-right text-[10px] tracking-widest uppercase text-white/60 font-medium">
                Weekday
              </th>
              <th className="px-4 py-3 text-right text-[10px] tracking-widest uppercase text-[#c9a96e] font-medium">
                Weekend
              </th>
            </tr>
          </thead>
          <tbody>
            {pkg.rates.map((rate, i) => (
              <tr
                key={rate.label}
                className={`border-t border-[#ede8df] ${i % 2 === 0 ? "bg-white" : "bg-[#faf8f5]"}`}
              >
                <td className="px-4 py-3 font-medium text-[#1a1a1a] text-xs">
                  {rate.label}
                </td>
                <td className="px-4 py-3 text-[#8a8a7a] text-[10px]">
                  {rate.hours}
                </td>
                <td className="px-4 py-3 text-right font-medium text-[#4a4a4a]">
                  {formatPHP(rate.weekday)}
                </td>
                <td
                  className="px-4 py-3 text-right font-medium"
                  style={{ color: "#c9a96e" }}
                >
                  {formatPHP(rate.weekend)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Additional pax note */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-[#ede8df] bg-[#faf8f5] px-4 py-3">
        <span
          className="text-[10px] text-[#8a8a7a]"
          style={{ fontFamily: "Jost, sans-serif" }}
        >
          <Info size={10} className="inline mr-1" />
          Max {pkg.maxAdditionalPax} additional pax:
          <strong className="text-[#4a4a4a] ml-1">
            Day {formatPHP(pkg.additionalPaxDay)}/head
          </strong>
          <strong className="text-[#4a4a4a] ml-2">
            Night/Overnight {formatPHP(pkg.additionalPaxNight)}/head
          </strong>
        </span>
      </div>
    </div>
  );
}

function PackageCard({
  pkg,
  onBook,
}: {
  pkg: RatePackage;
  onBook: (pkg: RatePackage) => void;
}) {
  const [open, setOpen] = useState(false);
  const color = TIER_COLORS[pkg.tier] ?? "#c9a96e";

  return (
    <div className="bg-white rounded-xl border border-[#ede8df] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: color }}
          />
          <div>
            <span
              className="text-[10px] font-medium tracking-widest uppercase px-2 py-0.5 rounded-full text-white"
              style={{ background: color, fontFamily: "Jost, sans-serif" }}
            >
              {TIER_LABELS[pkg.tier]}
            </span>
            <h3
              className="mt-1"
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "1.2rem",
                fontWeight: 400,
                color: "#1a1a1a",
              }}
            >
              {pkg.title}
            </h3>
            <p
              className="text-[11px] text-[#8a8a7a] mt-0.5"
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              <Users size={10} className="inline mr-1" />
              {pkg.subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <button
            onClick={() => onBook(pkg)}
            className="btn-gold text-[10px] py-2 px-4 hidden sm:flex"
          >
            Reserve
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="w-8 h-8 rounded-full border border-[#ede8df] flex items-center justify-center hover:border-[#c9a96e] transition-colors"
          >
            {open ? (
              <ChevronUp size={14} color="#8a8a7a" />
            ) : (
              <ChevronDown size={14} color="#8a8a7a" />
            )}
          </button>
        </div>
      </div>

      {/* Starting from */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4 sm:px-6">
        <span
          className="text-[10px] text-[#8a8a7a] uppercase tracking-wider"
          style={{ fontFamily: "Jost, sans-serif" }}
        >
          Starting from
        </span>
        <span
          style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: "1.3rem",
            color: "#c9a96e",
            fontWeight: 500,
          }}
        >
          {formatPHP(Math.min(...pkg.rates.map((r) => r.weekday)))}
        </span>
      </div>

      {/* Expandable table */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-[#ede8df]"
          >
            <div className="p-4">
              <RateTable pkg={pkg} />
              {pkg.notes.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1">
                  {pkg.notes.map((note) => (
                    <li
                      key={note}
                      className="flex items-start gap-2 text-[11px] text-[#8a8a7a]"
                      style={{ fontFamily: "Jost, sans-serif" }}
                    >
                      <Info
                        size={10}
                        className="mt-0.5 shrink-0"
                        color="#c9a96e"
                      />
                      {note}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="px-4 pb-4 sm:hidden">
              <button
                onClick={() => onBook(pkg)}
                className="btn-gold w-full justify-center"
              >
                Reserve This Package
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PropertyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeImage, setActiveImage] = useState(0);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [bookingPkg, setBookingPkg] = useState<RatePackage | null>(null);
  const [selectedQuickPkgTier, setSelectedQuickPkgTier] = useState<
    string | null
  >(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const property = slug ? PROPERTIES[slug] : null;
  const { getBestDiscount } = useActiveDiscounts();
  const badge = slug ? getBestDiscount(slug) : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);
  useEffect(() => {
    if (!property) return;
    setSelectedQuickPkgTier(property.packages[0]?.tier ?? null);
  }, [property]);

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f8f4ee]">
        <p
          style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: "1.5rem",
          }}
        >
          Property not found
        </p>
        <Link to="/" className="btn-gold">
          Back to Home
        </Link>
      </div>
    );
  }

  const allLocal = [property.coverImage, ...property.galleryImages];
  const allFallback = [
    COVER_FALLBACKS[slug!] ?? FALLBACK.poolHouseCover,
    ...(GALLERY_FALLBACKS[slug!] ?? FALLBACK.poolHouseGallery),
  ];
  const galleryPreview = property.galleryImages.slice(0, 5);
  const remainingGalleryCount =
    property.galleryImages.length - galleryPreview.length;
  const selectedQuickPkg =
    property.packages.find((pkg) => pkg.tier === selectedQuickPkgTier) ??
    property.packages[0];

  const selectGalleryImage = (imageIndex: number) => {
    setModalImageIndex(imageIndex);
    setActiveImage(imageIndex + 1);
  };

  const openGalleryModal = (imageIndex = 0) => {
    selectGalleryImage(imageIndex);
    setGalleryModalOpen(true);
  };

  useEffect(() => {
    if (!galleryModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setGalleryModalOpen(false);
      }

      if (property.galleryImages.length <= 1) return;

      if (event.key === "ArrowLeft") {
        setModalImageIndex((current) => {
          const next =
            (current - 1 + property.galleryImages.length) %
            property.galleryImages.length;
          setActiveImage(next + 1);
          return next;
        });
      }

      if (event.key === "ArrowRight") {
        setModalImageIndex((current) => {
          const next = (current + 1) % property.galleryImages.length;
          setActiveImage(next + 1);
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [galleryModalOpen, property.galleryImages.length]);

  const showPreviousGalleryImage = () => {
    if (property.galleryImages.length <= 1) return;

    setModalImageIndex((current) => {
      const next =
        (current - 1 + property.galleryImages.length) %
        property.galleryImages.length;
      setActiveImage(next + 1);
      return next;
    });
  };

  const showNextGalleryImage = () => {
    if (property.galleryImages.length <= 1) return;

    setModalImageIndex((current) => {
      const next = (current + 1) % property.galleryImages.length;
      setActiveImage(next + 1);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#f8f4ee]">
      {/* ── Sticky top nav ───────────────────────────── */}
      <div className="sticky top-0 z-40 border-b border-[#ede8df] bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:h-14 sm:gap-3 sm:px-5 lg:px-12">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-1.5 text-[10px] tracking-wider uppercase text-[#8a8a7a] transition-colors hover:text-[#1a1a1a] sm:gap-2 sm:text-xs"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            <ArrowLeft size={14} /> Back
          </Link>
          <span
            className="min-w-0 truncate text-center px-2"
            style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "clamp(0.98rem, 2vw, 1.1rem)",
              color: "#1a1a1a",
            }}
          >
            {property.name}
          </span>
          <button
            onClick={() => setBookingPkg(property.packages[0])}
            className="btn-gold shrink-0 px-3 py-2 text-[10px] sm:px-4 sm:text-xs"
          >
            <span className="hidden sm:inline">Book Now</span>
            <span className="sm:hidden">Book</span>
          </button>
        </div>
      </div>

      {/* ── Hero gallery ─────────────────────────────── */}
      <div className="relative h-[54svh] min-h-[420px] overflow-hidden sm:h-[55vh] lg:h-[68vh]">
        <ImgWithFallback
          local={allLocal[activeImage]}
          fallback={allFallback[activeImage] ?? allFallback[0]}
          alt={property.name}
          className="w-full h-full object-cover transition-opacity duration-500"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.45) 100%)",
          }}
        />

        {/* Tag badge + optional discount badge stacked */}
        <div className="absolute left-4 top-4 flex flex-col items-start gap-2 sm:left-5 sm:top-5">
          <span
            className="border border-white/30 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm sm:px-3 sm:text-[10px]"
            style={{
              background: "rgba(0,0,0,0.25)",
              fontFamily: "Jost, sans-serif",
            }}
          >
            {property.tagline}
          </span>
          {badge && <DiscountBadge discount={badge} />}
        </div>

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-7xl px-4 pb-5 sm:px-5 lg:px-12 lg:pb-8">
            {allLocal.length > 1 && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1 sm:mb-5">
                {allLocal.map((localSrc, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`relative h-11 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-300 sm:h-12 sm:w-16
                      ${
                        i === activeImage
                          ? "border-[#c9a96e] shadow-[0_0_0_1px_rgba(201,169,110,0.45)]"
                          : "border-white/35 hover:border-white/80"
                      }`}
                  >
                    <ImgWithFallback
                      local={localSrc}
                      fallback={allFallback[i] ?? allFallback[0]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div
                      className={`absolute inset-0 transition-colors ${
                        i === activeImage ? "bg-transparent" : "bg-black/20"
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Hero title overlay */}
            <div>
              <h1
                className="text-white"
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  fontSize: "clamp(2rem,5vw,3.2rem)",
                  fontWeight: 300,
                  lineHeight: 1.1,
                }}
              >
                {property.name}
              </h1>
              <div
                className="mt-2 flex flex-col items-start gap-2 text-xs text-white/60 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4"
                style={{ fontFamily: "Jost, sans-serif" }}
              >
                <span className="flex items-center gap-1.5">
                  <Users size={12} />
                  Up to {property.maxGuests} guests
                </span>
                <span className="flex items-center gap-1.5">
                  <Car size={12} />
                  Max {property.maxCars} cars
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={12} />
                  {property.location}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-12 lg:px-12 lg:py-14">
        <motion.div
          className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10"
          variants={containerVariant}
          initial="hidden"
          animate="visible"
        >
          {/* LEFT: main content */}
          <motion.div
            className="lg:col-span-2 flex flex-col gap-12"
            variants={fadeUpVariant}
            custom={0}
          >
            {/* Description */}
            <div>
              <p className="section-label mb-3">About</p>
              <p
                className="text-[#4a4a4a] text-sm leading-relaxed"
                style={{
                  fontFamily: "Jost, sans-serif",
                  fontWeight: 300,
                  lineHeight: 1.9,
                }}
              >
                {property.description}
              </p>
            </div>

            {/* Location */}
            <div>
              <p className="section-label mb-2">Our Location</p>
              <h2
                className="mb-2"
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  fontSize: "clamp(1.5rem,3vw,2rem)",
                  fontWeight: 400,
                  color: "#1a1a1a",
                }}
              >
                Find{" "}
                <span style={{ color: "#c9a96e", fontStyle: "italic" }}>
                  {property.name}
                </span>
              </h2>
              <p
                className="mb-5 flex items-start gap-2 text-sm leading-relaxed text-[#4a4a4a]"
                style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
              >
                <MapPin size={15} color="#c9a96e" className="mt-1 shrink-0" />
                <span>{property.location}</span>
              </p>
              <p
                className="mb-6 max-w-2xl text-sm leading-relaxed text-[#8a8a7a]"
                style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
              >
                {property.locationDescription}
              </p>

              <div className="overflow-hidden rounded-[24px] border border-[#ede8df] bg-white shadow-sm">
                <iframe
                  title={`${property.name} location map`}
                  src={getGoogleMapsEmbedUrl(property.location)}
                  className="h-[320px] w-full border-0 sm:h-[420px]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </div>

            {/* Amenities */}
            <div>
              <p className="section-label mb-4">Amenities & Features</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {property.amenities.map((group) => {
                  const Icon = AMENITY_ICONS[group.group] ?? Wifi;
                  return (
                    <div
                      key={group.group}
                      className="bg-white rounded-xl border border-[#ede8df] p-5"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(201,169,110,0.1)" }}>
                          <Icon size={14} color="#c9a96e" strokeWidth={1.5} />
                        </div>
                        <p
                          className="text-xs font-semibold text-[#1a1a1a] tracking-wide uppercase"
                          style={{ fontFamily: "Jost, sans-serif" }}
                        >
                          {group.group}
                        </p>
                      </div>
                      {group.items.length > 0 && (
                        <ul className="flex flex-col gap-1.5">
                          {group.items.map((item) => (
                            <li
                              key={item}
                              className="text-[11px] text-[#8a8a7a] flex items-start gap-1.5"
                              style={{ fontFamily: "Jost, sans-serif" }}
                            >
                              <span
                                className="mt-[5px] w-1 h-1 rounded-full shrink-0"
                                style={{ background: "#c9a96e" }}
                              />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                      {group.subGroups && (
                        <div className="flex flex-col gap-4">
                          {group.subGroups.map((sub) => (
                            <div key={sub.label}>
                              <p
                                className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                                style={{ fontFamily: "Jost, sans-serif", color: "#c9a96e" }}
                              >
                                {sub.label}
                              </p>
                              <ul className="flex flex-col gap-1.5">
                                {sub.items.map((item) => (
                                  <li
                                    key={item}
                                    className="text-[11px] text-[#8a8a7a] flex items-start gap-1.5"
                                    style={{ fontFamily: "Jost, sans-serif" }}
                                  >
                                    <span
                                      className="mt-[5px] w-1 h-1 rounded-full shrink-0"
                                      style={{ background: "#c9a96e" }}
                                    />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rate packages */}
            <div>
              <p className="section-label mb-2">Rates & Packages</p>
              <h2
                className="mb-2"
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  fontSize: "clamp(1.5rem,3vw,2rem)",
                  fontWeight: 400,
                  color: "#1a1a1a",
                }}
              >
                Choose Your{" "}
                <span style={{ color: "#c9a96e", fontStyle: "italic" }}>
                  Package
                </span>
              </h2>
              <p
                className="text-xs text-[#8a8a7a] mb-6"
                style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
              >
                Weekday: Sun–Thu Night &nbsp;·&nbsp; Weekend: Thu–Sun Night
                &nbsp;·&nbsp; Auto weekend rate Dec 1–Jan 2
              </p>
              <div className="flex flex-col gap-4">
                {property.packages.map((pkg) => (
                  <PackageCard
                    key={pkg.tier}
                    pkg={pkg}
                    onBook={setBookingPkg}
                  />
                ))}
              </div>
            </div>

            {/* House Rules */}
            <div>
              <button
                onClick={() => setRulesOpen(!rulesOpen)}
                className="w-full flex items-center justify-between px-6 py-4 bg-[#1a1a1a] rounded-t-xl text-left"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck size={16} color="#c9a96e" strokeWidth={1.5} />
                  <span
                    className="text-white text-sm font-medium"
                    style={{
                      fontFamily: "Jost, sans-serif",
                      letterSpacing: "0.05em",
                    }}
                  >
                    House Rules & Policies
                  </span>
                </div>
                {rulesOpen ? (
                  <ChevronUp size={16} color="#8a8a7a" />
                ) : (
                  <ChevronDown size={16} color="#8a8a7a" />
                )}
              </button>
              <AnimatePresence>
                {rulesOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden bg-[#242424] rounded-b-xl"
                  >
                    <div className="px-6 py-5">
                      <ul className="flex flex-col gap-3">
                        {property.houseRules.map((rule, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span
                              className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: "#c9a96e" }}
                            />
                            <span
                              className="text-white/65 text-xs leading-relaxed"
                              style={{
                                fontFamily: "Jost, sans-serif",
                                fontWeight: 300,
                              }}
                            >
                              {rule}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {property.policies.map((policy, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Info
                              size={11}
                              color="#c9a96e"
                              className="mt-0.5 shrink-0"
                            />
                            <span
                              className="text-[#c9a96e] text-[11px]"
                              style={{ fontFamily: "Jost, sans-serif" }}
                            >
                              {policy}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Gallery grid */}
            {property.galleryImages.length > 0 && (
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="section-label">Gallery</p>
                  <button
                    onClick={() => openGalleryModal(0)}
                    className="text-[11px] uppercase tracking-[0.18em] text-[#8a8a7a] transition-colors hover:text-[#1a1a1a]"
                    style={{ fontFamily: "Jost, sans-serif" }}
                  >
                    View More
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {galleryPreview.map((localSrc, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        selectGalleryImage(i);
                        openGalleryModal(i);
                      }}
                      className="overflow-hidden rounded-lg aspect-[4/3] group border border-[#d9d0c2] bg-white shadow-[0_0_0_1px_rgba(237,232,223,0.65)]"
                    >
                      <ImgWithFallback
                        local={localSrc}
                        fallback={
                          (GALLERY_FALLBACKS[slug!] ??
                            FALLBACK.poolHouseGallery)[i] ??
                          FALLBACK.poolHouseGallery[0]
                        }
                        alt={`${property.name} ${i + 1}`}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </button>
                  ))}
                  {remainingGalleryCount > 0 && (
                    <button
                      onClick={() => openGalleryModal(galleryPreview.length)}
                      className="relative overflow-hidden rounded-lg aspect-[4/3] border border-[#d9d0c2] bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(237,232,223,0.65)]"
                    >
                      <ImgWithFallback
                        local={property.galleryImages[galleryPreview.length]}
                        fallback={
                          (GALLERY_FALLBACKS[slug!] ??
                            FALLBACK.poolHouseGallery)[galleryPreview.length] ??
                          FALLBACK.poolHouseGallery[0]
                        }
                        alt={`${property.name} more photos`}
                        className="w-full h-full object-cover opacity-45"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 px-4 text-center">
                        <span
                          className="text-white"
                          style={{
                            fontFamily: "Cormorant Garamond, serif",
                            fontSize: "1.8rem",
                            fontWeight: 500,
                          }}
                        >
                          +{remainingGalleryCount}
                        </span>
                        <span
                          className="mt-1 text-[10px] uppercase tracking-[0.24em] text-white/75"
                          style={{ fontFamily: "Jost, sans-serif" }}
                        >
                          View More
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* RIGHT: sticky booking card */}
          <motion.div variants={fadeUpVariant} custom={1}>
            <div className="rounded-xl border border-[#ede8df] bg-white overflow-hidden shadow-sm lg:sticky lg:top-20">
              <div className="px-6 py-5 border-b border-[#ede8df]">
                <p className="section-label mb-2">Quick Rates</p>
                <div className="flex flex-col gap-3">
                  {property.packages.map((pkg) => (
                    <label
                      key={pkg.tier}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
                        selectedQuickPkg?.tier === pkg.tier
                          ? "border-[#c9a96e] bg-[#fbf8f3]"
                          : "border-transparent hover:border-[#ede8df]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="quick-rate-package"
                        value={pkg.tier}
                        checked={selectedQuickPkg?.tier === pkg.tier}
                        onChange={() => setSelectedQuickPkgTier(pkg.tier)}
                        className="mt-1 h-4 w-4 accent-[#c9a96e]"
                      />
                      <div className="flex flex-1 items-center justify-between gap-3">
                        <div>
                          <p
                            className="text-xs font-medium text-[#1a1a1a]"
                            style={{ fontFamily: "Jost, sans-serif" }}
                          >
                            {pkg.title}
                          </p>
                          <p
                            className="text-[10px] text-[#8a8a7a]"
                            style={{ fontFamily: "Jost, sans-serif" }}
                          >
                            Up to {pkg.maxPax} pax
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            style={{
                              fontFamily: "Cormorant Garamond, serif",
                              fontSize: "1rem",
                              fontWeight: 500,
                              color: "#c9a96e",
                            }}
                          >
                            {formatPHP(
                              Math.min(...pkg.rates.map((r) => r.weekday)),
                            )}
                          </span>
                          <p
                            className="text-[9px] text-[#8a8a7a]"
                            style={{ fontFamily: "Jost, sans-serif" }}
                          >
                            starting from
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <button
                  onClick={() => setBookingPkg(selectedQuickPkg)}
                  className="btn-gold w-full justify-center"
                >
                  Reserve {selectedQuickPkg?.title ?? "Now"}
                </button>
                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <Info
                      size={11}
                      color="#c9a96e"
                      className="mt-0.5 shrink-0"
                    />
                    <p
                      className="text-[10px] text-[#8a8a7a]"
                      style={{ fontFamily: "Jost, sans-serif" }}
                    >
                      50% down payment required to confirm booking
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info
                      size={11}
                      color="#c9a96e"
                      className="mt-0.5 shrink-0"
                    />
                    <p
                      className="text-[10px] text-[#8a8a7a]"
                      style={{ fontFamily: "Jost, sans-serif" }}
                    >
                      Down payment is non-refundable
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Booking Form Modal */}
      {bookingPkg && (
        <BookingFormModal
          property={property}
          initialPackage={bookingPkg}
          open={!!bookingPkg}
          onClose={() => setBookingPkg(null)}
        />
      )}

      {/* Gallery Modal */}
      <AnimatePresence>
        {galleryModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 bg-[#050505]"
            onClick={() => setGalleryModalOpen(false)}
          >
            <div className="flex h-[100svh] w-full flex-col">
              {/* Minimal Header */}
              <div className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-8 sm:py-6 lg:px-10">
                <div className="flex items-center gap-4">
                  <h2
                    className="text-white"
                    style={{
                      fontFamily: "Cormorant Garamond, serif",
                      fontSize: "clamp(1.4rem, 2vw, 1.8rem)",
                      fontWeight: 300,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {property.name}
                  </h2>
                  <div className="hidden h-4 w-[1px] bg-white/20 sm:block" />
                  <span
                    className="hidden text-[10px] uppercase tracking-[0.2em] text-[#8a8a7a] sm:inline"
                    style={{ fontFamily: "Jost, sans-serif" }}
                  >
                    Image {modalImageIndex + 1} of {property.galleryImages.length}
                  </span>
                </div>
                <button
                  onClick={() => setGalleryModalOpen(false)}
                  className="group flex h-10 w-10 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close gallery"
                >
                  <X size={20} strokeWidth={1} />
                </button>
              </div>

              {/* Minimal Content */}
              <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 pt-0 lg:flex-row lg:gap-6 lg:p-6 lg:pt-0">
                {/* Main Image */}
                <div className="relative flex min-h-0 flex-1 items-center justify-center rounded-sm bg-black/40">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${property.slug}-${modalImageIndex}`}
                      initial={{ opacity: 0, filter: "blur(4px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, filter: "blur(4px)" }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      className="h-full w-full"
                    >
                      <ImgWithFallback
                        local={property.galleryImages[modalImageIndex]}
                        fallback={
                          (GALLERY_FALLBACKS[slug!] ?? FALLBACK.poolHouseGallery)[
                            modalImageIndex
                          ] ?? FALLBACK.poolHouseGallery[0]
                        }
                        alt={`${property.name} ${modalImageIndex + 1}`}
                        className="h-full w-full object-contain"
                      />
                    </motion.div>
                  </AnimatePresence>

                  {property.galleryImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showPreviousGalleryImage();
                        }}
                        className="absolute left-2 flex h-12 w-12 items-center justify-center text-white/50 opacity-0 transition-all duration-300 hover:text-white focus:opacity-100 lg:group-hover:opacity-100 sm:left-4"
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={28} strokeWidth={1} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showNextGalleryImage();
                        }}
                        className="absolute right-2 flex h-12 w-12 items-center justify-center text-white/50 opacity-0 transition-all duration-300 hover:text-white focus:opacity-100 lg:group-hover:opacity-100 sm:right-4"
                        aria-label="Next image"
                      >
                        <ChevronRight size={28} strokeWidth={1} />
                      </button>
                    </>
                  )}
                  {/* Mobile Counter */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:hidden">
                    <span
                      className="rounded-full bg-black/40 px-3 py-1 text-[10px] uppercase tracking-widest text-white/70 backdrop-blur-md"
                      style={{ fontFamily: "Jost, sans-serif" }}
                    >
                      {modalImageIndex + 1} / {property.galleryImages.length}
                    </span>
                  </div>
                </div>

                {/* Thumbnails */}
                <div className="flex h-[15vh] min-h-[80px] shrink-0 flex-col overflow-hidden sm:h-[18vh] lg:h-full lg:w-[220px] xl:w-[260px]">
                  <div className="flex h-full gap-2 overflow-x-auto overflow-y-hidden lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                    {property.galleryImages.map((localSrc, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectGalleryImage(i);
                        }}
                        className={`relative shrink-0 aspect-[4/3] rounded-sm transition-all duration-500 w-[120px] sm:w-[160px] lg:w-full lg:h-auto ${
                          i === modalImageIndex
                            ? "opacity-100 ring-1 ring-white/50 ring-offset-2 ring-offset-[#050505]"
                            : "opacity-30 hover:opacity-100"
                        }`}
                      >
                        <ImgWithFallback
                          local={localSrc}
                          fallback={
                            (GALLERY_FALLBACKS[slug!] ?? FALLBACK.poolHouseGallery)[
                              i
                            ] ?? FALLBACK.poolHouseGallery[0]
                          }
                          alt={`${property.name} thumbnail ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
