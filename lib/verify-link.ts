import { toast } from "sonner"

/** The public page where anyone can verify an internship by its ID. */
export const internshipVerifyUrl = (id: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/verify/internship/${encodeURIComponent(id)}`

/** Copies the verify link to the clipboard (falls back to showing it). */
export async function copyVerifyLink(id: string) {
  const url = internshipVerifyUrl(id)
  try { await navigator.clipboard.writeText(url); toast.success(`Verify link copied: ${url}`, { duration: 7000 }) } catch { window.prompt("Copy this verify link:", url) }
}
