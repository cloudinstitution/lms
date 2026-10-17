"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Phone } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

const PHONE = "+917676370336"
const WHATSAPP = "917676370336"

/** "Schedule a Consultation": a short form that goes to the admin, plus direct call / WhatsApp. */
export default function ConsultationButton({ label = "Schedule a Consultation", interest = "" }: { label?: string; interest?: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [f, setF] = useState({ name: "", phone: "", email: "", message: "" })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const submit = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/consultations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, interest }) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d?.error || "Could not send your request")
      setDone(true)
    } catch (e: any) { toast.error(e?.message || "Could not send your request") }
    setBusy(false)
  }
  const close = (o: boolean) => { setOpen(o); if (!o && done) { setDone(false); setF({ name: "", phone: "", email: "", message: "" }) } }

  return (
    <>
      <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700" onClick={() => setOpen(true)}>{label}</Button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{done ? "Thank you!" : "Talk to a counselor"}</DialogTitle>
            <DialogDescription>{done ? "We have your request and will call you soon." : "Leave your details and we will call you back, or reach us right now."}</DialogDescription>
          </DialogHeader>
          {!done && (
            <div className="space-y-3">
              <Input placeholder="Your name" value={f.name} onChange={set("name")} />
              <Input placeholder="Mobile number" inputMode="tel" value={f.phone} onChange={set("phone")} />
              <Input placeholder="Email (optional)" type="email" value={f.email} onChange={set("email")} />
              <Textarea placeholder="Which course or career goal? (optional)" value={f.message} onChange={set("message")} rows={3} />
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={submit}>{busy ? "Sending…" : "Request a call-back"}</Button>
            </div>
          )}
          <div className="flex gap-2 border-t pt-3">
            <a href={`tel:${PHONE}`} className="flex-1"><Button variant="outline" className="w-full"><Phone className="mr-2 h-4 w-4" />Call us</Button></a>
            <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hi, I'd like help choosing a course.")}`} target="_blank" rel="noopener noreferrer" className="flex-1"><Button variant="outline" className="w-full">WhatsApp</Button></a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
