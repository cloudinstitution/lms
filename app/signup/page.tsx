"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { learnerApi } from "@/lib/learner-client"
import { ArrowLeft, GraduationCap } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

function SignupForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next")
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/learner/dashboard"
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" })
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError("")
    try {
      await learnerApi("/api/learner/signup", { body: f })
      router.push(safeNext)
    } catch (err: any) {
      setError(err?.message || "Could not create your account")
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-slate-950 to-slate-900 p-4 relative">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Link>
      <Link href="/" className="flex items-center gap-2 mb-8">
        <GraduationCap className="h-12 w-12 text-emerald-400" />
        <span className="font-bold text-2xl text-emerald-400">Cloud Institution</span>
      </Link>
      <Card className="w-full max-w-md border-none shadow-lg bg-slate-800/50 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-slate-100">Create your account</CardTitle>
          <CardDescription className="text-center text-slate-400">Sign up to buy a course and start learning right away</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="p-3 text-sm bg-red-950/50 border border-red-800 text-red-400 rounded-md">{error}</div>}
            {([
              ["name", "Full name", "text", "Your name"],
              ["email", "Email", "email", "name@example.com"],
              ["phone", "Phone (optional)", "tel", "+91 98765 43210"],
              ["password", "Password (min 8 characters)", "password", ""],
            ] as const).map(([k, label, type, ph]) => (
              <div key={k} className="space-y-2">
                <Label htmlFor={k} className="text-slate-200">{label}</Label>
                <Input id={k} type={type} placeholder={ph} required={k !== "phone"} minLength={k === "password" ? 8 : undefined} value={f[k]} onChange={set(k)}
                  className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500" />
              </div>
            ))}
            <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
              {busy ? "Creating account…" : "Sign up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t border-slate-700 bg-slate-900/50 rounded-b-lg py-4 text-sm text-slate-400">
          Already have an account?&nbsp;<Link href="/login" className="text-emerald-400 hover:underline">Log in</Link>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function SignupPage() {
  return <Suspense fallback={null}><SignupForm /></Suspense>
}
