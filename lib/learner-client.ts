export class LearnerApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message) }
}

export async function learnerApi<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    credentials: "same-origin",
    headers: init.body ? { "Content-Type": "application/json" } : undefined,
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new LearnerApiError(data?.error || "Something went wrong. Please try again.", res.status, data?.code)
  return data as T
}

export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`

/** Returns the signed-in learner, or null when nobody (or a student/admin) is signed in as a learner. */
export async function currentLearner() {
  try {
    return await learnerApi<{ learner: { name: string; email: string }; enrollments: any[] }>("/api/learner/me")
  } catch {
    return null
  }
}

let checkoutLoading: Promise<void> | null = null
export function loadCheckout(): Promise<void> {
  if ((window as any).Razorpay) return Promise.resolve()
  if (!checkoutLoading) {
    checkoutLoading = new Promise((resolve, reject) => {
      const s = document.createElement("script")
      s.src = "https://checkout.razorpay.com/v1/checkout.js"
      s.onload = () => resolve()
      s.onerror = () => { checkoutLoading = null; reject(new Error("Could not load the payment window. Check your connection and try again.")) }
      document.body.appendChild(s)
    })
  }
  return checkoutLoading
}
