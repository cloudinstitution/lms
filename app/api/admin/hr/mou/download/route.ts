import JSZip from "jszip"
import { ApiError, readJsonOptional, withApi } from "@/lib/server/http"
import { assertSameOrigin, requireSection } from "@/lib/server/session"
import { listMous, mouDocx, mouPdf } from "@/lib/server/mou-service"

export const maxDuration = 300
const MAX = 300
const DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * POST { ids?, from?, to?, format? } — MOUs as one .zip. `format` is "docx" (default), "pdf" or "both". `from`/`to` (YYYY-MM-DD) keep
 * MOUs dated in that range; `ids` limits it to those MOUs. With more than one date the zip has a folder per MOU date.
 */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  const b = await readJsonOptional<any>(req)
  const want = Array.isArray(b?.ids) ? new Set(b.ids.map(String)) : null
  const format = b?.format === "pdf" || b?.format === "both" ? b.format : "docx"
  for (const k of ["from", "to"]) if (b?.[k] && !DATE.test(String(b[k]))) throw new ApiError(400, `${k} must be a date like 2026-11-24`)
  if (b?.from && b?.to && b.from > b.to) throw new ApiError(400, "The start date is after the end date")
  const all = (await listMous()).filter((m: any) => (!want || want.has(m.id)) && (!b?.from || m.mou_date >= b.from) && (!b?.to || m.mou_date <= b.to))
  if (all.length === 0) throw new ApiError(404, "There are no MOUs to download for that selection")
  const limit = format === "docx" ? MAX : 150
  if (all.length > limit) throw new ApiError(400, `Too many at once (${all.length}). Choose a shorter date range to get ${limit} or fewer${format === "docx" ? "" : ", or download Word files, which allows more"}.`)
  const dates = new Set(all.map((m: any) => m.mou_date))
  const zip = new JSZip(), used = new Set<string>()
  const add = (folder: string, name: string, bytes: Uint8Array) => {
    let path = folder + name; for (let n = 2; used.has(path); n++) path = folder + name.replace(/(\.\w+)$/, `-${n}$1`)
    used.add(path); zip.file(path, bytes)
  }
  for (const m of all) {
    const folder = dates.size > 1 ? `${m.mou_date || "undated"}/` : ""
    if (format !== "pdf") { const f = await mouDocx(m.id); add(folder, f.filename, f.bytes) }
    if (format !== "docx") { const f = await mouPdf(m.id); add(folder, f.filename, f.bytes) }
  }
  const out = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" })
  const label = b?.from || b?.to ? `${b.from || "start"}_to_${b.to || "today"}` : new Date().toISOString().slice(0, 10)
  return new Response(out, { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="MOUs-${label}-${format}.zip"`, "cache-control": "no-store" } })
})
