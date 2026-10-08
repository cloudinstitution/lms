import { NextResponse } from "next/server"
import { getStudentCertificates } from "@/lib/server/certificates-service"
import { withApi } from "@/lib/server/http"
import { requireStudent } from "@/lib/server/session"

/** GET /api/student/certificates — only the student's own certificate, and only once the project is Accepted. */
export const GET = withApi(async (req) => {
  const student = await requireStudent(req)
  return NextResponse.json({ certificates: await getStudentCertificates(student, req) })
})
