/**
 * In-memory stand-ins for Firestore and the Storage bucket, used only by the tests.
 *
 * They imitate the Firestore behaviours this feature depends on, so mistakes surface here rather than in production:
 *  - `create()` fails if the document already exists (ALREADY_EXISTS) — this is what makes duplicate certificates impossible
 *  - a transaction must do all its reads before its first write
 *  - `undefined` field values are rejected (the real SDK rejects them too)
 *  - transactions are serialised (equivalent isolation to Firestore's optimistic concurrency with retries)
 */
import { randomUUID } from "crypto"

type Data = Record<string, any>

function assertNoUndefined(value: unknown, path = "data") {
  if (value === undefined) throw new Error(`Firestore: ${path} is undefined (Cannot use "undefined" as a Firestore value)`)
  if (Array.isArray(value)) value.forEach((v, i) => assertNoUndefined(v, `${path}[${i}]`))
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) assertNoUndefined(v, `${path}.${k}`)
}
const clone = <T>(v: T): T => structuredClone(v)

class FakeSnap {
  constructor(public id: string, private d: Data | undefined, public ref: FakeDocRef) {}
  get exists() { return this.d !== undefined }
  data() { return this.d === undefined ? undefined : clone(this.d) }
}

class FakeQuerySnap {
  constructor(public docs: FakeSnap[]) {}
  get empty() { return this.docs.length === 0 }
  get size() { return this.docs.length }
}

export class FakeDocRef {
  constructor(public db: FakeDb, public col: string, public id: string) {}
  async get() { return this.db.snap(this) }
  async set(data: Data) { assertNoUndefined(data); this.db.put(this.col, this.id, clone(data)) }
  async create(data: Data) { assertNoUndefined(data); this.db.createDoc(this.col, this.id, clone(data)) }
  async update(patch: Data) { assertNoUndefined(patch); this.db.updateDoc(this.col, this.id, patch) }
  async delete() { this.db.collections.get(this.col)?.delete(this.id) }
}

export class FakeQuery {
  constructor(public db: FakeDb, public col: string, public filters: [string, any][] = []) {}
  where(field: string, op: string, value: any) {
    if (op !== "==") throw new Error(`fake firestore: operator ${op} not supported`)
    return new FakeQuery(this.db, this.col, [...this.filters, [field, value]])
  }
  async get() { return this.db.runQuery(this) }
}

class FakeCollection extends FakeQuery {
  doc(id?: string) { return new FakeDocRef(this.db, this.col, id ?? randomUUID().replace(/-/g, "").slice(0, 20)) }
  async add(data: Data) { const ref = this.doc(); await ref.set(data); return ref }
}

class FakeTx {
  private writes: (() => void)[] = []
  private wrote = false
  constructor(private db: FakeDb) {}
  async get(target: FakeDocRef | FakeQuery) {
    if (this.wrote) throw new Error("Firestore transactions require all reads to be executed before all writes.")
    return target instanceof FakeDocRef ? this.db.snap(target) : this.db.runQuery(target)
  }
  create(ref: FakeDocRef, data: Data) { assertNoUndefined(data); this.wrote = true; this.writes.push(() => this.db.createDoc(ref.col, ref.id, clone(data))); return this }
  set(ref: FakeDocRef, data: Data) { assertNoUndefined(data); this.wrote = true; this.writes.push(() => this.db.put(ref.col, ref.id, clone(data))); return this }
  update(ref: FakeDocRef, patch: Data) { assertNoUndefined(patch); this.wrote = true; this.writes.push(() => this.db.updateDoc(ref.col, ref.id, patch)); return this }
  delete(ref: FakeDocRef) { this.wrote = true; this.writes.push(() => { this.db.collections.get(ref.col)?.delete(ref.id) }); return this }
  commit() {
    // Atomic: validate by applying to a copy, then swap in only if every write succeeds.
    const backup = this.db.snapshotAll()
    try {
      this.writes.forEach((w) => w())
    } catch (e) {
      this.db.restoreAll(backup)
      throw e
    }
  }
}

export class FakeDb {
  collections = new Map<string, Map<string, Data>>()
  private lock: Promise<unknown> = Promise.resolve()

  collection(name: string) { return new FakeCollection(this, name) }

  async runTransaction<T>(fn: (tx: FakeTx) => Promise<T>): Promise<T> {
    const run = this.lock.then(async () => {
      const tx = new FakeTx(this)
      const result = await fn(tx)
      tx.commit()
      return result
    })
    this.lock = run.catch(() => undefined)
    return run
  }

  private col(name: string) {
    let c = this.collections.get(name)
    if (!c) this.collections.set(name, (c = new Map()))
    return c
  }
  snap(ref: FakeDocRef) { return new FakeSnap(ref.id, this.col(ref.col).get(ref.id), ref) }
  put(col: string, id: string, data: Data) { this.col(col).set(id, data) }
  createDoc(col: string, id: string, data: Data) {
    if (this.col(col).has(id)) throw Object.assign(new Error(`6 ALREADY_EXISTS: Document already exists: ${col}/${id}`), { code: 6 })
    this.col(col).set(id, data)
  }
  updateDoc(col: string, id: string, patch: Data) {
    const cur = this.col(col).get(id)
    if (!cur) throw Object.assign(new Error(`5 NOT_FOUND: No document to update: ${col}/${id}`), { code: 5 })
    this.col(col).set(id, { ...cur, ...clone(patch) })
  }
  runQuery(q: FakeQuery) {
    const docs = [...this.col(q.col).entries()]
      .filter(([, d]) => q.filters.every(([f, v]) => d[f] === v))
      .map(([id, d]) => new FakeSnap(id, d, new FakeDocRef(this, q.col, id)))
    return new FakeQuerySnap(docs)
  }
  snapshotAll() { return new Map([...this.collections].map(([k, v]) => [k, new Map([...v].map(([id, d]) => [id, clone(d)]))])) }
  restoreAll(b: Map<string, Map<string, Data>>) { this.collections = b }

  // test helpers
  seed(col: string, id: string, data: Data) { this.put(col, id, clone(data)) }
  all(col: string) { return [...this.col(col).entries()].map(([id, d]) => ({ id, ...clone(d) })) }
  get(col: string, id: string) { const d = this.col(col).get(id); return d ? clone(d) : undefined }
}

export class FakeBucket {
  objects = new Map<string, { size: number; contentType: string }>()
  deleted: string[] = []
  /** Simulate the browser PUT to a signed upload URL. */
  put(path: string, size: number, contentType = "application/octet-stream") { this.objects.set(path, { size, contentType }) }
  file(path: string) {
    return {
      getSignedUrl: async (o: { action: string; expires: number; contentType?: string; responseDisposition?: string }) =>
        [`https://fake-storage.test/${o.action}/${path}?exp=${o.expires}&ct=${encodeURIComponent(o.contentType ?? "")}&cd=${encodeURIComponent(o.responseDisposition ?? "")}`] as [string],
      getMetadata: async () => {
        const o = this.objects.get(path)
        if (!o) throw Object.assign(new Error("No such object: " + path), { code: 404 })
        return [{ size: String(o.size), contentType: o.contentType }] as [{ size: string; contentType: string }]
      },
      exists: async () => [this.objects.has(path)] as [boolean],
      delete: async () => { this.objects.delete(path); this.deleted.push(path) },
    }
  }
}
