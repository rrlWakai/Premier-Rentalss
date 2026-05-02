import { useState, useEffect } from "react";
import { fetchRetreats, type Retreat } from "../lib/supabase";
import ClientCalendarView from "./ClientCalendarView";

export default function AvailabilitySection() {
  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [selectedRetreatId, setSelectedRetreatId] = useState("");

  useEffect(() => {
    const loadRetreats = async () => {
      const data = await fetchRetreats();
      setRetreats(data);
      if (data.length > 0 && !selectedRetreatId) {
        setSelectedRetreatId(data[0].id);
      }
    };

    loadRetreats();
  }, [selectedRetreatId]);

  const handleBookDate = (_date: Date, _retreatId: string) => {
    // Scroll to booking form and pre-fill the selected date
    const bookingSection = document.querySelector("#booking-form");
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: "smooth" });
      // You could also dispatch a custom event or use context to pass the selected date
      // For now, we'll just scroll to the booking form
    }
  };

  return (
    <section id="availability" className="py-16 bg-[#faf8f4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className="text-3xl sm:text-4xl mb-4"
            style={{
              fontFamily: "Cormorant Garamond, serif",
              fontWeight: 400,
              color: "#1a1a1a",
            }}
          >
            Check Availability
          </h2>
          <p
            className="text-lg text-[#8a8a7a] max-w-2xl mx-auto"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            View real-time availability for our premier properties. Select a
            property and date to check availability and book your stay.
          </p>
        </div>

        <ClientCalendarView
          retreats={retreats}
          selectedRetreatId={selectedRetreatId}
          onSelectRetreat={setSelectedRetreatId}
          onBookDate={handleBookDate}
        />
      </div>
    </section>
  );
}
