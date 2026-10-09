import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"
import { getApp, getApps as getWebApps, initializeApp as initializeWebApp } from "firebase/app"
import * as webFirestore from "firebase/firestore"
import * as webStorage from "firebase/storage"
import { getBackendsOverride, type StorageBucketLike } from "./backends"
import { createWebBucket, createWebDb } from "./web-backend"

/**
 * Initialise firebase-admin once per server instance, using the modular API
 * (firebase-admin v14 removed the old `admin.apps` / `admin.firestore()` namespace).
 * Same env vars as the existing /api/admin/* routes: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
 * FIREBASE_PRIVATE_KEY — plus the storage bucket already configured for the client SDK.
 */
function hasAdminCredentials(): boolean {
  return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
}

/** Firebase web app (public config) used when no service-account credentials are configured. */
function webApp() {
  const NAME = "lms-server-web"
  if (getWebApps().some((a) => a.name === NAME)) return getApp(NAME)
  return initializeWebApp(
    {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
    NAME,
  )
}

let webDbCache: Firestore | null = null
let webBucketCache: StorageBucketLike | null = null

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
  if (!hasAdminCredentials()) {
    if (!webDbCache) {
      const app = webApp()
      // Long-polling is the most reliable transport from serverless functions.
      let fdb
      try {
        fdb = webFirestore.initializeFirestore(app, { experimentalForceLongPolling: true })
      } catch {
        fdb = webFirestore.getFirestore(app)
      }
      webDbCache = createWebDb(webFirestore, fdb) as unknown as Firestore
    }
    return webDbCache
  }
  initAdmin()
  return getFirestore()
}

export function getBucket(): StorageBucketLike {
  const override = getBackendsOverride()
  if (override) return override.bucket
  if (!hasAdminCredentials()) {
    webBucketCache ??= createWebBucket(webStorage, webStorage.getStorage(webApp())) as unknown as StorageBucketLike
    return webBucketCache
  }
  initAdmin()
  const name = storageBucketName()
  if (!name) {
    throw new Error("No storage bucket configured (set FIREBASE_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).")
  }
  return getStorage().bucket(name) as unknown as StorageBucketLike
}
