"use client"

import LearnerShell from "@/components/learner/learner-shell"
import { rupees } from "@/lib/learner-client"

const fmt = (iso: string) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "")

export default function PurchaseHistory() {
  return (
    <LearnerShell>
      {({ enrollments }) => (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Purchase History</h1>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-purple-50"><tr>{["Course", "Amount", "Payment ID", "Date"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {enrollments.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">You have not bought a course yet.</td></tr>}
                {enrollments.map((e) => (
                  <tr key={e.course_id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{e.title}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{rupees(e.amount)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{e.payment_id ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmt(e.enrolled_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </LearnerShell>
  )
}
