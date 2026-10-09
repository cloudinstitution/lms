/**
 * Fallback data backend that needs NO service-account credentials.
 *
 * The LMS already talks to Firestore / Storage with the public Firebase web config (NEXT_PUBLIC_FIREBASE_*), exactly like the
 * login page and the Courses page do. When FIREBASE_PRIVATE_KEY & co. are not configured, the server-side Projects & Certificates
 * code uses this adapter, which exposes the small slice of the firebase-admin API the services need on top of the web SDK.
 *
 * The web SDK is injected (`F` = firebase/firestore, `S` = firebase/storage) so the adapter can be unit-tested with fakes.
 */

const already = (path: string) => Object.assign(new Error(`6 ALREADY_EXISTS: Document already exists: ${path}`), { code: 6 })

export function createWebDb(F: any, fdb: any) {
  class WSnap {
    constructor(private s: any) {}
    get id(): string { return this.s.id }
    get exists(): boolean { return this.s.exists() }
    get ref() { return new WDoc(this.s.ref) }
    data() { return this.s.exists() ? this.s.data() : undefined }
  }
  const wrapQuerySnap = (qs: any) => ({ docs: qs.docs.map((d: any) => new WSnap(d)), empty: qs.empty as boolean, size: qs.size as number })

  class WDoc {
    constructor(public raw: any) {}
    get id(): string { return this.raw.id }
    async get() { return new WSnap(await F.getDoc(this.raw)) }
    async set(data: any) { await F.setDoc(this.raw, data) }
    async create(data: any) {
      await F.runTransaction(fdb, async (tx: any) => {
        if ((await tx.get(this.raw)).exists()) throw already(this.raw.path)
        tx.set(this.raw, data)
      })
    }
    async update(patch: any) { await F.updateDoc(this.raw, patch) }
    async delete() { await F.deleteDoc(this.raw) }
  }

  class WQuery {
    constructor(public raw: any) {}
    where(field: string, op: string, value: any) { return new WQuery(F.query(this.raw, F.where(field, op, value))) }
    limit(n: number) { return new WQuery(F.query(this.raw, F.limit(n))) }
    async get() { return wrapQuerySnap(await F.getDocs(this.raw)) }
  }

  class WCollection extends WQuery {
    constructor(private name: string) { super(F.collection(fdb, name)) }
    doc(id?: string) { return new WDoc(id ? F.doc(fdb, this.name, id) : F.doc(F.collection(fdb, this.name))) }
    async add(data: any) { return new WDoc(await F.addDoc(this.raw, data)) }
  }

  return {
    collection: (name: string) => new WCollection(name),
    /**
     * Transactions: document reads/writes are real web-SDK transaction operations. The web SDK cannot run *queries* inside a
     * transaction, so `tx.get(query)` is a plain read. `tx.create()` is checked (document must not exist) just before the writes
     * are applied, which keeps the one-certificate-per-student guarantee.
     */
    async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
      return F.runTransaction(fdb, async (rtx: any) => {
        const writes: (() => void)[] = []
        const creates: any[] = []
        const tx = {
          get: async (target: any) => (target instanceof WDoc ? new WSnap(await rtx.get(target.raw)) : wrapQuerySnap(await F.getDocs(target.raw))),
          create: (ref: WDoc, data: any) => { creates.push(ref.raw); writes.push(() => rtx.set(ref.raw, data)); return tx },
          set: (ref: WDoc, data: any) => { writes.push(() => rtx.set(ref.raw, data)); return tx },
          update: (ref: WDoc, patch: any) => { writes.push(() => rtx.update(ref.raw, patch)); return tx },
          delete: (ref: WDoc) => { writes.push(() => rtx.delete(ref.raw)); return tx },
        }
        const result = await fn(tx)
        for (const c of creates) if ((await rtx.get(c)).exists()) throw already(c.path)
        writes.forEach((w) => w())
        return result
      })
    },
  }
}

export function createWebBucket(S: any, storage: any) {
  return {
    file(path: string) {
      const ref = () => S.ref(storage, path)
      return {
        /**
         * There are no signed URLs without a service account. Uploads are done by the browser through the Storage SDK
         * (the slot's `client-upload://` URL tells the page to do that); reads use the file's download URL.
         */
        async getSignedUrl(o: { action: "read" | "write" }): Promise<[string]> {
          if (o.action === "write") return [`client-upload://${path}`]
          return [await S.getDownloadURL(ref())]
        },
        async getMetadata(): Promise<[{ size?: string | number; contentType?: string }]> {
          const m = await S.getMetadata(ref())
          return [{ size: m.size, contentType: m.contentType }]
        },
        async exists(): Promise<[boolean]> {
          try {
            await S.getMetadata(ref())
            return [true]
          } catch {
            return [false]
          }
        },
        async delete(opts?: { ignoreNotFound?: boolean }) {
          try {
            await S.deleteObject(ref())
          } catch (e: any) {
            if (!(opts?.ignoreNotFound && e?.code === "storage/object-not-found")) throw e
          }
        },
      }
    },
  }
}
