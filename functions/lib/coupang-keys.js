/**
 * Coupang Partners API key vault (AES-GCM in R2).
 * Hanjeon R2 binding: MEDIA (not MEDIA_BUCKET).
 */

const COUPANG_KEYS_PATH = "config/coupang.json";
const APP_PEPPER = "hanjeon.coupang.keys.v1";
const GITHUB_REPO = "lab486486/hanjeon";

function getBearerToken(request) {
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

/** Admin access = GitHub token that can read the hanjeon repo (same as Decap). */
export async function hasAdminAccess(request) {
  const token = getBearerToken(request);
  if (!token) return false;

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "hanjeon-admin",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

function getBucket(env) {
  return env.MEDIA || env.MEDIA_BUCKET || null;
}

function bytesToBase64(bytes) {
  let binary = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(String(b64 || ""));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function getVaultKey(env) {
  const material = `${APP_PEPPER}:${env.COUPANG_VAULT_KEY || env.GITHUB_CLIENT_SECRET || "r2-at-rest"}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptPayload(env, plain) {
  const key = await getVaultKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(plain));
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    v: 1,
    alg: "AES-GCM",
    iv: bytesToBase64(iv),
    data: bytesToBase64(cipherBuf),
    updatedAt: plain.updatedAt || new Date().toISOString(),
  };
}

async function decryptPayload(env, stored) {
  if (!stored || stored.v !== 1 || !stored.iv || !stored.data) return null;
  try {
    const key = await getVaultKey(env);
    const iv = base64ToBytes(stored.iv);
    const data = base64ToBytes(stored.data);
    const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    const parsed = JSON.parse(new TextDecoder().decode(plainBuf));
    return {
      accessKey: String(parsed?.accessKey || "").trim(),
      secretKey: String(parsed?.secretKey || "").trim(),
      updatedAt: String(parsed?.updatedAt || stored.updatedAt || ""),
    };
  } catch {
    return null;
  }
}

function readPlaintextKeys(data) {
  const accessKey = String(data?.accessKey || data?.COUPANG_ACCESS_KEY || "").trim();
  const secretKey = String(data?.secretKey || data?.COUPANG_SECRET_KEY || "").trim();
  if (!accessKey || !secretKey) return null;
  return {
    accessKey,
    secretKey,
    updatedAt: String(data?.updatedAt || ""),
  };
}

export async function loadCoupangKeys(env) {
  const fromEnv = {
    accessKey: String(env.COUPANG_ACCESS_KEY || "").trim(),
    secretKey: String(env.COUPANG_SECRET_KEY || "").trim(),
  };

  const bucket = getBucket(env);
  if (!bucket) {
    return {
      accessKey: fromEnv.accessKey,
      secretKey: fromEnv.secretKey,
      source: fromEnv.accessKey && fromEnv.secretKey ? "env" : "none",
      updatedAt: "",
      encrypted: false,
    };
  }

  try {
    const obj = await bucket.get(COUPANG_KEYS_PATH);
    if (obj) {
      const data = await obj.json();
      if (data && data.v === 1 && data.data) {
        const decrypted = await decryptPayload(env, data);
        if (decrypted?.accessKey && decrypted?.secretKey) {
          return {
            accessKey: decrypted.accessKey,
            secretKey: decrypted.secretKey,
            source: "r2",
            updatedAt: decrypted.updatedAt,
            encrypted: true,
          };
        }
      } else {
        const plain = readPlaintextKeys(data);
        if (plain) {
          return {
            accessKey: plain.accessKey,
            secretKey: plain.secretKey,
            source: "r2",
            updatedAt: plain.updatedAt,
            encrypted: false,
          };
        }
      }
    }
  } catch {
    /* fall through */
  }

  return {
    accessKey: fromEnv.accessKey,
    secretKey: fromEnv.secretKey,
    source: fromEnv.accessKey && fromEnv.secretKey ? "env" : "none",
    updatedAt: "",
    encrypted: false,
  };
}

export async function saveCoupangKeys(env, accessKey, secretKey) {
  const bucket = getBucket(env);
  if (!bucket) {
    throw new Error("MEDIA binding missing");
  }
  const plain = {
    accessKey: String(accessKey || "").trim(),
    secretKey: String(secretKey || "").trim(),
    updatedAt: new Date().toISOString(),
  };
  const encrypted = await encryptPayload(env, plain);
  await bucket.put(COUPANG_KEYS_PATH, JSON.stringify(encrypted, null, 2), {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
      cacheControl: "no-store",
    },
  });
  return {
    accessKey: plain.accessKey,
    secretKey: plain.secretKey,
    updatedAt: plain.updatedAt,
    encrypted: true,
  };
}
