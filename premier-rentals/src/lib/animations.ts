import { useEffect, useRef, useState } from 'react'

// Intersection observer hook for scroll-triggered animations
export function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, inView }
}

// Stagger children animation class helper
export function staggerClass(index: number, base = 'animate-fade-in-up') {
  const delays = ['delay-0', 'delay-100', 'delay-200', 'delay-300', 'delay-400', 'delay-500']
  return `${base} ${delays[index % delays.length]}`
}

// Page transition wrapper styles
export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
}

// Fade up variant
export const fadeUpVariant = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

// Scale in variant
export const scaleVariant = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

// Slide in from left
export const slideLeftVariant = {
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// Container stagger
export const containerVariant = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
}
