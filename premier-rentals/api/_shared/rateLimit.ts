import { supabaseAdmin } from "./supabaseAdmin";

const DEFAULT_WINDOW_SECONDS = 60;

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );  
}

export function getRateLimitSubject(request: Request, suffix?: string) {
  const ip = getClientIp(request);
  return suffix ? `${ip}:${suffix}` : ip;
}

export async function enforceRateLimit(args: {
  request: Request;
  scope: string;
  maxRequests: number;
  windowSeconds?: number;
  subjectSuffix?: string;
}) {
  const { request, scope, maxRequests, windowSeconds = DEFAULT_WINDOW_SECONDS, subjectSuffix } = args;

  const subject = getRateLimitSubject(request, subjectSuffix);
  const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
    p_scope: scope,
    p_subject: subject,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });

if (error) {
  console.error("🔥 RATE LIMIT ERROR FULL:", JSON.stringify(error, null, 2));
  throw new Error("RATE_LIMIT_CHECK_FAILED");
}

console.log("✅ RATE LIMIT DATA:", JSON.stringify(data, null, 2));
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error("RATE_LIMIT_CHECK_FAILED");
  }

  return {
    allowed: Boolean(row.allowed),
    retryAfterSeconds: Number(row.retry_after_seconds || 0),
    currentCount: Number(row.current_count || 0),
  };
}
