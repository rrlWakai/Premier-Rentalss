begin;

create table if not exists public.api_rate_limits (
  scope text not null,
  subject_hash text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, subject_hash, window_start)
);

alter table public.api_rate_limits enable row level security;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_subject text,
  p_max_requests integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  current_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_subject_hash text;
  v_count integer;
  v_elapsed_seconds integer;
begin
  if p_scope is null or p_scope = '' then
    raise exception 'Rate limit scope is required';
  end if;

  if p_subject is null or p_subject = '' then
    raise exception 'Rate limit subject is required';
  end if;

  if p_max_requests <= 0 or p_window_seconds <= 0 then
    raise exception 'Invalid rate limit configuration';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );
  v_subject_hash := encode(digest(p_subject, 'sha256'), 'hex');

  perform pg_advisory_xact_lock(
    hashtextextended(p_scope || ':' || v_subject_hash || ':' || v_window_start::text, 0)
  );

  insert into public.api_rate_limits (
    scope,
    subject_hash,
    window_start,
    count,
    created_at,
    updated_at
  )
  values (
    p_scope,
    v_subject_hash,
    v_window_start,
    1,
    v_now,
    v_now
  )
  on conflict (scope, subject_hash, window_start)
  do update
    set count = public.api_rate_limits.count + 1,
        updated_at = v_now
  returning count into v_count;

  delete from public.api_rate_limits
  where updated_at < v_now - interval '1 day';

  v_elapsed_seconds := greatest(
    0,
    floor(extract(epoch from (v_now - v_window_start)))::integer
  );

  return query
  select
    v_count <= p_max_requests,
    case
      when v_count <= p_max_requests then 0
      else greatest(1, p_window_seconds - v_elapsed_seconds)
    end,
    v_count;
end;
$$;

revoke all on table public.api_rate_limits from public;
revoke all on function public.consume_rate_limit(text, text, integer, integer) from public;

grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;

commit;
