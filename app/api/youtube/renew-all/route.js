// app/api/youtube/renew-all/route.ts
import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

const HUB_URL = "https://pubsubhubbub.appspot.com/subscribe"

export async function GET(req: NextRequest) {
  // Protect this endpoint so random people can't trigger it —
  // Vercel Cron sends a special header; we also allow a manual secret check.
  const authHeader = req.headers.get("authorization")
  const isVercelCron = req.headers.get("x-vercel-cron") !== null
  const providedSecret = authHeader?.replace("Bearer ", "")

  if (!isVercelCron && providedSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.WEBSUB_CALLBACK_URL || !process.env.WEBSUB_SECRET) {
    return NextResponse.json(
      { error: "WEBSUB_CALLBACK_URL or WEBSUB_SECRET is not set on the server" },
      { status: 500 }
    )
  }

  // Find every course that has a YouTube channel linked
  const coursesSnap = await adminDb
    .collection("courses")
    .where("youtubeChannelId", "!=", null)
    .get()

  const results: { courseId: string; channelId: string; status: string }[] = []

  for (const courseDoc of coursesSnap.docs) {
    const channelId = courseDoc.data().youtubeChannelId
    if (!channelId) continue

    try {
      const topicUrl = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`

      const body = new URLSearchParams({
        "hub.callback": process.env.WEBSUB_CALLBACK_URL,
        "hub.topic": topicUrl,
        "hub.verify": "async",
        "hub.mode": "subscribe",
        "hub.secret": process.env.WEBSUB_SECRET,
      })

      const res = await fetch(HUB_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      })

      results.push({
        courseId: courseDoc.id,
        channelId,
        status: res.ok ? "renewed" : `failed (${res.status})`,
      })
    } catch (err) {
      console.error(`Failed to renew subscription for channel ${channelId}:`, err)
      results.push({ courseId: courseDoc.id, channelId, status: "error" })
    }
  }

  return NextResponse.json({ renewedAt: new Date().toISOString(), results })
}