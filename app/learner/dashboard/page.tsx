"use client"

import LearnerShell from "@/components/learner/learner-shell"
import BuyButton from "@/components/learner/buy-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { rupees } from "@/lib/learner-client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { BookOpen } from "lucide-react"

export default function LearnerDashboard() {
  const [catalog, setCatalog] = useState<any[]>([])
  useEffect(() => { fetch("/api/catalog").then((r) => r.json()).then((d) => setCatalog(d.courses || [])).catch(() => {}) }, [])

  return (
    <LearnerShell>
      {({ learner, enrollments }) => {
        const owned = new Set(enrollments.map((e) => e.course_id))
        const more = catalog.filter((c) => !owned.has(c.id))
        return (
          <div className="space-y-10">
            <div>
              <h1 className="text-2xl font-bold">Welcome, {learner.name.split(" ")[0]}</h1>
              <p className="text-muted-foreground">Your courses and what you can learn next.</p>
            </div>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold">My courses</h2>
              {enrollments.length === 0 && (
                <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">You have not bought a course yet. Pick one below to get started.</CardContent></Card>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {enrollments.map((e) => (
                  <Card key={e.course_id}>
                    <CardHeader>
                      <CardTitle className="text-base">{e.title}</CardTitle>
                      <CardDescription>{e.category} · {e.duration} · {e.level}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Link href={`/learner/courses/${e.course_id}`} className="w-full">
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700"><BookOpen className="mr-2 h-4 w-4" />Start learning</Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </section>

            {more.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold">More courses</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {more.map((c) => (
                    <Card key={c.id}>
                      <CardHeader>
                        <CardTitle className="text-base">{c.title}</CardTitle>
                        <CardDescription>{c.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">{c.category} · {c.duration} · {c.level}</CardContent>
                      <CardFooter className="gap-2">
                        <BuyButton courseId={c.id} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" label={`Buy now · ${rupees(c.price)}`} />
                        <Link href={`/courses/${c.id}`}><Button variant="outline">Details</Button></Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )
      }}
    </LearnerShell>
  )
}
