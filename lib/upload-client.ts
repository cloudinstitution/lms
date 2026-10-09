"use client"

import { db, storage } from "@/lib/firebase"
import { doc, setDoc } from "firebase/firestore"
import { ref, uploadBytesResumable } from "firebase/storage"

const STALL_MS = 12_000
/** Largest file kept in Firestore when Cloud Storage cannot be used (512 KB chunks). */
export const FIRESTORE_FALLBACK_MAX_BYTES = 10 * 1024 * 1024
const CHUNK_BYTES = 512 * 1024
const STORAGE_DOWN_KEY = "lms.storageDownUntil"

/** Turn a Firebase Storage error code into something an administrator can act on. */
export function explainStorageError(e: any): string {
  const code = String(e?.code || "")
  const bucket = (storage as any)?._bucket?.bucket || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "(not set)"
  const server = e?.customData?.serverResponse ? ` Server said: ${String(e.customData.serverResponse).slice(0, 160)}` : ""
  if (code === "storage/unauthorized" || code === "storage/unauthenticated") return "Firebase Storage rules do not allow this upload (storage/unauthorized). Update the Storage rules to allow writes to this path."
  if (code === "storage/retry-limit-exceeded" || code === "storage/stalled") return `Could not reach Firebase Storage (network, CORS or the bucket is not set up). Check the storage bucket name and that Storage is enabled for the project. [bucket: ${bucket}, code: ${code}]${server}`
  if (code === "storage/bucket-not-found") return "The Firebase Storage bucket was not found. Check NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET."
  if (code === "storage/quota-exceeded") return "Firebase Storage quota exceeded."
  return `${code || "storage error"}${e?.message ? ` — ${String(e.message).slice(0, 160)}` : ""}`
}

/**
 * Upload with progress and a stall guard: the Storage SDK otherwise retries silently for minutes when the bucket is unreachable
 * or the rules deny the write, which looks like an endless "Uploading…".
 */
export function uploadWithProgress(file: File, path: string, contentType: string, onProgress?: (fraction: number) => void): Promise<void> {
  try {
    storage.maxUploadRetryTime = 20_000
    storage.maxOperationRetryTime = 20_000
  } catch {
    /* read-only in some SDK versions */
  }
  return new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, path), file, { contentType })
    let timer: ReturnType<typeof setTimeout>
    const arm = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        task.cancel()
        reject(Object.assign(new Error("upload stalled"), { code: "storage/stalled" }))
      }, STALL_MS)
    }
    arm()
    task.on(
      "state_changed",
      (snap: any) => {
        arm()
        onProgress?.(snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0)
      },
      (err: any) => {
        clearTimeout(timer)
        reject(err)
      },
      () => {
        clearTimeout(timer)
        resolve()
      },
    )
  })
}

const storedKey = (path: string) => encodeURIComponent(path)

function readAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "")
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

/** Keep a file in Firestore (chunked base64) under the same virtual path Cloud Storage would have used. */
export async function uploadViaFirestore(file: File, path: string, contentType: string, onProgress?: (fraction: number) => void): Promise<void> {
  if (file.size > FIRESTORE_FALLBACK_MAX_BYTES) {
    throw Object.assign(new Error(`"${file.name}" is larger than ${FIRESTORE_FALLBACK_MAX_BYTES / 1024 / 1024} MB, which is the limit while Cloud Storage is unavailable.`), { code: "lms/too-large" })
  }
  const key = storedKey(path)
  const chunks = Math.max(1, Math.ceil(file.size / CHUNK_BYTES))
  let done = 0
  const writeChunk = async (i: number) => {
    const data = await readAsBase64(file.slice(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES))
    await setDoc(doc(db, "file_chunks", `${key}__${i}`), { file_key: key, index: i, data })
    onProgress?.(++done / chunks)
  }
  const queue = Array.from({ length: chunks }, (_, i) => i)
  await Promise.all(
    Array.from({ length: Math.min(4, chunks) }, async () => {
      for (let i = queue.shift(); i !== undefined; i = queue.shift()) await writeChunk(i)
    }),
  )
  // Metadata last: once it exists the file is complete.
  await setDoc(doc(db, "stored_files", key), { path, size: file.size, content_type: contentType, chunks, created_at: new Date().toISOString() })
}

const storageIsDown = () => {
  try {
    return Number(sessionStorage.getItem(STORAGE_DOWN_KEY) || 0) > Date.now()
  } catch {
    return false
  }
}

/**
 * Upload to Cloud Storage; if Storage cannot be reached (not set up, CORS, wrong bucket, rules) keep the file in Firestore instead,
 * so submitting a project never gets stuck. Resolves with where the file ended up.
 */
export async function uploadSmart(file: File, path: string, contentType: string, onProgress?: (fraction: number) => void): Promise<"storage" | "firestore"> {
  if (!storageIsDown()) {
    try {
      await uploadWithProgress(file, path, contentType, onProgress)
      return "storage"
    } catch (e: any) {
      const code = String(e?.code || "")
      const unusable = /retry-limit|stalled|bucket-not-found|unauthorized|unauthenticated|project-not-found|unknown|canceled/.test(code) || !code
      if (!unusable) throw e
      try {
        sessionStorage.setItem(STORAGE_DOWN_KEY, String(Date.now() + 10 * 60 * 1000))
      } catch {
        /* ignore */
      }
    }
  }
  await uploadViaFirestore(file, path, contentType, onProgress)
  return "firestore"
}
