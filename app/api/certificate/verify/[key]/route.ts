import { NextResponse } from "next/server"
import { verifyCertificate } from "@/lib/server/certificates-service"
import { rateLimit, withApi } from "@/lib/server/http"
import { readSessionUser } from "@/lib/server/session"

export const dynamic = "force-dynamic" // revocation must show up immediately — never cache this

/**
 * GET /api/certificate/verify/{token-or-certificate-id}   (public)
 * Anyone can call it; a logged-in student additionally learns whether the certificate is theirs
 * (so the page can send them to their own LMS view). Only public fields are returned.
 */
export const GET = withApi<{ key: string }>(async (req, { key }) => {
  rateLimit(req, "verify", 120)
  const viewer = await readSessionUser(req).catch(() => null)
  const result = await verifyCertificate(decodeURIComponent(key), viewer)
  return NextResponse.json(result, {
    status: result.status === "NOT_FOUND" ? 404 : 200,
    headers: { "Cache-Control": "no-store" },
  })
})
