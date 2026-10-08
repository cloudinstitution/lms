import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { listStudentNotifications } from "@/lib/server/projects-service"
import { requireStudent } from "@/lib/server/session"

/** GET /api/student/notifications — project / certificate notifications for the signed-in student only. */
export const GET = withApi(async (req) => {
  const student = await requireStudent(req)
  return NextResponse.json({ notifications: await listStudentNotifications(student) })
})
