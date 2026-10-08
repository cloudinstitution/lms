import { NextResponse } from "next/server"
import { rateLimit, readJson, withApi } from "@/lib/server/http"
import { deleteTask, updateTask, type TaskInput } from "@/lib/server/projects-service"
import { assertSameOrigin, requireReviewer } from "@/lib/server/session"

/** PUT /api/admin/project-tasks/{id} — edit an assigned project (also used to hide/show it with { active }). */
export const PUT = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  rateLimit(req, "task-write", 60)
  await requireReviewer(req)
  return NextResponse.json({ task: await updateTask(id, await readJson<TaskInput>(req)) })
})

/** DELETE /api/admin/project-tasks/{id} — removes it, or just hides it when students already submitted for it. */
export const DELETE = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  rateLimit(req, "task-write", 60)
  await requireReviewer(req)
  return NextResponse.json(await deleteTask(id))
})
