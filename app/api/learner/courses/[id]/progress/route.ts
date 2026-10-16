import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { coursePlayer, setLessonDone } from "@/lib/server/learning-service"
import { assertSameOrigin, requireLearner } from "@/lib/server/session"

/** GET — lessons, quizzes and progress for a course the learner bought. */
export const GET = withApi<{ id: string }>(async (req, { id }) => {
  const learner = await requireLearner(req)
  return NextResponse.json(await coursePlayer(learner, Number(id)))
})

/** POST { lesson_id, done? } — mark a lesson complete (done:false to undo). */
export const POST = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  const learner = await requireLearner(req)
  const body = await readJson<{ lesson_id?: unknown; done?: unknown }>(req)
  return NextResponse.json({ progress: await setLessonDone(learner, Number(id), body.lesson_id, body.done) })
})
