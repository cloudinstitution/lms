import { NextRequest, NextResponse } from "next/server"

/** An error that maps directly to an HTTP response. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

type Handler<P> = (req: NextRequest, params: P) => Promise<Response>

/**
 * Wrap a route handler: resolves Next 15's async `params`, and turns thrown ApiErrors
 * into `{ error }` JSON responses. Anything unexpected becomes a generic 500 (details are logged,
 * never sent to the client).
 */
export function withApi<P extends Record<string, string> = Record<string, never>>(handler: Handler<P>) {
  return async (req: NextRequest, ctx?: { params?: Promise<any> }): Promise<Response> => {
    try {
      const params = (ctx?.params ? await ctx.params : {}) as P
      return await handler(req, params)
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
      }
      console.error("[api] unexpected error:", err)
      // A short, secret-free hint so a misconfigured deployment can be diagnosed from the browser.
      const detail = (err instanceof Error ? err.message : String(err)).replace(/-----BEGIN[\s\S]*?END [A-Z ]*KEY-----/g, "[key]").slice(0, 240)
      return NextResponse.json({ error: "Internal server error", detail }, { status: 500 })
    }
  }
}

export async function readJson<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    const body = await req.json()
    if (body === null || typeof body !== "object" || Array.isArray(body)) throw new Error("not an object")
    return body as T
  } catch {
    throw new ApiError(400, "Request body must be a JSON object")
  }
}

/** Like readJson, but an empty body is fine (returns {}). A non-empty body must still be a JSON object. */
export async function readJsonOptional<T = Record<string, unknown>>(req: NextRequest): Promise<Partial<T>> {
  const text = await req.text()
  if (!text.trim()) return {}
  try {
    const body = JSON.parse(text)
    if (body === null || typeof body !== "object" || Array.isArray(body)) throw new Error("not an object")
    return body as Partial<T>
  } catch {
    throw new ApiError(400, "Request body must be a JSON object")
  }
}

// Small in-memory limiter (per server instance), same approach as the existing student-create route.
const buckets = new Map<string, { count: number; reset: number }>()
export function rateLimit(req: NextRequest, name: string, max: number, windowMs = 60_000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const key = `${name}:${ip}`
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return
  }
  b.count++
  if (b.count > max) throw new ApiError(429, "Too many requests. Please try again shortly.")
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k)
}
