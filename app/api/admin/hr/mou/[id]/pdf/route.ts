import { withApi } from "@/lib/server/http"
import { requireSection } from "@/lib/server/session"
import { mouPdf } from "@/lib/server/mou-service"

export const maxDuration = 60

/** The filled-in MOU as a PDF. */
export const GET = withApi<{ id: string }>(async (req, { id }) => {
  await requireSection(req, "hr")
  const { bytes, filename } = await mouPdf(id)
  return new Response(new Uint8Array(bytes), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${filename}"`, "cache-control": "no-store" } })
})
