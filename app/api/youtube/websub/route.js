import { NextRequest, NextResponse } from "next/server"
import { XMLParser } from "fast-xml-parser"
import crypto from "crypto"
import { adminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

// --- Verification handshake ---
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const challenge = params.get("hub.challenge")
  const mode = params.get("hub.mode")

  if (!challenge || (mode !== "subscribe" && mode !== "unsubscribe")) {
    return new NextResponse("Bad request", { status: 400 })
  }

  return new NextResponse(challenge, { status: 200 })
}

// --- Real-time push notification ---
export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const signatureHeader = req.headers.get("x-hub-signature") || ""
  const [algo, receivedSig] = signatureHeader.split("=")
  if (!algo || !receivedSig) {
    return new NextResponse("Missing signature", { status: 401 })
  }
  const expectedSig = crypto
    .createHmac(algo, process.env.WEBSUB_SECRET!)
    .update(rawBody)
    .digest("hex")
  if (expectedSig !== receivedSig) {
    return new NextResponse("Invalid signature", { status: 401 })
  }

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" })
  const parsed = parser.parse(rawBody)

  const feed = parsed?.feed
  if (!feed) return new NextResponse("OK", { status: 200 })

  const entries = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : []

  for (const entry of entries) {
    const videoId: string | undefined = entry["yt:videoId"]
    const channelId: string | undefined = entry["yt:channelId"]
    const feedTitle: string | undefined = entry.title

    if (!videoId || !channelId) continue

    await handleNewOrUpdatedVideo(videoId, channelId, feedTitle)
  }

  return new NextResponse("OK", { status: 200 })
}

async function handleNewOrUpdatedVideo(videoId: string, channelId: string, feedTitle?: string) {
  const existingPending = await adminDb
    .collection("pendingVideos")
    .where("videoId", "==", videoId)
    .limit(1)
    .get()
  if (!existingPending.empty) return

  const courseSnap = await adminDb
    .collection("courses")
    .where("youtubeChannelId", "==", channelId)
    .limit(1)
    .get()
  const courseId = courseSnap.empty ? null : courseSnap.docs[0].id

  let title = feedTitle || "Untitled video"
  let thumbnailUrl = ""
  try {
    const apiRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`
    )
    const apiData = await apiRes.json()
    const snippet = apiData?.items?.[0]?.snippet
    if (snippet) {
      title = snippet.title
      thumbnailUrl = snippet.thumbnails?.medium?.url || ""
    }
  } catch (err) {
    console.error("Failed to fetch video details from YouTube API:", err)
  }

  await adminDb.collection("pendingVideos").add({
    videoId,
    channelId,
    courseId,
    title,
    thumbnailUrl,
    link: `https://www.youtube.com/embed/${videoId}`,
    sourceType: "youtube",
    status: "pending",
    createdAt: new Date().toISOString(),
  })
}