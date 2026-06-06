-- Slot-level blocking for blocked_dates
-- Adds time_slot column (NULL = whole-day block)
-- Replaces UNIQUE(retreat_id, date) with UNIQUE NULLS NOT DISTINCT(retreat_id, date, time_slot)

alter table public.blocked_dates
  add column time_slot time_slot_enum;

alter table public.blocked_dates
  drop constraint blocked_dates_retreat_id_date_key;

alter table public.blocked_dates
  add constraint blocked_dates_retreat_date_slot_key
  unique nulls not distinct (retreat_id, date, time_slot);

comment on column public.blocked_dates.time_slot is
  'NULL = block entire day; daytime/nighttime/overnight = block specific slot only';
