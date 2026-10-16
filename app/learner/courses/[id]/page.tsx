"use client"

import LearnerShell from "@/components/learner/learner-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { learnerApi } from "@/lib/learner-client"
import { ArrowLeft, PlayCircle } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

type Video = { id: string; title: string; link: string; serialNo: number; sourceType: "youtube" | "gdrive" }

function embedUrl(v: Video): string | null {
  const yt = v.link.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const gd = v.link.match(/\/d\/([A-Za-z0-9_-]+)/) || v.link.match(/[?&]id=([A-Za-z0-9_-]+)/)
  if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`
  return null
}

function Lessons({ id, title }: { id: string; title: string }) {
  const [videos, setVideos] = useState<Video[] | null>(null)
  const [error, setError] = useState("")
  const [current, setCurrent] = useState<Video | null>(null)

  useEffect(() => {
    learnerApi<{ videos: Video[] }>(`/api/learner/courses/${id}/videos`)
      .then((d) => { setVideos(d.videos); setCurrent(d.videos[0] ?? null) })
      .catch((e) => setError(e?.message || "Could not load the lessons"))
  }, [id])

  const src = current ? embedUrl(current) : null
  return (
    <div className="space-y-4">
      <Link href="/learner/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"><ArrowLeft className="h-4 w-4" />My courses</Link>
      <h1 className="text-2xl font-bold">{title}</h1>
      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {videos && videos.length === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Lessons for this course will appear here soon.</CardContent></Card>}
      {videos && videos.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="aspect-video overflow-hidden rounded-lg border bg-black">
              {src ? <iframe src={src} title={current?.title} className="h-full w-full" allow="autoplay; encrypted-media; fullscreen" allowFullScreen /> : <div className="flex h-full items-center justify-center text-sm text-white">This lesson cannot be played here.</div>}
            </div>
            <p className="mt-2 font-medium">{current?.title}</p>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Lessons ({videos.length})</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {videos.map((v, i) => (
                <button key={v.id} onClick={() => setCurrent(v)} className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted ${current?.id === v.id ? "bg-muted font-medium" : ""}`}>
                  <PlayCircle className="h-4 w-4 shrink-0 text-emerald-600" />{i + 1}. {v.title}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default function LearnerCoursePage() {
  const { id } = useParams() as { id: string }
  return (
    <LearnerShell>
      {({ enrollments }) => {
        const e = enrollments.find((x) => String(x.course_id) === id)
        return e ? <Lessons id={id} title={e.title} /> : (
          <div className="space-y-3">
            <p>You have not bought this course yet.</p>
            <Link href={`/courses/${id}`} className="text-emerald-600 underline">View course details</Link>
          </div>
        )
      }}
    </LearnerShell>
  )
}
