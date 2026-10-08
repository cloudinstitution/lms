import { NextResponse } from "next/server"
import { ApiError, rateLimit, readJson, withApi } from "@/lib/server/http"
import { assertSameOrigin, createSessionToken, setSessionCookie, userFromDocId } from "@/lib/server/session"

/**
 * POST /api/session/resume  { kind: "student" | "staff", id }
 *
 * Lets a user who is already logged in to the LMS (the app's login is client-side) use Projects & Certificates
 * without logging in again: the server re-reads that user's Firestore record and issues the signed session cookie.
 * `id` is the Firestore document id the LMS already keeps in the browser session.
 * Set LMS_REQUIRE_SERVER_SESSION=true to disable this and require a fresh password login instead.
 */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  rateLimit(req, "session-resume", 60)
  if (process.env.LMS_REQUIRE_SERVER_SESSION === "true") throw new ApiError(401, "Please sign in again", "no_session")

  const body = await readJson<{ kind?: unknown; id?: unknown }>(req)
  const kind = body.kind === "student" ? "student" : body.kind === "staff" ? "staff" : null
  const id = typeof body.id === "string" ? body.id.trim() : ""
  if (!kind || !id || id.includes("/")) throw new ApiError(400, "Invalid session")

  const user = await userFromDocId(kind, id)
  if (!user) throw new ApiError(401, "Please sign in again", "no_session")

  const res = NextResponse.json({ success: true, role: user.role })
  setSessionCookie(res, await createSessionToken(user))
  return res
})
