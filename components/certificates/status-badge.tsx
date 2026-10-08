import { Badge } from "@/components/ui/badge"

const STYLES: Record<string, string> = {
  Submitted: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200",
  "Under Review": "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200",
  Accepted: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200",
  Rejected: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200",
  "Resubmission Required": "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200",
  Valid: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200",
  Revoked: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={STYLES[status] ?? ""}>
      {status}
    </Badge>
  )
}

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"
