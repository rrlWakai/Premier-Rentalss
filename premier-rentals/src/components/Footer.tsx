import { Link } from 'react-router-dom'
import { Facebook, Instagram, Mail, MapPin } from 'lucide-react'

const locations = [
  {
    name: 'Premier Pool House',
    address: '22 Love Bird St, Novaliches, Quezon City, Metro Manila',
  },
  {
    name: 'Premier Patio',
    address: '36 Amsterdam, Barangay 167, Caloocan, Metro Manila',
  },
]

const connectLinks = [
  {
    label: 'Pool House Facebook',
    href: 'https://www.facebook.com/premierpoolhouse',
    icon: Facebook,
  },
  {
    label: 'Pool House Instagram',
    href: 'https://www.instagram.com/premierpoolhouse/',
    icon: Instagram,
  },
  {
    label: 'Patio Facebook',
    href: 'https://www.facebook.com/profile.php?id=61555665219280',
    icon: Facebook,
  },
  {
    label: 'Patio Instagram',
    href: 'https://www.instagram.com/premierpatiobypph/',
    icon: Instagram,
  },
  { label: 'Email', href: 'mailto:hello@premierrentals.com', icon: Mail },
]

const legalLinks = [
  { label: 'Terms of Service', to: '/legal/terms' },
  { label: 'Privacy Policy', to: '/legal/privacy' },
]

export default function Footer() {
  return (
    <footer style={{ background: '#111111' }}>
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-12 lg:py-20">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] lg:gap-12">
          <div>
            <p
              className="mb-4 text-white"
              style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 400 }}
            >
              Premier Rentals
            </p>
            <p
              className="max-w-sm text-sm leading-relaxed text-white/72"
              style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}
            >
              Your private space in the city.
            </p>
            <p
              className="mt-3 max-w-md text-sm leading-relaxed text-white/45"
              style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}
            >
              Modern, comfortable, and fully-equipped stays designed for convenience and memorable moments within Metro Manila.
            </p>
          </div>

          <div>
            <p
              className="mb-5 text-[10px] uppercase tracking-[0.25em] text-[#c9a96e]"
              style={{ fontFamily: 'Jost, sans-serif', fontWeight: 500 }}
            >
              Locations
            </p>
            <div className="flex flex-col gap-5">
              {locations.map((location) => (
                <div key={location.name}>
                  <p
                    className="text-sm text-white"
                    style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 400 }}
                  >
                    {location.name}
                  </p>
                  <div className="mt-2 flex items-start gap-2.5">
                    <MapPin size={14} color="#c9a96e" className="mt-0.5 shrink-0" />
                    <p
                      className="text-xs leading-relaxed text-white/45"
                      style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}
                    >
                      {location.address}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p
              className="mb-5 text-[10px] uppercase tracking-[0.25em] text-[#c9a96e]"
              style={{ fontFamily: 'Jost, sans-serif', fontWeight: 500 }}
            >
              Connect With Us
            </p>
            <div className="flex flex-col gap-3">
              {connectLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noreferrer' : undefined}
                  className="flex items-center gap-3 text-xs text-white/45 transition-colors hover:text-white/75"
                  style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}
                >
                  <Icon size={14} color="#c9a96e" strokeWidth={1.5} />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>

          <div>
            <p
              className="mb-5 text-[10px] uppercase tracking-[0.25em] text-[#c9a96e]"
              style={{ fontFamily: 'Jost, sans-serif', fontWeight: 500 }}
            >
              Legal
            </p>
            <div className="flex flex-col gap-3">
              {legalLinks.map(({ label, to }) => (
                <Link
                  key={label}
                  to={to}
                  className="text-xs text-white/45 transition-colors hover:text-white/75"
                  style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center sm:px-6 lg:px-12">
          <p
            className="text-[10px] tracking-[0.2em] text-white/25 uppercase"
            style={{ fontFamily: 'Jost, sans-serif' }}
          >
            © 2026 Premier Rentals. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
