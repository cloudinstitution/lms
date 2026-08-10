// app/api/youtube/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const HUB_URL = "https://pubsubhubbub.appspot.com/subscribe"

export async function POST(req: NextRequest) {
  const { channelId } = await req.json()

  if (!channelId) {
    return NextResponse.json({ error: "channelId is required" }, { status: 400 })
  }

  if (!process.env.WEBSUB_CALLBACK_URL || !process.env.WEBSUB_SECRET) {
    return NextResponse.json(
      { error: "WEBSUB_CALLBACK_URL or WEBSUB_SECRET is not set on the server" },
      { status: 500 }
    )
  }

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

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: "Subscription request failed", details: text }, { status: 502 })
  }

  // Google verifies asynchronously — it will send a GET to your callback URL
  // (/api/youtube/websub) within a few seconds to confirm you own it.
  return NextResponse.json({ status: "subscription requested", channelId, topicUrl })
}