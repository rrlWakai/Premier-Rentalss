import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "./Navbar";
import Hero from "./Hero";
import Stats from "./Stats";
import Retreats from "./Retreats";
import MoreThanStay from "./MoreThanStay";
import Amenities from "./Amenities";
import TestimonialBanner from "./TestimonialBanner";
import Gallery from "./Gallery";
import Testimonials from "./Testimonials";
import Contact from "./Contact";
import Footer from "./Footer";

export default function HomePage() {
  const location = useLocation();

  // Smooth scroll to hash on mount (e.g. /#retreats)
  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  return (
    <motion.div
      className="min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Navbar />
      <Hero />
      <Stats />
      <Retreats />
      <MoreThanStay />
      <Amenities />
      <Gallery />
      {/* <Testimonials /> */}
      <TestimonialBanner />
      <Contact />
      <Footer />
    </motion.div>
  );
}
