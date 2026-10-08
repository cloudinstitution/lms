import { NextResponse } from "next/server"
import { readJsonOptional, withApi } from "@/lib/server/http"
import { acceptProject } from "@/lib/server/projects-service"
import { assertSameOrigin, requireReviewer } from "@/lib/server/session"

/**
 * PUT /api/admin/projects/{project_id}/accept   { remarks? }
 * Marks the project Accepted and, in the same transaction, issues the certificate
 * (code = student ID, random QR token). Safe to call twice: the second call returns the same certificate.
 */
export const PUT = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  const reviewer = await requireReviewer(req)
  const body = await readJsonOptional<{ remarks?: string }>(req)
  return NextResponse.json(await acceptProject(id, reviewer, body.remarks, req))
})
