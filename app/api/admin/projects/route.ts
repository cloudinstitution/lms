import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { adminListProjects } from "@/lib/server/projects-service"
import { requireReviewer } from "@/lib/server/session"

/** GET /api/admin/projects?status=pending|Accepted|Rejected|Resubmission Required&q=&course_id= (admin / teacher) */
export const GET = withApi(async (req) => {
  await requireReviewer(req)
  const sp = req.nextUrl.searchParams
  return NextResponse.json(
    await adminListProjects({ status: sp.get("status") || undefined, q: sp.get("q") || undefined, course_id: sp.get("course_id") || undefined }),
  )
})
