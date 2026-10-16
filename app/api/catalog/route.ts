import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { loadCatalog, manualPaymentUrl, paymentsEnabled } from "@/lib/server/learners-service"

/** GET /api/catalog — public course list with the CURRENT fees and how payment works. */
export const GET = withApi(async () => {
  return NextResponse.json({ courses: await loadCatalog(), payments_enabled: paymentsEnabled(), payment_link_url: manualPaymentUrl() }, { headers: { "Cache-Control": "no-store" } })
})
