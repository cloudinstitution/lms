"use client"

import { StatusBadge } from "@/components/certificates/status-badge"
import StudentLayout from "@/components/student-layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ApiFailure, LOGIN_AGAIN_MESSAGE, api } from "@/lib/certificate-client"
import { Award, Download, Eye } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface Cert {
  certificate_id: string
  course_name: string
  project_title: string
  issue_date_display: string
  status: string
}

export default function MyCertificatesPage() {
  const [certs, setCerts] = useState<Cert[]>([])
  const [loading, setLoading] = useState(true)
  const [needsLogin, setNeedsLogin] = useState(false)

  useEffect(() => {
    api("/api/student/certificates")
      .then((d) => setCerts(d.certificates))
      .catch((e) => {
        if (e instanceof ApiFailure && e.needsLogin) setNeedsLogin(true)
        else toast.error(e.message)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <StudentLayout>
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <div>
          <h1 className="text-2xl font-bold">My Certificates</h1>
          <p className="text-muted-foreground">Certificates are issued automatically when your project is accepted.</p>
        </div>
        {needsLogin && (
          <Alert variant="destructive">
            <AlertTitle>Please sign in again</AlertTitle>
            <AlertDescription>{LOGIN_AGAIN_MESSAGE}</AlertDescription>
          </Alert>
        )}
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && !needsLogin && certs.length === 0 && (
          <Card>
            <CardContent className="space-y-3 py-10 text-center">
              <Award className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">You don't have a certificate yet. Submit your project and it will appear here once approved.</p>
              <Button asChild><Link href="/student/projects">Go to My Projects</Link></Button>
            </CardContent>
          </Card>
        )}
        {certs.map((c) => (
          <Card key={c.certificate_id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold">{c.project_title}</span>
                  <StatusBadge status={c.status} />
                </div>
                <div className="text-sm text-muted-foreground">{c.course_name} · Issued {c.issue_date_display}</div>
                <div className="font-mono text-sm">{c.certificate_id}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/student/certificates/${encodeURIComponent(c.certificate_id)}`}><Eye className="mr-2 h-4 w-4" />View</Link>
                </Button>
                {c.status === "Valid" && (
                  <Button asChild>
                    <a href={`/api/student/certificates/${encodeURIComponent(c.certificate_id)}/download`}><Download className="mr-2 h-4 w-4" />Download PDF</a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </StudentLayout>
  )
}
