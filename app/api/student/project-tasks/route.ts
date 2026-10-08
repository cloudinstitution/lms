import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { listStudentTasks, studentCourses } from "@/lib/server/projects-service"
import { requireStudent } from "@/lib/server/session"

/** GET /api/student/project-tasks — projects the admin assigned to the student's course(s). */
export const GET = withApi(async (req) => {
  const s = await requireStudent(req)
  const [tasks, courses] = await Promise.all([listStudentTasks(s), studentCourses(s)])
  return NextResponse.json({ tasks, courses })
})
