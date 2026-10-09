import { withApi } from "@/lib/server/http"
import { getStudentProjectFile } from "@/lib/server/projects-service"
import { requireStudent } from "@/lib/server/session"
import { fileResponse } from "@/lib/server/storage"

/** GET — a student downloading one of their OWN submitted files (redirects to a 5-minute signed link). */
export const GET = withApi<{ id: string; fileId: string }>(async (req, { id, fileId }) => {
  const student = await requireStudent(req)
  const file = await getStudentProjectFile(student, id, fileId)
  return fileResponse(file.path, file.name)
})
