import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"
import { getBackendsOverride, type StorageBucketLike } from "./backends"

/**
 * Initialise firebase-admin once per server instance, using the modular API
 * (firebase-admin v14 removed the old `admin.apps` / `admin.firestore()` namespace).
 * Same env vars as the existing /api/admin/* routes: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
 * FIREBASE_PRIVATE_KEY — plus the storage bucket already configured for the client SDK.
 */
function initAdmin() {
  if (getApps().length) return

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase admin credentials (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY).")
  }

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: storageBucketName(),
  })
}

export function storageBucketName(): string | undefined {
  return process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined
}

export function getDb(): Firestore {
  const override = getBackendsOverride()
  if (override) return override.db
  initAdmin()
  return getFirestore()
}

export function getBucket(): StorageBucketLike {
  const override = getBackendsOverride()
  if (override) return override.bucket
  initAdmin()
  const name = storageBucketName()
  if (!name) {
    throw new Error("No storage bucket configured (set FIREBASE_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).")
  }
  return getStorage().bucket(name) as unknown as StorageBucketLike
}
