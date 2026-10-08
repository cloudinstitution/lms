"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { lastResumeError } from "@/lib/server-session-client"

/**
 * Shown only when the server cannot start its session from the LMS login. There is no second login: the user stays signed in
 * to the LMS, and this just reports what went wrong with a retry button.
 */
export function SignInAgain() {
  return (
    <Alert variant="destructive">
      <AlertTitle>Couldn't connect to the server</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          Projects &amp; Certificates could not verify your LMS login{lastResumeError ? ` (${lastResumeError})` : ""}. This is a server
          configuration issue, not a password problem — please tell the administrator.
        </p>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>Try again</Button>
      </AlertDescription>
    </Alert>
  )
}
