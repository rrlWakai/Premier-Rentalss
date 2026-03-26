import { motion } from "framer-motion";
import { ImgWithFallback } from "../lib/useImage";
import { TESTIMONIAL_BG, FALLBACK } from "../lib/images";

export default function TestimonialBanner() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute inset-0">
        <motion.div
          className="w-full h-full"
          initial={{ scale: 1.06 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <ImgWithFallback
            local={TESTIMONIAL_BG}
            fallback={FALLBACK.resort}
            alt="Resort ambiance"
            className="w-full h-full object-cover"
          />
        </motion.div>
        <div
          className="absolute inset-0"
          style={{ background: "rgba(10,10,10,0.72)" }}
        />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div
            className="mb-4 text-[#c9a96e] text-5xl leading-none select-none"
            style={{ fontFamily: "Georgia, serif" }}
          >
            "
          </div>
          <p className="testimonial-quote mb-8">
            Highly recommended po. Maganda at Malinis ang Lugar at mabait yun
            caretaker.
            <br className="hidden sm:block" />
            Within Metro Manila pa kaya Sulit oras.
            <br className="hidden sm:block" />
            For Family, Officemate and Friends ang Premier Patio, Pwede rin sya
            sa mga Events.😁
          </p>
          <div className="divider-gold mx-auto mb-4" />
          <p
            className="text-white/50 text-xs tracking-widest uppercase"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            &mdash; Aldrin
          </p>
        </motion.div>
      </div>
    </section>
  );
}
