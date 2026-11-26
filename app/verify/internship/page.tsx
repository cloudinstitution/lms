"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useState } from "react"

/** Public: type an internship ID (from the offer letter / certificate) to verify it. */
export default function VerifyInternshipSearch() {
  const router = useRouter()
  const [id, setId] = useState("")
  const go = (e: React.FormEvent) => { e.preventDefault(); const v = id.trim(); if (v) router.push(`/verify/internship/${encodeURIComponent(v)}`) }
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Cloud Institution · Internship Verification</p>
          <h1 className="text-xl font-bold">Verify an internship</h1>
          <p className="text-sm text-muted-foreground">Enter the internship ID printed on the letter or certificate, for example <span className="font-mono">CI-INT-2026-001</span> or <span className="font-mono">CI-VTU-2026-001</span>.</p>
          <form onSubmit={go} className="space-y-3">
            <Input autoFocus autoComplete="off" placeholder="Internship ID" value={id} onChange={(e) => setId(e.target.value)} className="text-center font-mono" />
            <Button type="submit" className="w-full" disabled={!id.trim()}>Verify</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
