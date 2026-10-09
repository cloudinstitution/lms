"use client"

import { storage } from "@/lib/firebase"
import { ref, uploadBytesResumable } from "firebase/storage"

const STALL_MS = 25_000

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
