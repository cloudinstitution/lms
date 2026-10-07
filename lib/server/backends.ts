/**
 * Narrow interfaces for the two cloud services the certificate feature touches.
 *
 * Production code gets the real firebase-admin Firestore / Storage bucket from
 * `./firebase-admin`. Tests (and only tests) can install in-memory stand-ins on
 * `globalThis.__LMS_BACKENDS__` before any route runs; nothing in production sets it.
 */
import type { Firestore } from "firebase-admin/firestore"

export interface StorageFileLike {
  getSignedUrl(options: {
    version: "v4"
    action: "read" | "write"
    expires: number
    contentType?: string
    responseDisposition?: string
  }): Promise<[string]>
  getMetadata(): Promise<[{ size?: string | number; contentType?: string }]>
  exists(): Promise<[boolean]>
  delete(options?: { ignoreNotFound?: boolean }): Promise<unknown>
}

export interface StorageBucketLike {
  file(path: string): StorageFileLike
}

export interface Backends {
  db: Firestore
  bucket: StorageBucketLike
}

declare global {
  // eslint-disable-next-line no-var
  var __LMS_BACKENDS__: Backends | undefined
}

export function getBackendsOverride(): Backends | undefined {
  return globalThis.__LMS_BACKENDS__
}
