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