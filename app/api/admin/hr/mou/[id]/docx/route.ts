import { withApi } from "@/lib/server/http"
import { requireSection } from "@/lib/server/session"
import { mouDocx } from "@/lib/server/mou-service"

export const maxDuration = 60

/** The filled-in MOU as a Word file. */
export const GET = withApi<{ id: string }>(async (req, { id }) => {
  await requireSection(req, "hr")
  const { bytes, filename } = await mouDocx(id)
  return new Response(new Uint8Array(bytes), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "content-disposition": `attachment; filename="${filename}"`, "cache-control": "no-store" } })
})
