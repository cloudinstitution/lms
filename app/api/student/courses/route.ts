import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { studentCourses } from "@/lib/server/projects-service"
import { requireStudent } from "@/lib/server/session"

/** GET /api/student/courses — the courses the signed-in student is enrolled in (from their student record). */
export const GET = withApi(async (req) => {
  const s = await requireStudent(req)
  const courses = await studentCourses(s)
  return NextResponse.json({ courses, student: { name: s.name, student_id: s.studentId } })
})
