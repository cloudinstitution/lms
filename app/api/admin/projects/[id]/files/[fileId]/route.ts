import { withApi } from "@/lib/server/http"
import { adminGetProjectFile } from "@/lib/server/projects-service"
import { requireReviewer } from "@/lib/server/session"
import { signedReadUrl } from "@/lib/server/storage"

/** GET — a reviewer downloading a submitted file (redirects to a 5-minute signed link). */
export const GET = withApi<{ id: string; fileId: string }>(async (req, { id, fileId }) => {
  await requireReviewer(req)
  const file = await adminGetProjectFile(id, fileId)
  return new Response(null, { status: 302, headers: { Location: await signedReadUrl(file.path, file.name), "Cache-Control": "no-store" } })
})
