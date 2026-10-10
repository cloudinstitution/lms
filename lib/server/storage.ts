import { randomUUID } from "crypto"
import { getBucket, getDb } from "./firebase-admin"
import { STORED_URL_PREFIX, getStoredMeta, streamStoredFile } from "./stored-files"
import { ApiError } from "./http"
import type { ProjectFile } from "./types"

export const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".zip", ".rar", ".7z", ".gz", ".tar", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
  ".csv", ".txt", ".md", ".png", ".jpg", ".jpeg", ".ipynb", ".py", ".js", ".ts", ".java", ".json",
])
export const MAX_FILE_BYTES = 500 * 1024 * 1024
export const MAX_FILES_PER_KIND = 10
const UPLOAD_URL_TTL_MS = 15 * 60 * 1000
const READ_URL_TTL_MS = 5 * 60 * 1000

const PATH_RE = /^project-submissions\/([^/]+)\/([0-9a-f-]{36})\/([^/]+)$/

export const storagePrefix = (studentDocId: string) => `project-submissions/${studentDocId}/`

export function extensionOf(name: string): string {
  const i = name.lastIndexOf(".")
  return i >= 0 ? name.slice(i).toLowerCase() : ""
}

export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() || "file"
  const cleaned = base.replace(/[^\w.\- ()]+/g, "_").replace(/^\.+/, "_").slice(0, 120)
  return cleaned || "file"
}

export interface UploadRequestFile {
  name: string
  size: number
  type?: string
  kind: "project" | "supporting"
}

export interface UploadSlot {
  id: string
  kind: "project" | "supporting"
  name: string
  path: string
  content_type: string
  upload_url: string
}

/** Validate the requested files and hand back short-lived signed PUT URLs (browser uploads directly to Storage). */
export async function createUploadSlots(studentDocId: string, files: UploadRequestFile[]): Promise<UploadSlot[]> {
  if (!Array.isArray(files) || files.length === 0) throw new ApiError(400, "No files requested")
  const counts = { project: 0, supporting: 0 }
  const bucket = getBucket()
  const slots: UploadSlot[] = []

  for (const f of files) {
    if (f.kind !== "project" && f.kind !== "supporting") throw new ApiError(400, "Invalid file kind")
    if (++counts[f.kind] > MAX_FILES_PER_KIND) throw new ApiError(400, `At most ${MAX_FILES_PER_KIND} ${f.kind} files are allowed`)
    const name = safeFileName(String(f.name || ""))
    const ext = extensionOf(name)
    if (!ALLOWED_EXTENSIONS.has(ext)) throw new ApiError(400, `File type "${ext || "(none)"}" is not allowed (${name})`)
    const size = Number(f.size)
    if (!Number.isFinite(size) || size <= 0) throw new ApiError(400, `"${name}" is empty`)
    if (size > MAX_FILE_BYTES) throw new ApiError(400, `"${name}" is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB`)

    const id = randomUUID()
    const path = `${storagePrefix(studentDocId)}${id}/${name}`
    const contentType = (typeof f.type === "string" && f.type) || "application/octet-stream"
    const [uploadUrl] = await bucket.file(path).getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + UPLOAD_URL_TTL_MS,
      contentType,
    })
    slots.push({ id, kind: f.kind, name, path, content_type: contentType, upload_url: uploadUrl })
  }
  return slots
}

export interface SubmittedFile {
  path: string
  kind: "project" | "supporting"
  name?: string
}

/**
 * Confirm that every file the client says it uploaded really exists under THIS student's prefix,
 * and take the size / type from Storage's own metadata rather than from the client.
 */
export async function verifyUploadedFiles(studentDocId: string, files: SubmittedFile[]): Promise<ProjectFile[]> {
  if (!Array.isArray(files) || files.length === 0) throw new ApiError(400, "At least one project file is required")
  const counts = { project: 0, supporting: 0 }
  const bucket = getBucket()
  const out: ProjectFile[] = []
  const seen = new Set<string>()

  for (const f of files) {
    if (f.kind !== "project" && f.kind !== "supporting") throw new ApiError(400, "Invalid file kind")
    if (++counts[f.kind] > MAX_FILES_PER_KIND) throw new ApiError(400, `At most ${MAX_FILES_PER_KIND} ${f.kind} files are allowed`)
    const path = String(f.path || "")
    const m = PATH_RE.exec(path)
    if (!m || m[1] !== studentDocId || path.includes("..")) throw new ApiError(400, "Invalid file reference")
    if (seen.has(path)) throw new ApiError(400, "Duplicate file reference")
    seen.add(path)
    const name = m[3]
    if (!ALLOWED_EXTENSIONS.has(extensionOf(name))) throw new ApiError(400, `File type not allowed: ${name}`)

    let size: number
    let contentType: string
    try {
      const [meta] = await bucket.file(path).getMetadata()
      size = Number(meta.size)
      contentType = meta.contentType || "application/octet-stream"
    } catch {
      throw new ApiError(400, `"${name}" was not uploaded. Please try again.`)
    }
    if (!Number.isFinite(size) || size <= 0) throw new ApiError(400, `"${name}" is empty`)
    if (size > MAX_FILE_BYTES) throw new ApiError(400, `"${name}" is too large`)
    out.push({ id: m[2], kind: f.kind, name, size, content_type: contentType, path })
  }
  if (counts.project === 0) throw new ApiError(400, "At least one project file is required")
  return out
}

/** Short-lived signed download link; the caller must already have authorised the request. */
export async function signedReadUrl(path: string, downloadName: string): Promise<string> {
  const [url] = await getBucket()
    .file(path)
    .getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + READ_URL_TTL_MS,
      responseDisposition: `attachment; filename="${downloadName.replace(/"/g, "")}"`,
    })
  return url
}

export async function deleteStoredFiles(paths: string[]): Promise<void> {
  const bucket = getBucket()
  await Promise.all(
    paths.map((p) =>
      bucket
        .file(p)
        .delete({ ignoreNotFound: true })
        .catch((e) => console.warn("Could not delete stored file", p, e?.message)),
    ),
  )
}

/** Response for downloading a stored file: a redirect to a short-lived link, or the bytes themselves for Firestore-stored files. */
export async function fileResponse(path: string, downloadName: string): Promise<Response> {
  const url = await signedReadUrl(path, downloadName)
  if (!url.startsWith(STORED_URL_PREFIX)) return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store" } })
  const meta = await getStoredMeta(getDb(), path)
  if (!meta) throw new ApiError(404, "File not found")
  return new Response(streamStoredFile(getDb(), meta), {
    headers: {
      "Content-Type": meta.content_type || "application/octet-stream",
      "Content-Length": String(meta.size),
      "Content-Disposition": `attachment; filename="${downloadName.replace(/["\r\n]/g, "")}"`,
      "Cache-Control": "no-store",
    },
  })
}
