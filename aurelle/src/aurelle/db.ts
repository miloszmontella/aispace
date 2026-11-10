import {
  b64ToBytes,
  bytesToB64,
  checkVerifier,
  decryptBytes,
  decryptJson,
  derivePinKey,
  encryptBytes,
  encryptJson,
  makeVerifier,
  randomBytes,
} from "@/aurelle/crypto";
import type { PhotoRow, Profile, ProfileRow, VaultMeta } from "@/aurelle/types";

const DB_NAME = "aurelle";
const DB_VERSION = 1;

let vaultTask: Promise<void> = Promise.resolve();

export function trackVaultTask(task: Promise<void>) {
  vaultTask = task.then(
    () => undefined,
    () => undefined,
  );
}

export function vaultReady(): Promise<void> {
  return vaultTask;
}
let dbPromise: Promise<IDBDatabase> | null = null;
let sessionKey: CryptoKey | null = null;

const thumbCache = new Map<string, string>();
const fullCache = new Map<string, string>();
const thumbInflight = new Map<string, Promise<string>>();
const fullInflight = new Map<string, Promise<string>>();
const staticThumbs = new Set<string>();

export function getSessionKey(): CryptoKey | null {
  return sessionKey;
}

export function lockSession() {
  sessionKey = null;
}

export function primeThumb(id: string, url: string) {
  thumbCache.set(id, url);
  staticThumbs.add(id);
}

export function peekThumb(id: string): string | null {
  return thumbCache.get(id) ?? null;
}

function dropUrl(cache: Map<string, string>, id: string, protectStatic: boolean) {
  const url = cache.get(id);
  if (!url) return;
  if (!(protectStatic && staticThumbs.has(id))) URL.revokeObjectURL(url);
  cache.delete(id);
}

export function dropPhotoCache(id: string) {
  dropUrl(thumbCache, id, true);
  dropUrl(fullCache, id, false);
  staticThumbs.delete(id);
  thumbInflight.delete(id);
  fullInflight.delete(id);
}

export function revokeAll() {
  for (const [id, url] of thumbCache) {
    if (!staticThumbs.has(id)) URL.revokeObjectURL(url);
  }
  for (const url of fullCache.values()) URL.revokeObjectURL(url);
  thumbCache.clear();
  fullCache.clear();
  thumbInflight.clear();
  fullInflight.clear();
  staticThumbs.clear();
}

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("no-idb"));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
        if (!db.objectStoreNames.contains("profiles")) db.createObjectStore("profiles");
        if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error ?? new Error("idb"));
      };
    });
  }
  return dbPromise;
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb"));
    tx.onabort = () => reject(tx.error ?? new Error("aborted"));
  });
}

export async function getMeta(): Promise<VaultMeta | null> {
  const db = await openDb();
  const tx = db.transaction("meta", "readonly");
  const req = tx.objectStore("meta").get("vault");
  const value = await new Promise<VaultMeta | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as VaultMeta | undefined);
    req.onerror = () => reject(req.error);
  });
  await done(tx);
  return value ?? null;
}

export async function putMeta(meta: VaultMeta): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("meta", "readwrite");
  tx.objectStore("meta").put(meta, "vault");
  await done(tx);
}

export async function getCover(): Promise<Blob | null> {
  const db = await openDb();
  const tx = db.transaction("meta", "readonly");
  const req = tx.objectStore("meta").get("cover");
  const value = await new Promise<Blob | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
  await done(tx);
  return value ?? null;
}

export async function putCover(blob: Blob | null): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("meta", "readwrite");
  if (blob) tx.objectStore("meta").put(blob, "cover");
  else tx.objectStore("meta").delete("cover");
  await done(tx);
}

async function readProfiles(): Promise<ProfileRow[]> {
  const db = await openDb();
  const tx = db.transaction("profiles", "readonly");
  const req = tx.objectStore("profiles").getAll();
  const rows = await new Promise<ProfileRow[]>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as ProfileRow[]);
    req.onerror = () => reject(req.error);
  });
  await done(tx);
  return rows;
}

async function readPhotos(): Promise<PhotoRow[]> {
  const db = await openDb();
  const tx = db.transaction("photos", "readonly");
  const req = tx.objectStore("photos").getAll();
  const rows = await new Promise<PhotoRow[]>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as PhotoRow[]);
    req.onerror = () => reject(req.error);
  });
  await done(tx);
  return rows;
}

async function getPhoto(id: string): Promise<PhotoRow | null> {
  const db = await openDb();
  const tx = db.transaction("photos", "readonly");
  const req = tx.objectStore("photos").get(id);
  const row = await new Promise<PhotoRow | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as PhotoRow | undefined);
    req.onerror = () => reject(req.error);
  });
  await done(tx);
  return row ?? null;
}

