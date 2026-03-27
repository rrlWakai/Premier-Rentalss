import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { ImgWithFallback } from "../lib/useImage";
import { HERO_BG, FALLBACK } from "../lib/images";

export default function Hero() {
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
    <section id="home" className="relative flex min-h-[100svh] flex-col py-0">
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="h-full w-full"
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

      <div className="relative flex flex-1 items-center">
        <div className="mx-auto flex w-full max-w-7xl px-4 pb-24 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:px-12 lg:pt-36">
          <motion.div
            className="mx-auto flex w-full max-w-4xl flex-col items-center gap-5 text-center"
            variants={container}
            initial="hidden"
            animate="visible"
          >
            <motion.p
              variants={item}
              className="section-label"
              style={{ color: "#d4b97f" }}
            >
              Private City Stays
            </motion.p>

            <motion.h1
              variants={item}
              className="text-white"
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "clamp(3.25rem, 9vw, 7.25rem)",
                fontWeight: 300,
                lineHeight: 0.94,
              }}
            >
              Premier
              <br />
              <span style={{ color: "#c9a96e", fontStyle: "italic" }}>
                Rentals
              </span>
            </motion.h1>

            <motion.div
              variants={item}
              className="mt-2 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center"
            >
              <a
                href="#retreats"
                className="btn-gold w-full justify-center sm:w-auto sm:min-w-[210px]"
              >
                Explore Properties
              </a>
              <a
                href="#about"
                className="btn-outline-gold w-full justify-center border-white/40 text-white hover:bg-white hover:text-[#1a1a1a] sm:w-auto sm:min-w-[180px]"
              >
                Learn More
              </a>
            </motion.div>
          </motion.div>
        </div>
      </div>

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
