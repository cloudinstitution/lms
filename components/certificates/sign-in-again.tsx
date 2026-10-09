"use client"

/**
 * Intentionally renders nothing: there is no separate "server login" or sign-in prompt. Users stay signed in through the normal
 * LMS login; if the server cannot be reached, the failure is reported as a toast (see lib/certificate-client.ts).
 */
export function SignInAgain() {
  return null
}
