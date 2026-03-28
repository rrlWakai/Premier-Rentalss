begin;

create unique index if not exists idx_payments_booking_id_unique
on public.payments (booking_id);

commit;
