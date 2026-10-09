/**
 * Files kept in Firestore instead of Cloud Storage.
 *
 * When the browser cannot reach Firebase Storage (bucket not set up, CORS, rules…), small uploads fall back to being stored as
 * base64 chunks in Firestore (`stored_files/{key}` metadata + `file_chunks/{key}__{n}`), under the same virtual path the Storage
 * object would have had. Everything that works with a Storage path (verification, download, delete) transparently handles both.
 */
import type { Firestore } from "firebase-admin/firestore"
import type { StorageBucketLike } from "./backends"

export const STORED_META = "stored_files"
export const STORED_CHUNKS = "file_chunks"
export const STORED_URL_PREFIX = "firestore-file://"

export const storedKey = (path: string) => encodeURIComponent(path)

export interface StoredMeta {
  path: string
  size: number
  content_type: string
  chunks: number
}

export async function getStoredMeta(db: Firestore, path: string): Promise<StoredMeta | null> {
  const snap = await db.collection(STORED_META).doc(storedKey(path)).get()
  return snap.exists ? (snap.data() as StoredMeta) : null
}

/** Stream the file chunk by chunk (keeps memory low and avoids the serverless response-size limit). */
export function streamStoredFile(db: Firestore, meta: StoredMeta): ReadableStream<Uint8Array> {
  const key = storedKey(meta.path)
  let i = 0
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (i >= meta.chunks) return controller.close()
      const snap = await db.collection(STORED_CHUNKS).doc(`${key}__${i}`).get()
      if (!snap.exists) return controller.error(new Error("A stored file chunk is missing"))
      controller.enqueue(new Uint8Array(Buffer.from((snap.data() as { data: string }).data, "base64")))
      i++
    },
  })
}

export async function deleteStoredFile(db: Firestore, path: string): Promise<boolean> {
  const meta = await getStoredMeta(db, path)
  if (!meta) return false
  const key = storedKey(path)
  await Promise.all(Array.from({ length: meta.chunks }, (_, i) => db.collection(STORED_CHUNKS).doc(`${key}__${i}`).delete()))
  await db.collection(STORED_META).doc(key).delete()
  return true
}

/** A bucket that first looks for the file among Firestore-stored files, then defers to the real bucket. */
export function wrapBucket(real: StorageBucketLike, getDb: () => Firestore): StorageBucketLike {
  return {
    file(path: string) {
      const f = real.file(path)
      return {
        async getSignedUrl(o) {
          if (o.action === "read" && (await getStoredMeta(getDb(), path))) return [`${STORED_URL_PREFIX}${path}`]
          return f.getSignedUrl(o)
        },
        async getMetadata() {
          const m = await getStoredMeta(getDb(), path)
          if (m) return [{ size: m.size, contentType: m.content_type }]
          return f.getMetadata()
        },
        async exists() {
          if (await getStoredMeta(getDb(), path)) return [true] as [boolean]
          return f.exists()
        },
        async delete(opts) {
          if (await deleteStoredFile(getDb(), path)) return
          return f.delete(opts)
        },
      }
    },
  }
}
