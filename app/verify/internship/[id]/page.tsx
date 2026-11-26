"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BadgeCheck, Loader2, ShieldX } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

const fmt = (iso?: string) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "")

/** Public internship verification page — the link/QR on the letter opens this. */
export default function VerifyInternshipPage() {
  const { id } = useParams() as { id: string }
  const [r, setR] = useState<any>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    fetch(`/api/verify/internship/${encodeURIComponent(decodeURIComponent(String(id)))}`, { cache: "no-store" })
      .then(async (res) => { const d = await res.json().catch(() => null); if (!d) throw new Error("bad"); setR(d) })
      .catch(() => setFailed(true))
  }, [id])
  const period = r?.start_date ? `${fmt(r.start_date)}${r.end_date ? ` – ${fmt(r.end_date)}` : " onwards"}` : ""
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-5 p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Cloud Institution · Internship Verification</p>
          {!r && !failed && <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}
          {failed && <p className="text-red-600">Verification is temporarily unavailable. Please try again.</p>}
          {r?.status === "VALID" && (
            <>
              <BadgeCheck className="mx-auto h-16 w-16 text-emerald-600" />
              <h1 className="text-2xl font-bold text-emerald-700">Verified Internship</h1>
              <dl className="space-y-3 text-left text-sm">
                {([["Intern", r.candidate_name], ["Role / Program", r.role], ["Organisation", r.organization], r.location ? ["Location", `${r.location}${r.mode ? ` · ${r.mode}` : ""}`] : null, ["Duration", r.duration], period ? ["Period", period] : null, ["Status", r.progress], ["Issued on", fmt(r.issued_on)], ["Internship ID", r.internship_id]].filter(Boolean) as string[][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b pb-2"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
                ))}
              </dl>
              <p className="text-xs text-muted-foreground">This confirms the internship was issued by Cloud Institution. Only public details are shown.</p>
            </>
          )}
          {r?.status === "NOT_FOUND" && (
            <>
              <ShieldX className="mx-auto h-16 w-16 text-red-600" />
              <h1 className="text-2xl font-bold text-red-700">Not found</h1>
              <p className="text-sm text-muted-foreground">No internship matches <span className="font-mono">{decodeURIComponent(String(id))}</span>. Check the ID on the letter and try again.</p>
              <Button asChild variant="outline"><Link href="/verify/internship">Try another ID</Link></Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
