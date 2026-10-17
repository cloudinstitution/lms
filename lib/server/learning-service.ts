import { getDb } from "./firebase-admin"
import { ApiError } from "./http"
import { findCourse } from "./catalog"
import { assertEnrolled, listCourseVideos } from "./learners-service"
import type { LearnerUser } from "./session"

const iso = () => new Date().toISOString()
const progressKey = (learnerId: string, courseId: number) => `${learnerId}__c${courseId}`

export interface QuizQuestion { question: string; options: string[]; answer: number }
export interface QuizDoc { course_id: number; title: string; after_lesson: number; pass_mark: number; questions: QuizQuestion[]; created_at: string }

export type CourseStatus = "Not started" | "In progress" | "Completed"
export interface Progress {
  status: CourseStatus
  percent: number
  lessons_done: number
  lessons_total: number
  quizzes_passed: number
  quizzes_total: number
}

// ---------- admin: author quizzes ----------
function cleanQuiz(courseId: number, input: any): QuizDoc {
  const title = typeof input?.title === "string" ? input.title.trim() : ""
  if (!title || title.length > 100) throw new ApiError(400, "Give the quiz a title (up to 100 characters)")
  const after = Number(input?.after_lesson)
  if (!Number.isInteger(after) || after < 1 || after > 500) throw new ApiError(400, "Say after which lesson number the quiz appears (1 or more)")
  const pass = input?.pass_mark === undefined || input?.pass_mark === "" ? 60 : Number(input.pass_mark)
  if (!Number.isInteger(pass) || pass < 1 || pass > 100) throw new ApiError(400, "Pass mark must be between 1 and 100 percent")
  const qs = Array.isArray(input?.questions) ? input.questions : []
  if (qs.length < 1 || qs.length > 30) throw new ApiError(400, "Add between 1 and 30 questions")
  const questions: QuizQuestion[] = qs.map((q: any, i: number) => {
    const question = typeof q?.question === "string" ? q.question.trim() : ""
    const options = Array.isArray(q?.options) ? q.options.map((o: unknown) => (typeof o === "string" ? o.trim() : "")).filter(Boolean) : []
    const answer = Number(q?.answer)
    if (!question || question.length > 300) throw new ApiError(400, `Question ${i + 1}: enter the question (up to 300 characters)`)
    if (options.length < 2 || options.length > 6 || options.some((o: string) => o.length > 200)) throw new ApiError(400, `Question ${i + 1}: give 2 to 6 answer options`)
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) throw new ApiError(400, `Question ${i + 1}: mark the correct answer`)
    return { question, options, answer }
  })
  return { course_id: courseId, title, after_lesson: after, pass_mark: pass, questions, created_at: iso() }
}

export async function adminListQuizzes(courseIdRaw: unknown) {
  const course = findCourse(courseIdRaw)
  if (!course) throw new ApiError(404, "Course not found")
  const snap = await getDb().collection("course_quizzes").where("course_id", "==", course.id).get()
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuizDoc) })).sort((a, b) => a.after_lesson - b.after_lesson || a.created_at.localeCompare(b.created_at))
}

export async function adminCreateQuiz(courseIdRaw: unknown, input: unknown) {
  const course = findCourse(courseIdRaw)
  if (!course) throw new ApiError(404, "Course not found")
  const doc = cleanQuiz(course.id, input)
  const ref = getDb().collection("course_quizzes").doc()
  await ref.set(doc)
  return { id: ref.id, ...doc }
}

export async function adminDeleteQuiz(id: string) {
  const ref = getDb().collection("course_quizzes").doc(id)
  if (!(await ref.get()).exists) throw new ApiError(404, "Quiz not found")
  await ref.delete()
}

// ---------- learner: progress ----------
async function quizzesFor(courseId: number) {
  const snap = await getDb().collection("course_quizzes").where("course_id", "==", courseId).get()
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuizDoc) })).sort((a, b) => a.after_lesson - b.after_lesson || a.created_at.localeCompare(b.created_at))
}

