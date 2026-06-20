import { NextResponse } from "next/server";

/** Standard JSON success/error responses for API routes. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Wrap an async route handler so unexpected throws become clean 500s. */
export function route<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>
) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (e) {
      console.error("[PAIOS:route]", e);
      return fail(e instanceof Error ? e.message : "Internal error", 500);
    }
  };
}
