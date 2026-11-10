const text = new TextEncoder();
const textDec = new TextDecoder();
const VERIFY = "AURELLE-VAULT-OK";

export function randomBytes(size: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(size));
}

function copyBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function bytesToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x2000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function b64ToBytes(value: string): ArrayBuffer {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return copyBuffer(out);
}

export async function derivePinKey(pin: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", text.encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBytes(
  key: CryptoKey,
  data: ArrayBuffer,
): Promise<{ iv: string; cipher: ArrayBuffer }> {
  const iv = randomBytes(12);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: copyBuffer(iv) }, key, data);
  return { iv: bytesToB64(copyBuffer(iv)), cipher };
}

export async function decryptBytes(key: CryptoKey, iv: string, cipher: ArrayBuffer): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(iv) }, key, cipher);
}

export async function encryptJson(
  key: CryptoKey,
  value: unknown,
): Promise<{ iv: string; cipher: ArrayBuffer }> {
  return encryptBytes(key, copyBuffer(text.encode(JSON.stringify(value))));
}

export async function decryptJson<T>(key: CryptoKey, iv: string, cipher: ArrayBuffer): Promise<T> {
  const plain = await decryptBytes(key, iv, cipher);
  return JSON.parse(textDec.decode(plain)) as T;
}

export async function makeVerifier(key: CryptoKey): Promise<{ iv: string; cipher: ArrayBuffer }> {
  return encryptBytes(key, copyBuffer(text.encode(VERIFY)));
}

export async function checkVerifier(key: CryptoKey, iv: string, cipher: ArrayBuffer): Promise<boolean> {
  try {
    const plain = await decryptBytes(key, iv, cipher);
    return textDec.decode(plain) === VERIFY;
  } catch {
    return false;
  }
}

export async function importAesKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, "AES-GCM", true, ["encrypt", "decrypt"]);
}

export async function exportAesKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("raw", key);
}
