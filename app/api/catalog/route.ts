import { NextResponse } from "next/server"
import { CATALOG } from "@/lib/server/catalog"
import { manualPaymentUrl, paymentsEnabled } from "@/lib/server/learners-service"

/** GET /api/catalog — public course list with the real prices and how payment works. */
export const GET = () => NextResponse.json({ courses: CATALOG, payments_enabled: paymentsEnabled(), payment_link_url: manualPaymentUrl() })
