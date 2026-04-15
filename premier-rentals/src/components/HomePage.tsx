import { useEffect } from "react";
import { useLocation } from "react-router-dom";

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

export default function HomePage() {
  const location = useLocation();

  useEffect(() => {
    const scrollToHash = () => {
      if (location.hash) {
        const el = document.querySelector(location.hash);

        if (el) {
          const navbarOffset = 80; // adjust based on your navbar height
          const elementTop =
            el.getBoundingClientRect().top + window.scrollY;

          const offsetPosition = elementTop - navbarOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
        }
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    // Ensures DOM is ready before scrolling
    requestAnimationFrame(scrollToHash);
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Stats />
      <Retreats />
      <MoreThanStay />
      <Amenities />
      <Gallery />
      <TestimonialBanner />
      <Contact />
      <Footer />
    </div>
  );
}