"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BadgeCheck, Loader2, ShieldAlert, ShieldX } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

/** Public certificate verification page (the QR code opens this). */
export default function VerifyCertificatePage() {
  const { key } = useParams() as { key: string }
  const router = useRouter()
  const [result, setResult] = useState<any>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch(`/api/certificate/verify/${encodeURIComponent(decodeURIComponent(String(key)))}`, { credentials: "same-origin", cache: "no-store" })
      .then(async (r) => {
        const data = await r.json().catch(() => null)
        if (!data) throw new Error("bad response")
        // A logged-in student who scans their own certificate goes straight to their LMS page.
        if (data.status === "VALID" && data.is_owner && data.owner_url) {
          router.replace(data.owner_url)
          return
        }
        setResult(data)
      })
      .catch(() => setFailed(true))
  }, [key, router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-5 p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Cloud Institution · Certificate Verification</p>
          {!result && !failed && <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}
          {failed && <p className="text-red-600">Verification is temporarily unavailable. Please try again.</p>}

          {result?.status === "VALID" && (
            <>
              <BadgeCheck className="mx-auto h-16 w-16 text-emerald-600" />
              <h1 className="text-2xl font-bold text-emerald-700">Valid Certificate</h1>
              <dl className="space-y-3 text-left text-sm">
                {[
                  ["Student", result.student_name],
                  ["Course", result.course_name],
                  ["Project", result.project_title],
                  ["Issued", result.issue_date_display],
                  ["Certificate ID", result.certificate_id],
                  ["Issued by", result.organization],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b pb-2"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
                ))}
              </dl>
              {result.public_download && (
                <Button asChild><a href={`/api/certificate/verify/${encodeURIComponent(String(key))}/download`}>Download certificate</a></Button>
              )}
            </>
          )}

          {result?.status === "REVOKED" && (
            <>
              <ShieldAlert className="mx-auto h-16 w-16 text-red-600" />
              <h1 className="text-2xl font-bold text-red-700">Certificate Revoked</h1>
              <p className="text-sm text-muted-foreground">Certificate {result.certificate_id} is no longer valid.</p>
            </>
          )}

          {result?.status === "NOT_FOUND" && (
            <>
              <ShieldX className="mx-auto h-16 w-16 text-red-600" />
              <h1 className="text-2xl font-bold text-red-700">Certificate Not Found / Invalid Certificate</h1>
              <p className="text-sm text-muted-foreground">We could not find a certificate matching this link or code.</p>
            </>
          )}
          <Button variant="ghost" size="sm" asChild><Link href="/">Back to home</Link></Button>
        </CardContent>
      </Card>
    </main>
  )
}
