"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { clearSession } from "@/lib/session-storage"

/** Shown when the server has no secure session for this browser (e.g. logged in before the feature was deployed). */
export function SignInAgain() {
  return (
    <Alert variant="destructive">
      <AlertTitle>Please sign in again</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>Your secure session for Projects &amp; Certificates has not started or has expired. Sign out and log in once more to continue.</p>
        <Button
          size="sm"
          onClick={() => {
            clearSession()
            window.location.href = "/login"
          }}
        >
          Log out &amp; sign in again
        </Button>
      </AlertDescription>
    </Alert>
  )
}
