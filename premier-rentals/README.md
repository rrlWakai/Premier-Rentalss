# Premier Rentals — City Short-Stay Booking Platform

Production booking platform for Premier Rentals with a React frontend, Supabase-backed admin tooling, server-side booking locks, and redirect-based payment checkout.

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, TypeScript, Vite          |
| Styling   | Tailwind CSS v4                     |
| Animation | Framer Motion                       |
| Routing   | React Router v6                     |
| Backend   | Supabase (Postgres + Auth + RLS)    |
| Payments  | Redirect checkout architecture (PayMongo-ready) |
| Toasts    | React Hot Toast                     |

---

## Features

- ✅ **Mobile-Friendly** — Responsive across all screen sizes
- ✅ **Smooth Animations** — Framer Motion scroll-triggered + stagger effects
- ✅ **Online Booking** — request flow with server-side slot locking and checkout initialization
- ✅ **Admin Dashboard** — Booking management, status updates, stats
- ✅ **Calendar Management** — Visual calendar with block/unblock dates
- ✅ **Property Showcase** — Dedicated pages for Premier Pool House & Premier Patio
- ✅ **Flexible Booking Types** — Daytime (8AM–6PM), Nighttime (6PM–2AM), Overnight
- ✅ **Checkout-Ready Payments** — server-side payment session initialization and webhook support

---

## Quick Start

### 1. Install
```bash
npm install
```

### 2. Set up Supabase
1. Create project at [supabase.com](https://supabase.com)
2. Apply the SQL migrations in `migrations/` in order
3. Set your admin account role in `auth.users.raw_app_meta_data` to `{"role":"admin"}`

### 3. Configure environment
```bash
cp .env.example .env
# Fill in your keys
```

### 4. PayMongo setup
1. Sign up at [paymongo.com](https://dashboard.paymongo.com)
2. Go to **Developers → API Keys**
3. Store your secret/server keys in backend environment variables only
4. Configure webhook signing secret and public site URL on your deployment platform

### 5. Run
```bash
npm run dev
```

---

## Routes

| Path                  | Description                        |
|-----------------------|------------------------------------|
| `/`                   | Landing page                       |
| `/property/premier-pool-house` | Premier Pool House page   |
| `/property/premier-patio`      | Premier Patio page        |
| `/booking/success`    | Payment success callback           |
| `/booking/failed`     | Payment failed callback            |
| `/admin`              | Admin login                        |
| `/admin/dashboard`    | Admin dashboard (protected)        |

---

## Project Structure

```
src/
├── components/
│   ├── HomePage.tsx           Landing page assembler
│   ├── Navbar.tsx             Animated fixed nav
│   ├── Hero.tsx               Full-screen hero + booking bar
│   ├── Stats.tsx              Animated count-up stats
│   ├── Retreats.tsx           Property grid + Book Now
│   ├── MoreThanStay.tsx       Split feature section
│   ├── Amenities.tsx          8-item amenities grid
│   ├── TestimonialBanner.tsx  Full-bleed quote banner
│   ├── Gallery.tsx            Mosaic photo gallery
│   ├── Testimonials.tsx       Guest reviews
│   ├── Contact.tsx            Inquiry form
│   ├── Footer.tsx             Footer with links
│   ├── BookingFormModal.tsx   Active booking + redirect checkout modal
│   ├── BookingCalendar.tsx    ← Date picker + blocked dates
│   ├── PropertyPage.tsx       ← Dedicated property pages
│   ├── BookingPages.tsx       ← Success/Failed pages
│   ├── AdminLogin.tsx         ← Admin sign in
│   ├── AdminDashboard.tsx     ← Full admin panel
│   ├── AdminCalendarView.tsx  ← Calendar + block management
│   └── ProtectedRoute.tsx     ← Auth guard
├── context/
│   └── AuthContext.tsx        Supabase auth state
├── lib/
│   ├── supabase.ts            All DB queries + types
│   └── animations.ts          Framer Motion variants
├── App.tsx                    Router config
└── main.tsx                   Entry point
```

---

## Supabase Tables

| Table            | Purpose                              |
|------------------|--------------------------------------|
| `retreats`       | Property listings                    |
| `bookings`       | Guest reservations + payment status  |
| `blocked_dates`  | Admin-managed unavailable dates      |
| `testimonials`   | Guest reviews                        |
| `inquiries`      | Contact form submissions             |

---

## Payment Architecture

1. Frontend creates a booking via `/api/bookings/create`
2. Backend computes price and downpayment server-side
3. Backend locks the slot for 15 minutes
4. Frontend requests `/api/payments/checkout`
5. Backend creates a redirect checkout session and saves the checkout session ID
6. Webhook verification updates payment status server-side

---

## Deployment

```bash
# Build
npm run build

# Deploy to Vercel
npx vercel --prod

# Or Netlify
npx netlify deploy --prod --dir=dist
```

Add these environment variables to your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYMONGO_SECRET_KEY`
- `PAYMONGO_WEBHOOK_SECRET`
- `PUBLIC_SITE_URL`

---

## Admin Access

1. Go to `/admin`
2. Sign in with an account whose `app_metadata.role` is set to `admin`
3. Access dashboard at `/admin/dashboard`

Features:
- **Overview** — Revenue, booking counts, recent bookings table
- **Bookings** — Search, filter by status, view/update individual bookings
- **Calendar** — Visual monthly calendar, block/unblock specific dates
