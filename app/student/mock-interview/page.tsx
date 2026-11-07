"use client"

import StudentLayout from "@/components/student-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ApiFailure, api } from "@/lib/certificate-client"
import { Bot, CheckCircle2, Mic, MicOff, RotateCcw, Send, SkipForward, Volume2, VolumeX } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"

type Topic = { id: string; label: string }
type Turn = { question: string; answer: string; score?: number }
type Evaluation = { score: number; feedback: string; better_answer: string }
type Report = { overall_score: number; verdict: string; strengths: string[]; improvements: string[]; study_next: string[]; per_question: { score: number; summary: string }[] }

const err = (e: unknown) => (e instanceof ApiFailure || e instanceof Error ? e.message : "Something went wrong")
const scoreColor = (n: number, of = 10) => { const p = n / of; return p >= 0.7 ? "text-emerald-600" : p >= 0.4 ? "text-amber-600" : "text-red-600" }

export default function MockInterviewPage() {
  const [ready, setReady] = useState<boolean | null>(null)
  const [loadError, setLoadError] = useState("")
  const [topics, setTopics] = useState<Topic[]>([])
  const [levels, setLevels] = useState<string[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [phase, setPhase] = useState<"setup" | "interview" | "report">("setup")
  const [topic, setTopic] = useState<Topic | null>(null)
  const [level, setLevel] = useState("Fresher")
  const [total, setTotal] = useState(5)
  const [turns, setTurns] = useState<Turn[]>([]) // finished questions
  const [question, setQuestion] = useState("")
  const [number, setNumber] = useState(1)
  const [answer, setAnswer] = useState("")
  const [feedback, setFeedback] = useState<Evaluation | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [busy, setBusy] = useState(false)
  const [speakOn, setSpeakOn] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef<any>(null)
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window
  const SR = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null

  const load = useCallback(() => api("/api/student/interview").then((d) => { setReady(d.ready); setLoadError(""); setTopics(d.topics); setLevels(d.levels); setHistory(d.history) }).catch((e) => { setReady(false); setLoadError(err(e)) }), [])
  useEffect(() => { load() }, [load])

  const speak = useCallback((text: string) => {
    if (!speakOn || !canSpeak) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text); u.lang = "en-IN"; u.rate = 0.95
    window.speechSynthesis.speak(u)
  }, [speakOn, canSpeak])
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); recRef.current?.stop() } catch {} }, [])

  const start = async () => {
    if (!topic) return toast.error("Choose a topic first")
    setBusy(true)
    try {
      const d = await api("/api/student/interview", { method: "POST", body: { action: "start", topic: topic.id, level, total } })
      setTurns([]); setFeedback(null); setReport(null); setAnswer(""); setQuestion(d.question); setNumber(1); setPhase("interview"); speak(d.question)
    } catch (e) { toast.error(err(e)) } finally { setBusy(false) }
  }

  const submit = async (skip = false) => {
    if (!topic || busy) return
    const text = skip ? "" : answer.trim()
    if (!skip && text.length < 2) return toast.error("Type your answer first (or press Skip)")
    try { recRef.current?.stop() } catch {}
    setBusy(true)
    const transcript = [...turns, { question, answer: text }]
    try {
      const d = await api("/api/student/interview", { method: "POST", body: { action: "answer", topic: topic.id, level, total, transcript } })
      const done = [...turns, { question, answer: text || "(skipped)", score: d.evaluation.score }]
      setTurns(done); setFeedback(d.evaluation); setAnswer("")
      if (d.report) { setReport(d.report); setPhase("report"); load() } else { setQuestion(d.question); setNumber(d.number); speak(d.question) }
    } catch (e) { toast.error(err(e)) } finally { setBusy(false) }
  }

  const toggleMic = () => {
    if (!SR) return toast.info("Voice typing isn't supported in this browser — please type, or use Chrome.")
    if (listening) { recRef.current?.stop(); return }
    const r = new SR(); r.lang = "en-IN"; r.interimResults = false; r.continuous = true
    r.onresult = (e: any) => { let t = ""; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript; setAnswer((a) => (a ? a + " " : "") + t.trim()) }
    r.onend = () => setListening(false); r.onerror = () => setListening(false)
    recRef.current = r; r.start(); setListening(true)
  }
  const reset = () => { setPhase("setup"); setTurns([]); setFeedback(null); setReport(null); setQuestion(""); setAnswer(""); try { window.speechSynthesis?.cancel() } catch {} }

  return (
    <StudentLayout>
      <div className="mx-auto max-w-4xl space-y-6 p-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Bot className="h-6 w-6 text-purple-600" />AI Mock Interview</h1>
          <p className="text-sm text-muted-foreground">Practise topic by topic. The AI interviewer asks one question at a time, scores each answer and gives you a report at the end.</p>
        </div>

        {ready === false && loadError && <Card className="border-red-300"><CardContent className="pt-6 text-sm">{loadError.toLowerCase().includes("authentication") || loadError.toLowerCase().includes("session") ? "Your session has expired. Please log out and log in again to use the mock interview." : `Couldn't load the mock interview: ${loadError}`}</CardContent></Card>}
        {ready === false && !loadError && <Card className="border-amber-300"><CardContent className="pt-6 text-sm">The AI interviewer isn&apos;t switched on yet. Please ask your admin to set it up (the server needs the <code>ANTHROPIC_API_KEY</code> setting).</CardContent></Card>}

        {phase === "setup" && ready && (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">1. Choose a topic</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {topics.map((t) => <button key={t.id} onClick={() => setTopic(t)} className={`rounded-md border p-3 text-left text-sm transition ${topic?.id === t.id ? "border-purple-600 bg-purple-50 font-medium dark:bg-purple-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-900"}`}>{t.label}</button>)}
                </div>
                <div className="flex flex-wrap items-end gap-4">
                  <label className="text-xs text-muted-foreground">Level<select className="mt-1 block h-10 rounded-md border bg-background px-3 text-sm text-foreground" value={level} onChange={(e) => setLevel(e.target.value)}>{levels.map((l) => <option key={l}>{l}</option>)}</select></label>
                  <label className="text-xs text-muted-foreground">Questions<select className="mt-1 block h-10 rounded-md border bg-background px-3 text-sm text-foreground" value={total} onChange={(e) => setTotal(Number(e.target.value))}>{[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
                  {canSpeak && <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={speakOn} onChange={(e) => setSpeakOn(e.target.checked)} />Read questions aloud</label>}
                  <Button onClick={start} disabled={busy || !topic} className="bg-purple-600 text-white hover:bg-purple-700">{busy ? "Starting…" : "Start interview"}</Button>
                </div>
              </CardContent>
            </Card>
            {history.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Your past interviews</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {history.map((h) => (
                    <details key={h.id} className="rounded-md border p-3 text-sm">
                      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2"><span className="font-medium">{h.topic_label} · {h.level}</span><span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · <b className={scoreColor(h.overall_score, 100)}>{h.overall_score}/100</b></span></summary>
                      <p className="mt-2 text-muted-foreground">{h.report?.verdict}</p>
                      {h.report?.study_next?.length > 0 && <p className="mt-1"><b>Study next:</b> {h.report.study_next.join(", ")}</p>}
                    </details>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {phase === "interview" && topic && (
          <Card>
            <CardHeader><CardTitle className="flex items-center justify-between text-base"><span>{topic.label} · {level}</span><span className="text-sm font-normal text-muted-foreground">Question {number} of {total}</span></CardTitle>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full bg-purple-600 transition-all" style={{ width: `${((number - 1) / total) * 100}%` }} /></div></CardHeader>
            <CardContent className="space-y-4">
              {feedback && turns.length > 0 && (
                <div className="rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
                  <div className="mb-1 font-medium">Your last answer: <span className={scoreColor(feedback.score)}>{feedback.score}/10</span></div>
                  <p>{feedback.feedback}</p>
                  {feedback.better_answer && <p className="mt-1 text-muted-foreground"><b>A strong answer:</b> {feedback.better_answer}</p>}
                </div>
              )}
              <div className="flex items-start gap-3 rounded-md border border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950/30">
                <Bot className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" /><p className="flex-1 text-base">{question}</p>
                {canSpeak && <Button type="button" variant="ghost" size="icon" onClick={() => { if (speakOn) { window.speechSynthesis.cancel(); setSpeakOn(false) } else { setSpeakOn(true); const u = new SpeechSynthesisUtterance(question); u.lang = "en-IN"; window.speechSynthesis.speak(u) } }} title="Read aloud">{speakOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</Button>}
              </div>
              <Textarea rows={6} placeholder="Type your answer here, as you would say it in a real interview…" value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={busy} maxLength={3000} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variant="outline" onClick={toggleMic} disabled={busy}>{listening ? <><MicOff className="mr-1 h-4 w-4 text-red-600" />Stop</> : <><Mic className="mr-1 h-4 w-4" />Speak your answer</>}</Button>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => submit(true)} disabled={busy}><SkipForward className="mr-1 h-4 w-4" />Skip</Button>
                  <Button type="button" onClick={() => submit(false)} disabled={busy} className="bg-purple-600 text-white hover:bg-purple-700"><Send className="mr-1 h-4 w-4" />{busy ? "Evaluating…" : number === total ? "Finish & get report" : "Submit answer"}</Button>
                </div>
              </div>
              <button className="text-xs text-muted-foreground underline" onClick={() => { if (confirm("End this interview? Your progress will be lost.")) reset() }}>End interview</button>
            </CardContent>
          </Card>
        )}

        {phase === "report" && report && topic && (
          <Card>
            <CardHeader><CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base"><span className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" />Interview report — {topic.label} · {level}</span><span className={`text-3xl font-bold ${scoreColor(report.overall_score, 100)}`}>{report.overall_score}<span className="text-sm text-muted-foreground">/100</span></span></CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              {feedback && <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-800/50"><div className="font-medium">Last answer: <span className={scoreColor(feedback.score)}>{feedback.score}/10</span></div><p>{feedback.feedback}</p></div>}
              <p>{report.verdict}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><h3 className="mb-1 font-semibold text-emerald-700">Strengths</h3><ul className="list-inside list-disc space-y-1">{report.strengths.map((s) => <li key={s}>{s}</li>)}</ul></div>
                <div><h3 className="mb-1 font-semibold text-amber-700">To improve</h3><ul className="list-inside list-disc space-y-1">{report.improvements.map((s) => <li key={s}>{s}</li>)}</ul></div>
              </div>
              {report.study_next.length > 0 && <p><b>Study next:</b> {report.study_next.join(" · ")}</p>}
              <div className="space-y-2">{turns.map((t, i) => (
                <details key={i} className="rounded-md border p-3"><summary className="cursor-pointer"><span className="font-medium">Q{i + 1}.</span> {t.question} <b className={scoreColor(t.score ?? 0)}>({t.score ?? 0}/10)</b></summary>
                  <p className="mt-2"><b>Your answer:</b> {t.answer}</p>{report.per_question[i]?.summary && <p className="mt-1 text-muted-foreground">{report.per_question[i].summary}</p>}</details>
              ))}</div>
              <Button onClick={reset} variant="outline"><RotateCcw className="mr-1 h-4 w-4" />Take another interview</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  )
}
