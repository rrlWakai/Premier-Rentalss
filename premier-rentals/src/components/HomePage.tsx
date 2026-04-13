import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "./Navbar";
import Hero from "./Hero";
import Stats from "./Stats";
import Retreats from "./Retreats";
import MoreThanStay from "./MoreThanStay";
import Amenities from "./Amenities";
import TestimonialBanner from "./TestimonialBanner";
import Gallery from "./Gallery";
import Contact from "./Contact";
import Footer from "./Footer";
import VideoSplash from "./VideoSplash";

export default function HomePage() {
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(() => {
    // Only show the splash screen once per session
    return !sessionStorage.getItem("splashPlayed");
  });

  const handleSplashComplete = () => {
    setShowSplash(false);
    sessionStorage.setItem("splashPlayed", "true");
  };

  // Smooth scroll to hash on mount (e.g. /#retreats)
  useEffect(() => {
    if (!showSplash) {
      if (location.hash) {
        const el = document.querySelector(location.hash);
        if (el) {
          setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
        }
      } else {
        window.scrollTo(0, 0);
      }
    }
  }, [location, showSplash]);

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <VideoSplash key="splash" onComplete={handleSplashComplete} />
      ) : (
        <motion.div
          key="main"
          className="min-h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
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
      )}
    </AnimatePresence>
  );
}
