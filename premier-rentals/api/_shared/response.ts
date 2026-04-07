/**
 * Utility for consistent API responses across Edge Functions
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export function json(
  data: unknown,
  init?: ResponseInit
): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

export function successResponse<T>(data: T, status: number = 200): Response {
  return json({ success: true, data }, { status });
}

export function errorResponse(error: string, status: number = 400): Response {
  return json({ success: false, error }, { status });
}

export function unauthorizedResponse(): Response {
  return errorResponse("Unauthorized", 401);
}

export function notFoundResponse(): Response {
  return errorResponse("Not found", 404);
}

export function methodNotAllowedResponse(): Response {
  return errorResponse("Method not allowed", 405);
}

export function internalErrorResponse(): Response {
  return errorResponse("Internal server error", 500);
}
