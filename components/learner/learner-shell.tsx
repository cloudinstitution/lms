"use client"

import { Button } from "@/components/ui/button"
import { currentLearner } from "@/lib/learner-client"
import { GraduationCap, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export type LearnerData = { learner: { name: string; email: string }; enrollments: any[] }

/** Page frame for signed-in learners; sends anyone else to the login page. */
export default function LearnerShell({ children }: { children: (data: LearnerData) => React.ReactNode }) {
  const router = useRouter()
  const [data, setData] = useState<LearnerData | null>(null)

  useEffect(() => {
    currentLearner().then((d) => (d ? setData(d) : router.replace("/login")))
  }, [router])

  const logout = async () => {
    await fetch("/api/learner/logout", { method: "POST", credentials: "same-origin" }).catch(() => {})
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/learner/dashboard" className="flex items-center gap-2 font-bold text-emerald-600">
            <GraduationCap className="h-6 w-6" /> Cloud Institution
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {data && <span className="hidden text-muted-foreground sm:inline">{data.learner.name}</span>}
            <Link href="/courses"><Button variant="outline" size="sm">Browse courses</Button></Link>
            <Button variant="ghost" size="sm" onClick={logout}><LogOut className="mr-1 h-4 w-4" />Log out</Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto max-w-5xl px-4 py-8">
        {data ? children(data) : <p className="text-muted-foreground">Loading…</p>}
      </main>
    </div>
  )
}
