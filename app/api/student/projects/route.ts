import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { listStudentProjects } from "@/lib/server/projects-service"
import { requireStudent } from "@/lib/server/session"

/** GET /api/student/projects — the signed-in student's own submissions with status and certificate availability. */
export const GET = withApi(async (req) => {
  const student = await requireStudent(req)
  return NextResponse.json({ projects: await listStudentProjects(student) })
})
