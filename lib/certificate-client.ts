"use client"

/** Small fetch wrapper for the project / certificate APIs (cookie-authenticated, JSON). */
export class ApiFailure extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message)
  }
  get needsLogin() {
    return this.status === 401
  }
}

export async function api<T = any>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: init.method ?? "GET",
    credentials: "same-origin",
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  })
  let data: any = null
  try {
    data = await res.json()
  } catch {
    /* non-JSON */
  }
  if (!res.ok) throw new ApiFailure(
      res.status,
      data?.error || `Request failed (${res.status}) — ${init.method ?? "GET"} ${url.split("?")[0]}${res.status === 404 ? " was not found on the server (is the latest code deployed?)" : ""}`,
      data?.code,
    )
  return data as T
}

export const LOGIN_AGAIN_MESSAGE = "Your secure session has expired. Please log out and log in again to continue."
