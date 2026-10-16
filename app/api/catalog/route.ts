import { NextResponse } from "next/server"
import { CATALOG } from "@/lib/server/catalog"

/** GET /api/catalog — public course list with the real prices. */
export const GET = () => NextResponse.json({ courses: CATALOG, payments_enabled: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) })
