import { NextResponse } from "next/server"
import { rateLimit, withApi } from "@/lib/server/http"
import { verifyInternship } from "@/lib/server/internship-verify"

export const dynamic = "force-dynamic"

/** GET /api/verify/internship/{internship-id}   (public) — confirms an internship ID and returns only public details. */
export const GET = withApi<{ id: string }>(async (req, { id }) => {
  rateLimit(req, "verify-internship", 60)
  const r = await verifyInternship(decodeURIComponent(id))
  return NextResponse.json(r, { status: r.status === "NOT_FOUND" ? 404 : 200, headers: { "Cache-Control": "no-store" } })
})
