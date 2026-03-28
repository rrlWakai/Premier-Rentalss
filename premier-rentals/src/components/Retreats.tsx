import { useState } from "react";
import { ArrowRight, Users, Car } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  POOL_HOUSE_DATA,
  PATIO_DATA,
  formatPHP,
  getStartingPrice,
  type PropertyData,
  type RatePackage,
} from "../lib/propertyData";
import { ImgWithFallback } from "../lib/useImage";
import { POOL_HOUSE, PATIO, FALLBACK } from "../lib/images";
import { containerVariant, fadeUpVariant } from "../lib/animations";
import BookingFormModal from "./BookingFormModal";

const PROPERTIES: { data: PropertyData; local: string; fallback: string }[] = [
  {
    data: POOL_HOUSE_DATA,
    local: POOL_HOUSE.cover,
    fallback: FALLBACK.poolHouseCover,
  },
  { data: PATIO_DATA, local: PATIO.cover, fallback: FALLBACK.patioCover },
];

export default function Retreats() {
  const [bookingState, setBookingState] = useState<{
    property: PropertyData;
    pkg: RatePackage;
  } | null>(null);

  return (
    <section id="retreats" className="bg-[#f8f4ee] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="section-label mb-3">Our Properties</p>
            <h2
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 400,
                lineHeight: 1.1,
                color: "#1a1a1a",
              }}
            >
              Exclusive{" "}
              <span style={{ color: "#c9a96e", fontStyle: "italic" }}>
                Rentals
              </span>
            </h2>
          </motion.div>
        </div>

        {/* Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={containerVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {PROPERTIES.map(({ data, local, fallback }, i) => (
            <motion.div
              key={data.slug}
              variants={fadeUpVariant}
              custom={i}
              className="retreat-card group cursor-pointer"
            >
              <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[4/3]">
                <ImgWithFallback
                  local={local}
                  fallback={fallback}
                  alt={data.name}
                  className="w-full h-full object-cover"
                />
                <div className="retreat-card-overlay absolute inset-0" />

                {/* Tag */}
                <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
                  <span
                    className="border border-white/30 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm sm:px-3 sm:text-[10px]"
                    style={{
                      background: "rgba(0,0,0,0.25)",
                      fontFamily: "Jost, sans-serif",
                    }}
                  >
                    {data.tagline}
                  </span>
                </div>

                {/* Package count badge */}
                <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
                  <span
                    className="rounded-full px-2.5 py-1 text-[9px] tracking-wider text-white/80 sm:text-[10px]"
                    style={{
                      background: "rgba(0,0,0,0.35)",
                      fontFamily: "Jost, sans-serif",
                    }}
                  >
                    {data.packages.length} Packages
                  </span>
                </div>

                {/* Bottom overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                  <h3
                    className="mb-1 text-white"
                    style={{
                      fontFamily: "Cormorant Garamond, serif",
                      fontSize: "clamp(1.3rem, 3vw, 1.5rem)",
                      fontWeight: 400,
                    }}
                  >
                    {data.name}
                  </h3>

                  {/* Capacity row */}
                  <div
                    className="mb-4 flex flex-col gap-2 text-[10px] text-white/50 sm:flex-row sm:items-center sm:gap-4"
                    style={{ fontFamily: "Jost, sans-serif" }}
                  >
                    <span className="flex items-center gap-1.5">
                      <Users size={11} />
                      Up to {data.maxGuests} guests
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Car size={11} />
                      Max {data.maxCars} cars
                    </span>
                  </div>

                  {/* Starting price */}
                  <div className="mb-4 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <span
                      className="text-[10px] text-white/40 uppercase tracking-wider"
                      style={{ fontFamily: "Jost, sans-serif" }}
                    >
                      Starting from
                    </span>
                    <span
                      style={{
                        fontFamily: "Cormorant Garamond, serif",
                        fontSize: "1.2rem",
                        color: "#c9a96e",
                        fontWeight: 500,
                      }}
                    >
                      {formatPHP(getStartingPrice(data))}
                    </span>
                  </div>

                  {/* Action buttons stay visible on touch devices and animate on larger screens */}
                  <div className="flex flex-col gap-2 opacity-100 transition-opacity duration-300 sm:flex-row sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      onClick={() =>
                        setBookingState({
                          property: data,
                          pkg: data.packages[0],
                        })
                      }
                      className="btn-gold px-4 py-2 text-[10px] w-full sm:w-auto"
                    >
                      Book Now
                    </button>
                    <Link
                      to={`/property/${data.slug}`}
                      className="flex w-full items-center justify-center gap-1.5 border border-white/30 bg-white/10 px-4 py-2 text-[10px] text-white transition-all hover:bg-white hover:text-[#1a1a1a] sm:w-auto"
                      style={{
                        fontFamily: "Jost, sans-serif",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      View Details <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Booking Modal */}
      {bookingState && (
        <BookingFormModal
          property={bookingState.property}
          initialPackage={bookingState.pkg}
          open={!!bookingState}
          onClose={() => setBookingState(null)}
        />
      )}
    </section>
  );
}
