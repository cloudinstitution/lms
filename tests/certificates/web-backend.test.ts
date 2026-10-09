import assert from "node:assert/strict"
import test from "node:test"
import { createWebBucket, createWebDb } from "../../lib/server/web-backend"

/** Minimal in-memory imitation of the firebase/firestore web SDK functions the adapter calls. */
function fakeSdk() {
  const store = new Map<string, any>() // "col/id" -> data
  let auto = 0
  const mkSnap = (path: string, id: string) => ({ id, exists: () => store.has(path), data: () => structuredClone(store.get(path)), ref: { path, id } })
  const F: any = {
    collection: (_db: any, name: string) => ({ kind: "col", name, path: name, filters: [] as any[], lim: 0 }),
    doc: (a: any, b?: string, c?: string) => (c !== undefined ? { path: `${b}/${c}`, id: c } : { path: `${a.name}/auto${++auto}`, id: `auto${auto}` }),
    where: (f: string, op: string, v: any) => ({ f, op, v }),
    limit: (n: number) => ({ lim: n }),
    query: (q: any, ...cs: any[]) => ({ ...q, filters: [...q.filters, ...cs.filter((c) => c.f)], lim: cs.find((c) => c.lim)?.lim ?? q.lim }),
    getDoc: async (r: any) => mkSnap(r.path, r.id),
    setDoc: async (r: any, d: any) => { store.set(r.path, structuredClone(d)) },
    updateDoc: async (r: any, p: any) => { if (!store.has(r.path)) throw new Error("NOT_FOUND"); store.set(r.path, { ...store.get(r.path), ...p }) },
    deleteDoc: async (r: any) => { store.delete(r.path) },
    addDoc: async (c: any, d: any) => { const r = F.doc(c); store.set(r.path, structuredClone(d)); return r },
    getDocs: async (q: any) => {
      let docs = [...store.entries()].filter(([p, d]) => p.startsWith(q.name + "/") && q.filters.every((f: any) => d[f.f] === f.v)).map(([p]) => mkSnap(p, p.split("/")[1]))
      if (q.lim) docs = docs.slice(0, q.lim)
      return { docs, empty: docs.length === 0, size: docs.length }
    },
    runTransaction: async (_db: any, fn: any) => {
      const backup = structuredClone([...store.entries()])
      const writes: (() => void)[] = []
      const rtx = {
        get: async (r: any) => mkSnap(r.path, r.id),
        set: (r: any, d: any) => { writes.push(() => store.set(r.path, structuredClone(d))) },
        update: (r: any, p: any) => { writes.push(() => { if (!store.has(r.path)) throw new Error("NOT_FOUND"); store.set(r.path, { ...store.get(r.path), ...p }) }) },
        delete: (r: any) => { writes.push(() => store.delete(r.path)) },
      }
      try { const res = await fn(rtx); writes.forEach((w) => w()); return res } catch (e) { store.clear(); backup.forEach(([k, v]) => store.set(k, v)); throw e }
    },
  }
  return { F, store }
}

test("web db adapter: set/get/update/delete, add, where, limit", async () => {
  const { F } = fakeSdk()
  const db: any = createWebDb(F, {})
  await db.collection("students").doc("a").set({ name: "A", n: 1 })
  await db.collection("students").doc("b").set({ name: "B", n: 1 })
  const s = await db.collection("students").doc("a").get()
  assert.equal(s.exists, true); assert.equal(s.id, "a"); assert.equal(s.data().name, "A")
  assert.equal((await db.collection("students").doc("zz").get()).exists, false)
  assert.equal((await db.collection("students").doc("zz").get()).data(), undefined)
  await db.collection("students").doc("a").update({ n: 2 })
  assert.equal((await db.collection("students").doc("a").get()).data().n, 2)
  assert.equal((await db.collection("students").where("n", "==", 1).get()).docs.length, 1)
  assert.equal((await db.collection("students").limit(1).get()).size, 1)
  const q = await db.collection("students").where("name", "==", "B").get()
  assert.equal(q.empty, false); assert.equal(q.docs[0].ref.id, "b")
  const ref = await db.collection("notes").add({ t: 1 })
  assert.equal((await ref.get()).data().t, 1)
  await db.collection("students").doc("b").delete()
  assert.equal((await db.collection("students").doc("b").get()).exists, false)
})

