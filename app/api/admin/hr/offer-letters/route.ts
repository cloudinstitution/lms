import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { createOfferLetter, listOfferLetters } from "@/lib/server/hr-service"
import { assertSameOrigin, requireSection } from "@/lib/server/session"

export const GET = withApi(async (req) => {
  await requireSection(req, "hr")
  return NextResponse.json({ offers: await listOfferLetters() })
})

/** POST { company_id, candidate_name, candidate_email?, designation, location?, joining_date, offer_date?, prior_experience_months?, components: [{label, monthly}], probation_months?, … } */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  return NextResponse.json({ offer: await createOfferLetter(await readJson(req)) }, { status: 201 })
})
