export interface NavItem {
  label: string
  href: string
}

export interface StatItem {
  value: string
  suffix?: string
  label: string
}

export interface AmenityItem {
  icon: string
  title: string
  description: string
}

export interface GalleryImage {
  src: string
  alt: string
  tall?: boolean
}
