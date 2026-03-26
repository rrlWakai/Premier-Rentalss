# Premier Rentals — Luxury Private Resort Experiences

Production-ready luxury resort rental website with online booking, admin dashboard, PayMongo payments, and calendar management.

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, TypeScript, Vite          |
| Styling   | Tailwind CSS v4                     |
| Animation | Framer Motion                       |
| Routing   | React Router v6                     |
| Backend   | Supabase (Postgres + Auth + RLS)    |
| Payments  | PayMongo (GCash, Maya, GrabPay, Card)|
| Toasts    | React Hot Toast                     |

---

## Features

- ✅ **Mobile-Friendly** — Responsive across all screen sizes
- ✅ **Smooth Animations** — Framer Motion scroll-triggered + stagger effects
- ✅ **Online Booking** — 5-step booking modal (type → dates → details → payment → confirm)
- ✅ **Admin Dashboard** — Booking management, status updates, stats
- ✅ **Calendar Management** — Visual calendar with block/unblock dates
- ✅ **Property Showcase** — Dedicated pages for Premier Pool House & Premier Patio
- ✅ **Flexible Booking Types** — Daytime (8AM–6PM), Nighttime (6PM–2AM), Overnight
- ✅ **PayMongo Integration** — GCash, Maya, GrabPay, Credit/Debit cards

---

## Quick Start

### 1. Install
```bash
npm install
```

### 2. Set up Supabase
1. Create project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → run entire `supabase-schema.sql`
3. Go to **Authentication → Users** → create admin user

### 3. Configure environment
```bash
cp .env.example .env
# Fill in your keys
```

### 4. PayMongo setup
1. Sign up at [paymongo.com](https://dashboard.paymongo.com)
2. Go to **Developers → API Keys**
3. Copy your **Public Key** (pk_test_... for dev, pk_live_... for production)
4. Add to `.env` as `VITE_PAYMONGO_PUBLIC_KEY`

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
│   ├── BookingModal.tsx       ← 5-step booking flow
│   ├── BookingCalendar.tsx    ← Date picker + blocked dates
│   ├── PaymentForm.tsx        ← PayMongo payment UI
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
│   ├── paymongo.ts            PayMongo API helpers
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

## PayMongo Payment Flow

### E-wallets (GCash, Maya, GrabPay)
1. User selects e-wallet → clicks Pay
2. Source created via PayMongo API
3. User redirected to e-wallet checkout
4. After payment, redirected to `/booking/success?ref=...`
5. Webhook updates payment status server-side

### Card Payments
1. PaymentIntent created
2. PaymentMethod created with card details
3. Attach to intent → immediate success or 3DS redirect
4. On success, booking marked as paid

### Webhook (Recommended for Production)
Set up a Supabase Edge Function to handle PayMongo webhooks:
- `POST /functions/v1/paymongo-webhook`
- Listens for `source.chargeable` and `payment.paid` events
- Updates `bookings.payment_status` accordingly

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
- `VITE_PAYMONGO_PUBLIC_KEY`

---

## Admin Access

1. Go to `/admin`
2. Sign in with the email/password you created in Supabase Auth
3. Access dashboard at `/admin/dashboard`

Features:
- **Overview** — Revenue, booking counts, recent bookings table
- **Bookings** — Search, filter by status, view/update individual bookings
- **Calendar** — Visual monthly calendar, block/unblock specific dates