async function progressDoc(learnerId: string, courseId: number) {
  const snap = await getDb().collection("learner_progress").doc(progressKey(learnerId, courseId)).get()
  const d = snap.exists ? (snap.data() as any) : {}
  return { completed: (Array.isArray(d.completed) ? d.completed : []) as string[], quizBest: (d.quiz_best && typeof d.quiz_best === "object" ? d.quiz_best : {}) as Record<string, number>, passed: (Array.isArray(d.quiz_passed) ? d.quiz_passed : []) as string[] }
}

function summarize(lessonIds: string[], quizzes: { id: string }[], p: { completed: string[]; passed: string[] }): Progress {
  const lessonsDone = lessonIds.filter((id) => p.completed.includes(id)).length
  const quizzesPassed = quizzes.filter((q) => p.passed.includes(q.id)).length
  const total = lessonIds.length + quizzes.length
  const done = lessonsDone + quizzesPassed
  const percent = total ? Math.round((done / total) * 100) : 0
  const status: CourseStatus = total && done === total ? "Completed" : done > 0 ? "In progress" : "Not started"
  return { status, percent, lessons_done: lessonsDone, lessons_total: lessonIds.length, quizzes_passed: quizzesPassed, quizzes_total: quizzes.length }
}

export async function progressFor(learnerId: string, courseId: number): Promise<Progress> {
  const [videos, quizzes, p] = await Promise.all([listCourseVideos(courseId), quizzesFor(courseId), progressDoc(learnerId, courseId)])
  return summarize(videos.map((v) => v.id), quizzes, p)
}

/** Progress for many (learner, course) pairs — used by the admin list. Course totals are read once per course. */
export async function progressForMany(pairs: { learner_id: string; course_id: number }[]): Promise<Progress[]> {
  const totals = new Map<number, Promise<{ ids: string[]; quizzes: { id: string }[] }>>()
  const totalsOf = (cid: number) => {
    if (!totals.has(cid)) totals.set(cid, Promise.all([listCourseVideos(cid), quizzesFor(cid)]).then(([v, q]) => ({ ids: v.map((x) => x.id), quizzes: q })))
    return totals.get(cid)!
  }
  return Promise.all(pairs.map(async (pr) => {
    const [t, p] = await Promise.all([totalsOf(pr.course_id), progressDoc(pr.learner_id, pr.course_id)])
    return summarize(t.ids, t.quizzes, p)
  }))
}

/** Everything the player needs: lessons, quizzes (without answers), what is done. */
export async function coursePlayer(learner: LearnerUser, courseId: number) {
  await assertEnrolled(learner, courseId)
  const [videos, quizzes, p] = await Promise.all([listCourseVideos(courseId), quizzesFor(courseId), progressDoc(learner.docId, courseId)])
  return {
    videos,
    quizzes: quizzes.map((q) => ({ id: q.id, title: q.title, after_lesson: q.after_lesson, pass_mark: q.pass_mark, question_count: q.questions.length, best: p.quizBest[q.id] ?? null, passed: p.passed.includes(q.id) })),
    completed: p.completed,
    progress: summarize(videos.map((v) => v.id), quizzes, p),
  }
}

export async function setLessonDone(learner: LearnerUser, courseId: number, lessonId: unknown, done: unknown) {
  await assertEnrolled(learner, courseId)
  const id = typeof lessonId === "string" ? lessonId : ""
  const videos = await listCourseVideos(courseId)
  if (!id || !videos.some((v) => v.id === id)) throw new ApiError(404, "Lesson not found")
  const db = getDb()
  const ref = db.collection("learner_progress").doc(progressKey(learner.docId, courseId))
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const cur = snap.exists ? (snap.data() as any) : null
    const set = new Set<string>(Array.isArray(cur?.completed) ? cur.completed : [])
    if (done === false) set.delete(id)
    else set.add(id)
    const data = { learner_id: learner.docId, course_id: courseId, completed: [...set], updated_at: iso() }
    if (cur) tx.update(ref, data)
    else tx.create(ref, { ...data, quiz_best: {}, quiz_passed: [] })
  })
  if (done !== false) await touchActivity(learner)
  return progressFor(learner.docId, courseId)
}

