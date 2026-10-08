import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { adminDecide } from "@/lib/server/projects-service"
import { assertSameOrigin, requireReviewer } from "@/lib/server/session"

/** PUT /api/admin/projects/{project_id}/reject   { remarks }  — remarks are required and sent to the student. */
export const PUT = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  const reviewer = await requireReviewer(req)
  const body = await readJson<{ remarks?: string }>(req)
  return NextResponse.json({ project: await adminDecide(id, reviewer, "Rejected", body.remarks) })
})
