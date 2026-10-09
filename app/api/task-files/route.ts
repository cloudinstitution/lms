import { ApiError, withApi } from "@/lib/server/http"
import { requireUser } from "@/lib/server/session"
import { fileResponse } from "@/lib/server/storage"

/**
 * GET /api/task-files?path=project-tasks/{taskId}/{file}
 * Download a project file the admin uploaded when the browser had to keep it in Firestore (signed-in users only).
 */
export const GET = withApi(async (req) => {
  await requireUser(req)
  const path = req.nextUrl.searchParams.get("path") || ""
  if (!/^project-tasks\/[^/]+\/[^/]+$/.test(path) || path.includes("..")) throw new ApiError(400, "Invalid file")
  return fileResponse(path, path.split("/").pop()!.replace(/^\d+-/, ""))
})
