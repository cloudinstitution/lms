"use client"

/**
 * Browser helpers for the server-verified session cookie used by the Projects & Certificates APIs.
 * The existing localStorage session keeps driving the rest of the UI; this cookie is what the
 * server trusts for anything that must be protected (project files, certificates).
 */

export async function startServerSession(username: string, password: string): Promise<boolean> {
  try {
    const res = await fetch("/api/session/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
    return res.ok
  } catch (error) {
    console.warn("Could not start server session:", error)
    return false
  }
}

let lastLogoutAt = 0

export function endServerSession(): void {
  if (typeof window === "undefined") return
  const now = Date.now()
  if (now - lastLogoutAt < 2000) return // clearSession() can be called several times in a row
  lastLogoutAt = now
  try {
    void fetch("/api/session/logout", { method: "POST", keepalive: true }).catch(() => {})
  } catch {
    /* best effort */
  }
}