function requireKey(): CryptoKey {
  if (!sessionKey) throw new Error("locked");
  return sessionKey;
}

async function rewrite(meta: VaultMeta, profiles: ProfileRow[], photos: PhotoRow[]): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["meta", "profiles", "photos"], "readwrite");
    tx.objectStore("meta").put(meta, "vault");
    const profileStore = tx.objectStore("profiles");
    profileStore.clear();
    for (const row of profiles) profileStore.put(row, row.id);
    const photoStore = tx.objectStore("photos");
    photoStore.clear();
    for (const row of photos) photoStore.put(row, row.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb"));
    tx.onabort = () => reject(tx.error ?? new Error("aborted"));
  });
}

export async function listProfiles(): Promise<Profile[]> {
  const rows = await readProfiles();
  const out: Profile[] = [];
  for (const row of rows) {
    if (!row.enc) {
      if (row.profile) out.push(row.profile);
      continue;
    }
    if (!sessionKey || !row.iv || !row.cipher) continue;
    try {
      out.push(await decryptJson<Profile>(sessionKey, row.iv, row.cipher));
    } catch {
      /* skip a damaged record rather than blanking the archive */
    }
  }
  return out;
}

async function bytesOf(row: PhotoRow, part: "thumb" | "full"): Promise<ArrayBuffer> {
  if (!row.enc) return part === "thumb" ? row.thumb : row.full;
  const key = requireKey();
  const iv = part === "thumb" ? row.ivThumb : row.ivFull;
  const data = part === "thumb" ? row.thumb : row.full;
  if (!iv) throw new Error("missing iv");
  return decryptBytes(key, iv, data);
}

function asUrl(buf: ArrayBuffer): string {
  return URL.createObjectURL(new Blob([buf], { type: "image/jpeg" }));
}

export async function ensureThumb(id: string): Promise<string> {
  const cached = thumbCache.get(id);
  if (cached) return cached;
  const pending = thumbInflight.get(id);
  if (pending) return pending;
  const job = (async () => {
    const row = await getPhoto(id);
    if (!row) throw new Error("missing photo");
    const url = asUrl(await bytesOf(row, "thumb"));
    thumbCache.set(id, url);
    return url;
  })();
  thumbInflight.set(id, job);
  try {
    return await job;
  } finally {
    thumbInflight.delete(id);
  }
}

export async function ensureFull(id: string): Promise<string> {
  const cached = fullCache.get(id);
  if (cached) return cached;
  const pending = fullInflight.get(id);
  if (pending) return pending;
  const job = (async () => {
    const row = await getPhoto(id);
    if (!row) {
      const fallback = thumbCache.get(id);
      if (fallback) {
        fullCache.set(id, fallback);
        return fallback;
      }
      throw new Error("missing photo");
    }
    const bytes = await bytesOf(row, "full");
    if (bytes.byteLength < 32) throw new Error("empty photo");
    const url = asUrl(bytes);
    fullCache.set(id, url);
    return url;
  })();
  fullInflight.set(id, job);
  try {
    return await job;
  } finally {
    fullInflight.delete(id);
  }
}

export async function saveProfile(
  profile: Profile,
  additions: { id: string; thumb: Blob; full: Blob }[],
  removed: string[],
): Promise<void> {
  const meta = await getMeta();
  if (!meta) throw new Error("no vault");
  if (meta.encrypted && !sessionKey) throw new Error("locked");
  let row: ProfileRow;
  if (meta.encrypted && sessionKey) {
    const enc = await encryptJson(sessionKey, profile);
    row = { id: profile.id, enc: true, iv: enc.iv, cipher: enc.cipher };
  } else {
    row = { id: profile.id, enc: false, profile };
  }
  const photos: PhotoRow[] = [];
  for (const addition of additions) {
    const thumb = await addition.thumb.arrayBuffer();
    const full = await addition.full.arrayBuffer();
    if (meta.encrypted && sessionKey) {
      const t = await encryptBytes(sessionKey, thumb);
      const f = await encryptBytes(sessionKey, full);
      photos.push({
        id: addition.id,
        profileId: profile.id,
        enc: true,
        ivThumb: t.iv,
        thumb: t.cipher,
        ivFull: f.iv,
        full: f.cipher,
      });
    } else {
      photos.push({ id: addition.id, profileId: profile.id, enc: false, thumb, full });
    }
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["profiles", "photos"], "readwrite");
    tx.objectStore("profiles").put(row, profile.id);
    const store = tx.objectStore("photos");
    for (const id of removed) store.delete(id);
    for (const photo of photos) store.put(photo, photo.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb"));
    tx.onabort = () => reject(tx.error ?? new Error("aborted"));
  });
  for (const id of removed) dropPhotoCache(id);
}

