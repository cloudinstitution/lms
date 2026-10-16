import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { assertEnrolled, listCourseVideos } from "@/lib/server/learners-service"
import { requireLearner } from "@/lib/server/session"

/** GET /api/learner/courses/:id/videos — lessons, only for learners who bought the course. */
export const GET = withApi<{ id: string }>(async (req, { id }) => {
  const learner = await requireLearner(req)
  const courseId = Number(id)
  await assertEnrolled(learner, courseId)
  return NextResponse.json({ videos: await listCourseVideos(courseId) })
})
