import { NextResponse } from "next/server"
import { rateLimit, readJson, withApi } from "@/lib/server/http"
import { assertSameOrigin, requireStudent } from "@/lib/server/session"
import { createUploadSlots, type UploadRequestFile } from "@/lib/server/storage"

/**
 * POST /api/projects/upload-urls  { files: [{ name, size, type, kind }] }
 * Step 1 of submitting: returns short-lived signed URLs so the browser can upload large files straight to
 * Firebase Storage (serverless request bodies are too small for project files).
 */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  rateLimit(req, "upload-urls", 30)
  const student = await requireStudent(req)
  const body = await readJson<{ files?: UploadRequestFile[] }>(req)
  const slots = await createUploadSlots(student.docId, body.files as UploadRequestFile[])
  return NextResponse.json({ slots })
})
