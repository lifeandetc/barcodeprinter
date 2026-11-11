const encoder = new TextEncoder();

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sameString(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function sessionSecret() {
  return process.env.SESSION_SECRET?.trim() || "";
}

export function appPassword() {
  return process.env.APP_ACCESS_PASSWORD?.trim() ?? "";
}

export function authRequired() {
  return appPassword().length > 0 || process.env.NODE_ENV === "production";
}

export async function signSession(secret: string, days = 30) {
  const expires = String(Date.now() + days * 24 * 60 * 60 * 1000);
  const signature = await hmac(secret, expires);
  return `${expires}.${signature}`;
}

export async function verifySession(secret: string, token: string | undefined) {
  if (!secret || !token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;
  if (Number(expires) < Date.now()) return false;
  const expected = await hmac(secret, expires);
  return sameString(expected, signature);
}

export async function passwordMatches(input: string, expected: string) {
  const left = await sha256(input);
  const right = await sha256(expected);
  return sameString(left, right);
}

export const SESSION_COOKIE = "le_session";
