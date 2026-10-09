import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"
import { getApp, getApps as getWebApps, initializeApp as initializeWebApp } from "firebase/app"
import * as webFirestore from "firebase/firestore"
import * as webStorage from "firebase/storage"
import { getBackendsOverride, type StorageBucketLike } from "./backends"
import { wrapBucket } from "./stored-files"
import { createWebBucket, createWebDb } from "./web-backend"

/**
 * Initialise firebase-admin once per server instance, using the modular API
 * (firebase-admin v14 removed the old `admin.apps` / `admin.firestore()` namespace).
 * Same env vars as the existing /api/admin/* routes: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
 * FIREBASE_PRIVATE_KEY — plus the storage bucket already configured for the client SDK.
 */
let adminBroken = false

/** Credentials are present but Google rejected them (wrong project / revoked / bad key): use the web backend from now on. */
export function markAdminBroken() {
  adminBroken = true
}
export function isAdminBroken() {
  return adminBroken
}

/** True for errors that mean "the service-account credentials are not accepted", as opposed to a bug in a request. */
export function isCredentialFailure(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.message} ${(err as any).code ?? ""}` : String(err)
  return /UNAUTHENTICATED|invalid authentication credentials|invalid_grant|invalid_rapt|Could not load the default credentials|Getting metadata from plugin failed|DECODER routines|Invalid PEM|error:1E08010C/i.test(msg)
}

function hasAdminCredentials(): boolean {
  if (adminBroken) return false
  const key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? ""
  // A malformed key (e.g. pasted without its BEGIN/END lines) is treated as "not configured" so the web backend is used instead.
  return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+-----END [A-Z ]*PRIVATE KEY-----/.test(key))
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

function getRealBucket(): StorageBucketLike {
  const override = getBackendsOverride()
  if (override) return override.bucket
  if (!hasAdminCredentials()) {
    if (!webBucketCache) {
      const st = webStorage.getStorage(webApp())
      st.maxOperationRetryTime = 10_000 // fail fast instead of hanging the request when the bucket is unreachable
      st.maxUploadRetryTime = 10_000
      webBucketCache = createWebBucket(webStorage, st) as unknown as StorageBucketLike
    }
    return webBucketCache
  }
  initAdmin()
  const name = storageBucketName()
  if (!name) {
    throw new Error("No storage bucket configured (set FIREBASE_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).")
  }
  return getStorage().bucket(name) as unknown as StorageBucketLike
}

/** Storage bucket (or its web-SDK stand-in), plus files that the browser had to keep in Firestore. */
export function getBucket(): StorageBucketLike {
  return wrapBucket(getRealBucket(), getDb)
}
