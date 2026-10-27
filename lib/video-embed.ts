export type YoutubeSource = { videoId?: string; playlistId?: string }

/** Video and/or playlist id from any YouTube link: watch, youtu.be, /embed/ID, /embed/videoseries?list=, shorts, live. */
export function youtubeSource(raw: string): YoutubeSource {
  const input = (raw || "").trim()
  try {
    const u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`)
    const list = u.searchParams.get("list") || undefined
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0]
      return id ? { videoId: id, playlistId: list } : list ? { playlistId: list } : {}
    }
    if (u.hostname.endsWith("youtube.com") || u.hostname.endsWith("youtube-nocookie.com")) {
      if (u.pathname.startsWith("/embed/videoseries") || u.pathname === "/playlist") return list ? { playlistId: list } : {}
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?]+)/)
      const id = m?.[1] || u.searchParams.get("v") || undefined
      if (id) return { videoId: id, playlistId: list }
      if (list) return { playlistId: list }
    }
  } catch { /* fall through to the loose match */ }
  const loose = input.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/)?.[1]
  return loose ? { videoId: loose } : {}
}

export const youtubeId = (link: string): string | null => youtubeSource(link).videoId ?? null

/** Plain iframe URL for a YouTube link (single video, or a playlist when there is no video id). */
export const youtubeEmbedUrl = (link: string): string | null => {
  const { videoId, playlistId } = youtubeSource(link)
  if (videoId) return `https://www.youtube.com/embed/${videoId}`
  if (playlistId) return `https://www.youtube.com/embed/videoseries?list=${playlistId}`
  return null
}

/** File id from a Google Drive link (/file/d/ID/..., open?id=ID, uc?id=ID). */
export const driveId = (link: string): string | null =>
  (link || "").match(/\/d\/([A-Za-z0-9_-]+)/)?.[1] ?? (link || "").match(/[?&]id=([A-Za-z0-9_-]+)/)?.[1] ?? null

export const driveEmbedUrl = (link: string): string | null => {
  const id = driveId(link)
  return id ? `https://drive.google.com/file/d/${id}/preview` : null
}
