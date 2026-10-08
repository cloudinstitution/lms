import { withApi } from "@/lib/server/http"
import { getStudentProjectFile } from "@/lib/server/projects-service"
import { requireStudent } from "@/lib/server/session"
import { signedReadUrl } from "@/lib/server/storage"

/** GET — a student downloading one of their OWN submitted files (redirects to a 5-minute signed link). */
export const GET = withApi<{ id: string; fileId: string }>(async (req, { id, fileId }) => {
  const student = await requireStudent(req)
  const file = await getStudentProjectFile(student, id, fileId)
  return new Response(null, { status: 302, headers: { Location: await signedReadUrl(file.path, file.name), "Cache-Control": "no-store" } })
})
