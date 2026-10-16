import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { adminListEnrollments } from "@/lib/server/learners-service"
import { requireAdmin } from "@/lib/server/session"

/** GET /api/admin/enrollments — online buyers, their courses and payments (admin only). */
export const GET = withApi(async (req) => {
  await requireAdmin(req)
  return NextResponse.json(await adminListEnrollments())
})
