import { Instagram, Facebook, Twitter, Mail, Phone, MapPin } from 'lucide-react'

const links = {
  Explore: ['Properties', 'Amenities', 'Gallery', 'About Us'],
  Services: ['Private Chef', 'Concierge', 'Transfers', 'Spa & Wellness'],
  Company: ['Our Story', 'Press', 'Careers', 'Privacy Policy'],
}

const socials = [
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Twitter, href: '#', label: 'Twitter' },
]

export default function Footer() {
  return (
    <footer style={{ background: '#111111' }}>
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <p
              className="text-white text-2xl tracking-[0.2em] uppercase mb-4"
              style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300 }}
            >
              Premier
            </p>
            <p
              className="text-white/40 text-xs leading-relaxed max-w-xs mb-8"
              style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, lineHeight: 1.9 }}
            >
              Redefining luxury private resort experiences for the world's most discerning travelers. Every stay is a masterpiece of comfort, elegance, and unforgettable moments.
            </p>

            {/* Contact info */}
            <div className="flex flex-col gap-3 mb-8">
              {[
                { icon: Phone, text: '+1 (800) 555-0199' },
                { icon: Mail, text: 'reservations@premierrentals.com' },
                { icon: MapPin, text: 'Worldwide Properties' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <Icon size={13} color="#c9a96e" strokeWidth={1.5} />
                  <span
                    className="text-white/40 text-xs"
                    style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>

            {/* Socials */}
            <div className="flex gap-3">
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 flex items-center justify-center border border-white/10 hover:border-[#c9a96e] hover:bg-[#c9a96e]/10 transition-all duration-300"
                >
                  <Icon size={14} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <p
                className="text-[#c9a96e] text-[10px] tracking-[0.25em] uppercase mb-5"
                style={{ fontFamily: 'Jost, sans-serif', fontWeight: 500 }}
              >
                {category}
              </p>
              <ul className="flex flex-col gap-3">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-white/35 hover:text-white/70 transition-colors text-xs"
                      style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, letterSpacing: '0.04em' }}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p
            className="text-white/20 text-[10px] tracking-widest uppercase"
            style={{ fontFamily: 'Jost, sans-serif' }}
          >
            © {new Date().getFullYear()} Premier Rentals. All rights reserved.
          </p>
          <div className="flex gap-6">
            {['Terms of Service', 'Privacy Policy', 'Cookie Policy'].map((item) => (
              <a
                key={item}
                href="#"
                className="text-white/20 hover:text-white/45 transition-colors text-[10px] tracking-wider"
                style={{ fontFamily: 'Jost, sans-serif' }}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
