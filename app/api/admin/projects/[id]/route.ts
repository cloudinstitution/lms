import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { adminOpenProject } from "@/lib/server/projects-service"
import { requireReviewer } from "@/lib/server/session"

/** GET /api/admin/projects/{project_id} — opening a freshly Submitted project moves it to "Under Review". */
export const GET = withApi<{ id: string }>(async (req, { id }) => {
  const reviewer = await requireReviewer(req)
  return NextResponse.json({ project: await adminOpenProject(id, reviewer) })
})
