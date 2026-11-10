import { bytesToB64, b64ToBytes, decryptBytes, encryptBytes, exportAesKey, importAesKey, randomBytes } from "@/aurelle/crypto";
import { getMeta, setBio } from "@/aurelle/db";

type PrfResults = {
  prf?: {
    enabled?: boolean;
    results?: { first?: ArrayBuffer };
  };
};

function saltBuffer(): ArrayBuffer {
  const bytes = randomBytes(32);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function asCreation(options: CredentialCreationOptions): CredentialCreationOptions {
  return options;
}

function asRequest(options: CredentialRequestOptions): CredentialRequestOptions {
  return options;
}

export async function platformBioAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function prfSecret(cred: PublicKeyCredential): ArrayBuffer | null {
  const ext = cred.getClientExtensionResults() as PrfResults;
  const first = ext.prf?.results?.first;
  return first ?? null;
}

async function wrapKey(secret: ArrayBuffer, key: CryptoKey): Promise<{ iv: string; cipher: ArrayBuffer }> {
  const wrap = await importAesKey(secret);
  const raw = await exportAesKey(key);
  return encryptBytes(wrap, raw);
}

export async function enableBiometric(key: CryptoKey): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!(await platformBioAvailable())) {
    return { ok: false, reason: "Biometrics are not available on this device" };
  }
  const prfSalt = saltBuffer();
  const rawId = randomBytes(16);
  const userId = rawId.buffer.slice(rawId.byteOffset, rawId.byteOffset + rawId.byteLength) as ArrayBuffer;
  try {
    const created = (await navigator.credentials.create(
      asCreation({
        publicKey: {
          challenge: saltBuffer(),
          rp: { name: "AURELLE" },
          user: {
            id: userId,
            name: "aurelle",
            displayName: "AURELLE",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60_000,
          attestation: "none",
          extensions: { prf: { eval: { first: prfSalt } } } as AuthenticationExtensionsClientInputs,
        },
      }),
    )) as PublicKeyCredential | null;
    if (!created) return { ok: false, reason: "Biometrics cancelled" };
    let secret = prfSecret(created);
    if (!secret) {
      const assertion = (await navigator.credentials.get(
        asRequest({
          publicKey: {
            challenge: saltBuffer(),
            allowCredentials: [{ id: created.rawId, type: "public-key" }],
            userVerification: "required",
            timeout: 60_000,
            extensions: { prf: { eval: { first: prfSalt } } } as AuthenticationExtensionsClientInputs,
          },
        }),
      )) as PublicKeyCredential | null;
      secret = assertion ? prfSecret(assertion) : null;
    }
    if (!secret) {
      return { ok: false, reason: "This browser does not return a biometric key. Use your PIN." };
    }
    const wrapped = await wrapKey(secret, key);
    await setBio({
      credentialId: bytesToB64(created.rawId),
      prfSalt: bytesToB64(prfSalt),
      wrapIv: wrapped.iv,
      wrappedKey: wrapped.cipher,
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "Could not turn on biometrics" };
  }
}

export async function unlockWithBiometric(): Promise<CryptoKey | null> {
  const meta = await getMeta();
  if (!meta?.bioCredentialId || !meta.bioPrfSalt || !meta.bioWrapIv || !meta.bioWrappedKey) return null;
  try {
    const assertion = (await navigator.credentials.get(
      asRequest({
        publicKey: {
          challenge: saltBuffer(),
          allowCredentials: [{ id: b64ToBytes(meta.bioCredentialId), type: "public-key" }],
          userVerification: "required",
          timeout: 60_000,
          extensions: {
            prf: { eval: { first: b64ToBytes(meta.bioPrfSalt) } },
          } as AuthenticationExtensionsClientInputs,
        },
      }),
    )) as PublicKeyCredential | null;
    if (!assertion) return null;
    const secret = prfSecret(assertion);
    if (!secret) return null;
    const wrap = await importAesKey(secret);
    const raw = await decryptBytes(wrap, meta.bioWrapIv, meta.bioWrappedKey);
    return importAesKey(raw);
  } catch {
    return null;
  }
}
