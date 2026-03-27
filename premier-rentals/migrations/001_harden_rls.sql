begin;

drop policy if exists "Public insert bookings" on public.bookings;
drop policy if exists "Admin read bookings" on public.bookings;
drop policy if exists "Admin update bookings" on public.bookings;

create policy "Admin read bookings"
on public.bookings
for select
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admin update bookings"
on public.bookings
for update
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin write retreats" on public.retreats;
create policy "Admin write retreats"
on public.retreats
for all
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin write blocked_dates" on public.blocked_dates;
create policy "Admin write blocked_dates"
on public.blocked_dates
for all
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin write testimonials" on public.testimonials;
create policy "Admin write testimonials"
on public.testimonials
for all
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin read inquiries" on public.inquiries;
create policy "Admin read inquiries"
on public.inquiries
for select
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin read payments" on public.payments;
drop policy if exists "Admin write payments" on public.payments;

create policy "Admin read payments"
on public.payments
for select
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admin write payments"
on public.payments
for all
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

commit;
