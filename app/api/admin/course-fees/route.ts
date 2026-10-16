import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { loadCatalog, setCourseFee } from "@/lib/server/learners-service"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"

/** GET /api/admin/course-fees — current fee of every course. */
export const GET = withApi(async (req) => {
  await requireAdmin(req)
  return NextResponse.json({ courses: (await loadCatalog()).map((c) => ({ id: c.id, title: c.title, price: c.price })) })
})

/** PUT /api/admin/course-fees { course_id, price } — the amount buyers are charged from now on. */
export const PUT = withApi(async (req) => {
  assertSameOrigin(req)
  const admin = await requireAdmin(req)
  const body = await readJson<{ course_id?: unknown; price?: unknown }>(req)
  return NextResponse.json(await setCourseFee(admin.name, body.course_id, body.price))
})
