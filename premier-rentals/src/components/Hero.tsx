import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ImgWithFallback } from "../lib/useImage";
import { HERO_BG, FALLBACK } from "../lib/images";

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Background moves at ~30 % of scroll speed — creates depth against the content
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  // Text drifts upward slightly and fades as you scroll away
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } },
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  return (
    <section
      ref={sectionRef}
      id="home"
      className="hero-section relative flex min-h-[100svh] flex-col overflow-hidden py-0"
    >
      {/* ── Parallax background ── */}
      <div className="absolute inset-0">
        {/*
          Extend the image 20 % above and below so the parallax shift (max ~30 %
          of this div's height) never exposes a gap at the edges.
          overflow-hidden on the section clips the overflow cleanly.
        */}
        <motion.div
          className="absolute inset-x-0 -top-[20%] -bottom-[20%]"
          style={{ y: bgY }}
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: "easeOut" }}
        >
          <ImgWithFallback
            local={HERO_BG}
            fallback={FALLBACK.heroBg}
            alt="Premier Rentals city stay"
            className="h-full w-full object-cover object-center"
          />
        </motion.div>
        <div className="hero-overlay absolute inset-0" />
      </div>

      {/* ── Content (drifts up + fades on scroll) ── */}
      <motion.div
        className="relative flex flex-1 items-center justify-center"
        style={{ y: textY, opacity: textOpacity }}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-center px-4 pb-16 pt-24 sm:px-6 sm:pb-16 sm:pt-28 lg:px-12 lg:pb-20 lg:pt-32">
          <motion.div
            className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center sm:gap-7"
            variants={container}
            initial="hidden"
            animate="visible"
          >
            <motion.p
              variants={item}
              className="section-label"
              style={{ color: "#d4b97f" }}
            >
              PRIVATE CITY STAYS
            </motion.p>

            <motion.h1
              variants={item}
              className="text-white"
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "clamp(3.25rem, 8vw, 6.5rem)",
                fontWeight: 300,
                lineHeight: 0.96,
              }}
            >
              Premier Rentals
            </motion.h1>

            <motion.p
              variants={item}
              className="max-w-2xl text-sm leading-relaxed text-white/72 sm:text-base"
              style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
            >
              Your private space in the city designed for comfort, convenience,
              and memorable moments.
            </motion.p>

            <motion.div
              variants={item}
              className="mt-1 flex w-full max-w-sm flex-col items-center sm:max-w-md"
            >
              <a
                href="#retreats"
                className="btn-gold w-full justify-center px-6 py-4 text-xs sm:min-w-[240px]"
              >
                Check Availability
              </a>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      <motion.a
        href="#stats"
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30 transition-colors hover:text-white/60 sm:bottom-8"
        animate={{ y: [0, 6, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <ChevronDown size={20} />
      </motion.a>
    </section>
  );
}