export async function deleteProfile(id: string): Promise<void> {
  const photos = (await readPhotos()).filter((photo) => photo.profileId === id);
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["profiles", "photos"], "readwrite");
    tx.objectStore("profiles").delete(id);
    for (const photo of photos) tx.objectStore("photos").delete(photo.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb"));
    tx.onabort = () => reject(tx.error ?? new Error("aborted"));
  });
  for (const photo of photos) dropPhotoCache(photo.id);
}

async function encodeAll(key: CryptoKey | null, encrypted: boolean): Promise<{ profiles: ProfileRow[]; photos: PhotoRow[] }> {
  const profiles = await listProfiles();
  const photoRows = await readPhotos();
  const old = sessionKey;
  const nextProfiles: ProfileRow[] = [];
  for (const profile of profiles) {
    if (encrypted && key) {
      const enc = await encryptJson(key, profile);
      nextProfiles.push({ id: profile.id, enc: true, iv: enc.iv, cipher: enc.cipher });
    } else {
      nextProfiles.push({ id: profile.id, enc: false, profile });
    }
  }
  const nextPhotos: PhotoRow[] = [];
  for (const row of photoRows) {
    const thumb = row.enc ? await decryptBytes(old ?? requireKey(), row.ivThumb ?? "", row.thumb) : row.thumb;
    const full = row.enc ? await decryptBytes(old ?? requireKey(), row.ivFull ?? "", row.full) : row.full;
    if (encrypted && key) {
      const t = await encryptBytes(key, thumb);
      const f = await encryptBytes(key, full);
      nextPhotos.push({
        id: row.id,
        profileId: row.profileId,
        enc: true,
        ivThumb: t.iv,
        thumb: t.cipher,
        ivFull: f.iv,
        full: f.cipher,
      });
    } else {
      nextPhotos.push({ id: row.id, profileId: row.profileId, enc: false, thumb, full });
    }
  }
  return { profiles: nextProfiles, photos: nextPhotos };
}

function clearedBio(meta: VaultMeta): VaultMeta {
  return {
    encrypted: meta.encrypted,
    seeded: meta.seeded,
    autoLockMs: meta.autoLockMs,
    salt: meta.salt,
    verifyIv: meta.verifyIv,
    verify: meta.verify,
  };
}

export async function enablePin(pin: string): Promise<void> {
  const meta = await getMeta();
  if (!meta) throw new Error("no vault");
  if (meta.encrypted) throw new Error("already");
  const salt = randomBytes(16);
  const saltBuf = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  const key = await derivePinKey(pin, saltBuf);
  const packed = await encodeAll(key, true);
  const verify = await makeVerifier(key);
  const next: VaultMeta = {
    ...clearedBio(meta),
    encrypted: true,
    seeded: true,
    salt: bytesToB64(saltBuf),
    verifyIv: verify.iv,
    verify: verify.cipher,
  };
  await rewrite(next, packed.profiles, packed.photos);
  sessionKey = key;
}

export async function changePin(pin: string): Promise<void> {
  const meta = await getMeta();
  if (!meta?.encrypted || !sessionKey) throw new Error("locked");
  const salt = randomBytes(16);
  const saltBuf = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  const key = await derivePinKey(pin, saltBuf);
  const packed = await encodeAll(key, true);
  const verify = await makeVerifier(key);
  const next: VaultMeta = {
    ...clearedBio(meta),
    encrypted: true,
    salt: bytesToB64(saltBuf),
    verifyIv: verify.iv,
    verify: verify.cipher,
  };
  await rewrite(next, packed.profiles, packed.photos);
  sessionKey = key;
}

export async function disablePin(): Promise<void> {
  const meta = await getMeta();
  if (!meta?.encrypted || !sessionKey) throw new Error("locked");
  const packed = await encodeAll(null, false);
  const next: VaultMeta = {
    encrypted: false,
    seeded: true,
    autoLockMs: meta.autoLockMs,
  };
  await rewrite(next, packed.profiles, packed.photos);
  sessionKey = null;
}

export async function unlock(pin: string): Promise<boolean> {
  const meta = await getMeta();
  if (!meta?.encrypted || !meta.salt || !meta.verify || !meta.verifyIv) return false;
  const key = await derivePinKey(pin, b64ToBytes(meta.salt));
  const ok = await checkVerifier(key, meta.verifyIv, meta.verify);
  if (!ok) return false;
  sessionKey = key;
  return true;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const meta = await getMeta();
  if (!meta?.encrypted || !meta.salt || !meta.verify || !meta.verifyIv) return false;
  const key = await derivePinKey(pin, b64ToBytes(meta.salt));
  return checkVerifier(key, meta.verifyIv, meta.verify);
}

