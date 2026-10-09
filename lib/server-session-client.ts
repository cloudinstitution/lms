"use client"

/**
 * Browser helpers for the server-verified session cookie used by the Projects & Certificates APIs.
 * The existing localStorage session keeps driving the rest of the UI; this cookie is what the
 * server trusts for anything that must be protected (project files, certificates).
 */

import { getAdminSession, getStudentSession } from "@/lib/session-storage"

export let lastServerSessionError = ""

export async function startServerSession(username: string, password: string): Promise<boolean> {
  lastServerSessionError = ""
  try {
    const res = await fetch("/api/session/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      lastServerSessionError = `${res.status}${body?.error ? ": " + body.error : ""}`
      console.warn("Could not start server session:", lastServerSessionError)
    }
    return res.ok
  } catch (error) {
    lastServerSessionError = "network error"
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

export let lastResumeError = ""
let resuming: Promise<boolean> | null = null

/** Silently start the server session from the existing LMS login (no password prompt). */
export function resumeServerSession(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false)
  if (resuming) return resuming
  resuming = (async () => {
    try {
      const admin = getAdminSession()
      const student = getStudentSession()
      const payload = admin?.id ? { kind: "staff", id: admin.id } : student?.id ? { kind: "student", id: student.id } : null
      lastResumeError = ""
      if (!payload) {
        lastResumeError = "no LMS login found in this browser"
        return false
      }
      const res = await fetch("/api/session/resume", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        lastResumeError = `${res.status}${body?.error ? ": " + body.error : ""}${body?.detail ? " — " + body.detail : ""}`
      }
      return res.ok
    } catch {
      lastResumeError = "network error"
      return false
    } finally {
      setTimeout(() => (resuming = null), 1000)
    }
  })()
  return resuming
}
