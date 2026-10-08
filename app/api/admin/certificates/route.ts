import { NextResponse } from "next/server"
import { adminListCertificates } from "@/lib/server/certificates-service"
import { withApi } from "@/lib/server/http"
import { requireAdmin } from "@/lib/server/session"

/** GET /api/admin/certificates?q=&course_id=&from=&to=&status=Valid|Revoked  (admin only) */
export const GET = withApi(async (req) => {
  await requireAdmin(req)
  const sp = req.nextUrl.searchParams
  const certificates = await adminListCertificates(
    {
      q: sp.get("q") || undefined,
      course_id: sp.get("course_id") || undefined,
      from: sp.get("from") || undefined,
      to: sp.get("to") || undefined,
      status: sp.get("status") || undefined,
    },
    req,
  )
  return NextResponse.json({ certificates })
})
