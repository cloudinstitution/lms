import JSZip from "jszip"
import { ApiError, readJsonOptional, withApi } from "@/lib/server/http"
import { assertSameOrigin, requireSection } from "@/lib/server/session"
import { listMous, mouDocx } from "@/lib/server/mou-service"

export const maxDuration = 300
const MAX = 300

/** POST { ids? } — every MOU (or just the listed ones) as one .zip of Word files. */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  const b = await readJsonOptional<any>(req)
  const want = Array.isArray(b?.ids) ? new Set(b.ids.map(String)) : null
  const all = (await listMous()).filter((m: any) => !want || want.has(m.id))
  if (all.length === 0) throw new ApiError(404, "There are no MOUs to download")
  if (all.length > MAX) throw new ApiError(400, `Too many at once (${all.length}). Search to narrow it to ${MAX} or fewer.`)
  const zip = new JSZip(), used = new Set<string>()
  for (const m of all) {
    const f = await mouDocx(m.id)
    let name = f.filename; for (let n = 2; used.has(name); n++) name = f.filename.replace(/\.docx$/, `-${n}.docx`)
    used.add(name); zip.file(name, f.bytes)
  }
  const out = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" })
  return new Response(out, { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="MOUs-${new Date().toISOString().slice(0, 10)}.zip"`, "cache-control": "no-store" } })
})