// ---------- learner: take a quiz ----------
async function loadQuizForLearner(learner: LearnerUser, quizId: string) {
  const snap = await getDb().collection("course_quizzes").doc(quizId).get()
  if (!snap.exists) throw new ApiError(404, "Quiz not found")
  const q = snap.data() as QuizDoc
  await assertEnrolled(learner, q.course_id)
  return q
}

export async function getQuizForLearner(learner: LearnerUser, quizId: string) {
  const q = await loadQuizForLearner(learner, quizId)
  return { id: quizId, title: q.title, pass_mark: q.pass_mark, questions: q.questions.map((x) => ({ question: x.question, options: x.options })) }
}

export async function submitQuiz(learner: LearnerUser, quizId: string, answersRaw: unknown) {
  const q = await loadQuizForLearner(learner, quizId)
  const answers = Array.isArray(answersRaw) ? answersRaw.map((a) => (Number.isInteger(a) ? (a as number) : -1)) : []
  if (answers.length !== q.questions.length) throw new ApiError(400, "Please answer every question")
  const review = q.questions.map((x, i) => ({ correct: answers[i] === x.answer, correct_index: x.answer, your_index: answers[i] }))
  const score = review.filter((r) => r.correct).length
  const percent = Math.round((score / q.questions.length) * 100)
  const passed = percent >= q.pass_mark
  const db = getDb()
  const ref = db.collection("learner_progress").doc(progressKey(learner.docId, q.course_id))
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const cur = snap.exists ? (snap.data() as any) : null
    const best = { ...(cur?.quiz_best ?? {}) } as Record<string, number>
    best[quizId] = Math.max(best[quizId] ?? 0, percent)
    const ok = new Set<string>(Array.isArray(cur?.quiz_passed) ? cur.quiz_passed : [])
    if (passed) ok.add(quizId)
    const data = { learner_id: learner.docId, course_id: q.course_id, quiz_best: best, quiz_passed: [...ok], updated_at: iso() }
    if (cur) tx.update(ref, data)
    else tx.create(ref, { ...data, completed: [] })
  })
  await touchActivity(learner)
  return { score, total: q.questions.length, percent, passed, pass_mark: q.pass_mark, review, progress: await progressFor(learner.docId, q.course_id) }
}

// ---------- learning streaks ----------
const istDay = (d = new Date()) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10)

/** Remember that the learner studied today (IST). Stored on the learner's own document. */
export async function touchActivity(learner: LearnerUser) {
  const ref = getDb().collection("learners").doc(learner.docId)
  const snap = await ref.get()
  const days: string[] = snap.exists && Array.isArray((snap.data() as any).active_days) ? (snap.data() as any).active_days : []
  const today = istDay()
  if (days.includes(today)) return
  await ref.update({ active_days: [...days, today].sort().slice(-400) })
}

export async function activityFor(learnerId: string) {
  const snap = await getDb().collection("learners").doc(learnerId).get()
  const days: string[] = snap.exists && Array.isArray((snap.data() as any).active_days) ? [...(snap.data() as any).active_days].sort() : []
  const set = new Set(days)
  const dayMs = 86400000
  // current streak: consecutive days ending today (or yesterday, so it is not lost before today's study)
  let cur = 0
  let t = new Date(Date.now())
  if (!set.has(istDay(t))) t = new Date(t.getTime() - dayMs)
  while (set.has(istDay(t))) { cur++; t = new Date(t.getTime() - dayMs) }
  let longest = 0, run = 0, prev = 0
  for (const d of days) {
    const ms = Date.parse(d)
    run = prev && ms - prev === dayMs ? run + 1 : 1
    prev = ms
    longest = Math.max(longest, run)
  }
  return { days: days.slice(-120), current_streak: cur, longest_streak: longest, today: istDay() }
}
