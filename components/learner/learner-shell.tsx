"use client"

import { currentLearner } from "@/lib/learner-client"
import { GraduationCap, LayoutDashboard, LogOut, Receipt, Store } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export type Activity = { days: string[]; current_streak: number; longest_streak: number; today: string }
export type LearnerData = { learner: { name: string; email: string }; enrollments: any[]; activity?: Activity }

const NAV = [
  { name: "Dashboard", href: "/learner/dashboard", icon: LayoutDashboard },
  { name: "Purchase History", href: "/learner/purchases", icon: Receipt },
  { name: "Browse Courses", href: "/courses", icon: Store },
]

/** Page frame for signed-in learners (sidebar + content); sends anyone else to the login page. */
export default function LearnerShell({ children, wide = false }: { children: (data: LearnerData) => React.ReactNode; wide?: boolean }) {
  const router = useRouter()
  const path = usePathname()
  const [data, setData] = useState<LearnerData | null>(null)

  useEffect(() => {
    currentLearner().then((d) => (d ? setData(d) : router.replace("/login")))
  }, [router])

  const logout = async () => {
    await fetch("/api/learner/logout", { method: "POST", credentials: "same-origin" }).catch(() => {})
    router.push("/")
  }

  const link = (n: (typeof NAV)[number], mobile = false) => {
    const active = path === n.href || (n.href === "/learner/dashboard" && path.startsWith("/learner/courses"))
    return (
      <Link key={n.href} href={n.href} className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${mobile ? "whitespace-nowrap px-3 py-2" : ""} ${active ? "bg-purple-100 text-purple-800" : "text-slate-600 hover:bg-purple-50"}`}>
        <n.icon className="h-5 w-5" />{n.name}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-purple-50/60 lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-white p-4 lg:flex">
        <Link href="/learner/dashboard" className="mb-8 mt-2 flex items-center gap-2 px-2 text-lg font-bold text-purple-800"><GraduationCap className="h-7 w-7" />Cloud Institution</Link>
        <nav className="space-y-1">{NAV.map((n) => link(n))}</nav>
        <div className="mt-auto space-y-2 border-t pt-4">
          {data && <div className="px-2 text-sm"><div className="font-medium">{data.learner.name}</div><div className="truncate text-xs text-muted-foreground">{data.learner.email}</div></div>}
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-purple-50"><LogOut className="h-5 w-5" />Log out</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-2 overflow-x-auto border-b bg-white px-3 py-2 lg:hidden">
          {NAV.map((n) => link(n, true))}
          <button onClick={logout} className="ml-auto flex items-center gap-1 whitespace-nowrap px-3 py-2 text-sm text-slate-600"><LogOut className="h-4 w-4" />Log out</button>
        </header>
        <main className={`mx-auto px-4 py-6 lg:px-8 ${wide ? "max-w-7xl" : "max-w-5xl"}`}>
          {data ? children(data) : <p className="text-muted-foreground">Loading…</p>}
        </main>
      </div>
    </div>
  )
}
