"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { currentLearner, learnerApi, loadCheckout, rupees } from "@/lib/learner-client"
import { Loader2, ShoppingCart } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

/** "Buy now": sign-up first if needed, then Razorpay Checkout. The price is decided by the server, never by this page. */
export default function BuyButton({ courseId, label = "Buy now", className, variant, size }: { courseId: number; label?: string; className?: string; variant?: any; size?: any }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [manual, setManual] = useState<{ url: string; title: string; price: number } | null>(null)
  const [reference, setReference] = useState("")
  const [sending, setSending] = useState(false)

  const sendRequest = async () => {
    setSending(true)
    try {
      await learnerApi("/api/payments/request", { body: { course_id: courseId, reference } })
      toast.success("Thanks! We will confirm your payment and unlock the course shortly.")
      setManual(null); setReference("")
    } catch (e: any) {
      toast.error(e?.message || "Could not send your payment details")
    }
    setSending(false)
  }

  const buy = async () => {
    setBusy(true)
    try {
      const me = await currentLearner()
      if (!me) {
        router.push(`/signup?next=${encodeURIComponent(`/courses/${courseId}?buy=1`)}`)
        return
      }
      if (me.enrollments.some((e: any) => e.course_id === courseId)) {
        router.push(`/learner/courses/${courseId}`)
        return
      }
      const cat = await fetch("/api/catalog").then((r) => r.json())
      if (!cat.payments_enabled) {
        const c = (cat.courses || []).find((x: any) => x.id === courseId)
        if (!c || !cat.payment_link_url) throw new Error("Online payments are not enabled yet. Please contact the institute.")
        setManual({ url: cat.payment_link_url, title: c.title, price: c.price })
        setBusy(false)
        return
      }
      const order = await learnerApi("/api/payments/create-order", { body: { course_id: courseId } })
      await loadCheckout()
      const Razorpay = (window as any).Razorpay
      const rz = new Razorpay({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: "Cloud Institution",
        description: order.course.title,
        prefill: order.prefill,
        theme: { color: "#059669" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (r: any) => {
          try {
            await learnerApi("/api/payments/verify", { body: r })
            toast.success("Payment successful. The course is now in your account.")
            router.push(`/learner/courses/${courseId}`)
          } catch (e: any) {
            toast.error(e?.message || "We could not confirm your payment. If money was deducted it will be added to your account shortly.")
            setBusy(false)
          }
        },
      })
      rz.on("payment.failed", (resp: any) => { toast.error(resp?.error?.description || "Payment failed. Please try again."); setBusy(false) })
      rz.open()
      return
    } catch (e: any) {
      toast.error(e?.message || "Could not start the payment")
    }
    setBusy(false)
  }

  return (
    <>
      <Button className={className} variant={variant} size={size} onClick={buy} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
        {label}
      </Button>
      <Dialog open={Boolean(manual)} onOpenChange={(o) => !o && setManual(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay for {manual?.title}</DialogTitle>
            <DialogDescription>Amount to pay: <b>{manual ? rupees(manual.price) : ""}</b></DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-3 pl-5 text-sm">
            <li>
              Open the payment page and pay exactly <b>{manual ? rupees(manual.price) : ""}</b>.
              <div className="mt-2"><a href={manual?.url} target="_blank" rel="noreferrer"><Button type="button" variant="outline" size="sm">Open payment page</Button></a></div>
            </li>
            <li>
              Enter the payment ID (starts with <code>pay_</code>) or UTR number from your receipt.
              <Input className="mt-2" placeholder="e.g. pay_Abc123XYZ" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={60} />
            </li>
            <li>We check the payment and unlock the course, usually within a few hours.</li>
          </ol>
          <Button onClick={sendRequest} disabled={sending || reference.trim().length < 6} className="bg-emerald-600 hover:bg-emerald-700">
            {sending ? "Sending…" : "I have paid"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
