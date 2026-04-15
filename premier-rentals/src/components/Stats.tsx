import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { containerVariant, fadeUpVariant } from '../lib/animations'

const stats = [
  { value: 3,   suffix: '+',  label: 'Years of Excellence' },
  { value: 500, suffix: '',   label: 'Happy Guests' },
  { value: 5,   suffix: '★',  label: 'Star Rating' },
  { value: 24,  suffix: '/7', label: 'Concierge Service' },
]

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const steps = 50
          const increment = target / steps
          let current = 0
          const timer = setInterval(() => {
            current += increment
            if (current >= target) { setCount(target); clearInterval(timer) }
            else setCount(Math.floor(current))
          }, 1400 / steps)
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return (
    <span ref={ref} className="stat-number">
      {count}{suffix}
    </span>
  )
}

export default function Stats() {
  return (
    <section id="stats" className="py-14 bg-white border-b border-[#ede8df]">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center"
          variants={containerVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
        >
          {stats.map((stat, i) => (
            <motion.div key={stat.label} variants={fadeUpVariant} custom={i} className="relative flex flex-col items-center gap-1 lg:[&:not(:last-child)]:after:absolute lg:[&:not(:last-child)]:after:right-0 lg:[&:not(:last-child)]:after:top-1/2 lg:[&:not(:last-child)]:after:-translate-y-1/2 lg:[&:not(:last-child)]:after:h-10 lg:[&:not(:last-child)]:after:w-px lg:[&:not(:last-child)]:after:bg-[#ede8df] lg:[&:not(:last-child)]:after:content-['']">
              <CountUp target={stat.value} suffix={stat.suffix} />
              <p className="text-[#8a8a7a] text-[10px] tracking-widest uppercase mt-1"
                style={{ fontFamily: 'Jost, sans-serif', fontWeight: 400 }}>
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
