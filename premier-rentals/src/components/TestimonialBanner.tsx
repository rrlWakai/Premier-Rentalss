import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { ImgWithFallback } from "../lib/useImage";
import { TESTIMONIAL_BG, FALLBACK } from "../lib/images";

interface BannerReview {
  id: string;
  quote: string;
  author: string;
}

const REVIEWS: BannerReview[] = [
  {
    id: "1",
    quote:
      "Highly recommended po. Maganda at Malinis ang Lugar at mabait yun caretaker. Within Metro Manila pa kaya Sulit oras. For Family, Officemate and Friends ang Premier Patio, Pwede rin sya sa mga Events.😁",
    author: "Aldrin",
  },
  {
    id: "2",
    quote:
      "My Family and I enjoyed our staycation.. I was impressed by the place..picture perfect tlaga kahit saang angulo.. plus super accomodating ng owner and ng caretaker.. hopefully mamentain ung cleanliness.. this place is highly recommended.. will definitely be back here with my friends naman.. \nThank you Premier Patio" ,
     
    author: "Khristine",
  },
];

const SLIDE_INTERVAL = 5000;

const slideVariants = {
  enter: (d: number) => ({
    x: d > 0 ? "40%" : "-40%",
    opacity: 0,
    filter: "blur(5px)",
  }),
  center: {
    x: "0%",
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: (d: number) => ({
    x: d > 0 ? "-40%" : "40%",
    opacity: 0,
    filter: "blur(5px)",
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function TestimonialBanner() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);

  // Auto-advance every 5 s; pauses on hover
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setDirection(1);
      setCurrent((c) => (c + 1) % REVIEWS.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, [paused]);

  function navigate(dir: 1 | -1) {
    setDirection(dir);
    setCurrent((c) => (c + REVIEWS.length + dir) % REVIEWS.length);
  }

  function goTo(index: number) {
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  }

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden py-32"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Parallax background ── */}
      <motion.div
        style={{ y: bgY }}
        className="pointer-events-none absolute -bottom-[12%] -top-[12%] inset-x-0"
        aria-hidden
      >
        <ImgWithFallback
          local={TESTIMONIAL_BG}
          fallback={FALLBACK.resort}
          alt=""
          className="h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: "rgba(10,10,10,0.72)" }}
        />
      </motion.div>

      {/* ── Content ── */}
      <div className="relative max-w-3xl mx-auto px-6 text-center">
        {/* Prev / Next */}
        <button
          onClick={() => navigate(-1)}
          aria-label="Previous review"
          className="absolute left-0 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/50 transition-all duration-200 hover:border-white/50 hover:text-white"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => navigate(1)}
          aria-label="Next review"
          className="absolute right-0 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/50 transition-all duration-200 hover:border-white/50 hover:text-white"
        >
          <ChevronRight size={16} />
        </button>

        {/* Slide */}
        <div className="overflow-hidden px-10">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <div
                className="mb-4 text-[#c9a96e] text-5xl leading-none select-none"
                style={{ fontFamily: "Georgia, serif" }}
              >
                "
              </div>
              <p className="testimonial-quote mb-8">
                {REVIEWS[current].quote}
              </p>
              <div className="divider-gold mx-auto mb-4" />
              <p
                className="text-white/50 text-xs tracking-widest uppercase"
                style={{ fontFamily: "Jost, sans-serif" }}
              >
                &mdash; {REVIEWS[current].author}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dot indicators */}
        <div className="mt-10 flex items-center justify-center gap-2">
          {REVIEWS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to review ${i + 1}`}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === current
                  ? "w-6 bg-[#c9a96e]"
                  : "w-1.5 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