test("web db adapter: create() refuses an existing document (one certificate per student)", async () => {
  const { F } = fakeSdk()
  const db: any = createWebDb(F, {})
  await db.collection("certificates").doc("cert_CI1").create({ v: 1 })
  await assert.rejects(() => db.collection("certificates").doc("cert_CI1").create({ v: 2 }), /ALREADY_EXISTS/)
  assert.equal((await db.collection("certificates").doc("cert_CI1").get()).data().v, 1)
})

test("web db adapter: transaction reads, queued writes, create conflict rolls everything back", async () => {
  const { F } = fakeSdk()
  const db: any = createWebDb(F, {})
  await db.collection("projects").doc("p1").set({ status: "Submitted", sid: "x" })
  const ok = await db.runTransaction(async (tx: any) => {
    const p = await tx.get(db.collection("projects").doc("p1"))
    const mine = await tx.get(db.collection("projects").where("sid", "==", "x"))
    assert.equal(mine.docs.length, 1)
    tx.create(db.collection("certificates").doc("c1"), { id: "c1" })
    tx.update(p.ref, { status: "Accepted" })
    return "done"
  })
  assert.equal(ok, "done")
  assert.equal((await db.collection("projects").doc("p1").get()).data().status, "Accepted")
  await assert.rejects(() => db.runTransaction(async (tx: any) => {
    tx.update(db.collection("projects").doc("p1"), { status: "Rejected" })
    tx.create(db.collection("certificates").doc("c1"), { id: "dup" })
  }), /ALREADY_EXISTS/)
  assert.equal((await db.collection("projects").doc("p1").get()).data().status, "Accepted") // nothing was applied
  assert.equal((await db.collection("certificates").doc("c1").get()).data().id, "c1")
})

test("web bucket adapter: write slots use client-upload, reads use download URLs, missing file metadata throws", async () => {
  const objects = new Map<string, { size: number; contentType: string }>([["a/b.pdf", { size: 5, contentType: "application/pdf" }]])
  const S: any = {
    ref: (_s: any, p: string) => ({ p }),
    getDownloadURL: async (r: any) => `https://firebasestorage.googleapis.com/v0/b/x/o/${encodeURIComponent(r.p)}?alt=media&token=t`,
    getMetadata: async (r: any) => { const o = objects.get(r.p); if (!o) throw Object.assign(new Error("nf"), { code: "storage/object-not-found" }); return o },
    deleteObject: async (r: any) => { if (!objects.delete(r.p)) throw Object.assign(new Error("nf"), { code: "storage/object-not-found" }) },
  }
  const bucket: any = createWebBucket(S, {})
  assert.equal((await bucket.file("a/b.pdf").getSignedUrl({ action: "write" }))[0], "client-upload://a/b.pdf")
  assert.match((await bucket.file("a/b.pdf").getSignedUrl({ action: "read" }))[0], /^https:\/\/firebasestorage/)
  assert.equal(Number((await bucket.file("a/b.pdf").getMetadata())[0].size), 5)
  await assert.rejects(() => bucket.file("nope").getMetadata())
  assert.deepEqual(await bucket.file("nope").exists(), [false])
  await bucket.file("nope").delete({ ignoreNotFound: true })
  await bucket.file("a/b.pdf").delete()
  assert.deepEqual(await bucket.file("a/b.pdf").exists(), [false])
})

test("withApi replays once on the web backend when service-account credentials are rejected", async () => {
  const { NextRequest } = await import("next/server")
  const { withApi } = await import("../../lib/server/http")
  const { isAdminBroken, isCredentialFailure } = await import("../../lib/server/firebase-admin")
  assert.equal(isCredentialFailure(new Error("16 UNAUTHENTICATED: Request had invalid authentication credentials.")), true)
  assert.equal(isCredentialFailure(new Error("something else")), false)
  let calls = 0
  const h = withApi(async (req) => {
    calls++
    const body = await req.json()
    if (calls === 1) throw new Error("16 UNAUTHENTICATED: Request had invalid authentication credentials.")
    return Response.json({ ok: true, body, cookie: req.cookies.get("a")?.value })
  })
  const res = await h(new NextRequest("https://x.test/api/y", { method: "POST", headers: { cookie: "a=1", "content-type": "application/json" }, body: JSON.stringify({ n: 5 }) }))
  const j: any = await res.json()
  assert.equal(res.status, 200); assert.deepEqual(j.body, { n: 5 }); assert.equal(j.cookie, "1"); assert.equal(calls, 2)
  assert.equal(isAdminBroken(), true)
})