export async function adoptKey(key: CryptoKey): Promise<boolean> {
  const meta = await getMeta();
  if (!meta?.verify || !meta.verifyIv) return false;
  const ok = await checkVerifier(key, meta.verifyIv, meta.verify);
  if (!ok) return false;
  sessionKey = key;
  return true;
}

export async function setBio(data: {
  credentialId: string;
  prfSalt: string;
  wrapIv: string;
  wrappedKey: ArrayBuffer;
}): Promise<void> {
  const meta = await getMeta();
  if (!meta) throw new Error("no vault");
  await putMeta({
    ...meta,
    bioCredentialId: data.credentialId,
    bioPrfSalt: data.prfSalt,
    bioWrapIv: data.wrapIv,
    bioWrappedKey: data.wrappedKey,
  });
}

export async function clearBio(): Promise<void> {
  const meta = await getMeta();
  if (!meta) return;
  await putMeta(clearedBio(meta));
}

export async function setAutoLock(autoLockMs: number): Promise<void> {
  const meta = await getMeta();
  if (!meta) return;
  await putMeta({ ...meta, autoLockMs });
}

type Backup = {
  magic: "AURELLE1";
  exportedAt: number;
  meta: {
    encrypted: boolean;
    seeded: boolean;
    autoLockMs: number;
    salt?: string;
    verifyIv?: string;
    verify?: string;
  };
  profiles: {
    id: string;
    enc: boolean;
    profile?: Profile;
    iv?: string;
    cipher?: string;
  }[];
  photos: {
    id: string;
    profileId: string;
    enc: boolean;
    ivThumb?: string;
    ivFull?: string;
    thumb: string;
    full: string;
  }[];
};

export async function exportBackup(): Promise<Blob> {
  const meta = await getMeta();
  if (!meta) throw new Error("no vault");
  const profiles = await readProfiles();
  const photos = await readPhotos();
  const payload: Backup = {
    magic: "AURELLE1",
    exportedAt: Date.now(),
    meta: {
      encrypted: meta.encrypted,
      seeded: true,
      autoLockMs: meta.autoLockMs,
      salt: meta.salt,
      verifyIv: meta.verifyIv,
      verify: meta.verify ? bytesToB64(meta.verify) : undefined,
    },
    profiles: profiles.map((row) => ({
      id: row.id,
      enc: row.enc,
      profile: row.profile,
      iv: row.iv,
      cipher: row.cipher ? bytesToB64(row.cipher) : undefined,
    })),
    photos: photos.map((row) => ({
      id: row.id,
      profileId: row.profileId,
      enc: row.enc,
      ivThumb: row.ivThumb,
      ivFull: row.ivFull,
      thumb: bytesToB64(row.thumb),
      full: bytesToB64(row.full),
    })),
  };
  return new Blob([JSON.stringify(payload)], { type: "application/json" });
}

export async function importBackup(file: File): Promise<{ encrypted: boolean }> {
  const parsed = JSON.parse(await file.text()) as Backup;
  if (!parsed || parsed.magic !== "AURELLE1" || !parsed.meta || !Array.isArray(parsed.profiles)) {
    throw new Error("bad backup");
  }
  const meta: VaultMeta = {
    encrypted: Boolean(parsed.meta.encrypted),
    seeded: true,
    autoLockMs: Number(parsed.meta.autoLockMs ?? 60_000),
    salt: parsed.meta.salt,
    verifyIv: parsed.meta.verifyIv,
    verify: parsed.meta.verify ? b64ToBytes(parsed.meta.verify) : undefined,
  };
  const profiles: ProfileRow[] = parsed.profiles.map((row) => ({
    id: row.id,
    enc: row.enc,
    profile: row.profile,
    iv: row.iv,
    cipher: row.cipher ? b64ToBytes(row.cipher) : undefined,
  }));
  const photos: PhotoRow[] = (parsed.photos ?? []).map((row) => ({
    id: row.id,
    profileId: row.profileId,
    enc: row.enc,
    ivThumb: row.ivThumb,
    ivFull: row.ivFull,
    thumb: b64ToBytes(row.thumb),
    full: b64ToBytes(row.full),
  }));
  lockSession();
  revokeAll();
  await rewrite(meta, profiles, photos);
  return { encrypted: meta.encrypted };
}
