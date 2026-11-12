import { withApi } from "@/lib/server/http"
import { requireSection } from "@/lib/server/session"
import { vtuPdf } from "@/lib/server/vtu-service"

export const maxDuration = 60

export const GET = withApi<{ id: string }>(async (req, { id }) => {
  await requireSection(req, "hr")
  const { bytes, filename } = await vtuPdf(id)
  return new Response(new Uint8Array(bytes), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${filename}"`, "cache-control": "no-store" } })
})
