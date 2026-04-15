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

      <section id="home">
        <Hero />
      </section>

      <section id="stats">
        <Stats />
      </section>

      <section id="retreats">
        <Retreats />
      </section>

      <section id="about">
        <MoreThanStay />
      </section>

      <section id="amenities">
        <Amenities />
      </section>

      <section id="gallery">
        <Gallery />
      </section>

      <section id="testimonials">
        <TestimonialBanner />
      </section>

      <section id="contact">
        <Contact />
      </section>

      <Footer />
    </div>
  );
}