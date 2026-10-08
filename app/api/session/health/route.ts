import { NextResponse } from "next/server"
import { getDb } from "@/lib/server/firebase-admin"

/**
 * GET /api/session/health — says which server settings are missing and whether Firestore can be reached.
 * Never returns any secret value, only true/false and an error summary.
 */
export async function GET() {
  const has = (k: string) => Boolean(process.env[k])
  const env = {
    FIREBASE_PROJECT_ID: has("FIREBASE_PROJECT_ID"),
    FIREBASE_CLIENT_EMAIL: has("FIREBASE_CLIENT_EMAIL"),
    FIREBASE_PRIVATE_KEY: has("FIREBASE_PRIVATE_KEY"),
    FIREBASE_STORAGE_BUCKET: has("FIREBASE_STORAGE_BUCKET") || has("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    SESSION_SECRET: has("SESSION_SECRET"),
  }
  let firestore: string = "ok"
  try {
    await getDb().collection("courses").limit(1).get()
  } catch (e) {
    firestore = e instanceof Error ? e.message.replace(/-----BEGIN[\s\S]*?END PRIVATE KEY-----/g, "[key]").slice(0, 300) : "failed"
  }
  return NextResponse.json({ env, firestore }, { headers: { "Cache-Control": "no-store" } })
}
