"use client"

import { Button } from "@/components/ui/button"
import { currentLearner, learnerApi, loadCheckout } from "@/lib/learner-client"
import { Loader2, ShoppingCart } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

/** "Buy now": sign-up first if needed, then Razorpay Checkout. The price is decided by the server, never by this page. */
export default function BuyButton({ courseId, label = "Buy now", className, variant, size }: { courseId: number; label?: string; className?: string; variant?: any; size?: any }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

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
    <Button className={className} variant={variant} size={size} onClick={buy} disabled={busy}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
      {label}
    </Button>
  )
}
