begin;

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  booking_id uuid references public.bookings(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.payment_webhook_events enable row level security;

create policy "Admin read payment webhook events"
on public.payment_webhook_events
for select
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create index if not exists idx_payment_webhook_events_booking_id
on public.payment_webhook_events (booking_id);

commit;
