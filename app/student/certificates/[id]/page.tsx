"use client"

import { SignInAgain } from "@/components/certificates/sign-in-again"
import { StatusBadge } from "@/components/certificates/status-badge"
import StudentLayout from "@/components/student-layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ApiFailure, LOGIN_AGAIN_MESSAGE, api } from "@/lib/certificate-client"
import { ArrowLeft, Copy, Download, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export default function CertificateDetailPage() {
  const params = useParams() as { id: string }
  const id = decodeURIComponent(String(params.id))
  const enc = encodeURIComponent(id)
  const [cert, setCert] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)

  useEffect(() => {
    api(`/api/student/certificates/${enc}`)
      .then((d) => setCert(d.certificate))
      .catch((e) => {
        if (e instanceof ApiFailure && e.needsLogin) setNeedsLogin(true)
        else setError(e.message)
      })
  }, [enc])

  const valid = cert?.status === "Valid"

  return (
    <StudentLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
        <Button variant="ghost" size="sm" asChild><Link href="/student/certificates"><ArrowLeft className="mr-2 h-4 w-4" />All certificates</Link></Button>
        {needsLogin && <SignInAgain />}
        {error && <Alert variant="destructive"><AlertTitle>Certificate unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        {cert && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">Certificate {cert.certificate_id}</h1>
              <StatusBadge status={cert.status} />
            </div>
            {!valid && (
              <Alert variant="destructive"><AlertTitle>This certificate has been revoked</AlertTitle><AlertDescription>It can no longer be downloaded and will show as revoked when verified.</AlertDescription></Alert>
            )}
            <Card>
              <CardContent className="grid gap-6 pt-6 md:grid-cols-[1fr_auto]">
                <dl className="space-y-3 text-sm">
                  {[
                    ["Student", cert.student_name],
                    ["Course", cert.course_name],
                    ["Project", cert.project_title],
                    ["Issued", cert.issue_date_display],
                    ["Certificate ID", cert.certificate_id],
                  ].map(([k, v]) => (
                    <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
                  ))}
                </dl>
                {valid && (
                  <div className="text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/student/certificates/${enc}/qr`} alt="Certificate verification QR code" width={160} height={160} className="mx-auto rounded border bg-white p-1" />
                    <p className="mt-1 text-xs text-muted-foreground">Scan to verify</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="flex flex-wrap gap-2">
              {valid && (
                <>
                  <Button asChild><a href={`/api/student/certificates/${enc}/download`}><Download className="mr-2 h-4 w-4" />Download PDF</a></Button>
                  <Button variant="outline" asChild><a href={`/api/student/certificates/${enc}/download?inline=1`} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />View PDF</a></Button>
                </>
              )}
              <Button variant="outline" asChild><a href={cert.verify_url} target="_blank" rel="noreferrer">Open verification page</a></Button>
              <Button variant="ghost" onClick={() => navigator.clipboard.writeText(cert.verify_url).then(() => toast.success("Verification link copied"))}><Copy className="mr-2 h-4 w-4" />Copy link</Button>
            </div>
          </>
        )}
      </div>
    </StudentLayout>
  )
}
