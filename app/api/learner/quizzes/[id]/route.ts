import { NextResponse } from "next/server"
import { rateLimit, readJson, withApi } from "@/lib/server/http"
import { getQuizForLearner, submitQuiz } from "@/lib/server/learning-service"
import { assertSameOrigin, requireLearner } from "@/lib/server/session"

/** GET — questions without answers. */
export const GET = withApi<{ id: string }>(async (req, { id }) => {
  const learner = await requireLearner(req)
  return NextResponse.json({ quiz: await getQuizForLearner(learner, id) })
})

/** POST { answers: number[] } — graded on the server. */
export const POST = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  rateLimit(req, "quiz-submit", 30)
  const learner = await requireLearner(req)
  const body = await readJson<{ answers?: unknown }>(req)
  return NextResponse.json(await submitQuiz(learner, id, body.answers))
})
