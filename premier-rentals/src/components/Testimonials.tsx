import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { fetchTestimonials, type Testimonial } from "../lib/supabase";
import { containerVariant, fadeUpVariant } from "../lib/animations";

const FALLBACK: Testimonial[] = [
  {
    id: "1",
    name: "James & Clara",
    location: "London, UK",
    rating: 5,
    created_at: "",
    review:
      "Premier Rentals redefined what a vacation could be. The staff anticipated our every need before we even voiced it. Absolute perfection from start to finish.",
  },
  {
    id: "2",
    name: "Lucia Montero",
    location: "Madrid, Spain",
    rating: 5,
    created_at: "",
    review:
      "An extraordinary escape. The villa was impeccably designed, and the private chef created the most memorable meals of our lives. We will return without question.",
  },
  {
    id: "3",
    name: "Marcus & Priya",
    location: "New York, USA",
    rating: 5,
    created_at: "",
    review:
      "Beyond five stars. Premier delivered a level of luxury and personalization we didn't think possible. Our honeymoon was absolutely flawless.",
  },
];

export default function Testimonials() {
  const [reviews, setReviews] = useState<Testimonial[]>(FALLBACK);

  useEffect(() => {
    fetchTestimonials().then((data) => {
      if (data.length > 0) setReviews(data);
    });
  }, []);

  return (
    <section className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        <motion.div
          className="mb-10 text-center sm:mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="section-label mb-3">Guest Stories</p>
          <h2
            style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 400,
              lineHeight: 1.1,
              color: "#1a1a1a",
            }}
          >
            What Our{" "}
            <span style={{ color: "#c9a96e", fontStyle: "italic" }}>
              Guests
            </span>{" "}
            Say
          </h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-6 md:grid-cols-3"
          variants={containerVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {reviews.map((review, i) => (
            <motion.div
              key={review.id}
              variants={fadeUpVariant}
              custom={i}
              className="flex flex-col gap-4 bg-[#f8f4ee] p-5 sm:p-8"
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
            >
              <div className="flex gap-1">
                {Array.from({ length: review.rating }).map((_, j) => (
                  <Star key={j} size={12} fill="#c9a96e" color="#c9a96e" />
                ))}
              </div>
              <p
                className="text-[#4a4a4a] leading-relaxed flex-1"
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  fontStyle: "italic",
                  fontWeight: 400,
                  fontSize: "1.05rem",
                }}
              >
                "{review.review}"
              </p>
              <div className="pt-3 border-t border-[#ede8df]">
                <p
                  className="text-[#1a1a1a] text-sm font-medium"
                  style={{ fontFamily: "Jost, sans-serif" }}
                >
                  {review.name}
                </p>
                <p
                  className="text-[#8a8a7a] text-xs tracking-wider mt-0.5"
                  style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
                >
                  {review.location}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
