/** Pull the video id out of any common YouTube link (watch, youtu.be, embed, shorts, live). */
export const youtubeId = (link: string): string | null =>
  (link || "").match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/|\/v\/)([A-Za-z0-9_-]{11})/)?.[1] ?? null

/** Pull the file id out of a Google Drive link (/file/d/ID/..., open?id=ID, uc?id=ID). */
export const driveId = (link: string): string | null =>
  (link || "").match(/\/d\/([A-Za-z0-9_-]+)/)?.[1] ?? (link || "").match(/[?&]id=([A-Za-z0-9_-]+)/)?.[1] ?? null

export const driveEmbedUrl = (link: string): string | null => {
  const id = driveId(link)
  return id ? `https://drive.google.com/file/d/${id}/preview` : null
}
