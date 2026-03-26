import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
  { label: 'Home', href: '/#home' },
  { label: 'Properties', href: '/#retreats' },
  { label: 'Amenities', href: '/#amenities' },
  { label: 'About', href: '/#about' },
  { label: 'Gallery', href: '/#gallery' },
  { label: 'Contact', href: '/#contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close menu on resize
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setMenuOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault()
    setMenuOpen(false)
    const [path, hash] = href.split('#')
    if (window.location.pathname !== '/' && path === '/') {
      navigate('/')
      setTimeout(() => {
        const el = document.getElementById(hash)
        el?.scrollIntoView({ behavior: 'smooth' })
      }, 300)
    } else if (hash) {
      const el = document.getElementById(hash)
      el?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-[#1a1a1a]/96 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="max-w-7xl mx-auto px-5 lg:px-12 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-white text-xl tracking-[0.2em] uppercase"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300 }}>
            Premier
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <a key={item.label} href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className="nav-link">
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="hidden lg:flex items-center gap-4">
          <Link to="/admin"
            className="text-white/40 hover:text-white/70 transition-colors text-[10px] tracking-widest uppercase"
            style={{ fontFamily: 'Jost, sans-serif' }}>
            Admin
          </Link>
          <a href="/#retreats" onClick={(e) => handleNavClick(e, '/#retreats')} className="btn-gold text-xs py-2.5 px-5">
            Book Now
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden text-white p-1.5 rounded"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="lg:hidden overflow-hidden bg-[#111]/98 backdrop-blur-md border-t border-white/10"
          >
            <nav className="flex flex-col px-6 py-6 gap-1">
              {navItems.map((item, i) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className="nav-link py-3 text-sm border-b border-white/5 last:border-0"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {item.label}
                </motion.a>
              ))}
              <div className="flex gap-3 mt-4 pt-2">
                <a href="/#retreats" onClick={(e) => handleNavClick(e, '/#retreats')} className="btn-gold text-xs flex-1 justify-center">
                  Book Now
                </a>
                <Link to="/admin" onClick={() => setMenuOpen(false)}
                  className="btn-outline-gold text-xs px-4">
                  Admin
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
