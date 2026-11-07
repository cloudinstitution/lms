import { NextResponse } from "next/server"
import { rateLimit, readJson, withApi } from "@/lib/server/http"
import { LEVELS, TOPICS, answerInterview, interviewHistory, interviewReady, startInterview } from "@/lib/server/interview-service"
import { assertSameOrigin, requireStudent } from "@/lib/server/session"

export const maxDuration = 60

/** GET → topics, levels, whether the AI is set up, and this student's past interviews. */
export const GET = withApi(async (req) => {
  const user = await requireStudent(req)
  return NextResponse.json({ ready: interviewReady(), topics: TOPICS.map((t) => ({ id: t.id, label: t.label })), levels: LEVELS, history: await interviewHistory(user) })
})

/** POST { action: "start" | "answer", topic, level, total, transcript? } */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  const user = await requireStudent(req)
  rateLimit(req, "interview", 30)
  const body = await readJson<any>(req)
  return NextResponse.json(body?.action === "answer" ? await answerInterview(user, body) : await startInterview(user, body))
})
